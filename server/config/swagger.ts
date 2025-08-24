import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DeepChat API',
      version: '1.0.0',
      description: 'DeepChat 后端 API 文档'
    },
    servers: [
      {
        url: 'http://localhost:3002/api',
        description: '开发服务器'
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
