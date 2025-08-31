// 主应用
const { createApp, ref, reactive, computed, onMounted } = Vue
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

    // 模型选择器对话框数据
    const modelSelectorDialog = reactive({
      visible: false,
      loading: false,
      searchQuery: '',
      activeTab: 'all',
      selectedModel: null,
      owners: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0
      }
    })

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

    // 打开模型选择器
    const openModelSelector = async () => {
      if (!settingsDialog.form.openaiApiKey) {
        ElMessage.warning('请先配置OpenAI API Key')
        return
      }

      modelSelectorDialog.visible = true
      await loadModelsForSelector()
    }

    // 为选择器加载模型
    const loadModelsForSelector = async () => {
      modelSelectorDialog.loading = true

      try {
        const config = {
          baseURL: settingsDialog.form.openaiBaseUrl,
          apiKey: settingsDialog.form.openaiApiKey
        }

        const result = await testOpenAIConnectionWithConfig(config)
        if (result.success && result.models) {
          // 不过滤模型，显示所有模型
          availableModels.value = result.models.sort((a, b) => a.id.localeCompare(b.id))

          // 根据模型前缀分组，添加调试信息
          console.log('原始模型数据样本:', result.models.slice(0, 5)) // 打印前5个模型的数据结构
          console.log('模型总数:', result.models.length)

          // 提取所有模型前缀
          const allPrefixes = result.models
            .map((m) => {
              const modelId = m.id || ''
              // 提取前缀（到第一个 '-' 或 '_' 为止）
              const prefix = modelId.split(/[-_]/)[0]
              console.log(`模型 ${modelId} 的前缀:`, prefix) // 详细日志
              return prefix
            })
            .filter(Boolean) // 过滤掉空值

          const uniquePrefixes = [...new Set(allPrefixes)]
          console.log('所有模型前缀:', allPrefixes.slice(0, 10)) // 显示前10个
          console.log('去重后的前缀:', uniquePrefixes)

          // 计算每个前缀的模型数量并排序
          const prefixCounts = uniquePrefixes.map((prefix) => {
            const count = result.models.filter((model) => {
              const modelId = model.id || ''
              const modelPrefix = modelId.split(/[-_]/)[0]
              return modelPrefix === prefix
            }).length
            return { prefix, count }
          })

          // 按数量降序排序（数量多的在前），数量相同时按字母顺序
          prefixCounts.sort((a, b) => {
            if (b.count !== a.count) {
              return b.count - a.count // 数量降序
            }
            return a.prefix.localeCompare(b.prefix) // 字母升序
          })

          // 提取排序后的前缀列表
          modelSelectorDialog.owners = prefixCounts.map((item) => item.prefix)

          // 输出排序结果
          console.log('前缀按数量排序结果:', prefixCounts)

          // 如果没有找到前缀，添加默认选项
          if (modelSelectorDialog.owners.length === 0) {
            console.log('没有找到模型前缀，使用默认选项')
            modelSelectorDialog.owners = ['gpt', 'text', 'davinci']
          }

          // 更新分页信息
          modelSelectorDialog.pagination.total = result.models.length
        } else {
          ElMessage.error('加载模型失败: ' + (result.message || '未知错误'))
        }
      } catch (error) {
        console.error('加载模型列表失败:', error)
        ElMessage.error('加载模型列表失败: ' + error.message)
      } finally {
        modelSelectorDialog.loading = false
      }
    }

    // 计算过滤后的模型列表
    const filteredModels = computed(() => {
      let models = availableModels.value

      // 按搜索关键词过滤
      if (modelSelectorDialog.searchQuery) {
        const query = modelSelectorDialog.searchQuery.toLowerCase()
        models = models.filter(
          (model) =>
            model.id.toLowerCase().includes(query) ||
            (model.description && model.description.toLowerCase().includes(query))
        )
      }

      // 按选中的tab过滤模型前缀
      if (modelSelectorDialog.activeTab !== 'all') {
        models = models.filter((model) => {
          const modelId = model.id || ''
          const prefix = modelId.split(/[-_]/)[0]
          return prefix === modelSelectorDialog.activeTab
        })
      }

      // 分页
      const start = (modelSelectorDialog.pagination.page - 1) * modelSelectorDialog.pagination.limit
      const end = start + modelSelectorDialog.pagination.limit

      // 更新总数
      modelSelectorDialog.pagination.total = models.length

      return models.slice(start, end)
    })

    // 处理模型搜索
    const handleModelSearch = () => {
      modelSelectorDialog.pagination.page = 1
    }

    // 处理模型选择器tab切换
    const handleModelTabChange = (tabName) => {
      modelSelectorDialog.activeTab = tabName
      modelSelectorDialog.pagination.page = 1
    }

    // 刷新模型列表
    const refreshModelList = () => {
      loadModelsForSelector()
    }

    // 选择模型
    const selectModel = (model) => {
      modelSelectorDialog.selectedModel = model
    }

    // 确认模型选择
    const confirmModelSelection = () => {
      if (modelSelectorDialog.selectedModel) {
        settingsDialog.form.openaiModel = modelSelectorDialog.selectedModel.id
        modelSelectorDialog.visible = false
        ElMessage.success(`已选择模型: ${modelSelectorDialog.selectedModel.id}`)
      }
    }

    // 重置模型选择器
    const resetModelSelector = () => {
      modelSelectorDialog.searchQuery = ''
      modelSelectorDialog.activeTab = 'all'
      modelSelectorDialog.selectedModel = null
      modelSelectorDialog.pagination.page = 1
    }

    // 获取总模型数量
    const getTotalModelCount = () => {
      return availableModels.value.length
    }

    // 获取指定前缀的模型数量
    const getModelCountByOwner = (prefix) => {
      return availableModels.value.filter((model) => {
        const modelId = model.id || ''
        const modelPrefix = modelId.split(/[-_]/)[0]
        return modelPrefix === prefix
      }).length
    }

    // 处理模型分页大小变化
    const handleModelPageSizeChange = (size) => {
      modelSelectorDialog.pagination.limit = size
      modelSelectorDialog.pagination.page = 1
    }

    // 处理模型分页变化
    const handleModelPageChange = (page) => {
      modelSelectorDialog.pagination.page = page
    }

    // 获取模型前缀标签类型
    const getOwnerTagType = (prefix) => {
      if (!prefix) return ''

      const typeMap = {
        gpt: 'success', // GPT系列 - 绿色
        claude: 'primary', // Claude系列 - 蓝色
        text: 'info', // Text系列 - 灰色
        davinci: 'warning', // Davinci系列 - 橙色
        curie: 'warning', // Curie系列 - 橙色
        babbage: 'info', // Babbage系列 - 灰色
        ada: 'info', // Ada系列 - 灰色
        embedding: 'primary', // 嵌入模型 - 蓝色
        whisper: 'success', // Whisper系列 - 绿色
        dall: 'danger', // DALL-E系列 - 红色
        tts: 'warning' // TTS系列 - 橙色
      }

      // Element Plus Tag 支持的类型: primary, success, info, warning, danger
      // 如果没有匹配的类型，返回空字符串（默认样式）
      return typeMap[prefix.toLowerCase()] || ''
    }

    // 格式化模型创建时间
    const formatModelDate = (timestamp) => {
      if (!timestamp) return '-'
      return new Date(timestamp * 1000).toLocaleString('zh-CN')
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

    // 处理Element Plus主题变化
    const handleElementThemeChange = (event) => {
      const theme = event.detail.theme

      // 强制更新所有Vue组件
      if (userManagement.value) {
        userManagement.value.$forceUpdate?.()
      }
      if (fileManagement.value) {
        fileManagement.value.$forceUpdate?.()
      }
      if (projectManagement.value) {
        projectManagement.value.$forceUpdate?.()
      }

      // 触发Element Plus组件重新渲染
      setTimeout(() => {
        const tables = document.querySelectorAll('.el-table')
        tables.forEach((table) => {
          const instance = table.__vue__
          if (instance && instance.doLayout) {
            instance.doLayout()
          }
        })
      }, 100)
    }

    // 组件挂载时初始化
    onMounted(() => {
      // 初始化主题状态
      isDarkTheme.value = window.themeManager.getCurrentTheme() === 'dark'

      // 监听主题变化
      window.addEventListener('themechange', handleThemeChange)

      // 监听Element Plus主题变化
      document.addEventListener('el-theme-change', handleElementThemeChange)

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
      modelSelectorDialog,
      filteredModels,
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
      handleElementThemeChange,
      testOpenAIConnection,
      loadAvailableModels,
      openModelSelector,
      loadModelsForSelector,
      handleModelSearch,
      handleModelTabChange,
      refreshModelList,
      selectModel,
      confirmModelSelection,
      resetModelSelector,
      handleModelPageSizeChange,
      handleModelPageChange,
      getTotalModelCount,
      getModelCountByOwner,
      getOwnerTagType,
      formatModelDate,
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
