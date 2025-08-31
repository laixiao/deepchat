// 主题管理工具类
class ThemeManager {
  constructor() {
    this.currentTheme = 'light'
    this.systemPreference = 'light'
    this.init()
  }

  // 初始化主题管理器
  init() {
    // 监听系统主题变化
    this.watchSystemTheme()

    // 加载保存的主题偏好
    this.loadThemePreference()
  }

  // 监听系统主题变化
  watchSystemTheme() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    // 设置初始系统偏好
    this.systemPreference = mediaQuery.matches ? 'dark' : 'light'

    // 监听变化
    mediaQuery.addEventListener('change', (e) => {
      this.systemPreference = e.matches ? 'dark' : 'light'

      // 如果当前是自动模式，应用系统主题
      const savedPreference = localStorage.getItem('theme-preference')
      if (savedPreference === 'auto' || !savedPreference) {
        this.applyTheme(this.systemPreference)
      }
    })
  }

  // 应用主题
  applyTheme(theme) {
    const actualTheme = theme === 'auto' ? this.systemPreference : theme

    if (actualTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
      document.body.classList.add('dark-theme')
      document.body.classList.remove('light-theme')

      // 更新Element Plus主题
      this.updateElementPlusTheme('dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
      document.body.classList.add('light-theme')
      document.body.classList.remove('dark-theme')

      // 更新Element Plus主题
      this.updateElementPlusTheme('light')
    }

    this.currentTheme = actualTheme

    // 触发主题变化事件
    this.dispatchThemeChange(actualTheme)
  }

  // 更新Element Plus主题
  updateElementPlusTheme(theme) {
    // 等待下一个tick确保DOM已更新
    setTimeout(() => {
      // 强制重新渲染Element Plus组件
      const event = new CustomEvent('el-theme-change', {
        detail: { theme }
      })
      document.dispatchEvent(event)

      // 更新所有表格的样式
      this.updateTableStyles()

      // 更新所有对话框的样式
      this.updateDialogStyles()

      // 更新所有下拉框的样式
      this.updateSelectStyles()

      // 更新所有上传组件的样式
      this.updateUploadStyles()
    }, 0)
  }

  // 更新表格样式
  updateTableStyles() {
    const tables = document.querySelectorAll('.el-table')
    tables.forEach((table) => {
      // 强制重新计算样式
      table.style.display = 'none'
      table.offsetHeight // 触发重排
      table.style.display = ''
    })
  }

  // 更新对话框样式
  updateDialogStyles() {
    const dialogs = document.querySelectorAll('.el-dialog')
    dialogs.forEach((dialog) => {
      // 强制重新计算样式
      dialog.style.display = 'none'
      dialog.offsetHeight // 触发重排
      dialog.style.display = ''
    })
  }

  // 更新下拉框样式
  updateSelectStyles() {
    const selects = document.querySelectorAll('.el-select-dropdown')
    selects.forEach((select) => {
      // 强制重新计算样式
      select.style.display = 'none'
      select.offsetHeight // 触发重排
      select.style.display = ''
    })
  }

  // 更新上传组件样式
  updateUploadStyles() {
    const uploads = document.querySelectorAll('.el-upload-dragger')
    uploads.forEach((upload) => {
      // 强制重新计算样式
      upload.style.display = 'none'
      upload.offsetHeight // 触发重排
      upload.style.display = ''
    })
  }

  // 设置主题
  setTheme(theme) {
    this.applyTheme(theme)
    this.saveThemePreference(theme)
  }

  // 切换主题
  toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark'
    this.setTheme(newTheme)
    return newTheme
  }

  // 获取当前主题
  getCurrentTheme() {
    return this.currentTheme
  }

  // 获取系统偏好主题
  getSystemPreference() {
    return this.systemPreference
  }

  // 保存主题偏好
  saveThemePreference(theme) {
    localStorage.setItem('theme-preference', theme)
  }

  // 加载主题偏好
  loadThemePreference() {
    const saved = localStorage.getItem('theme-preference')
    if (saved) {
      this.applyTheme(saved)
    } else {
      // 默认跟随系统
      this.applyTheme('auto')
    }
  }

  // 触发主题变化事件
  dispatchThemeChange(theme) {
    const event = new CustomEvent('themechange', {
      detail: { theme, systemPreference: this.systemPreference }
    })
    window.dispatchEvent(event)
  }

  // 获取主题相关的CSS变量
  getThemeVariables() {
    const root = document.documentElement
    const computedStyle = getComputedStyle(root)

    return {
      bgColor: computedStyle.getPropertyValue('--bg-color').trim(),
      cardBg: computedStyle.getPropertyValue('--card-bg').trim(),
      textPrimary: computedStyle.getPropertyValue('--text-primary').trim(),
      textRegular: computedStyle.getPropertyValue('--text-regular').trim(),
      textSecondary: computedStyle.getPropertyValue('--text-secondary').trim(),
      borderColor: computedStyle.getPropertyValue('--border-color').trim(),
      headerBg: computedStyle.getPropertyValue('--header-bg').trim()
    }
  }

  // 设置自定义CSS变量
  setThemeVariable(name, value) {
    document.documentElement.style.setProperty(`--${name}`, value)
  }

  // 重置所有自定义变量
  resetThemeVariables() {
    const customProps = [
      '--bg-color',
      '--card-bg',
      '--text-primary',
      '--text-regular',
      '--text-secondary',
      '--border-color',
      '--header-bg'
    ]

    customProps.forEach((prop) => {
      document.documentElement.style.removeProperty(prop)
    })
  }

  // 预设主题配置
  getPresetThemes() {
    return {
      light: {
        name: '浅色主题',
        variables: {
          'bg-color': '#f5f7fa',
          'card-bg': '#ffffff',
          'text-primary': '#303133',
          'text-regular': '#606266',
          'text-secondary': '#909399',
          'border-color': '#dcdfe6',
          'header-bg': 'linear-gradient(90deg, #409eff 0%, #67c23a 100%)'
        }
      },
      dark: {
        name: '深色主题',
        variables: {
          'bg-color': '#1a1a1a',
          'card-bg': '#2d2d2d',
          'text-primary': '#e4e7ed',
          'text-regular': '#cfcfcf',
          'text-secondary': '#a8abb2',
          'border-color': '#4c4d4f',
          'header-bg': 'linear-gradient(90deg, #337ecc 0%, #529b2e 100%)'
        }
      },
      blue: {
        name: '蓝色主题',
        variables: {
          'bg-color': '#f0f8ff',
          'card-bg': '#ffffff',
          'text-primary': '#1e3a8a',
          'text-regular': '#3b82f6',
          'text-secondary': '#6b7280',
          'border-color': '#bfdbfe',
          'header-bg': 'linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%)'
        }
      },
      green: {
        name: '绿色主题',
        variables: {
          'bg-color': '#f0fdf4',
          'card-bg': '#ffffff',
          'text-primary': '#14532d',
          'text-regular': '#16a34a',
          'text-secondary': '#6b7280',
          'border-color': '#bbf7d0',
          'header-bg': 'linear-gradient(90deg, #16a34a 0%, #15803d 100%)'
        }
      }
    }
  }

  // 应用预设主题
  applyPresetTheme(themeName) {
    const themes = this.getPresetThemes()
    const theme = themes[themeName]

    if (theme) {
      Object.entries(theme.variables).forEach(([key, value]) => {
        this.setThemeVariable(key, value)
      })

      this.currentTheme = themeName
      this.saveThemePreference(themeName)
      this.dispatchThemeChange(themeName)
    }
  }
}

// 创建全局主题管理器实例
window.themeManager = new ThemeManager()

// 导出主题管理器
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeManager
}
