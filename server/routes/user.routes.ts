import express, { Router } from 'express'
import { register, login, getUserProfile } from '../controllers/user.controller.js'
import { authenticateToken } from '../middleware/auth.middleware.js'

const router: Router = express.Router()

// 用户注册路由
router.post('/register', register)

// 用户登录路由
router.post('/login', login)

// 获取用户信息路由（需要认证）
router.get('/profile', authenticateToken, getUserProfile)

export default router
