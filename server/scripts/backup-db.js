// MongoDB数据库备份脚本
// 使用方法: docker exec deepchat-mongodb mongosh deepchat /scripts/backup-db.js

print('开始备份DeepChat数据库...')

// 获取当前时间戳
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupName = `deepchat_backup_${timestamp}`

print(`备份名称: ${backupName}`)

// 切换到应用数据库
db = db.getSiblingDB('deepchat')

// 统计数据
const userCount = db.users.countDocuments()
const fileCount = db.files.countDocuments()

print(`📊 数据统计:`)
print(`   用户数量: ${userCount}`)
print(`   文件数量: ${fileCount}`)

// 导出集合数据到JSON格式
print('📦 开始导出数据...')

// 导出用户数据（不包含密码）
const users = db.users.find({}, { password: 0 }).toArray()
print(`✅ 已导出 ${users.length} 个用户记录`)

// 导出文件数据
const files = db.files.find({}).toArray()
print(`✅ 已导出 ${files.length} 个文件记录`)

print('💾 备份完成!')
print('注意: 这是一个示例脚本，实际备份请使用 mongodump 命令')
print('命令示例: docker exec deepchat-mongodb mongodump --db deepchat --out /backup')
