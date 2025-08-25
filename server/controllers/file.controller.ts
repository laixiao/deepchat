import { Request, Response } from 'express'
import File from '../models/file.model.js'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { getUploadDir, ensureDirectoryExists, getFileUrl } from '../utils/paths.js'
import { AuthRequest } from '../middleware/auth.middleware.js'

/**
 * @swagger
 * tags:
 *   name: Files
 *   description: 文件管理
 */

/**
 * @swagger
 * /files/upload:
 *   post:
 *     summary: 上传文件
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               md5:
 *                 type: string
 *                 description: 文件MD5值（可选）
 *     responses:
 *       200:
 *         description: 文件上传成功
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId
    const md5 = req.body.md5 || ''

    // 检查是否提供了文件
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      })
      return
    }

    // 如果提供了MD5，则先检查数据库中是否已存在相同的文件
    if (md5) {
      const existingFile = await File.findOne({ md5 })
      if (existingFile) {
        // 如果存在相同的文件，直接返回已有的URL
        res.status(200).json({
          success: true,
          message: '文件已存在，直接返回URL',
          data: {
            url: existingFile.url,
            fileId: existingFile._id
          }
        })
        return
      }
    }

    // 生成文件名
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const ext = path.extname(req.file.originalname)
    const filename = `${timestamp}-${randomString}${ext}`

    // 确保 uploads 目录存在
    const uploadDir = getUploadDir()
    ensureDirectoryExists(uploadDir)

    // 移动文件到 uploads 目录
    const filePath = path.join(uploadDir, filename)
    fs.renameSync(req.file.path, filePath)

    // 计算文件的实际MD5（如果未提供）
    const fileMD5 = md5 || (await calculateFileMD5(filePath))

    // 再次检查数据库中是否已存在相同的文件（防止并发上传）
    if (!md5) {
      const existingFile = await File.findOne({ md5: fileMD5 })
      if (existingFile) {
        // 删除刚刚上传的文件
        fs.unlinkSync(filePath)
        // 返回已有的URL
        res.status(200).json({
          success: true,
          message: '文件已存在，直接返回URL',
          data: {
            url: existingFile.url,
            fileId: existingFile._id
          }
        })
        return
      }
    }

    // 保存文件信息到数据库
    const file = new File({
      filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: filePath,
      url: getFileUrl(filename),
      md5: fileMD5,
      userId
    })

    await file.save()

    res.status(200).json({
      success: true,
      message: '文件上传成功',
      data: {
        url: getFileUrl(filename),
        fileId: file._id
      }
    })
  } catch (error) {
    console.error('文件上传错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

/**
 * @swagger
 * /files/{id}:
 *   get:
 *     summary: 获取文件信息
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 文件ID
 *     responses:
 *       200:
 *         description: 获取文件信息成功
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 文件不存在
 *       500:
 *         description: 服务器内部错误
 */
export const getFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId
    const fileId = req.params.id

    const file = await File.findOne({ _id: fileId, userId })

    if (!file) {
      res.status(404).json({
        success: false,
        message: '文件不存在'
      })
      return
    }

    res.status(200).json({
      success: true,
      data: {
        file
      }
    })
  } catch (error) {
    console.error('获取文件信息错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

/**
 * 计算文件的MD5值
 */
const calculateFileMD5 = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5')
    const stream = fs.createReadStream(filePath)

    stream.on('data', (data) => {
      hash.update(data)
    })

    stream.on('end', () => {
      const md5 = hash.digest('hex')
      resolve(md5)
    })

    stream.on('error', (err) => {
      reject(err)
    })
  })
}
