# 使用官方Node.js镜像作为基础镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 设置npm淘宝镜像源（可选，提高国内下载速度）
RUN npm config set registry https://registry.npmmirror.com

# 复制package.json和package-lock.json（如果存在）
COPY package*.json ./

# 安装所有依赖（包括devDependencies，用于构建）
RUN npm install

# 复制源代码
COPY . .

# 创建必要的目录
RUN mkdir -p uploads temp

# 编译TypeScript代码
RUN npm run build

# 清理devDependencies以减小镜像大小
RUN npm prune --production

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production

# 启动应用
CMD ["npm", "start"]
