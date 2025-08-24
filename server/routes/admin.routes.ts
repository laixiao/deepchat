import express, { Router } from 'express'
import {
  getAllFiles,
  getFileInfo,
  updateFileInfo,
  deleteFile,
  getAllUsers,
  getUserInfo,
  updateUserInfo,
  deleteUser
} from '../controllers/admin.controller'
import { authenticateToken, authorizeAdmin } from '../middleware/auth.middleware'

const router: Router = express.Router()

// 管理后台文件管理路由（需要认证和管理员权限）
router.get('/files', authenticateToken, authorizeAdmin, getAllFiles)
router.get('/files/:id', authenticateToken, authorizeAdmin, getFileInfo)
router.put('/files/:id', authenticateToken, authorizeAdmin, updateFileInfo)
router.delete('/files/:id', authenticateToken, authorizeAdmin, deleteFile)

// 管理后台用户管理路由（需要认证和管理员权限）
router.get('/users', authenticateToken, authorizeAdmin, getAllUsers)
router.get('/users/:id', authenticateToken, authorizeAdmin, getUserInfo)
router.put('/users/:id', authenticateToken, authorizeAdmin, updateUserInfo)
router.delete('/users/:id', authenticateToken, authorizeAdmin, deleteUser)

export default router
