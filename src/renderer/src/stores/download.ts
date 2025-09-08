import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { nanoid } from 'nanoid'
import { usePresenter } from '@/composables/usePresenter'
import { useRouter } from 'vue-router'
import { useToast } from '@/components/ui/toast/use-toast'

// 下载状态类型
export type DownloadStatus =
  | 'pending'
  | 'downloading'
  | 'paused'
  | 'verifying'
  | 'completed'
  | 'failed'

// 下载项目接口
export interface DownloadItem {
  id: string
  filename: string
  url: string
  hash?: string
  status: DownloadStatus
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

export const useDownloadStore = defineStore('download', () => {
  // 状态
  const downloads = ref<DownloadItem[]>([])
  const isVisible = ref(false)

  // 获取全局实例
  const { toast } = useToast()
  const { t } = useI18n()

  // 安全翻译（当 key 不存在时回退到指定文案）
  const tt = (key: string, fallback: string, params?: Record<string, unknown>) => {
    const translated = params ? (t(key, params) as string) : (t(key) as string)
    return translated === key ? fallback : translated
  }

  const updateDownload = (id: string, updates: Partial<DownloadItem>) => {
    const index = downloads.value.findIndex((d) => d.id === id)
    if (index !== -1) {
      downloads.value[index] = { ...downloads.value[index], ...updates }
    }
  }

  const addDownload = async (params: {
    filename: string
    url: string
    hash?: string
  }): Promise<string | null> => {
    // 在添加任务前进行配置校验
    try {
      const configPresenter = usePresenter('configPresenter')

      // 获取（可能为默认）下载/安装目录
      const downloadDir = await configPresenter.getDownloadDirectory()
      const installDir = await configPresenter.getInstallationDirectory()

      if (!downloadDir || !installDir) {
        showConfigPrompt('无法获取下载或安装目录，请前往设置页面检查')
        return null
      }

      // 确保目录存在
      try {
        await configPresenter.ensureDirectoryExists(downloadDir)
        await configPresenter.ensureDirectoryExists(installDir)
      } catch (e) {
        console.error('确保目录存在失败:', e)
        showConfigPrompt('创建下载或安装目录失败，请前往设置页面检查')
        return null
      }

      // 校验安装目录（不能包含中文）
      const isValidPath = await configPresenter.validatePathNotContainsChinese(installDir)
      if (!isValidPath) {
        showConfigPrompt('安装目录路径不能包含中文字符，请重新设置')
        return null
      }
    } catch (error) {
      console.error('配置校验失败:', error)
      showConfigPrompt('获取配置失败，请前往设置页面检查')
      return null
    }

    const downloadId = nanoid()
    const downloadItem: DownloadItem = {
      id: downloadId,
      filename: params.filename,
      url: params.url,
      hash: params.hash,
      status: 'pending',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      speed: 0,
      createdAt: Date.now()
    }

    downloads.value.push(downloadItem)

    // 同步到全局存储
    syncToGlobalStore('add', downloadItem)

    // 跨标签页同步：通知其他标签页
    syncToOtherTabs('add', downloadItem)

    // 异步开始下载
    setTimeout(() => {
      startDownloadProcess(downloadId)
    }, 100)

    return downloadId
  }

  const removeDownload = (id: string) => {
    const index = downloads.value.findIndex((d) => d.id === id)
    if (index !== -1) {
      // 如果正在下载，先取消
      if (downloads.value[index].status === 'downloading') {
        cancelDownloadProcess(id)
      }
      downloads.value.splice(index, 1)
      // 同步到全局存储与其他标签页
      syncToGlobalStore('remove', undefined, id)
      syncToOtherTabs('remove', undefined, id)
    }
  }

  const pauseDownload = async (id: string) => {
    try {
      const downloadPresenter = usePresenter('downloadPresenter')
      const result = await downloadPresenter.pauseDownload(id)

      if (result) {
        // 状态会通过IPC事件更新，不需要手动设置
      }
    } catch (error) {
      console.error('暂停下载失败:', error)
    }
  }

  const resumeDownload = async (id: string) => {
    try {
      const downloadPresenter = usePresenter('downloadPresenter')
      const result = await downloadPresenter.resumeDownload(id)
      if (result) {
        // 状态会通过IPC事件更新，不需要手动设置
      }
    } catch (error) {
      console.error('恢复下载失败:', error)
    }
  }

  const retryDownload = (id: string) => {
    updateDownload(id, {
      status: 'pending',
      progress: 0,
      downloadedBytes: 0,
      error: undefined
    })
    startDownloadProcess(id)
  }

  const clearCompleted = () => {
    const toRemove = downloads.value.filter((d) => d.status === 'completed')
    // 本地删除并同步每条记录到全局与其他标签页
    for (const item of toRemove) {
      const idx = downloads.value.findIndex((d) => d.id === item.id)
      if (idx !== -1) {
        downloads.value.splice(idx, 1)
      }
      syncToGlobalStore('remove', undefined, item.id)
      syncToOtherTabs('remove', undefined, item.id)
    }
  }

  const clearAll = () => {
    // 取消所有进行中的下载
    downloads.value.forEach((download) => {
      if (download.status === 'downloading') {
        cancelDownloadProcess(download.id)
      }
    })
    downloads.value = []
    // 同步到全局存储与其他标签页
    syncToGlobalStore('clear')
    syncToOtherTabs('clear')
  }

  // 批量操作：全部开始
  const startAll = () => {
    downloads.value.forEach((d) => {
      if (d.status === 'pending') {
        // 未开始的直接启动
        startDownloadProcess(d.id)
      } else if (d.status === 'paused') {
        // 暂停的恢复
        resumeDownloadProcess(d.id)
      } else if (d.status === 'failed') {
        // 失败的重试
        retryDownload(d.id)
      }
      // 已完成与下载中不处理
    })
  }

  // 批量操作：全部暂停
  const pauseAll = () => {
    downloads.value.forEach((d) => {
      if (d.status === 'downloading') {
        pauseDownloadProcess(d.id)
      }
    })
  }

  // 批量操作：全部删除（等价于清空）
  const deleteAll = () => {
    clearAll()
    // 同步到全局存储与其他标签页
    syncToGlobalStore('clear')
    syncToOtherTabs('clear')
  }

  // 显示配置提示并引导用户到设置页面（使用 i18n）
  const showConfigPrompt = (message: string) => {
    const title = tt('download.toast.needConfigTitle', '需要配置')
    const description = tt('download.toast.navigateToSettings', `${message}。即将打开设置页面`, {
      message
    })
    toast({
      title,
      description,
      variant: 'destructive',
      duration: 4000
    })
    // 直接导航到设置页面，避免依赖 toast 的 onOpenChange（该回调会被内部覆盖）
    const router = useRouter()
    router.push('/settings')
  }

  // 下载处理函数
  const startDownloadProcess = async (id: string) => {
    const download = downloads.value.find((d) => d.id === id)
    if (!download) return

    try {
      // 使用 presenter 获取配置
      const configPresenter = usePresenter('configPresenter')
      const downloadPresenter = usePresenter('downloadPresenter')

      const downloadDir = await configPresenter.getDownloadDirectory()
      if (!downloadDir) {
        showConfigPrompt('请先在设置中配置下载目录')
        throw new Error('请先在设置中配置下载目录')
      }

      const installDir = await configPresenter.getInstallationDirectory()
      if (!installDir) {
        showConfigPrompt('请先在设置中配置安装目录')
        throw new Error('请先在设置中配置安装目录')
      }

      // 验证安装目录不包含中文
      const isValidPath = await configPresenter.validatePathNotContainsChinese(installDir)
      if (!isValidPath) {
        showConfigPrompt('安装目录路径不能包含中文字符，请重新设置')
        throw new Error('安装目录路径不能包含中文字符，请重新设置')
      }

      updateDownload(id, {
        status: 'downloading',
        startedAt: Date.now()
      })

      // 调用主进程下载API
      const result = await downloadPresenter.downloadFile({
        id,
        url: download.url,
        filename: download.filename,
        downloadDir,
        hash: download.hash
      })

      if (result?.success) {
        updateDownload(id, {
          status: 'completed',
          progress: 100,
          downloadedBytes: download.totalBytes,
          filePath: result.filePath,
          completedAt: Date.now()
        })
      } else {
        throw new Error(result?.error || '下载失败')
      }
    } catch (error) {
      updateDownload(id, {
        status: 'failed',
        error: error instanceof Error ? error.message : '下载失败'
      })
    }
  }

  const pauseDownloadProcess = (id: string) => {
    // 使用 presenter 调用主进程暂停下载
    const downloadPresenter = usePresenter('downloadPresenter')
    downloadPresenter.pauseDownload(id)
  }

  const resumeDownloadProcess = (id: string) => {
    // 使用 presenter 调用主进程恢复下载
    const downloadPresenter = usePresenter('downloadPresenter')
    downloadPresenter.resumeDownload(id)
  }

  const cancelDownloadProcess = (id: string) => {
    // 使用 presenter 调用主进程取消下载
    const downloadPresenter = usePresenter('downloadPresenter')
    downloadPresenter.cancelDownload(id)
  }

  // 监听来自主进程的下载进度更新
  const initDownloadListeners = () => {
    // 监听下载进度事件（通过 IPC 监听器）
    window.electron.ipcRenderer.on(
      'download-progress',
      (
        _event,
        data: {
          id: string
          progress: number
          downloadedBytes: number
          totalBytes: number
          speed: number
          remainingTime?: number
          status: DownloadStatus
          error?: string
          filePath?: string
        }
      ) => {
        updateDownload(data.id, {
          progress: data.progress,
          downloadedBytes: data.downloadedBytes,
          totalBytes: data.totalBytes,
          speed: data.speed,
          remainingTime: data.remainingTime,
          status: data.status,
          error: data.error,
          filePath: data.filePath
        })

        // 如果下载完成，设置完成时间
        if (data.status === 'completed') {
          updateDownload(data.id, { completedAt: Date.now() })
        }

        // 将最新状态同步到全局存储与其他标签页
        const updated = downloads.value.find((d) => d.id === data.id)
        if (updated) {
          syncToGlobalStore('update', { ...updated })
          syncToOtherTabs('update', { ...updated })
        }
      }
    )

    // 监听跨标签页的数据同步事件
    window.electron.ipcRenderer.on(
      'download-sync',
      (
        _event,
        data: {
          action: 'add' | 'update' | 'remove' | 'clear'
          downloadItem?: DownloadItem
          downloadId?: string
        }
      ) => {
        switch (data.action) {
          case 'add':
            if (data.downloadItem) {
              // 检查是否已经存在相同的任务
              const existingIndex = downloads.value.findIndex((d) => d.id === data.downloadItem!.id)
              if (existingIndex === -1) {
                downloads.value.push(data.downloadItem)
              }
            }
            break
          case 'update':
            if (data.downloadItem) {
              updateDownload(data.downloadItem.id, data.downloadItem)
            }
            break
          case 'remove':
            if (data.downloadId) {
              const index = downloads.value.findIndex((d) => d.id === data.downloadId)
              if (index !== -1) {
                downloads.value.splice(index, 1)
              }
            }
            break
          case 'clear':
            downloads.value = []
            break
        }
      }
    )

    // 监听其他标签页的数据请求
    window.electron.ipcRenderer.on('download-sync-data-request', () => {
      // 发送当前所有的下载任务数据
      window.electron.ipcRenderer.send('download-sync-data-response', downloads.value)
    })

    // 监听主进程的全局下载数据返回，用于窗口初始化时的任务同步
    window.electron.ipcRenderer.on('download-global-data', (_event, tasks: DownloadItem[]) => {
      // 合并全局任务到本地，避免重复
      for (const task of tasks) {
        const idx = downloads.value.findIndex((d) => d.id === task.id)
        if (idx === -1) {
          downloads.value.push(task)
        } else {
          downloads.value[idx] = { ...downloads.value[idx], ...task }
        }
      }
    })

    // 初始化时向主进程请求当前全局下载任务，用于新窗口/新标签页首屏同步
    window.electron.ipcRenderer.send('download-global-store', { action: 'get' })
  }

  // 全局存储同步函数
  const syncToGlobalStore = (
    action: 'add' | 'update' | 'remove' | 'clear',
    downloadItem?: DownloadItem,
    downloadId?: string
  ) => {
    // 通过 IPC 发送到主进程的全局存储
    window.electron.ipcRenderer.send('download-global-store', {
      action,
      downloadItem,
      downloadId
    })
  }

  // 跨标签页同步函数
  const syncToOtherTabs = (
    action: 'add' | 'update' | 'remove' | 'clear',
    downloadItem?: DownloadItem,
    downloadId?: string
  ) => {
    // 通过 IPC 发送同步事件到主进程，主进程会转发给其他标签页
    window.electron.ipcRenderer.send('download-sync-broadcast', {
      action,
      downloadItem,
      downloadId
    })
  }

  // 初始化监听器
  initDownloadListeners()

  // 控制下载管理器显示状态的方法
  const setVisible = (visible: boolean) => {
    isVisible.value = visible
  }

  return {
    downloads,
    isVisible,
    setVisible,
    addDownload,
    updateDownload,
    removeDownload,
    pauseDownload,
    resumeDownload,
    retryDownload,
    clearCompleted,
    clearAll,
    startAll,
    pauseAll,
    deleteAll,
    initDownloadListeners
  }
})
