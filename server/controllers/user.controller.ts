import { Request, Response } from 'express'
import User, { IUser } from '../models/user.model.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: 用户管理
 */

/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: 用户注册
 *     tags: [Users]
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
 *         description: 用户注册成功
 *       400:
 *         description: 用户名或邮箱已存在
 *       500:
 *         description: 服务器内部错误
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body

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

    // 创建新用户
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
      message: '用户注册成功',
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
    console.error('注册错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: 用户登录
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 description: 邮箱地址
 *               password:
 *                 type: string
 *                 description: 密码
 *     responses:
 *       200:
 *         description: 登录成功
 *       401:
 *         description: 邮箱或密码错误
 *       500:
 *         description: 服务器内部错误
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body

    // 查找用户
    const user = await User.findOne({ email })
    if (!user) {
      res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      })
      return
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
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
    console.error('登录错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: 获取用户信息
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取用户信息成功
 *       401:
 *         description: 未授权访问
 *       404:
 *         description: 用户不存在
 *       500:
 *         description: 服务器内部错误
 */
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId

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
    console.error('获取用户信息错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}
