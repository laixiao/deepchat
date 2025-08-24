// MongoDB数据库状态检查脚本
// 使用方法: docker exec deepchat-mongodb mongosh deepchat /scripts/check-db-status.js

print('🔍 检查DeepChat数据库状态...')
print('=' * 50)

// 切换到应用数据库
db = db.getSiblingDB('deepchat')

// 检查数据库连接
try {
    const serverStatus = db.runCommand({ serverStatus: 1 })
    print(`✅ 数据库连接正常`)
    print(`📍 MongoDB版本: ${serverStatus.version}`)
    print(`⏰ 运行时间: ${Math.floor(serverStatus.uptime / 3600)} 小时`)
} catch (e) {
    print(`❌ 数据库连接失败: ${e.message}`)
}

print('')
print('📊 集合统计:')
print('-' * 30)

// 检查集合状态
const collections = ['users', 'files']

collections.forEach(collName => {
    try {
        const count = db[collName].countDocuments()
        const stats = db[collName].stats()
        const sizeKB = Math.round(stats.size / 1024)
        
        print(`📁 ${collName}:`)
        print(`   文档数量: ${count}`)
        print(`   存储大小: ${sizeKB} KB`)
        print(`   索引数量: ${stats.nindexes}`)
        print('')
    } catch (e) {
        print(`❌ 检查集合 ${collName} 失败: ${e.message}`)
    }
})

print('🔍 索引检查:')
print('-' * 30)

// 检查索引
collections.forEach(collName => {
    try {
        const indexes = db[collName].getIndexes()
        print(`📁 ${collName} 索引:`)
        indexes.forEach(index => {
            const keys = Object.keys(index.key).join(', ')
            const unique = index.unique ? ' (唯一)' : ''
            print(`   - ${index.name}: ${keys}${unique}`)
        })
        print('')
    } catch (e) {
        print(`❌ 检查 ${collName} 索引失败: ${e.message}`)
    }
})

print('✅ 数据库状态检查完成!')
print('=' * 50)
