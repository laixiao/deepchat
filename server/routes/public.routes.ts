import express, { Router } from 'express'
import { getPublicProjectInfo, getPublicProjects } from '../controllers/project.controller.js'

const router: Router = express.Router()

// 公开项目信息路由（无需认证）
router.get('/projects/:id', getPublicProjectInfo)
router.get('/projects', getPublicProjects)

export default router
