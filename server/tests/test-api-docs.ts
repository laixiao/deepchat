// API 文档和健康检查端点测试
import axios from 'axios'

const PORT = process.env.PORT || 3000
const BASE_URL = `http://localhost:${PORT}`

async function testAPIEndpoints() {
  console.log('开始测试 API 文档和健康检查端点...')

  try {
    // 测试根路径
    const rootResponse = await axios.get(`${BASE_URL}/`)
    console.log('✅ 根路径测试通过:', rootResponse.data)

    // 测试健康检查端点
    const healthResponse = await axios.get(`${BASE_URL}/health`)
    console.log('✅ 健康检查端点测试通过:', healthResponse.data)

    // 测试状态检查端点
    const statusResponse = await axios.get(`${BASE_URL}/status`)
    console.log('✅ 状态检查端点测试通过:', statusResponse.data)

    // 测试 API 文档页面是否可访问
    try {
      const docsResponse = await axios.get(`${BASE_URL}/api-docs`)
      console.log('✅ API 文档页面可访问 (状态码:', docsResponse.status, ')')
    } catch (error: any) {
      // API 文档可能返回重定向
      if (error.response && (error.response.status === 301 || error.response.status === 302)) {
        console.log('✅ API 文档页面可访问 (重定向状态码:', error.response.status, ')')
      } else {
        console.error('❌ API 文档页面访问失败:', error.message)
      }
    }

    console.log('🎉 所有 API 文档和健康检查测试完成!')
  } catch (error: any) {
    console.error('❌ API 测试失败:', error.message)
    process.exit(1)
  }
}

// 运行测试
testAPIEndpoints()
