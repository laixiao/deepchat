# DeepChat Docker 快速部署

## 🚀 快速开始

DeepChat的Docker部署文件现在位于 `server` 目录下。

### 部署步骤

1. **进入server目录**
   ```bash
   cd server
   ```

2. **配置环境变量**
   ```bash
   # 复制环境变量模板
   cp .env.example .env
   
   # 编辑配置文件，修改以下关键配置：
   # - MONGO_ROOT_PASSWORD（数据库密码）
   # - JWT_SECRET（JWT密钥，至少32个字符）
   ```

3. **一键部署**
   
   **Windows用户：**
   ```cmd
   deploy.bat start
   ```
   
   **macOS/Linux用户：**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh start
   ```

4. **验证部署**
   ```bash
   # 运行测试脚本
   ./test-deployment.sh
   
   # 或手动访问
   # http://localhost:3000 - API服务
   # http://localhost:3000/api-docs - API文档
   # http://localhost:3000/admin - 管理后台
   ```

## 📁 文件结构

```
deepchat/
├── server/                    # 后端服务目录
│   ├── docker-compose.yml    # Docker编排配置
│   ├── Dockerfile            # Docker镜像配置
│   ├── .env.example          # 环境变量模板
│   ├── deploy.sh             # Linux/macOS部署脚本
│   ├── deploy.bat            # Windows部署脚本
│   ├── test-deployment.sh    # 部署测试脚本
│   ├── DOCKER_DEPLOYMENT.md  # 详细部署文档
│   ├── scripts/              # 数据库脚本目录
│   └── ...                   # 其他服务器文件
└── ...                       # 其他项目文件
```

## 📖 详细文档

更多详细信息请查看：[server/DOCKER_DEPLOYMENT.md](server/DOCKER_DEPLOYMENT.md)

## 🛠️ 管理命令

在 `server` 目录下执行：

```bash
# 启动服务
./deploy.sh start

# 停止服务
./deploy.sh stop

# 查看状态
./deploy.sh status

# 查看日志
./deploy.sh logs
```
