// 设置管理工具类
class SettingsManager {
  constructor() {
    this.storageKey = 'app-settings'
    this.defaultSettings = {
      openaiBaseUrl: 'https://api.openai.com/v1',
      openaiApiKey: '',
      openaiModel: 'gpt-3.5-turbo',
      theme: 'auto',
      language: 'zh-CN',
      autoSave: true,
      pageSize: 10,
      enableNotifications: true
    }
    this.currentSettings = { ...this.defaultSettings }
    this.loadSettings()
  }

  // 加载设置
  loadSettings() {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        this.currentSettings = { ...this.defaultSettings, ...parsed }
      }
    } catch (error) {
      console.error('加载设置失败:', error)
      this.currentSettings = { ...this.defaultSettings }
    }
    return this.currentSettings
  }

  // 保存设置
  saveSettings(settings) {
    try {
      this.currentSettings = { ...this.currentSettings, ...settings }
      localStorage.setItem(this.storageKey, JSON.stringify(this.currentSettings))

      // 触发设置变化事件
      this.dispatchSettingsChange()

      return true
    } catch (error) {
      console.error('保存设置失败:', error)
      return false
    }
  }

  // 获取设置
  getSettings() {
    return { ...this.currentSettings }
  }

  // 获取单个设置项
  getSetting(key) {
    return this.currentSettings[key]
  }

  // 设置单个设置项
  setSetting(key, value) {
    this.currentSettings[key] = value
    return this.saveSettings({ [key]: value })
  }

  // 重置设置
  resetSettings() {
    this.currentSettings = { ...this.defaultSettings }
    localStorage.removeItem(this.storageKey)
    this.dispatchSettingsChange()
  }

  // 导出设置
  exportSettings() {
    return JSON.stringify(this.currentSettings, null, 2)
  }

  // 导入设置
  importSettings(settingsJson) {
    try {
      const imported = JSON.parse(settingsJson)
      // 验证设置格式
      if (this.validateSettings(imported)) {
        this.currentSettings = { ...this.defaultSettings, ...imported }
        this.saveSettings(this.currentSettings)
        return true
      }
      return false
    } catch (error) {
      console.error('导入设置失败:', error)
      return false
    }
  }

  // 验证设置格式
  validateSettings(settings) {
    if (typeof settings !== 'object' || settings === null) {
      return false
    }

    // 验证必要字段
    const requiredFields = ['openaiBaseUrl', 'theme', 'language']
    for (const field of requiredFields) {
      if (!(field in settings)) {
        return false
      }
    }

    // 验证URL格式
    if (settings.openaiBaseUrl && !this.isValidUrl(settings.openaiBaseUrl)) {
      return false
    }

    // 验证主题值
    const validThemes = ['light', 'dark', 'auto']
    if (settings.theme && !validThemes.includes(settings.theme)) {
      return false
    }

    return true
  }

  // 验证URL格式
  isValidUrl(string) {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  }

  // 获取OpenAI配置
  getOpenAIConfig() {
    return {
      baseURL: this.currentSettings.openaiBaseUrl,
      apiKey: this.currentSettings.openaiApiKey,
      model: this.currentSettings.openaiModel
    }
  }

  // 设置OpenAI配置
  setOpenAIConfig(config) {
    const updates = {}
    if (config.baseURL) updates.openaiBaseUrl = config.baseURL
    if (config.apiKey) updates.openaiApiKey = config.apiKey
    if (config.model) updates.openaiModel = config.model

    return this.saveSettings(updates)
  }

  // 测试OpenAI连接
  async testOpenAIConnection() {
    const config = this.getOpenAIConfig()

    if (!config.apiKey) {
      throw new Error('请先配置API Key')
    }

    try {
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
    } catch (error) {
      return {
        success: false,
        message: error.message
      }
    }
  }

  // 获取可用的OpenAI模型
  async getAvailableModels() {
    const config = this.getOpenAIConfig()

    if (!config.apiKey) {
      return []
    }

    try {
      const response = await fetch(`${config.baseURL}/models`, {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        return data.data || []
      }
    } catch (error) {
      console.error('获取模型列表失败:', error)
    }

    return []
  }

  // 触发设置变化事件
  dispatchSettingsChange() {
    const event = new CustomEvent('settingschange', {
      detail: { settings: this.currentSettings }
    })
    window.dispatchEvent(event)
  }

  // 监听设置变化
  onSettingsChange(callback) {
    window.addEventListener('settingschange', (event) => {
      callback(event.detail.settings)
    })
  }

  // 获取设置摘要（用于显示）
  getSettingsSummary() {
    const config = this.getOpenAIConfig()
    return {
      hasApiKey: !!config.apiKey,
      baseUrl: config.baseURL,
      model: config.model,
      theme: this.currentSettings.theme,
      language: this.currentSettings.language
    }
  }

  // 清除敏感信息（用于日志等）
  getSafeSettings() {
    const safe = { ...this.currentSettings }
    if (safe.openaiApiKey) {
      safe.openaiApiKey = safe.openaiApiKey.substring(0, 8) + '...'
    }
    return safe
  }
}

// 创建全局设置管理器实例
window.settingsManager = new SettingsManager()

// 导出设置管理器
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SettingsManager
}
