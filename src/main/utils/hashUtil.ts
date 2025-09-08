import fs from 'fs'
import crypto from 'crypto'

export class HashUtil {
  /**
   * Calculate MD5 hash for a file with optional progress callback
   * @param filePath absolute path to file
   * @param onProgress optional callback receiving (readBytes, totalBytes, percent)
   */
  static async md5(
    filePath: string,
    onProgress?: (readBytes: number, totalBytes: number, percent: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('md5')
      const stream = fs.createReadStream(filePath)

      let readBytes = 0
      let lastEmit = Date.now()
      const totalBytes = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0

      stream.on('data', (chunk: Buffer | string) => {
        hash.update(chunk as any)
        if (onProgress && totalBytes > 0) {
          const inc = typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length
          readBytes += inc
          const now = Date.now()
          // throttle UI updates to ~60ms to avoid flooding
          if (now - lastEmit > 60) {
            lastEmit = now
            const percent = (readBytes / totalBytes) * 100
            onProgress(readBytes, totalBytes, percent)
          }
        }
      })

      stream.on('end', () => {
        // ensure final 100% progress
        if (onProgress && totalBytes > 0) {
          onProgress(totalBytes, totalBytes, 100)
        }
        resolve(hash.digest('hex'))
      })

      stream.on('error', (err) => {
        reject(err)
      })
    })
  }

  /**
   * Calculate SHA-256 hash for a file with optional progress callback
   * @param filePath absolute path to file
   * @param onProgress optional callback receiving (readBytes, totalBytes, percent)
   */
  static async sha256(
    filePath: string,
    onProgress?: (readBytes: number, totalBytes: number, percent: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256')
      const stream = fs.createReadStream(filePath)

      let readBytes = 0
      let lastEmit = Date.now()
      const totalBytes = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0

      stream.on('data', (chunk: Buffer | string) => {
        hash.update(chunk as any)
        if (onProgress && totalBytes > 0) {
          const inc = typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length
          readBytes += inc
          const now = Date.now()
          if (now - lastEmit > 60) {
            lastEmit = now
            const percent = (readBytes / totalBytes) * 100
            onProgress(readBytes, totalBytes, percent)
          }
        }
      })

      stream.on('end', () => {
        if (onProgress && totalBytes > 0) {
          onProgress(totalBytes, totalBytes, 100)
        }
        resolve(hash.digest('hex'))
      })

      stream.on('error', (err) => {
        reject(err)
      })
    })
  }
}
