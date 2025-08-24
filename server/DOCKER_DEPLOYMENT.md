# DeepChat Docker + .env 一键部署指南

本指南将帮助您使用Docker和环境变量配置快速部署DeepChat后端服务。

## 📋 前置要求

### 系统要求
- **操作系统**: Windows 10/11, macOS, Linux
- **内存**: 至少 2GB RAM
- **存储**: 至少 5GB 可用空间

### 软件依赖
1. **Docker Desktop** (推荐) 或 Docker Engine
   - Windows/macOS: [下载 Docker Desktop](https://www.docker.com/products/docker-desktop/)
   - Linux: [安装 Docker Engine](https://docs.docker.com/engine/install/)

2. **Docker Compose**
   - Docker Desktop 自带
   - Linux 需要单独安装: `sudo apt-get install docker-compose-plugin`

## 🚀 快速开始

### 1. 进入server目录
```bash
# 如果还没有克隆项目
git clone https://github.com/your-repo/deepchat.git
cd deepchat/server

# 如果已经有项目
cd deepchat/server
```

### 2. 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量文件
# Windows: notepad .env
# macOS/Linux: nano .env 或 vim .env
```

### 3. 修改关键配置
打开 `.env` 文件，**必须修改**以下配置：

```env
# 数据库密码（必须修改）
MONGO_ROOT_PASSWORD=your_secure_password_here

# MongoDB连接URI（必须修改，确保密码与上面一致）
MONGODB_URI=mongodb://admin:your_secure_password_here@mongodb:27017/deepchat?authSource=admin

# JWT密钥（必须修改，至少32个字符）
JWT_SECRET=your_very_secure_jwt_secret_key_here_at_least_32_characters

# 服务器端口（可选）
SERVER_PORT=3000
```

### 4. 一键部署

#### Windows 用户
```cmd
# 启动服务
deploy.bat start

# 或者直接双击 deploy.bat 文件
```

#### macOS/Linux 用户
```bash
# 给脚本执行权限
chmod +x deploy.sh

# 启动服务
./deploy.sh start
```

### 5. 验证部署
部署成功后，您可以访问以下地址：

- **API服务**: http://localhost:3000
- **API文档**: http://localhost:3000/api-docs
- **管理后台**: http://localhost:3000/admin
- **健康检查**: http://localhost:3000/health

## 📖 详细配置说明

### 环境变量配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `SERVER_PORT` | 3000 | 服务器端口 |
| `MONGO_ROOT_USERNAME` | admin | MongoDB管理员用户名 |
| `MONGO_ROOT_PASSWORD` | - | MongoDB管理员密码（必须设置） |
| `MONGO_DATABASE` | deepchat | 数据库名称 |
| `MONGO_PORT` | 27017 | MongoDB端口 |
| `MONGODB_URI` | - | MongoDB完整连接字符串（推荐直接配置） |
| `JWT_SECRET` | - | JWT签名密钥（必须设置） |
| `FILE_SIZE_LIMIT` | 50mb | 文件上传大小限制 |
| `UPLOAD_DIR` | uploads | 文件上传目录 |


### 服务架构

部署包含以下服务：

1. **deepchat-server**: Node.js后端服务
2. **mongodb**: MongoDB数据库

## 🛠️ 管理命令

### Windows (deploy.bat)
```cmd
deploy.bat start     # 启动所有服务
deploy.bat stop      # 停止所有服务
deploy.bat restart   # 重启所有服务
deploy.bat logs      # 查看服务日志
deploy.bat status    # 查看服务状态
deploy.bat help      # 显示帮助信息
```

### macOS/Linux (deploy.sh)
```bash
./deploy.sh start    # 启动所有服务
./deploy.sh stop     # 停止所有服务
./deploy.sh restart  # 重启所有服务
./deploy.sh logs     # 查看服务日志
./deploy.sh status   # 查看服务状态
./deploy.sh help     # 显示帮助信息
```

### 手动Docker命令
```bash
# 确保在server目录下执行
cd server

# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 查看日志
docker-compose logs -f

# 重新构建并启动
docker-compose up -d --build


```

## 🔧 高级配置

### 数据持久化
- MongoDB数据存储在Docker卷 `mongodb_data` 中
- 上传文件存储在 `uploads` 目录中
- 临时文件存储在 `temp` 目录中

### 备份和恢复
```bash
# 备份MongoDB数据
docker exec deepchat-mongodb mongodump --out /backup

# 恢复MongoDB数据
docker exec deepchat-mongodb mongorestore /backup
```

## 🔍 故障排除

### 常见问题

1. **端口冲突**
   - 修改 `.env` 文件中的端口配置
   - 确保端口未被其他服务占用

2. **服务启动失败**
   ```bash
   # 查看详细日志
   docker-compose logs deepchat-server
   docker-compose logs mongodb
   ```

3. **数据库连接失败**
   - 检查MongoDB容器是否正常运行
   - 验证 `.env` 文件中的数据库配置

4. **文件上传失败**
   - 检查 `uploads` 目录权限
   - 确认 `FILE_SIZE_LIMIT` 配置

### 日志查看
```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs deepchat-server
docker-compose logs mongodb

# 实时查看日志
docker-compose logs -f
```

### 重置部署
```bash
# 停止并删除所有容器和卷
docker-compose down -v

# 删除镜像（可选）
docker-compose down --rmi all

# 重新部署
./deploy.sh start  # 或 deploy.bat start
```

## 🔐 安全建议

1. **修改默认密码**: 确保修改所有默认密码
2. **使用强密钥**: JWT_SECRET应该是强随机字符串
3. **启用HTTPS**: 生产环境建议配置SSL证书
4. **防火墙配置**: 只开放必要的端口
5. **定期备份**: 定期备份数据库和上传文件
6. **更新镜像**: 定期更新Docker镜像到最新版本

## 📞 支持

如果遇到问题，请：
1. 查看本文档的故障排除部分
2. 检查项目的GitHub Issues
3. 提交新的Issue并附上详细的错误日志
