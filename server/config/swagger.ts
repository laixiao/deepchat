import swaggerJsdoc from 'swagger-jsdoc'

// 从环境变量获取配置
const PORT = process.env.PORT || '3010'
const DOMAIN = process.env.DOMAIN || `http://localhost:${PORT}`

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'QinCore API',
      version: '1.0.0',
      description: 'DeepChat 后端 API 文档'
    },
    servers: [
      {
        url: `${DOMAIN}/api`,
        description: '服务器'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./routes/*.ts', './controllers/*.ts'] // 指定包含 API 注释的文件路径
}

const specs = swaggerJsdoc(options)
export default specs
