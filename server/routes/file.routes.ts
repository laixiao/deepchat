import express, { Router } from 'express'
import { uploadFile, getFile } from '../controllers/file.controller.js'
import { authenticateToken } from '../middleware/auth.middleware.js'
import multer from 'multer'
import { getTempDir, ensureDirectoryExists } from '../utils/paths.js'

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 获取临时存储目录
    const tempDir = getTempDir()

    // 确保临时目录存在
    ensureDirectoryExists(tempDir)

    cb(null, tempDir)
  },
  filename: (req, file, cb) => {
    // 生成临时文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, file.fieldname + '-' + uniqueSuffix)
  }
})

const upload = multer({ storage: storage })

const router: Router = express.Router()

// 文件上传路由（需要认证）
router.post('/upload', authenticateToken, upload.single('file'), uploadFile)

// 获取文件信息路由（需要认证）
router.get('/:id', authenticateToken, getFile)

export default router
