import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 获取项目根目录路径
 */
export function getProjectRoot(): string {
  return path.join(__dirname, '..', '..')
}

/**
 * 获取上传目录路径
 */
export function getUploadDir(): string {
  const uploadDir = process.env.UPLOAD_DIR || 'uploads'
  return path.resolve(getProjectRoot(), uploadDir)
}

/**
 * 获取临时目录路径
 */
export function getTempDir(): string {
  const tempDir = process.env.TEMP_DIR || 'temp'
  return path.resolve(getProjectRoot(), tempDir)
}

/**
 * 确保目录存在，如果不存在则创建
 */
export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

/**
 * 获取文件的URL路径
 */
export function getFileUrl(filename: string): string {
  const uploadDirConfig = process.env.UPLOAD_DIR || 'uploads'
  const domain = process.env.DOMAIN

  // 如果UPLOAD_DIR是绝对路径，只取最后的目录名作为URL路径
  const uploadDirName = path.isAbsolute(uploadDirConfig)
    ? path.basename(uploadDirConfig)
    : uploadDirConfig

  // 如果没有配置域名，警告并返回相对路径
  if (!domain) {
    console.warn('警告: DOMAIN 环境变量未设置，返回相对路径')
    return `/${uploadDirName}/${filename}`
  }

  return `${domain}/${uploadDirName}/${filename}`
}

/**
 * 安全地移动文件，处理跨设备移动的情况（同步版本）
 */
export function safeFileMove(sourcePath: string, destPath: string): void {
  try {
    fs.renameSync(sourcePath, destPath)
  } catch (error: any) {
    // 如果是跨设备错误，使用复制+删除的方式
    if (error.code === 'EXDEV') {
      fs.copyFileSync(sourcePath, destPath)
      fs.unlinkSync(sourcePath)
    } else {
      throw error
    }
  }
}

/**
 * 安全地移动文件，处理跨设备移动的情况（异步版本）
 */
export async function safeFileMoveAsync(sourcePath: string, destPath: string): Promise<void> {
  try {
    await fs.promises.rename(sourcePath, destPath)
  } catch (error: any) {
    // 如果是跨设备错误，使用复制+删除的方式
    if (error.code === 'EXDEV') {
      await fs.promises.copyFile(sourcePath, destPath)
      await fs.promises.unlink(sourcePath)
    } else {
      throw error
    }
  }
}

/**
 * 初始化所有必要的目录
 */
export function initializeDirectories(): void {
  const uploadDir = getUploadDir()
  const tempDir = getTempDir()

  ensureDirectoryExists(uploadDir)
  ensureDirectoryExists(tempDir)

  console.log(`📁 上传目录: ${uploadDir}`)
  console.log(`📁 临时目录: ${tempDir}`)
}
