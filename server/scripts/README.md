# DeepChat 数据库脚本

这个目录包含了DeepChat项目的数据库相关脚本。

## 📁 脚本说明

### init-db.js
- **用途**: MongoDB容器初始化脚本
- **执行时机**: MongoDB容器首次启动时自动执行
- **功能**: 
  - 创建数据库集合（users, files）
  - 创建索引以提高查询性能
  - 输出初始化日志

### backup-db.js
- **用途**: 数据库备份脚本
- **执行方法**: 
  ```bash
  docker exec deepchat-mongodb mongosh deepchat /scripts/backup-db.js
  ```
- **功能**: 
  - 统计数据库信息
  - 提供备份指导

### check-db-status.js
- **用途**: 数据库状态检查脚本
- **执行方法**: 
  ```bash
  docker exec deepchat-mongodb mongosh deepchat /scripts/check-db-status.js
  ```
- **功能**: 
  - 检查数据库连接状态
  - 显示集合统计信息
  - 检查索引状态

## 🚀 使用方法

### 1. 自动执行（推荐）
init-db.js会在MongoDB容器首次启动时自动执行，无需手动干预。

### 2. 手动执行脚本
```bash
# 检查数据库状态
docker exec deepchat-mongodb mongosh deepchat /scripts/check-db-status.js

# 运行备份脚本
docker exec deepchat-mongodb mongosh deepchat /scripts/backup-db.js
```

### 3. 数据库备份（生产环境）
```bash
# 完整备份
docker exec deepchat-mongodb mongodump --db deepchat --out /backup

# 恢复备份
docker exec deepchat-mongodb mongorestore /backup
```

## 📝 注意事项

1. **init-db.js是可选的** - MongoDB和Mongoose会自动创建集合，但预先创建索引有助于性能
2. **脚本路径**: 所有脚本都挂载到容器的 `/scripts` 目录
3. **权限**: 脚本在MongoDB容器内以mongodb用户身份执行
4. **日志**: 初始化脚本的输出会显示在MongoDB容器日志中

## 🔧 自定义脚本

你可以在这个目录下添加更多的MongoDB脚本：

1. 将脚本文件放在 `server/scripts/` 目录下
2. 脚本会自动挂载到MongoDB容器的 `/scripts` 目录
3. 使用 `docker exec` 命令执行脚本

### 脚本模板
```javascript
// 你的脚本描述
print('开始执行脚本...')

// 切换到应用数据库
db = db.getSiblingDB('deepchat')

// 你的脚本逻辑
// ...

print('脚本执行完成!')
```
