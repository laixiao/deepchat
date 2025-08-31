// 主应用
const { createApp, ref, reactive, onMounted } = Vue
const { ElMessage, ElMessageBox } = ElementPlus

// 创建Vue应用
const app = createApp({
  setup() {
    // 响应式数据
    const activeTab = ref('users')
    const globalLoading = ref(false)
    const isDarkTheme = ref(false)
    const settingsFormRef = ref(null)

    // 组件引用
    const userManagement = ref(null)
    const fileManagement = ref(null)
    const projectManagement = ref(null)

    // 设置对话框数据
    const settingsDialog = reactive({
      visible: false,
      saving: false,
      testing: false,
      loadingModels: false,
      connectionStatus: null,
      form: {
        openaiBaseUrl: '',
        openaiApiKey: '',
        openaiModel: 'gpt-3.5-turbo',
        theme: 'light',
        language: 'zh-CN'
      },
      rules: {
        openaiBaseUrl: [{ type: 'url', message: '请输入有效的URL地址', trigger: 'blur' }]
      }
    })

    // 可用模型列表
    const availableModels = ref([])

    // 处理标签页切换
    const handleTabChange = (tabName) => {
      activeTab.value = tabName

      // 刷新对应组件的数据
      switch (tabName) {
        case 'users':
          if (userManagement.value) {
            userManagement.value.refresh()
          }
          break
        case 'files':
          if (fileManagement.value) {
            fileManagement.value.refresh()
          }
          break
        case 'projects':
          if (projectManagement.value) {
            projectManagement.value.refresh()
          }
          break
      }
    }

    // 处理用户操作
    const handleUserCommand = (command) => {
      switch (command) {
        case 'logout':
          handleLogout()
          break
      }
    }

    // 退出登录
    const handleLogout = async () => {
      try {
        await ElMessageBox.confirm('确定要退出登录吗？', '确认退出', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })

        window.authManager.logout()
      } catch (error) {
        // 用户取消操作
      }
    }

    // 打开API文档
    const openApiDocs = () => {
      window.open('/api-docs', '_blank')
    }

    // 打开设置对话框
    const openSettings = () => {
      loadSettings()
      settingsDialog.visible = true
    }

    // 主题切换
    const toggleTheme = () => {
      const newTheme = window.themeManager.toggleTheme()
      isDarkTheme.value = newTheme === 'dark'
    }

    // 监听主题变化
    const handleThemeChange = (event) => {
      isDarkTheme.value = event.detail.theme === 'dark'
      settingsDialog.form.theme = event.detail.theme
    }

    // 加载设置
    const loadSettings = () => {
      const settings = window.settingsManager.getSettings()
      Object.assign(settingsDialog.form, settings)
    }

    // 测试OpenAI连接
    const testOpenAIConnection = async () => {
      settingsDialog.testing = true
      settingsDialog.connectionStatus = null

      try {
        // 临时保存当前表单数据用于测试
        const tempConfig = {
          baseURL: settingsDialog.form.openaiBaseUrl,
          apiKey: settingsDialog.form.openaiApiKey,
          model: settingsDialog.form.openaiModel
        }

        // 使用临时配置测试连接
        const result = await testOpenAIConnectionWithConfig(tempConfig)
        settingsDialog.connectionStatus = result

        if (result.success) {
          ElMessage.success('OpenAI API 连接测试成功')
          // 加载可用模型
          if (result.models && result.models.length > 0) {
            availableModels.value = result.models
          }
        } else {
          ElMessage.error(`连接测试失败: ${result.message}`)
        }
      } catch (error) {
        const errorResult = {
          success: false,
          message: error.message || '连接测试失败'
        }
        settingsDialog.connectionStatus = errorResult
        ElMessage.error(`连接测试失败: ${error.message}`)
      } finally {
        settingsDialog.testing = false
      }
    }

    // 使用指定配置测试OpenAI连接
    const testOpenAIConnectionWithConfig = async (config) => {
      if (!config.apiKey) {
        throw new Error('请先输入API Key')
      }

      const response = await fetch(`${config.baseURL}/models`, {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return {
        success: true,
        models: data.data || [],
        message: '连接成功'
      }
    }

    // 加载可用模型
    const loadAvailableModels = async () => {
      if (settingsDialog.loadingModels || !settingsDialog.form.openaiApiKey) {
        return
      }

      settingsDialog.loadingModels = true

      try {
        const config = {
          baseURL: settingsDialog.form.openaiBaseUrl,
          apiKey: settingsDialog.form.openaiApiKey
        }

        const result = await testOpenAIConnectionWithConfig(config)
        if (result.success && result.models) {
          // 过滤并排序模型列表
          const filteredModels = result.models
            .filter((model) => model.id && model.id.includes('gpt'))
            .sort((a, b) => a.id.localeCompare(b.id))

          availableModels.value = filteredModels
          console.log('加载到的模型:', filteredModels)
        }
      } catch (error) {
        console.error('加载模型列表失败:', error)
        ElMessage.warning('加载模型列表失败，请检查API配置')
      } finally {
        settingsDialog.loadingModels = false
      }
    }

    // 保存设置
    const saveSettings = async () => {
      try {
        if (settingsFormRef.value) {
          await settingsFormRef.value.validate()
        }

        settingsDialog.saving = true

        // 使用设置管理器保存
        const success = window.settingsManager.saveSettings(settingsDialog.form)

        if (success) {
          // 应用主题设置
          window.themeManager.setTheme(settingsDialog.form.theme)

          ElMessage.success('设置保存成功')
          settingsDialog.visible = false
        } else {
          ElMessage.error('保存设置失败')
        }
      } catch (error) {
        if (error !== false) {
          // 不是表单验证错误
          console.error('保存设置失败:', error)
          ElMessage.error('保存设置失败')
        }
      } finally {
        settingsDialog.saving = false
      }
    }

    // 重置设置表单
    const resetSettingsForm = () => {
      if (settingsFormRef.value) {
        settingsFormRef.value.resetFields()
      }
    }

    // 初始化应用
    const initApp = async () => {
      globalLoading.value = true

      try {
        // 检查认证状态
        const isAuthenticated = await window.authManager.init()

        if (!isAuthenticated) {
          return
        }

        // 认证成功，显示欢迎消息
        const user = window.authManager.getCurrentUser()
        if (user) {
          ElMessage.success(`欢迎回来，${user.username}！`)
        }
      } catch (error) {
        console.error('应用初始化失败:', error)
        ElMessage.error('应用初始化失败: ' + error.message)
      } finally {
        globalLoading.value = false
      }
    }

    // 组件挂载时初始化
    onMounted(() => {
      // 初始化主题状态
      isDarkTheme.value = window.themeManager.getCurrentTheme() === 'dark'

      // 监听主题变化
      window.addEventListener('themechange', handleThemeChange)

      loadSettings()
      initApp()
    })

    return {
      activeTab,
      globalLoading,
      isDarkTheme,
      settingsDialog,
      settingsFormRef,
      availableModels,
      userManagement,
      fileManagement,
      projectManagement,
      handleTabChange,
      handleUserCommand,
      handleLogout,
      openApiDocs,
      openSettings,
      toggleTheme,
      handleThemeChange,
      testOpenAIConnection,
      loadAvailableModels,
      saveSettings,
      resetSettingsForm
    }
  }
})

// 注册组件
app.component('UserManagement', window.UserManagement)
app.component('FileManagement', window.FileManagement)
app.component('ProjectManagement', window.ProjectManagement)

// 使用Element Plus
app.use(ElementPlus)

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 全局错误处理
app.config.errorHandler = (error, instance, info) => {
  console.error('Vue应用错误:', error, info)
  ElMessage.error('应用发生错误，请刷新页面重试')
}

// 挂载应用
app.mount('#app')

// 全局工具函数
window.utils = {
  // 格式化文件大小
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  // 格式化日期
  formatDate(dateString) {
    return new Date(dateString).toLocaleString('zh-CN')
  },

  // 复制到剪贴板
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text)
      ElMessage.success('已复制到剪贴板')
    } catch (error) {
      console.error('复制失败:', error)
      ElMessage.error('复制失败')
    }
  },

  // 下载文件
  downloadFile(url, filename) {
    const link = document.createElement('a')
    link.href = url
    link.download = filename || ''
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  },

  // 验证邮箱格式
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  },

  // 验证URL格式
  validateUrl(url) {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  },

  // 防抖函数
  debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  },

  // 节流函数
  throttle(func, limit) {
    let inThrottle
    return function () {
      const args = arguments
      const context = this
      if (!inThrottle) {
        func.apply(context, args)
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  }
}

// 导出应用实例（用于调试）
window.app = app
