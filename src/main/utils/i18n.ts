import {
  getLLMProviderLabels,
  getErrorMessageLabels,
  getContextMenuLabels,
  getAppTitle
} from '@shared/i18n'

/**
 * 主进程国际化工具类
 * 为无法使用 vue-i18n 的主进程提供国际化支持
 */
export class MainI18n {
  private static instance: MainI18n
  private locale: string = 'en-US'

  private constructor() {}

  static getInstance(): MainI18n {
    if (!MainI18n.instance) {
      MainI18n.instance = new MainI18n()
    }
    return MainI18n.instance
  }

  /**
   * 设置当前语言
   * @param locale 语言代码
   */
  setLocale(locale: string): void {
    this.locale = locale
  }

  /**
   * 获取当前语言
   * @returns 当前语言代码
   */
  getLocale(): string {
    return this.locale
  }

  /**
   * 获取 LLM Provider 相关翻译
   * @returns 翻译映射表
   */
  getLLMProviderLabels(): Record<string, string> {
    return getLLMProviderLabels(this.locale)
  }

  /**
   * 获取错误消息相关翻译
   * @returns 翻译映射表
   */
  getErrorMessageLabels(): Record<string, string> {
    return getErrorMessageLabels(this.locale)
  }

  /**
   * 获取上下文菜单相关翻译
   * @returns 翻译映射表
   */
  getContextMenuLabels(): Record<string, string> {
    return getContextMenuLabels(this.locale)
  }

  /**
   * 获取应用标题
   * @returns 应用标题
   */
  getAppTitle(): string {
    return getAppTitle(this.locale)
  }

  /**
   * 获取指定键的翻译文本
   * @param key 翻译键
   * @param category 翻译类别，默认为 LLM Provider
   * @returns 翻译文本
   */
  t(key: string, category: 'llm' | 'error' | 'context' = 'llm'): string {
    switch (category) {
      case 'error':
        return this.getErrorMessageLabels()[key] || key
      case 'context':
        return this.getContextMenuLabels()[key] || key
      default:
        return this.getLLMProviderLabels()[key] || key
    }
  }
}
