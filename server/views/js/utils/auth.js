// 认证工具类
class AuthManager {
  constructor() {
    this.token = localStorage.getItem('token')
    this.user = this.getStoredUser()
  }

  // 获取存储的用户信息
  getStoredUser() {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  }

  // 设置用户信息和token
  setAuth(token, user) {
    this.token = token
    this.user = user

    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))

    // 更新API客户端的token
    if (window.apiClient) {
      window.apiClient.setToken(token)
    }
  }

  // 清除认证信息
  clearAuth() {
    this.token = null
    this.user = null

    localStorage.removeItem('token')
    localStorage.removeItem('user')

    // 清除API客户端的token
    if (window.apiClient) {
      window.apiClient.setToken(null)
    }
  }

  // 检查是否已认证
  isAuthenticated() {
    return !!this.token
  }

  // 获取当前用户
  getCurrentUser() {
    return this.user
  }

  // 获取token
  getToken() {
    return this.token
  }

  // 验证token有效性
  async validateToken() {
    if (!this.token) {
      return false
    }

    try {
      // 尝试调用一个需要认证的API来验证token
      await window.apiClient.users.getList({ page: 1, limit: 1 })
      return true
    } catch (error) {
      console.error('Token验证失败:', error)
      this.clearAuth()
      return false
    }
  }

  // 登录
  async login(credentials) {
    try {
      const response = await window.apiClient.auth.login(credentials)

      if (response.success) {
        this.setAuth(response.data.token, response.data.user)
        return { success: true, user: response.data.user }
      } else {
        return { success: false, message: response.message }
      }
    } catch (error) {
      console.error('登录失败:', error)
      return { success: false, message: error.message || '登录失败' }
    }
  }

  // 登出
  logout() {
    this.clearAuth()
    window.location.href = '/admin/login'
  }

  // 检查并重定向到登录页
  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = '/admin/login'
      return false
    }
    return true
  }

  // 初始化认证状态
  async init() {
    if (!this.isAuthenticated()) {
      this.requireAuth()
      return false
    }

    // 验证token有效性
    const isValid = await this.validateToken()
    if (!isValid) {
      this.requireAuth()
      return false
    }

    return true
  }
}

// 创建全局认证管理器实例
window.authManager = new AuthManager()

// 工具函数
window.authUtils = {
  // 格式化用户显示名称
  formatUserName(user) {
    return user ? `${user.username} (${user.email})` : '未知用户'
  },

  // 检查用户权限（目前所有认证用户都是管理员）
  hasPermission(permission) {
    return window.authManager.isAuthenticated()
  },

  // 安全地执行需要认证的操作
  async withAuth(callback) {
    if (!window.authManager.isAuthenticated()) {
      window.authManager.requireAuth()
      return
    }

    try {
      return await callback()
    } catch (error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        window.authManager.logout()
      }
      throw error
    }
  }
}

// 导出认证管理器
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthManager
}
