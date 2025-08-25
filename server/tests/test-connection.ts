import connectDB from '../config/database.js'
import User from '../models/user.model.js'

const testConnection = async () => {
  try {
    // 连接数据库
    await connectDB()

    // 测试查询
    const users = await User.find({})
    console.log('数据库连接成功，用户数量:', users.length)

    // 断开连接
    process.exit(0)
  } catch (error) {
    console.error('测试失败:', error)
    process.exit(1)
  }
}

testConnection()
