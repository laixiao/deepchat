import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/user.model.js'

export interface AuthRequest extends Request {
  userId?: string
}

export const authenticateAdminToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // 检查是否存在token
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    // 如果没有token，重定向到登录页面
    res.redirect('/admin/login')
    return
  }

  try {
    // 验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as jwt.JwtPayload
    req.userId = decoded.userId

    // 检查用户是否存在
    const user = await User.findById(req.userId)
    if (!user) {
      res.redirect('/admin/login')
      return
    }

    // 继续处理请求
    next()
  } catch (error) {
    // token无效，重定向到登录页面
    res.redirect('/admin/login')
  }
}
