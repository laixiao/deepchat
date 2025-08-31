import express, { Application, Request, Response, NextFunction } from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import connectDB from './config/database.js'
import routes from './routes/index.js'
import swaggerUi from 'swagger-ui-express'
import specs from './config/swagger.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { getUploadDir, initializeDirectories } from './utils/paths.js'

// 加载环境变量
dotenv.config()
const PORT = parseInt(process.env.PORT || '3000')
console.log('PORT from env:', process.env.PORT)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app: Application = express()

// 中间件
app.use(cors())
app.use(express.json({ limit: process.env.FILE_SIZE_LIMIT || '50mb' }))
app.use(express.urlencoded({ extended: true, limit: process.env.FILE_SIZE_LIMIT || '50mb' }))

// 初始化目录
initializeDirectories()

// 静态文件服务
const uploadDirConfig = process.env.UPLOAD_DIR || 'uploads'
const uploadDirName = path.isAbsolute(uploadDirConfig)
  ? path.basename(uploadDirConfig)
  : uploadDirConfig
app.use(`/${uploadDirName}`, express.static(getUploadDir()))
app.use('/admin', express.static(path.join(__dirname, 'views')))

// 管理后台登录页面路由
app.get('/admin/login', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-login.html'))
})

// 管理后台页面路由（客户端认证）
app.get('/admin', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'))
})

// 数据库连接
connectDB()

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs))

// 路由
app.use('/api', routes)

// 基础路由
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'QinCore Backend Server',
    version: '1.0.0'
  })
})

// 健康检查端点
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// API 状态检查端点（用于 Atlassian Statuspage）
app.get('/status', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    service: 'QinCore API'
  })
})

// 404 处理
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: '路由未找到'
  })
})

// 全局错误处理中间件
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack)
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  })
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`)
  console.log(`访问地址: http://localhost:${PORT}/admin`)
  console.log(`Swagger UI: http://localhost:${PORT}/api-docs`)
})

export default app
