import { eventBus, SendTarget } from '@/eventbus'
import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'
import { URL } from 'url'
import crypto from 'crypto'
import { HashUtil } from '@/utils/hashUtil'

// 下载项目接口
export interface DownloadTask {
  id: string
  filename: string
  url: string
  downloadDir: string
  hash?: string
  filePath?: string
  tempFilePath?: string
  progress: number
  downloadedBytes: number
  totalBytes: number
  speed: number
  remainingTime?: number
  status: 'pending' | 'downloading' | 'paused' | 'verifying' | 'completed' | 'failed'
  error?: string
  createdAt: number
  startedAt?: number
  completedAt?: number
  request?: http.ClientRequest
  writeStream?: fs.WriteStream
  isPausing?: boolean // 标记是否正在暂停，避免错误处理
  retryAttempt?: number // 失败后的干净重试次数
}

export class DownloadPresenter {
  private downloads: Map<string, DownloadTask> = new Map()

  constructor() {
    // 监听下载相关事件
    this.setupEventListeners()
  }

  // 判断是否全部下载任务均已完成
  private areAllDownloadsCompleted(): boolean {
    const tasks = Array.from(this.downloads.values())
    if (tasks.length === 0) return false
    return tasks.every((t) => t.status === 'completed')
  }

  // 清理孤立的断点临时文件（*.part.*），避免占用空间
  private cleanupOrphanTempFiles(downloadDirs: string[]) {
    try {
      // 收集当前任务仍在使用的临时文件路径，避免误删
      const activeTempSet = new Set(
        Array.from(this.downloads.values())
          .filter((t) => t.status !== 'completed')
          .map((t) => t.tempFilePath)
          .filter((p): p is string => !!p)
      )

      for (const dir of downloadDirs) {
        if (!dir || !fs.existsSync(dir)) continue
        const entries = fs.readdirSync(dir)
        for (const name of entries) {
          // 我们的命名规则为 `${filename}.part.${id}`，因此包含 `.part.` 的视为临时文件
          if (name.includes('.part.')) {
            const full = path.join(dir, name)
            if (!activeTempSet.has(full)) {
              try {
                fs.unlinkSync(full)
                console.log('清理断点临时文件:', full)
              } catch (e) {
                console.warn('清理断点临时文件失败:', full, e)
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('清理断点临时文件过程出现异常:', e)
    }
  }

  // 生成基于URL的哈希文件名，保留可能的扩展名
  private computeLinkHashFilename(urlStr: string, originalFilename?: string): string {
    try {
      const u = new URL(urlStr)
      const raw = u.toString() // 包含完整查询参数，保证唯一性
      const linkHash = crypto.createHash('sha256').update(raw).digest('hex')
      // 优先从原始文件名获取扩展名，其次从URL路径推断扩展名
      let ext = ''
      const fromOriginal = originalFilename ? path.extname(originalFilename) : ''
      const fromUrlPath = path.extname(u.pathname)
      ext = fromOriginal || fromUrlPath || ''
      return `${linkHash}${ext}`
    } catch {
      // 兜底：失败时仅返回哈希
      const linkHash = crypto.createHash('sha256').update(urlStr).digest('hex')
      return linkHash
    }
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

      // 基于下载链接信息生成稳定且唯一的文件名（使用URL的SHA-256），并保留扩展名
      const computedFilename = this.computeLinkHashFilename(url, filename)
      // 最终文件路径（下载完成后会落到此处）
      const filePath = path.join(downloadDir, computedFilename)
      // 每个任务独立的临时文件，避免同名任务之间共享进度
      const tempFilePath = path.join(downloadDir, `${computedFilename}.part.${id}`)

      // 预先创建下载任务，以便在校验阶段也能向前端汇报状态
      const preTask: DownloadTask = {
        id,
        filename: computedFilename,
        url,
        downloadDir,
        hash,
        filePath,
        tempFilePath,
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        speed: 0,
        status: 'pending',
        createdAt: Date.now(),
        retryAttempt: 0
      }
      this.downloads.set(id, preTask)

      // 如果最终文件已存在，检查哈希值（SHA-256），并在校验过程中显示校验进度
      if (fs.existsSync(filePath) && hash) {
        const matched = await this.verifyFileWithProgress(id, filePath, hash)
        if (matched) {
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

      // 切换任务为下载中并记录开始时间
      const task = this.downloads.get(id)!
      task.status = 'downloading'
      task.startedAt = Date.now()

      // 如果存在未完成的临时文件，优先尝试断点续传（应用安全回退）
      try {
        if (task.tempFilePath && fs.existsSync(task.tempFilePath)) {
          const stats = fs.statSync(task.tempFilePath)
          if (stats.size > 0) {
            const SAFETY_BACKTRACK = 512 * 1024 // 512KB
            const resumeOffset = Math.max(stats.size - SAFETY_BACKTRACK, 0)
            if (resumeOffset < stats.size) {
              try {
                fs.truncateSync(task.tempFilePath, resumeOffset)
                console.log(`Truncated temp file to ${resumeOffset} bytes for safe auto-resume`)
              } catch (e) {
                console.warn('Failed to truncate temp file for safe auto-resume:', e)
              }
            }
            task.downloadedBytes = resumeOffset
            task.progress = task.totalBytes > 0 ? (resumeOffset / task.totalBytes) * 100 : 0
            return await (this.resumeDownloadFromBreakpoint(task) as unknown as Promise<{
              success: boolean
              filePath?: string
              error?: string
            }>)
          }
        }
      } catch (e) {
        console.warn('检查断点文件失败，回退为全量下载:', e)
      }

      // 开始全量下载
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

        // 设置请求头模拟浏览器
        const options = {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
            // 强制不使用压缩，避免校验值与服务器原文件不一致
            'Accept-Encoding': 'identity',
            Connection: 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0'
          }
        }

        const request = client.get(task.url, options, (response) => {
          // 处理重定向
          if (
            response.statusCode === 301 ||
            response.statusCode === 302 ||
            response.statusCode === 303 ||
            response.statusCode === 307 ||
            response.statusCode === 308
          ) {
            const redirectUrl = response.headers.location
            if (redirectUrl) {
              console.log(`Following redirect from ${task.url} to ${redirectUrl}`)
              // 关闭当前请求
              request.destroy()

              // 创建新的请求跟随重定向
              const newUrl = new URL(redirectUrl, task.url)
              const newClient = newUrl.protocol === 'https:' ? https : http

              const redirectRequest = newClient.get(
                newUrl.toString(),
                options,
                (redirectResponse) => {
                  // 处理重定向响应后的重定向（递归处理）
                  if (
                    redirectResponse.statusCode === 301 ||
                    redirectResponse.statusCode === 302 ||
                    redirectResponse.statusCode === 303 ||
                    redirectResponse.statusCode === 307 ||
                    redirectResponse.statusCode === 308
                  ) {
                    const secondRedirectUrl = redirectResponse.headers.location
                    if (secondRedirectUrl) {
                      console.log(`Following second redirect to ${secondRedirectUrl}`)
                      redirectRequest.destroy()

                      const secondNewUrl = new URL(secondRedirectUrl, newUrl)
                      const secondNewClient = secondNewUrl.protocol === 'https:' ? https : http

                      const secondRedirectRequest = secondNewClient.get(
                        secondNewUrl.toString(),
                        options,
                        (secondRedirectResponse) => {
                          if (secondRedirectResponse.statusCode !== 200) {
                            const error = `HTTP ${secondRedirectResponse.statusCode}: ${secondRedirectResponse.statusMessage}`
                            this.updateDownloadStatus(task.id, {
                              status: 'failed',
                              error
                            })
                            resolve({ success: false, error })
                            return
                          }
                          this.handleDownloadResponse(task, secondRedirectResponse, resolve)
                        }
                      )

                      secondRedirectRequest.on('error', (error) => {
                        this.updateDownloadStatus(task.id, {
                          status: 'failed',
                          error: error.message
                        })
                        resolve({ success: false, error: error.message })
                      })

                      task.request = secondRedirectRequest
                      return
                    }
                  }

                  if (redirectResponse.statusCode !== 200) {
                    const error = `HTTP ${redirectResponse.statusCode}: ${redirectResponse.statusMessage}`
                    this.updateDownloadStatus(task.id, {
                      status: 'failed',
                      error
                    })
                    resolve({ success: false, error })
                    return
                  }

                  // 使用重定向响应的处理逻辑
                  this.handleDownloadResponse(task, redirectResponse, resolve)
                }
              )

              redirectRequest.on('error', (error) => {
                this.updateDownloadStatus(task.id, {
                  status: 'failed',
                  error: error.message
                })
                resolve({ success: false, error: error.message })
              })

              // 更新任务的请求对象
              task.request = redirectRequest
              return
            }
          }

          if (response.statusCode !== 200) {
            const error = `HTTP ${response.statusCode}: ${response.statusMessage}`
            this.updateDownloadStatus(task.id, {
              status: 'failed',
              error
            })
            resolve({ success: false, error })
            return
          }

          this.handleDownloadResponse(task, response, resolve)
        })

        task.request = request

        request.on('error', (error) => {
          // 如果正在暂停，不应该把错误当作真正的错误
          if (task.isPausing) {
            console.log('Request error during pause, ignoring:', error.message)
            return
          }

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

  // 处理下载响应
  private handleDownloadResponse(
    task: DownloadTask,
    response: http.IncomingMessage,
    resolve: (value: { success: boolean; filePath?: string; error?: string }) => void
  ) {
    const totalBytes = parseInt(response.headers['content-length'] || '0', 10)
    task.totalBytes = totalBytes

    let downloadedBytes = 0
    let lastProgressTime = Date.now()
    let lastDownloadedBytes = 0

    // 创建写入流，写入到任务独立的临时文件
    const writeStream = fs.createWriteStream(task.tempFilePath!)
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

      // 每100ms更新一次进度（不打印日志）
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
        // 验证哈希值（如果提供，使用SHA-256），展示校验过程
        if (task.hash) {
          const ok = await this.verifyFileWithProgress(task.id, task.tempFilePath!, task.hash)
          if (!ok) {
            // 一次性干净重试：删除临时文件并重新全量下载
            if ((task.retryAttempt ?? 0) < 1) {
              task.retryAttempt = (task.retryAttempt ?? 0) + 1
              console.warn(
                'Hash verify failed after full download, retrying once with clean download...'
              )
              try {
                if (task.tempFilePath && fs.existsSync(task.tempFilePath)) {
                  fs.unlinkSync(task.tempFilePath)
                }
              } catch (e) {
                console.warn('Failed to remove temp file after hash fail:', e)
              }
              task.downloadedBytes = 0
              task.progress = 0
              return void this.startDownload(task).then(resolve)
            }
            throw new Error('文件哈希验证失败')
          }
        }

        // 下载完成后将临时文件重命名为最终文件
        if (task.tempFilePath && task.filePath) {
          if (fs.existsSync(task.filePath)) {
            // 如已存在目标文件，先删除（避免跨任务残留）
            fs.unlinkSync(task.filePath)
          }
          fs.renameSync(task.tempFilePath, task.filePath)
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
        if (task.tempFilePath && fs.existsSync(task.tempFilePath)) {
          fs.unlinkSync(task.tempFilePath)
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
      // 如果正在暂停，不应该把错误当作真正的错误
      if (task.isPausing) {
        console.log('Response error during pause, ignoring:', error.message)
        return
      }

      writeStream.destroy()
      if (task.tempFilePath && fs.existsSync(task.tempFilePath)) {
        fs.unlinkSync(task.tempFilePath)
      }

      this.updateDownloadStatus(task.id, {
        status: 'failed',
        error: error.message
      })
      resolve({ success: false, error: error.message })
    })
  }

  // 暂停下载
  pauseDownload(id: string): boolean {
    const task = this.downloads.get(id)
    if (!task || task.status !== 'downloading') {
      console.log(`Pause failed: task not found or not downloading. Status: ${task?.status}`)
      return false
    }

    console.log(`Pausing download: ${id}`)
    console.log(`Current downloaded bytes: ${task.downloadedBytes}`)

    task.status = 'paused'
    task.isPausing = true // 标记正在暂停，避免错误处理

    // 暂停响应流
    if (task.request) {
      console.log('Destroying request')
      task.request.destroy()
      task.request = undefined
    }

    // 关闭写入流并更新实际文件大小（基于临时文件）
    if (task.writeStream) {
      console.log('Destroying write stream')
      task.writeStream.destroy()
      task.writeStream = undefined

      // 重新检查实际文件大小，确保与记录一致
      if (task.tempFilePath && fs.existsSync(task.tempFilePath)) {
        const stats = fs.statSync(task.tempFilePath)
        const actualFileSize = stats.size
        console.log(
          `Actual file size after pause: ${actualFileSize}, recorded: ${task.downloadedBytes}`
        )

        // 更新记录的下载字节数以匹配实际文件大小
        if (actualFileSize !== task.downloadedBytes) {
          console.log(`Updating downloaded bytes from ${task.downloadedBytes} to ${actualFileSize}`)
          task.downloadedBytes = actualFileSize
          task.progress = task.totalBytes > 0 ? (actualFileSize / task.totalBytes) * 100 : 0
        }
      }
    }

    this.updateDownloadStatus(id, { status: 'paused' })
    console.log('Download paused successfully')
    return true
  }

  // 恢复下载
  resumeDownload(id: string): boolean {
    const task = this.downloads.get(id)
    if (!task || task.status !== 'paused') {
      console.log(`Resume failed: task not found or not paused. Status: ${task?.status}`)
      return false
    }

    console.log(`Attempting to resume download: ${id}`)
    console.log(
      `Task info: downloaded=${task.downloadedBytes}, total=${task.totalBytes}, file=${task.filePath}`
    )

    // 重置暂停标志
    task.isPausing = false

    // 检查临时文件是否存在且大小正确
    if (task.tempFilePath && fs.existsSync(task.tempFilePath)) {
      const stats = fs.statSync(task.tempFilePath)
      const fileSize = stats.size

      console.log(`File exists: size=${fileSize}, expected=${task.downloadedBytes}`)

      // 为了防止异常关机导致尾部不完整，回退一段安全窗口后续传
      const SAFETY_BACKTRACK = 512 * 1024 // 512KB
      if (fileSize > 0) {
        const resumeOffset = Math.max(fileSize - SAFETY_BACKTRACK, 0)
        if (resumeOffset < fileSize) {
          try {
            fs.truncateSync(task.tempFilePath, resumeOffset)
            console.log(`Truncated temp file to ${resumeOffset} bytes for safe resume`)
          } catch (e) {
            console.warn('Failed to truncate temp file for safe resume:', e)
          }
        }
        task.downloadedBytes = resumeOffset
        task.progress = task.totalBytes > 0 ? (resumeOffset / task.totalBytes) * 100 : 0
      }

      // 现在继续断点续传
      if (task.totalBytes > 0 && task.downloadedBytes > 0) {
        console.log(`Resuming download from safe offset: ${task.downloadedBytes} bytes`)
        this.resumeDownloadFromBreakpoint(task)
      } else if (fileSize === 0) {
        // 文件为空，重新开始下载
        console.log('File is empty, restarting download')
        task.downloadedBytes = 0
        task.progress = 0
        task.status = 'downloading'
        task.startedAt = Date.now()
        this.startDownload(task)
      } else {
        // 文件大小不匹配，可能是损坏的文件，重新开始下载
        console.warn(
          `File size mismatch: expected ${task.downloadedBytes}, got ${fileSize}, restarting download`
        )
        // 清理错误的临时文件后重下
        try {
          if (task.tempFilePath && fs.existsSync(task.tempFilePath)) {
            fs.unlinkSync(task.tempFilePath)
          }
        } catch (e) {
          console.warn('Failed to remove mismatched temp file:', e)
        }
        task.downloadedBytes = 0
        task.progress = 0
        task.status = 'downloading'
        task.startedAt = Date.now()
        this.startDownload(task)
      }
    } else {
      // 文件不存在，重新开始下载
      console.log('Download file not found, restarting download')
      task.downloadedBytes = 0
      task.progress = 0
      task.status = 'downloading'
      task.startedAt = Date.now()
      this.startDownload(task)
    }

    return true
  }

  // 从断点恢复下载
  private resumeDownloadFromBreakpoint(task: DownloadTask) {
    console.log(`Starting breakpoint resume for task ${task.id}`)
    console.log(`Range header: bytes=${task.downloadedBytes}-`)

    return new Promise((resolve) => {
      try {
        const url = new URL(task.url)
        const client = url.protocol === 'https:' ? https : http

        // 设置请求头模拟浏览器，并添加 Range 请求头
        const options = {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
            // 强制不使用压缩，避免校验值与服务器原文件不一致
            'Accept-Encoding': 'identity',
            Connection: 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0',
            Range: `bytes=${task.downloadedBytes}-` // 从断点继续下载
          }
        }

        console.log(`Sending resume request to: ${task.url}`)
        console.log(`Resume request headers:`, options.headers)

        const request = client.get(task.url, options, (response) => {
          console.log(`Resume response status: ${response.statusCode}`)
          console.log(`Resume response headers:`, response.headers)

          // 处理重定向
          if (
            response.statusCode === 301 ||
            response.statusCode === 302 ||
            response.statusCode === 303 ||
            response.statusCode === 307 ||
            response.statusCode === 308
          ) {
            const redirectUrl = response.headers.location
            if (redirectUrl) {
              console.log(`Following redirect from ${task.url} to ${redirectUrl}`)
              request.destroy()

              const newUrl = new URL(redirectUrl, task.url)
              const newClient = newUrl.protocol === 'https:' ? https : http

              const redirectRequest = newClient.get(
                newUrl.toString(),
                options,
                (redirectResponse) => {
                  console.log(`Redirect resume response status: ${redirectResponse.statusCode}`)
                  if (redirectResponse.statusCode === 206) {
                    // 206 Partial Content 表示支持断点续传
                    console.log('Redirect response supports resume (206)')
                    this.handleResumeResponse(task, redirectResponse, resolve)
                  } else if (redirectResponse.statusCode === 200) {
                    // 服务器不支持断点续传，从头开始下载
                    console.log(
                      'Redirect response does not support resume (200), restarting download'
                    )
                    task.downloadedBytes = 0
                    task.progress = 0
                    this.handleDownloadResponse(task, redirectResponse, resolve)
                  } else {
                    const error = `HTTP ${redirectResponse.statusCode}: ${redirectResponse.statusMessage}`
                    console.error('Redirect resume failed:', error)
                    this.updateDownloadStatus(task.id, {
                      status: 'failed',
                      error
                    })
                    resolve({ success: false, error })
                  }
                }
              )

              redirectRequest.on('error', (error) => {
                console.error('Redirect resume request error:', error)
                this.updateDownloadStatus(task.id, {
                  status: 'failed',
                  error: error.message
                })
                resolve({ success: false, error: error.message })
              })

              task.request = redirectRequest
              return
            }
          }

          if (response.statusCode === 206) {
            // 206 Partial Content 表示支持断点续传
            console.log('Response supports resume (206)')
            this.handleResumeResponse(task, response, resolve)
          } else if (response.statusCode === 200) {
            // 服务器不支持断点续传，从头开始下载
            console.log('Response does not support resume (200), restarting download')
            task.downloadedBytes = 0
            task.progress = 0
            this.handleDownloadResponse(task, response, resolve)
          } else {
            const error = `HTTP ${response.statusCode}: ${response.statusMessage}`
            console.error('Resume failed:', error)
            this.updateDownloadStatus(task.id, {
              status: 'failed',
              error
            })
            resolve({ success: false, error })
          }
        })

        task.request = request
        task.status = 'downloading'

        request.on('error', (error) => {
          console.error('Resume request error:', error)
          this.updateDownloadStatus(task.id, {
            status: 'failed',
            error: error.message
          })
          resolve({ success: false, error: error.message })
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '恢复下载失败'
        console.error('Resume setup error:', errorMessage)
        this.updateDownloadStatus(task.id, {
          status: 'failed',
          error: errorMessage
        })
        resolve({ success: false, error: errorMessage })
      }
    })
  }

  // 处理断点续传响应
  private handleResumeResponse(
    task: DownloadTask,
    response: http.IncomingMessage,
    resolve: (value: { success: boolean; filePath?: string; error?: string }) => void
  ) {
    // 对于断点续传，Content-Length 应该是剩余的字节数
    const contentRange = response.headers['content-range']
    let totalBytes = task.totalBytes

    if (contentRange) {
      // 解析 Content-Range 头，如 "bytes 1000-1999/2000"
      const match = contentRange.match(/bytes (\d+)-(\d+)\/(\d+)/)
      if (match) {
        const startByte = parseInt(match[1], 10)
        totalBytes = parseInt(match[3], 10)

        // 验证断点是否正确
        if (startByte !== task.downloadedBytes) {
          console.warn(
            `Resume position mismatch: expected ${task.downloadedBytes}, got ${startByte}. Falling back to full download.`
          )
          // 清理错误的临时文件并回退到全量下载，避免文件损坏
          try {
            if (task.tempFilePath && fs.existsSync(task.tempFilePath)) {
              fs.unlinkSync(task.tempFilePath)
            }
          } catch (e) {
            console.warn('Failed to remove temp file during fallback:', e)
          }
          task.downloadedBytes = 0
          task.progress = 0
          this.handleDownloadResponse(task, response, resolve)
          return
        }
      }
    }

    task.totalBytes = totalBytes

    let downloadedBytes = task.downloadedBytes
    let lastProgressTime = Date.now()
    let lastDownloadedBytes = task.downloadedBytes

    // 以追加模式打开临时文件（我们已经在恢复前对文件进行了安全截断）
    const writeStream = fs.createWriteStream(task.tempFilePath!, { flags: 'a' })
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
        // 验证哈希值（如果提供），展示校验过程
        if (task.hash) {
          const ok = await this.verifyFileWithProgress(task.id, task.tempFilePath!, task.hash)
          if (!ok) {
            if ((task.retryAttempt ?? 0) < 1) {
              task.retryAttempt = (task.retryAttempt ?? 0) + 1
              // 一次性干净重试：删除临时文件并重新全量下载
              console.warn(
                'Hash verify failed after resume, retrying once with clean full download...'
              )
              try {
                if (task.tempFilePath && fs.existsSync(task.tempFilePath)) {
                  fs.unlinkSync(task.tempFilePath)
                }
              } catch (e) {
                console.warn('Failed to remove temp file after hash fail:', e)
              }
              task.downloadedBytes = 0
              task.progress = 0
              return void this.startDownload(task).then(resolve)
            }
            throw new Error('文件哈希验证失败')
          }
        }

        // 续传完成后重命名为最终文件
        if (task.tempFilePath && task.filePath) {
          if (fs.existsSync(task.filePath)) {
            fs.unlinkSync(task.filePath)
          }
          fs.renameSync(task.tempFilePath, task.filePath)
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
        if (task.tempFilePath && fs.existsSync(task.tempFilePath)) {
          fs.unlinkSync(task.tempFilePath)
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
      // 如果正在暂停，不应该把错误当作真正的错误
      if (task.isPausing) {
        console.log('Resume response error during pause, ignoring:', error.message)
        return
      }

      writeStream.destroy()
      if (task.tempFilePath && fs.existsSync(task.tempFilePath)) {
        fs.unlinkSync(task.tempFilePath)
      }

      this.updateDownloadStatus(task.id, {
        status: 'failed',
        error: error.message
      })
      resolve({ success: false, error: error.message })
    })
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

    // 删除未完成的临时文件
    if (task.tempFilePath && fs.existsSync(task.tempFilePath) && task.status !== 'completed') {
      try {
        fs.unlinkSync(task.tempFilePath)
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

    // 状态变化时打印日志
    if (updates.status && updates.status !== task.status) {
      console.log(`Download ${id} status changed: ${task.status} -> ${updates.status}`)
    }

    // 直接发送IPC事件到所有渲染进程
    // console.log(`发送状态更新到前端: ID=${id}, status=${task.status}`)
    eventBus.sendToRenderer('download-progress', SendTarget.ALL_WINDOWS, {
      id,
      progress: task.progress,
      downloadedBytes: task.downloadedBytes,
      totalBytes: task.totalBytes,
      speed: task.speed,
      remainingTime: task.remainingTime,
      status: task.status,
      error: task.error,
      filePath: task.filePath,
      filename: task.filename
    })

    // 如果全部任务都已完成（没有pending/downloading/paused/verifying），进行一次临时文件清理
    if (this.areAllDownloadsCompleted()) {
      const dirs = Array.from(
        new Set(Array.from(this.downloads.values()).map((t) => t.downloadDir))
      )
      this.cleanupOrphanTempFiles(dirs)
    }
  }

  // 使用SHA-256校验文件并显示进度到前端
  private async verifyFileWithProgress(id: string, filePath: string, expectedSha256: string) {
    // 切换到校验状态
    this.updateDownloadStatus(id, { status: 'verifying', speed: 0 })
    try {
      const sha256 = await HashUtil.sha256(filePath, (readBytes, totalBytes, percent) => {
        // 复用 progress 字段显示校验进度
        this.updateDownloadStatus(id, {
          status: 'verifying',
          progress: percent,
          downloadedBytes: readBytes,
          totalBytes
        })
      })
      console.log(
        `本地文件sha256: ${sha256.toLowerCase()} 远程文件sha256: ${expectedSha256.toLowerCase()}`
      )
      return sha256.toLowerCase() === expectedSha256.toLowerCase()
    } catch (e) {
      // 校验失败同样视为不匹配，由调用方决定后续行为
      return false
    }
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
