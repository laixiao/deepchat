import { Tray, Menu, app, nativeImage, NativeImage } from 'electron'
import * as path from 'path'
import { getContextMenuLabels, getAppTitle } from '@shared/i18n'
import { presenter } from '.'
import { eventBus } from '@/eventbus'
import { CONFIG_EVENTS, TRAY_EVENTS } from '@/events'

export class TrayPresenter {
  private tray: Tray | null = null
  private iconPath: string

  constructor() {
    this.iconPath = path.join(app.getAppPath(), 'resources')
  }

  private createTray() {
    // 根据平台选择不同的图标
    let image: NativeImage | undefined = undefined

    if (process.platform === 'darwin') {
      // macOS 平台
      image = nativeImage.createFromPath(path.join(this.iconPath, 'macTrayTemplate.png'))
      image = image.resize({ width: 24, height: 24 })
      image.setTemplateImage(true)
    } else if (process.platform === 'win32') {
      // Windows 平台
      image = nativeImage.createFromPath(path.join(this.iconPath, 'win_tray.ico'))
    } else {
      // Linux 和其他平台
      image = nativeImage.createFromPath(path.join(this.iconPath, 'linux_tray.png'))
      // Linux 下通常使用较小的图标尺寸
      image = image.resize({ width: 22, height: 22 })
    }

    this.tray = new Tray(image)

    // 获取当前系统语言并设置提示
    const locale = presenter.configPresenter.getLanguage?.() || 'zh-CN'
    this.tray.setToolTip(getAppTitle(locale))

    const labels = getContextMenuLabels(locale)
    const contextMenu = Menu.buildFromTemplate([
      {
        label: labels.open || '打开/隐藏',
        click: () => {
          eventBus.sendToMain(TRAY_EVENTS.SHOW_HIDDEN_WINDOW)
        }
      },
      {
        label: labels.checkForUpdates || '检查更新',
        click: () => {
          eventBus.sendToMain(TRAY_EVENTS.CHECK_FOR_UPDATES)
        }
      },
      {
        label: labels.quit || '退出',
        click: async () => {
          // knowledgePresenter task manager must be destroyed before app quit
          // ask user to confirm if there are still tasks running
          const confirmed = await presenter.knowledgePresenter.beforeDestroy()
          if (confirmed) {
            app.quit()
          }
        }
      }
    ])

    this.tray.setContextMenu(contextMenu)

    // 监听语言变化，动态更新托盘提示与菜单
    eventBus.on(CONFIG_EVENTS.SETTING_CHANGED, (key: string) => {
      if (!this.tray) return
      if (key === 'language') {
        const newLocale = presenter.configPresenter.getLanguage?.() || 'zh-CN'
        this.tray.setToolTip(getAppTitle(newLocale))
        const newLabels = getContextMenuLabels(newLocale)
        const newMenu = Menu.buildFromTemplate([
          {
            label: newLabels.open || '打开/隐藏',
            click: () => {
              eventBus.sendToMain(TRAY_EVENTS.SHOW_HIDDEN_WINDOW)
            }
          },
          {
            label: newLabels.checkForUpdates || '检查更新',
            click: () => {
              eventBus.sendToMain(TRAY_EVENTS.CHECK_FOR_UPDATES)
            }
          },
          {
            label: newLabels.quit || '退出',
            click: async () => {
              const confirmed = await presenter.knowledgePresenter.beforeDestroy()
              if (confirmed) {
                app.quit()
              }
            }
          }
        ])
        this.tray.setContextMenu(newMenu)
      }
    })

    // 点击托盘图标时显示窗口
    this.tray.on('click', () => {
      eventBus.sendToMain(TRAY_EVENTS.SHOW_HIDDEN_WINDOW, true)
    })
  }

  public init(): void {
    this.createTray()
  }

  destroy() {
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
    }
  }
}
