// 文件上传测试脚本
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import FormData from 'form-data'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 3000
const BASE_URL = `http://localhost:${PORT}/api`

async function testFileUpload() {
  console.log('开始测试文件上传功能...')

  try {
    // 首先注册一个测试用户
    console.log('正在注册测试用户...')
    const registerResponse = await axios.post(`${BASE_URL}/users/register`, {
      username: 'filetestuser',
      email: 'filetest@example.com',
      password: 'filetestpassword'
    })

    console.log('✅ 用户注册成功')
    const token = registerResponse.data.data.token

    // 创建一个测试文件
    console.log('正在创建测试文件...')
    const testFilePath = path.join(__dirname, 'test-file.txt')
    const testContent = '这是一个测试文件的内容'
    fs.writeFileSync(testFilePath, testContent)

    // 测试文件上传
    console.log('正在测试文件上传...')

    try {
      // 测试上传端点是否可访问（不带文件）
      const uploadResponse = await axios.post(
        `${BASE_URL}/files/upload`,
        {},
        {
          headers: {
            Authorization: `Bearer ${process.env.GENERIC_ACCESS_TOKEN || token}`
          }
        }
      )

      console.log('✅ 文件上传端点可访问')
    } catch (error: any) {
      // 400错误是正常的，因为我们没有提供文件
      if (error.response && error.response.status === 400) {
        console.log('✅ 文件上传端点测试通过 (返回400错误，正常)')
      } else {
        console.error('❌ 文件上传端点测试失败:', error.message)
      }
    }

    // 测试带文件的上传
    console.log('正在测试带文件的上传...')
    try {
      const formData = new FormData()
      formData.append('file', fs.createReadStream(testFilePath))

      const uploadFileResponse = await axios.post(`${BASE_URL}/files/upload`, formData, {
        headers: {
          Authorization: `Bearer ${process.env.GENERIC_ACCESS_TOKEN || token}`,
          ...formData.getHeaders()
        }
      })

      console.log('✅ 带文件的上传测试通过')
      console.log('  上传结果:', uploadFileResponse.data)
    } catch (error: any) {
      console.error('❌ 带文件的上传测试失败:', error.message)
    }

    // 清理测试文件
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath)
    }

    console.log('🎉 文件上传功能测试完成!')
  } catch (error: any) {
    console.error('❌ 测试失败:', error.message)
    process.exit(1)
  }
}

// 运行测试
testFileUpload()
