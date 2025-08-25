import { Request, Response } from 'express'
import File, { FileType } from '../models/file.model.js'
import User from '../models/user.model.js'
import fs from 'fs'
import path from 'path'

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: 管理后台相关接口
 */

/**
 * @swagger
 * /admin/files:
 *   get:
 *     summary: 获取所有文件列表（管理后台）
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 每页数量
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词（文件名）
 *     responses:
 *       200:
 *         description: 获取文件列表成功
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
export const getAllFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const search = (req.query.search as string) || ''
    const fileType = req.query.fileType as string

    // 构建查询条件
    const query: any = {}
    if (search) {
      query.originalName = { $regex: search, $options: 'i' }
    }
    if (fileType && fileType !== 'all') {
      query.fileType = fileType
    }

    // 获取文件总数
    const total = await File.countDocuments(query)

    // 获取文件列表
    const files = await File.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    res.status(200).json({
      success: true,
      data: {
        files,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('获取文件列表错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

/**
 * @swagger
 * /admin/files/{id}:
 *   get:
 *     summary: 获取文件详情（管理后台）
 *     tags: [Admin]
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
 *         description: 获取文件详情成功
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 文件不存在
 *       500:
 *         description: 服务器内部错误
 */
export const getFileInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const fileId = req.params.id

    const file = await File.findById(fileId)

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
    console.error('获取文件详情错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

/**
 * @swagger
 * /admin/files/{id}:
 *   put:
 *     summary: 更新文件信息（管理后台）
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 文件ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               originalName:
 *                 type: string
 *                 description: 原始文件名
 *     responses:
 *       200:
 *         description: 更新文件信息成功
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 文件不存在
 *       500:
 *         description: 服务器内部错误
 */
export const updateFileInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const fileId = req.params.id
    const { originalName } = req.body

    // 检查文件是否存在
    const file = await File.findById(fileId)
    if (!file) {
      res.status(404).json({
        success: false,
        message: '文件不存在'
      })
      return
    }

    // 更新文件信息
    if (originalName) {
      file.originalName = originalName
      await file.save()
    }

    res.status(200).json({
      success: true,
      message: '文件信息更新成功',
      data: {
        file
      }
    })
  } catch (error) {
    console.error('更新文件信息错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

/**
 * @swagger
 * /admin/files/{id}:
 *   delete:
 *     summary: 删除文件（管理后台）
 *     tags: [Admin]
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
 *         description: 删除文件成功
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 文件不存在
 *       500:
 *         description: 服务器内部错误
 */
export const deleteFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const fileId = req.params.id

    // 检查文件是否存在
    const file = await File.findById(fileId)
    if (!file) {
      res.status(404).json({
        success: false,
        message: '文件不存在'
      })
      return
    }

    // 删除物理文件
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path)
      }
    } catch (fsError) {
      console.error('删除物理文件错误:', fsError)
    }

    // 从数据库删除记录
    await File.findByIdAndDelete(fileId)

    res.status(200).json({
      success: true,
      message: '文件删除成功'
    })
  } catch (error) {
    console.error('删除文件错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: 获取所有用户列表（管理后台）
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 每页数量
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词（用户名或邮箱）
 *     responses:
 *       200:
 *         description: 获取用户列表成功
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const search = (req.query.search as string) || ''

    // 构建查询条件
    const query: any = {}
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }

    // 获取用户总数
    const total = await User.countDocuments(query)

    // 获取用户列表（不包含密码）
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('获取用户列表错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

/**
 * @swagger
 * /admin/users/{id}:
 *   get:
 *     summary: 获取用户详情（管理后台）
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 获取用户详情成功
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 用户不存在
 *       500:
 *         description: 服务器内部错误
 */
export const getUserInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id

    const user = await User.findById(userId).select('-password')

    if (!user) {
      res.status(404).json({
        success: false,
        message: '用户不存在'
      })
      return
    }

    res.status(200).json({
      success: true,
      data: {
        user
      }
    })
  } catch (error) {
    console.error('获取用户详情错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

/**
 * @swagger
 * /admin/users/{id}:
 *   put:
 *     summary: 更新用户信息（管理后台）
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名
 *               email:
 *                 type: string
 *                 description: 邮箱地址
 *               avatar:
 *                 type: string
 *                 description: 头像URL
 *     responses:
 *       200:
 *         description: 更新用户信息成功
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 用户不存在
 *       500:
 *         description: 服务器内部错误
 */
export const updateUserInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id
    const { username, email, avatar } = req.body

    // 检查用户是否存在
    const user = await User.findById(userId)
    if (!user) {
      res.status(404).json({
        success: false,
        message: '用户不存在'
      })
      return
    }

    // 检查用户名和邮箱是否已被其他用户使用
    if (username) {
      const existingUser = await User.findOne({
        username,
        _id: { $ne: userId }
      })
      if (existingUser) {
        res.status(400).json({
          success: false,
          message: '用户名已被其他用户使用'
        })
        return
      }
      user.username = username
    }

    if (email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: userId }
      })
      if (existingUser) {
        res.status(400).json({
          success: false,
          message: '邮箱已被其他用户使用'
        })
        return
      }
      user.email = email
    }

    if (avatar !== undefined) {
      user.avatar = avatar
    }

    await user.save()

    // 返回更新后的用户信息（不包含密码）
    const updatedUser = await User.findById(userId).select('-password')

    res.status(200).json({
      success: true,
      message: '用户信息更新成功',
      data: {
        user: updatedUser
      }
    })
  } catch (error) {
    console.error('更新用户信息错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

/**
 * @swagger
 * /admin/users/{id}:
 *   delete:
 *     summary: 删除用户（管理后台）
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 删除用户成功
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 用户不存在
 *       500:
 *         description: 服务器内部错误
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id

    // 检查用户是否存在
    const user = await User.findById(userId)
    if (!user) {
      res.status(404).json({
        success: false,
        message: '用户不存在'
      })
      return
    }

    // 删除用户关联的文件
    await File.deleteMany({ userId })

    // 从数据库删除用户
    await User.findByIdAndDelete(userId)

    res.status(200).json({
      success: true,
      message: '用户删除成功'
    })
  } catch (error) {
    console.error('删除用户错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

/**
 * @swagger
 * /admin/cleanup-temp-files:
 *   post:
 *     summary: 清理临时文件（管理后台）
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: 清理创建时间超过48小时的临时文件
 *     responses:
 *       200:
 *         description: 清理成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedCount:
 *                       type: number
 *                       description: 删除的文件数量
 *                     deletedFiles:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 删除的文件列表
 *       401:
 *         description: 未授权访问
 *       500:
 *         description: 服务器内部错误
 */
export const cleanupTempFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    // 计算48小时前的时间
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)

    // 查找超过48小时的临时文件
    const tempFiles = await File.find({
      fileType: FileType.TEMPORARY,
      createdAt: { $lt: fortyEightHoursAgo }
    })

    const deletedFiles: string[] = []
    let deletedCount = 0

    // 删除文件和数据库记录
    for (const file of tempFiles) {
      try {
        // 删除物理文件
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path)
          deletedFiles.push(file.originalName)
        }

        // 删除数据库记录
        await File.findByIdAndDelete(file._id)
        deletedCount++
      } catch (fileError) {
        console.error(`删除文件失败: ${file.path}`, fileError)
        // 继续处理其他文件，不中断整个清理过程
      }
    }

    res.status(200).json({
      success: true,
      message: `成功清理了 ${deletedCount} 个临时文件`,
      data: {
        deletedCount,
        deletedFiles
      }
    })
  } catch (error) {
    console.error('清理临时文件错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}
