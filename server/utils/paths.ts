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
  const uploadDirName = process.env.UPLOAD_DIR || 'uploads'
  return `/${uploadDirName}/${filename}`
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
