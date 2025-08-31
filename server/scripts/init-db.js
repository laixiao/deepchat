// MongoDB初始化脚本
// 这个脚本会在MongoDB容器首次启动时执行
// 位置：scripts/init-db.js

print('开始初始化DeepChat数据库...')

// 切换到应用数据库
db = db.getSiblingDB('deepchat')

// 创建应用用户（可选）
// db.createUser({
//   user: 'deepchat_user',
//   pwd: 'deepchat_password',
//   roles: [
//     {
//       role: 'readWrite',
//       db: 'deepchat'
//     }
//   ]
// });

// 创建集合和索引
db.createCollection('users')
db.createCollection('files')
db.createCollection('projects')

// 为用户集合创建索引
db.users.createIndex({ username: 1 }, { unique: true })
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ createdAt: -1 })

// 为文件集合创建索引
db.files.createIndex({ filename: 1 })
db.files.createIndex({ md5: 1 }, { unique: true })
db.files.createIndex({ uploadedBy: 1 })
db.files.createIndex({ createdAt: -1 })

// 为项目集合创建索引
db.projects.createIndex({ userId: 1, name: 1 }, { unique: true }) // 同一用户下项目名称唯一
db.projects.createIndex({ serverAddress: 1, port: 1 }) // 服务器地址和端口组合索引
db.projects.createIndex({ status: 1 }) // 状态索引
db.projects.createIndex({ createdAt: -1 }) // 创建时间索引
db.projects.createIndex({ userId: 1 }) // 用户ID索引

print('✅ DeepChat数据库初始化完成!')
print('📊 已创建集合: users, files, projects')
print('🔍 已创建索引: username, email, filename, md5, project相关索引等')
print('🚀 数据库已准备就绪')
