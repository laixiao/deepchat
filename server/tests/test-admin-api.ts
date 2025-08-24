import { describe, it, beforeAll, afterAll } from 'vitest'
import mongoose from 'mongoose'
import request from 'supertest'
import app from '../index'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

describe('管理后台API测试', () => {
  beforeAll(async () => {
    // 连接测试数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/deepchat_test')
  })

  afterAll(async () => {
    // 断开数据库连接
    await mongoose.connection.close()
  })

  it('应该能够获取文件列表', async () => {
    // 使用通用测试令牌进行测试
    const response = await request(app)
      .get('/api/admin/files')
      .set('Authorization', `Bearer ${process.env.GENERIC_ACCESS_TOKEN}`)
      .expect(200) // 使用通用令牌应该返回200

    // 验证响应结构
    expect(response.body).toHaveProperty('success')
    expect(response.body).toHaveProperty('data')
  })

  it('应该能够获取文件详情', async () => {
    // 测试获取特定文件的详情
    const response = await request(app)
      .get('/api/admin/files/nonexistent_file_id')
      .set('Authorization', `Bearer ${process.env.GENERIC_ACCESS_TOKEN}`)
      .expect(404) // 使用通用令牌但文件不存在，应该返回404

    // 验证响应结构
    expect(response.body).toHaveProperty('success')
    expect(response.body).toHaveProperty('message')
  })
})
