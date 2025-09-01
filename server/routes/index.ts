import express, { Router } from 'express'
import userRoutes from './user.routes.js'
import fileRoutes from './file.routes.js'
import adminRoutes from './admin.routes.js'
import adminAuthRoutes from './admin.auth.routes.js'
import publicRoutes from './public.routes.js'

const router: Router = express.Router()

// 用户相关路由
router.use('/users', userRoutes)

// 文件相关路由
router.use('/files', fileRoutes)

// 管理后台认证路由
router.use('/admin', adminAuthRoutes)

// 管理后台路由
router.use('/admin', adminRoutes)

// 公开路由（无需认证）
router.use('/public', publicRoutes)

export default router
