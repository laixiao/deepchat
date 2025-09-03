import { eventBus, SendTarget } from '@/eventbus'
import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'
import crypto from 'crypto'
import { URL } from 'url'

// 下载项目接口
export interface DownloadTask {
  id: string
  filename: string
  url: string
  downloadDir: string
  hash?: string
  filePath?: string
  progress: number
  downloadedBytes: number
  totalBytes: number
  speed: number
  remainingTime?: number
  status: 'pending' | 'downloading' | 'paused' | 'completed' | 'failed'
  error?: string
  createdAt: number
  startedAt?: number
  completedAt?: number
  request?: http.ClientRequest | https.RequestOptions
  writeStream?: fs.WriteStream
}

export class DownloadPresenter {
  private downloads: Map<string, DownloadTask> = new Map()

  constructor() {
    // 监听下载相关事件
    this.setupEventListeners()
  }

  private setupEventListeners() {
    // 这里可以添加IPC事件监听
  }

  // 开始下载
  async downloadFile(params: {
    id: string
    url: string
    filename: string
    downloadDir: string
    hash?: string
  }): Promise<{ success: boolean; filePath?: string; error?: string }> {
    const { id, url, filename, downloadDir, hash } = params

    try {
      // 确保下载目录存在
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true })
      }

      const filePath = path.join(downloadDir, filename)

      // 如果文件已存在，检查哈希值
      if (fs.existsSync(filePath) && hash) {
        const existingHash = await this.calculateFileHash(filePath)
        if (existingHash === hash) {
          // 文件已存在且哈希匹配，直接返回成功
          this.updateDownloadStatus(id, {
            status: 'completed',
            progress: 100,
            filePath,
            completedAt: Date.now()
          })
          return { success: true, filePath }
        }
      }

      // 创建下载任务
      const task: DownloadTask = {
        id,
        filename,
        url,
        downloadDir,
        hash,
        filePath,
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        speed: 0,
        status: 'downloading',
        createdAt: Date.now(),
        startedAt: Date.now()
      }

      this.downloads.set(id, task)

      // 开始下载
      return await this.startDownload(task)
    } catch (error) {
      console.error('下载初始化失败:', error)
      this.updateDownloadStatus(id, {
        status: 'failed',
        error: error instanceof Error ? error.message : '下载初始化失败'
      })
      return { success: false, error: error instanceof Error ? error.message : '下载初始化失败' }
    }
  }

  private async startDownload(
    task: DownloadTask
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    return new Promise((resolve) => {
      try {
        const url = new URL(task.url)
        const client = url.protocol === 'https:' ? https : http

        const request = client.get(task.url, (response) => {
          if (response.statusCode !== 200) {
            const error = `HTTP ${response.statusCode}: ${response.statusMessage}`
            this.updateDownloadStatus(task.id, {
              status: 'failed',
              error
            })
            resolve({ success: false, error })
            return
          }

          const totalBytes = parseInt(response.headers['content-length'] || '0', 10)
          task.totalBytes = totalBytes

          let downloadedBytes = 0
          let lastProgressTime = Date.now()
          let lastDownloadedBytes = 0

          // 创建写入流
          const writeStream = fs.createWriteStream(task.filePath!)
          task.writeStream = writeStream

          // 监听数据
          response.on('data', (chunk) => {
            if (task.status === 'paused') {
              response.pause()
              return
            }

            writeStream.write(chunk)
            downloadedBytes += chunk.length

            // 计算进度和速度
            const now = Date.now()
            const progress = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0

            // 每100ms更新一次进度
            if (now - lastProgressTime >= 100) {
              const timeDiff = (now - lastProgressTime) / 1000
              const bytesDiff = downloadedBytes - lastDownloadedBytes
              const speed = bytesDiff / timeDiff
              const remainingBytes = totalBytes - downloadedBytes
              const remainingTime = speed > 0 ? remainingBytes / speed : undefined

              this.updateDownloadStatus(task.id, {
                progress,
                downloadedBytes,
                speed,
                remainingTime
              })

              lastProgressTime = now
              lastDownloadedBytes = downloadedBytes
            }
          })

          // 下载完成
          response.on('end', async () => {
            writeStream.end()

            try {
              // 验证哈希值（如果提供）
              if (task.hash) {
                const fileHash = await this.calculateFileHash(task.filePath!)
                if (fileHash !== task.hash) {
                  throw new Error('文件哈希验证失败')
                }
              }

              this.updateDownloadStatus(task.id, {
                status: 'completed',
                progress: 100,
                downloadedBytes: totalBytes,
                completedAt: Date.now()
              })

              resolve({ success: true, filePath: task.filePath })
            } catch (error) {
              // 删除损坏的文件
              if (fs.existsSync(task.filePath!)) {
                fs.unlinkSync(task.filePath!)
              }

              const errorMessage = error instanceof Error ? error.message : '文件验证失败'
              this.updateDownloadStatus(task.id, {
                status: 'failed',
                error: errorMessage
              })
              resolve({ success: false, error: errorMessage })
            }
          })

          // 处理错误
          response.on('error', (error) => {
            writeStream.destroy()
            if (fs.existsSync(task.filePath!)) {
              fs.unlinkSync(task.filePath!)
            }

            this.updateDownloadStatus(task.id, {
              status: 'failed',
              error: error.message
            })
            resolve({ success: false, error: error.message })
          })
        })

        task.request = request

        request.on('error', (error) => {
          this.updateDownloadStatus(task.id, {
            status: 'failed',
            error: error.message
          })
          resolve({ success: false, error: error.message })
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '下载失败'
        this.updateDownloadStatus(task.id, {
          status: 'failed',
          error: errorMessage
        })
        resolve({ success: false, error: errorMessage })
      }
    })
  }

  // 暂停下载
  pauseDownload(id: string): boolean {
    const task = this.downloads.get(id)
    if (!task || task.status !== 'downloading') {
      return false
    }

    task.status = 'paused'
    this.updateDownloadStatus(id, { status: 'paused' })
    return true
  }

  // 恢复下载
  resumeDownload(id: string): boolean {
    const task = this.downloads.get(id)
    if (!task || task.status !== 'paused') {
      return false
    }

    task.status = 'downloading'
    this.updateDownloadStatus(id, { status: 'downloading' })
    return true
  }

  // 取消下载
  cancelDownload(id: string): boolean {
    const task = this.downloads.get(id)
    if (!task) {
      return false
    }

    // 停止请求
    if (task.request) {
      task.request.destroy()
    }

    // 关闭写入流
    if (task.writeStream) {
      task.writeStream.destroy()
    }

    // 删除未完成的文件
    if (task.filePath && fs.existsSync(task.filePath) && task.status !== 'completed') {
      try {
        fs.unlinkSync(task.filePath)
      } catch (error) {
        console.error('删除未完成的下载文件失败:', error)
      }
    }

    this.downloads.delete(id)
    return true
  }

  // 获取下载状态
  getDownloadStatus(id: string): DownloadTask | null {
    return this.downloads.get(id) || null
  }

  // 获取所有下载
  getAllDownloads(): DownloadTask[] {
    return Array.from(this.downloads.values())
  }

  // 更新下载状态并通知渲染进程
  private updateDownloadStatus(id: string, updates: Partial<DownloadTask>) {
    const task = this.downloads.get(id)
    if (!task) return

    Object.assign(task, updates)

    // 直接发送IPC事件到所有渲染进程
    eventBus.sendToRenderer('download-progress', SendTarget.ALL_WINDOWS, {
      id,
      progress: task.progress,
      downloadedBytes: task.downloadedBytes,
      totalBytes: task.totalBytes,
      speed: task.speed,
      remainingTime: task.remainingTime,
      status: task.status,
      error: task.error,
      filePath: task.filePath
    })
  }

  // 计算文件哈希值
  private async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256')
      const stream = fs.createReadStream(filePath)

      stream.on('data', (data) => {
        hash.update(data)
      })

      stream.on('end', () => {
        resolve(hash.digest('hex'))
      })

      stream.on('error', (error) => {
        reject(error)
      })
    })
  }

  // 清理已完成的下载
  clearCompleted() {
    for (const [id, task] of this.downloads.entries()) {
      if (task.status === 'completed') {
        this.downloads.delete(id)
      }
    }
  }

  // 清理所有下载
  clearAll() {
    // 取消所有进行中的下载
    for (const [id, task] of this.downloads.entries()) {
      if (task.status === 'downloading') {
        this.cancelDownload(id)
      }
    }
    this.downloads.clear()
  }
}
