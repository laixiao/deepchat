import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  userId?: string
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      success: false,
      message: '访问令牌缺失'
    })
    return
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET || 'fallback_secret',
    (err: jwt.VerifyErrors | null, decoded: jwt.JwtPayload | string | undefined) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          res.status(401).json({
            success: false,
            message: '访问令牌已过期'
          })
        } else {
          res.status(403).json({
            success: false,
            message: '访问令牌无效'
          })
        }
        return
      }

      req.userId = (decoded as jwt.JwtPayload)?.userId
      next()
    }
  )
}

// 管理员权限检查中间件
export const authorizeAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // 在实际应用中，这里应该检查用户是否具有管理员权限
  // 目前我们假设所有认证用户都可以访问管理后台
  // 在生产环境中，你应该有一个用户角色系统来检查管理员权限
  next()
}
