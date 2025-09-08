import { app, BrowserWindow, dialog, shell } from 'electron'
import { LifecycleManager, registerCoreHooks } from './presenter/lifecyclePresenter'
import { getInstance, Presenter } from './presenter'
import { electronApp } from '@electron-toolkit/utils'
import { ipcMain } from 'electron'
import ElectronStore from 'electron-store'
import { TabPresenter } from './presenter/tabPresenter'

// Set application command line arguments
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required') // Allow video autoplay
app.commandLine.appendSwitch('webrtc-max-cpu-consumption-percentage', '100') // Set WebRTC max CPU usage
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096') // Set V8 heap memory size
app.commandLine.appendSwitch('ignore-certificate-errors') // Ignore certificate errors (for dev or specific scenarios)

// Set platform-specific command line arguments
if (process.platform == 'win32') {
  // Windows platform specific parameters (currently commented out)
  // app.commandLine.appendSwitch('in-process-gpu')
  // app.commandLine.appendSwitch('wm-window-animations-disabled')
}
if (process.platform === 'darwin') {
  // macOS platform specific parameters
  app.commandLine.appendSwitch('disable-features', 'DesktopCaptureMacV2,IOSurfaceCapturer')
}

// Register IPC handlers
ipcMain.handle('show-open-dialog', async (_event, options) => {
  return await dialog.showOpenDialog(options)
})

ipcMain.handle('show-item-in-folder', async (_event, path) => {
  return shell.showItemInFolder(path)
})

// 处理打开下载管理标签页的请求
ipcMain.handle('open-downloads-tab', async (event) => {
  try {
    // 获取发送请求的窗口 ID
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) {
      console.warn('无法获取发送请求的窗口')
      return
    }

    const windowId = window.id
    console.log(`收到打开下载管理标签页的请求，窗口 ID: ${windowId}`)

    // 获取 TabPresenter 实例
    const tabPresenter = presenter.tabPresenter as TabPresenter

    // 获取窗口的所有标签页
    const tabsData = await tabPresenter.getWindowTabsData(windowId)

    // 查找是否已经存在下载管理标签页
    const existingDownloadsTab = tabsData.find((tab) => tab.url?.includes('#/downloads'))

    if (existingDownloadsTab) {
      // 如果已经存在下载管理标签页，切换到该标签页
      console.log(`窗口 ${windowId} 中已存在下载管理标签页，切换到该标签页`)
      await tabPresenter.switchTab(existingDownloadsTab.id)
    } else {
      // 如果不存在下载管理标签页，创建新的
      console.log(`窗口 ${windowId} 中不存在下载管理标签页，创建新的标签页`)
      await tabPresenter.createTab(windowId, 'local://downloads', {
        active: true
      })
    }
  } catch (error) {
    console.error('处理打开下载管理标签页请求时出错:', error)
  }
})

// 处理跨标签页下载数据同步
ipcMain.on('download-sync-broadcast', async (event, data) => {
  try {
    // console.log('主进程收到下载同步广播:', data)

    // 获取发送请求的标签页信息
    const senderWebContentsId = event.sender.id
    const senderTabId = presenter.tabPresenter.getTabIdByWebContentsId(senderWebContentsId)

    if (!senderTabId) {
      console.warn('无法获取发送同步请求的标签页ID')
      return
    }

    // console.log(`同步请求来自 Tab:${senderTabId}`)

    // 获取所有窗口
    const allWindows = presenter.windowPresenter.getAllWindows()

    // 遍历所有窗口，向每个窗口的所有标签页发送同步事件
    for (const window of allWindows) {
      if (window && !window.isDestroyed()) {
        const windowId = window.id

        // 获取窗口的所有标签页数据
        const tabsData = await presenter.tabPresenter.getWindowTabsData(windowId)

        for (const tab of tabsData) {
          // 跳过发送同步请求的标签页
          if (tab.id === senderTabId) {
            continue
          }

          // 获取标签页的 WebContents
          const tabView = await presenter.tabPresenter.getTab(tab.id)
          if (tabView && !tabView.webContents.isDestroyed()) {
            // console.log(`转发同步事件到 Tab:${tab.id} Window:${windowId}`)
            tabView.webContents.send('download-sync', data)
          }
        }
      }
    }

    // console.log('下载同步广播完成')
  } catch (error) {
    console.error('处理下载同步广播时出错:', error)
  }
})

// 全局下载任务存储（持久化）
type GlobalDownloadItem = {
  id: string
  filename: string
  url: string
  hash?: string
  status: string
  progress: number
  downloadedBytes: number
  totalBytes: number
  speed: number
  remainingTime?: number
  filePath?: string
  error?: string
  createdAt: number
  startedAt?: number
  completedAt?: number
}

const downloadsStore = new ElectronStore<{ tasks: GlobalDownloadItem[] }>({
  name: 'download-tasks',
  defaults: {
    tasks: []
  }
})

const globalDownloadTasks: GlobalDownloadItem[] = downloadsStore.get('tasks') || []

function persistDownloads() {
  try {
    downloadsStore.set('tasks', globalDownloadTasks)
  } catch (e) {
    console.warn('持久化下载任务失败:', e)
  }
}

// 处理下载任务的全局存储
ipcMain.on('download-global-store', (event, data) => {
  const { action, downloadItem, downloadId } = data

  // console.log('主进程收到全局下载存储请求:', action)

  switch (action) {
    case 'add':
      if (downloadItem) {
        // 检查是否已存在
        const existingIndex = globalDownloadTasks.findIndex((d) => d.id === downloadItem.id)
        if (existingIndex === -1) {
          globalDownloadTasks.push(downloadItem)
          console.log('全局存储添加下载任务:', downloadItem.id)
          persistDownloads()
        }
      }
      break
    case 'update':
      if (downloadItem) {
        const index = globalDownloadTasks.findIndex((d) => d.id === downloadItem.id)
        if (index !== -1) {
          globalDownloadTasks[index] = downloadItem
          // console.log('全局存储更新下载任务:', downloadItem.id)
          persistDownloads()
        }
      }
      break
    case 'remove':
      if (downloadId) {
        const index = globalDownloadTasks.findIndex((d) => d.id === downloadId)
        if (index !== -1) {
          globalDownloadTasks.splice(index, 1)
          console.log('全局存储删除下载任务:', downloadId)
          persistDownloads()
        }
      }
      break
    case 'clear':
      globalDownloadTasks.length = 0
      console.log('全局存储清空下载任务')
      persistDownloads()
      break
    case 'get':
      // 返回所有下载任务
      console.log('返回全局下载任务，数量:', globalDownloadTasks.length)
      event.sender.send('download-global-data', globalDownloadTasks)
      break
  }
})

// 处理下载管理页面打开时的同步请求（向后兼容）
ipcMain.on('download-sync-request', async (event) => {
  console.log('发送全局下载任务数据，数量:', globalDownloadTasks.length)
  event.sender.send('download-sync-response', [...globalDownloadTasks])
})

// Initialize lifecycle manager and register core hooks
const lifecycleManager = new LifecycleManager()
registerCoreHooks(lifecycleManager)

// Initialize presenter after ready
let presenter: Presenter
// Start the lifecycle management system instead of using app.whenReady()
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.dilu.daqinzhongqi')
  try {
    console.log('main: Application lifecycle startup')
    await lifecycleManager.start()
    presenter = getInstance(lifecycleManager)
    console.log('main: Application lifecycle startup completed successfully')

    // 应用启动后自动恢复未完成的下载（pending / downloading / paused）
    try {
      const configPresenter = presenter.configPresenter
      const downloadPresenter = presenter.downloadPresenter
      const downloadDir = configPresenter.getDownloadDirectory()

      for (const task of globalDownloadTasks) {
        if (!task) continue
        if (['completed', 'failed'].includes(task.status)) continue
        // 避免重复同时启动：让已经在进行中的由主进程自身管理
        try {
          await downloadPresenter.downloadFile({
            id: task.id,
            url: task.url,
            filename: task.filename,
            downloadDir,
            hash: task.hash
          })
        } catch (e) {
          console.warn('自动恢复下载失败:', task.id, e)
        }
      }
    } catch (e) {
      console.warn('自动恢复下载初始化失败:', e)
    }
  } catch (error) {
    console.error('main: Application lifecycle startup failed:', error)
    dialog.showErrorBox(
      'Application startup failed',
      error instanceof Error ? error.message : String(error)
    )
    app.quit() // Serious error, exit the program
  }
})

// Handle window-all-closed event
app.on('window-all-closed', () => {
  if (!presenter) return

  // Check if there are any non-floating-button windows
  const mainWindows = presenter.windowPresenter.getAllWindows()

  if (mainWindows.length === 0) {
    // When only floating button windows exist, quit app on non-macOS platforms
    console.log('main: All main windows closed, requesting shutdown')
    app.quit() // Keep this event to avoid unexpected situations
  }
})
