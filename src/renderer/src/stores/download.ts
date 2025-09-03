import { defineStore } from 'pinia'
import { ref } from 'vue'
import { nanoid } from 'nanoid'
import { usePresenter } from '@/composables/usePresenter'
import { useRouter } from 'vue-router'
import { useToast } from '@/components/ui/toast/use-toast'

// 下载状态类型
export type DownloadStatus = 'pending' | 'downloading' | 'paused' | 'completed' | 'failed'

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
  // const { t } = useI18n()

  // 操作方法
  const setVisible = (visible: boolean) => {
    isVisible.value = visible
  }

  const addDownload = (params: { filename: string; url: string; hash?: string }): string => {
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

    // 显示下载管理器
    isVisible.value = true

    // 异步开始下载
    setTimeout(() => {
      startDownloadProcess(downloadId)
    }, 100)

    return downloadId
  }

  const updateDownload = (id: string, updates: Partial<DownloadItem>) => {
    const index = downloads.value.findIndex((d) => d.id === id)
    if (index !== -1) {
      downloads.value[index] = { ...downloads.value[index], ...updates }
    }
  }

  const removeDownload = (id: string) => {
    const index = downloads.value.findIndex((d) => d.id === id)
    if (index !== -1) {
      // 如果正在下载，先取消
      if (downloads.value[index].status === 'downloading') {
        cancelDownloadProcess(id)
      }
      downloads.value.splice(index, 1)
    }
  }

  const pauseDownload = (id: string) => {
    updateDownload(id, { status: 'paused' })
    pauseDownloadProcess(id)
  }

  const resumeDownload = (id: string) => {
    updateDownload(id, { status: 'downloading' })
    resumeDownloadProcess(id)
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
    downloads.value = downloads.value.filter((d) => d.status !== 'completed')
  }

  const clearAll = () => {
    // 取消所有进行中的下载
    downloads.value.forEach((download) => {
      if (download.status === 'downloading') {
        cancelDownloadProcess(download.id)
      }
    })
    downloads.value = []
  }

  // 显示配置提示并引导用户到设置页面
  const showConfigPrompt = (message: string) => {
    toast({
      title: '需要配置',
      description: `${message}。点击这里去设置`,
      variant: 'destructive',
      duration: 5000,
      onOpenChange: (open) => {
        if (!open) {
          // 用户点击了toast，引导到设置页面
          const router = useRouter()
          router.push('/settings')

          // 关闭下载管理器弹窗
          isVisible.value = false
        }
      }
    })
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
      console.error('下载失败:', error)
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
      }
    )
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
    initDownloadListeners
  }
})
