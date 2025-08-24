# DeepChat Backend Server

DeepChat 后端服务器是基于 Node.js + Express + MongoDB 构建的 RESTful API 服务，为 DeepChat 前端应用提供数据接口和业务逻辑支持。

## 📋 技术栈

- **运行环境**: Node.js (>= 20.12.2)
- **Web框架**: Express.js
- **数据库**: MongoDB + Mongoose
- **认证机制**: JWT (JSON Web Tokens)
- **密码加密**: Bcrypt
- **API文档**: Swagger UI
- **开发工具**: TypeScript, Nodemon, tsx

## 🚀 快速开始

### 方式一：Docker 一键部署（推荐）

使用Docker可以快速部署整个服务，无需手动安装依赖：

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，修改数据库密码和JWT密钥

# 2. 一键启动（Windows）
deploy.bat start

# 2. 一键启动（macOS/Linux）
./deploy.sh start
```

详细说明请参考：[Docker部署指南](../DOCKER_DEPLOYMENT.md)

### 方式二：传统部署

#### 环境要求

- Node.js >= 20.12.2
- MongoDB 数据库 (本地或远程)
- pnpm 包管理器

### 安装依赖

```bash
pnpm install
```

### 环境变量配置

创建 `.env` 文件并配置以下环境变量：

```env
MONGODB_URI=mongodb://username:password@host:port/database
PORT=3002
JWT_SECRET=your_jwt_secret_key
FILE_SIZE_LIMIT=50mb

# 文件上传配置
UPLOAD_DIR=uploads
TEMP_DIR=temp
```

### 开发模式启动

```bash
# 启动主服务
pnpm run dev

# 启动管理后台服务
pnpm run dev:admin
```

### 生产环境构建

```bash
pnpm run build
```

### 生产环境启动

```bash
pnpm run start
```

## 🧪 测试

运行所有测试：

```bash
pnpm run test
```

运行 API 文档测试：

```bash
pnpm run test:docs
```

## 📚 API 文档

服务器启动后，可以通过以下地址访问 Swagger API 文档：

```
http://localhost:3002/api-docs
```

## 🔧 核心功能

### 用户认证系统

- 用户注册
- 用户登录
- JWT Token 认证
- 用户信息获取

### 文件管理系统

- 文件上传
- 文件去重（基于MD5）
- 文件信息存储
- 文件访问控制

### 管理后台系统

- 文件列表查看
- 文件搜索
- 文件信息编辑
- 文件删除
- 分页支持
- 用户列表查看
- 用户搜索
- 用户信息编辑
- 用户删除
- 文件上传功能

管理后台访问地址：
```
http://localhost:3002/admin
```

### API 端点

#### 用户相关路由 `/api/users`

- `POST /register` - 用户注册
- `POST /login` - 用户登录
- `GET /profile` - 获取用户信息 (需要认证)

#### 文件相关路由 `/api/files`

- `POST /upload` - 文件上传 (需要认证)
- `GET /:id` - 获取文件信息 (需要认证)

#### 管理后台路由 `/api/admin`

- `GET /files` - 获取所有文件列表 (需要认证和管理员权限)
- `GET /files/:id` - 获取文件详情 (需要认证和管理员权限)
- `PUT /files/:id` - 更新文件信息 (需要认证和管理员权限)
- `DELETE /files/:id` - 删除文件 (需要认证和管理员权限)

#### 系统状态路由

- `GET /` - 根路径，返回服务器基本信息
- `GET /health` - 健康检查端点
- `GET /status` - 状态检查端点 (用于 Atlassian Statuspage)

## 📁 项目结构

```
server/
├── config/           # 配置文件
├── controllers/      # 控制器
├── middleware/       # 中间件
├── models/           # 数据模型
├── routes/           # 路由定义
├── scripts/          # 构建和启动脚本
├── tests/            # 测试文件
├── utils/            # 工具函数
├── types/            # TypeScript 类型定义
├── views/            # 管理后台前端页面
├── .env              # 环境变量配置文件
├── index.ts          # 应用入口文件
├── package.json      # 项目依赖和脚本
└── tsconfig.server.json  # TypeScript 配置
```

## 🔐 安全特性

- 密码使用 Bcrypt 加密存储
- JWT Token 认证机制
- 输入数据验证和清理
- CORS 跨域资源共享支持
- 环境变量管理敏感配置
- 文件访问权限控制

## 🛠️ 开发指南

### 添加新的 API 端点

1. 在 `routes/` 目录下创建或更新路由文件
2. 在 `controllers/` 目录下创建控制器函数
3. 如需要，在 `middleware/` 目录下添加中间件
4. 更新 Swagger 文档注释

### 添加新的数据模型

1. 在 `models/` 目录下创建新的模型文件
2. 定义 Mongoose Schema
3. 导出模型以供控制器使用

### 添加新的中间件

1. 在 `middleware/` 目录下创建中间件函数
2. 实现所需逻辑
3. 在路由中应用中间件

## 📈 性能优化

- 使用连接池管理 MongoDB 连接
- 异步/等待处理非阻塞操作
- 适当的错误处理防止服务器崩溃
- API 响应压缩

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进项目。

## 📄 许可证

[Apache License 2.0](../LICENSE)