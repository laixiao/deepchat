import express, { Router } from 'express'
import { adminLogin, createAdmin } from '../controllers/admin.auth.controller'

const router: Router = express.Router()

// 管理后台登录路由
router.post('/login', adminLogin)

// 创建管理员账户路由（仅在首次启动时可用）
router.post('/register', createAdmin)

export default router
