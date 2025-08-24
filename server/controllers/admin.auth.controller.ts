import { Request, Response } from 'express'
import User from '../models/user.model'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

/**
 * @swagger
 * tags:
 *   name: AdminAuth
 *   description: 管理后台认证相关接口
 */

/**
 * @swagger
 * /admin/login:
 *   post:
 *     summary: 管理后台登录
 *     tags: [AdminAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名
 *               password:
 *                 type: string
 *                 description: 密码
 *     responses:
 *       200:
 *         description: 登录成功
 *       401:
 *         description: 用户名或密码错误
 *       500:
 *         description: 服务器内部错误
 */
export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body

    // 检查参数
    if (!username || !password) {
      res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      })
      return
    }

    // 查找用户
    const user = await User.findOne({ username })
    if (!user) {
      res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      })
      return
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      })
      return
    }

    // 生成JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret', {
      expiresIn: '7d'
    })

    res.status(200).json({
      success: true,
      message: '登录成功',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar
        },
        token
      }
    })
  } catch (error) {
    console.error('管理员登录错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

/**
 * @swagger
 * /admin/register:
 *   post:
 *     summary: 创建管理员账户（仅在首次启动时可用）
 *     tags: [AdminAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名
 *               email:
 *                 type: string
 *                 description: 邮箱地址
 *               password:
 *                 type: string
 *                 description: 密码
 *     responses:
 *       201:
 *         description: 管理员账户创建成功
 *       400:
 *         description: 用户名或邮箱已存在
 *       500:
 *         description: 服务器内部错误
 */
export const createAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body

    // 检查是否已经存在用户（防止重复创建）
    const existingUsers = await User.countDocuments()
    if (existingUsers > 0) {
      res.status(400).json({
        success: false,
        message: '管理员账户已存在'
      })
      return
    }

    // 检查用户是否已存在
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    })

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: '用户名或邮箱已存在'
      })
      return
    }

    // 密码加密
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // 创建管理员用户
    const user = new User({
      username,
      email,
      password: hashedPassword
    })

    await user.save()

    // 生成JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret', {
      expiresIn: '7d'
    })

    res.status(201).json({
      success: true,
      message: '管理员账户创建成功',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar
        },
        token
      }
    })
  } catch (error) {
    console.error('创建管理员账户错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}
