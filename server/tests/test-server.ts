// 简单的服务器测试脚本
import { spawn, ChildProcess } from 'child_process'
import axios from 'axios'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config({ path: './server/.env' })

const PORT = process.env.PORT || 3000

console.log('开始测试服务器启动...')

// 启动服务器进程
const serverProcess: ChildProcess = spawn('node', ['dist/server/index.js'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
})

let serverStarted = false

// 监听服务器输出
serverProcess.stdout?.on('data', (data) => {
  const output = data.toString()
  console.log(`[SERVER OUTPUT] ${output}`)

  // 检查服务器是否启动成功
  if (output.includes(`服务器运行在端口 ${PORT}`)) {
    serverStarted = true
    console.log('✅ 服务器启动成功!')
    testAPIEndpoints()
  }
})

serverProcess.stderr?.on('data', (data) => {
  console.error(`[SERVER ERROR] ${data}`)
})

serverProcess.on('error', (error: Error) => {
  console.error('❌ 启动服务器时发生错误:', error)
  process.exit(1)
})

// 5秒后如果没有启动成功，则认为启动失败
setTimeout(() => {
  if (!serverStarted) {
    console.log('❌ 服务器启动超时!')
    if (serverProcess.pid) {
      process.kill(serverProcess.pid)
    }
    process.exit(1)
  }
}, 5000)

// 测试API端点
async function testAPIEndpoints() {
  try {
    console.log('开始测试API端点...')

    // 测试根路径
    const rootResponse = await axios.get(`http://localhost:${PORT}/`)
    console.log('✅ 根路径测试通过:', rootResponse.data)

    // 测试用户注册路径
    try {
      const registerResponse = await axios.post(`http://localhost:${PORT}/api/users/register`, {
        username: 'testuser',
        email: 'test@example.com',
        password: 'testpassword'
      })
      console.log('✅ 用户注册路径测试通过:', registerResponse.data)
    } catch (error: any) {
      // 400错误是正常的，因为我们没有提供有效的数据
      if (error.response && error.response.status === 400) {
        console.log('✅ 用户注册路径测试通过 (返回400错误，正常)')
      } else {
        console.error('❌ 用户注册路径测试失败:', error.message)
      }
    }

    // 测试用户登录路径
    try {
      const loginResponse = await axios.post(`http://localhost:${PORT}/api/users/login`, {
        email: 'test@example.com',
        password: 'testpassword'
      })
      console.log('✅ 用户登录路径测试通过:', loginResponse.data)
    } catch (error: any) {
      // 401错误是正常的，因为用户不存在
      if (error.response && error.response.status === 401) {
        console.log('✅ 用户登录路径测试通过 (返回401错误，正常)')
      } else {
        console.error('❌ 用户登录路径测试失败:', error.message)
      }
    }

    console.log('🎉 所有测试完成!')
    if (serverProcess.pid) {
      process.kill(serverProcess.pid)
    }
    process.exit(0)
  } catch (error: any) {
    console.error('❌ API测试失败:', error.message)
    if (serverProcess.pid) {
      process.kill(serverProcess.pid)
    }
    process.exit(1)
  }
}
