// API 工具类
class ApiClient {
  constructor() {
    this.baseURL = '/api'
    this.token = localStorage.getItem('token')
  }

  // 设置认证token
  setToken(token) {
    this.token = token
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
    }
  }

  // 获取请求头
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    return headers
  }

  // 通用请求方法
  async request(url, options = {}) {
    const config = {
      headers: this.getHeaders(),
      ...options
    }

    try {
      const response = await fetch(`${this.baseURL}${url}`, config)

      if (!response.ok) {
        if (response.status === 401) {
          // Token过期，清除并跳转到登录页
          this.setToken(null)
          window.location.href = '/admin/login'
          return
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('API请求失败:', error)
      throw error
    }
  }

  // GET请求
  async get(url, params = {}) {
    const queryString = new URLSearchParams(params).toString()
    const fullUrl = queryString ? `${url}?${queryString}` : url

    return this.request(fullUrl, {
      method: 'GET'
    })
  }

  // POST请求
  async post(url, data = {}) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  // PUT请求
  async put(url, data = {}) {
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  // DELETE请求
  async delete(url) {
    return this.request(url, {
      method: 'DELETE'
    })
  }

  // 文件上传
  async upload(url, formData) {
    const headers = {}
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(`${this.baseURL}${url}`, {
        method: 'POST',
        headers,
        body: formData
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('文件上传失败:', error)
      throw error
    }
  }

  // 用户相关API
  users = {
    // 获取用户列表
    getList: (params) => this.get('/admin/users', params),

    // 获取用户详情
    getDetail: (id) => this.get(`/admin/users/${id}`),

    // 更新用户信息
    update: (id, data) => this.put(`/admin/users/${id}`, data),

    // 删除用户
    delete: (id) => this.delete(`/admin/users/${id}`)
  }

  // 文件相关API
  files = {
    // 获取文件列表
    getList: (params) => this.get('/admin/files', params),

    // 获取文件详情
    getDetail: (id) => this.get(`/admin/files/${id}`),

    // 更新文件信息
    update: (id, data) => this.put(`/admin/files/${id}`, data),

    // 删除文件
    delete: (id) => this.delete(`/admin/files/${id}`),

    // 上传文件
    upload: (formData) => this.upload('/files/upload', formData),

    // 上传临时文件
    uploadTemp: (formData) => this.upload('/files/temp-upload', formData),

    // 清理临时文件
    cleanupTemp: () => this.post('/admin/cleanup-temp-files')
  }

  // 项目相关API
  projects = {
    // 获取项目列表
    getList: (params) => this.get('/admin/projects', params),

    // 获取项目详情
    getDetail: (id) => this.get(`/admin/projects/${id}`),

    // 创建项目
    create: (data) => this.post('/admin/projects', data),

    // 更新项目信息
    update: (id, data) => this.put(`/admin/projects/${id}`, data),

    // 删除项目
    delete: (id) => this.delete(`/admin/projects/${id}`)
  }

  // 认证相关API
  auth = {
    // 管理员登录
    login: (data) => this.post('/admin/login', data),

    // 创建管理员
    createAdmin: (data) => this.post('/admin/register', data)
  }
}

// 创建全局API实例
window.apiClient = new ApiClient()

// 导出API客户端
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiClient
}
