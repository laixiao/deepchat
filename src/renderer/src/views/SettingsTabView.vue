<template>
  <div class="w-full h-full flex flex-col bg-white/80 dark:bg-black/80 mx-auto xl:max-w-6xl">
    <div class="w-full h-16 border-b border-border p-2 flex-shrink-0 overflow-x-auto">
      <div class="flex flex-row gap-2 h-full">
        <div
          v-for="setting in settings"
          :key="setting.name"
          :class="[
            'flex flex-row items-center hover:bg-accent gap-2 rounded-lg p-2 cursor-pointer whitespace-nowrap',
            route.name === setting.name ? 'bg-secondary' : ''
          ]"
          @click="handleClick(setting.path)"
        >
          <Icon :icon="setting.icon" class="w-4 h-4 text-muted-foreground" />
          <span class="text-sm font-medium">{{ t(setting.title) }}</span>
        </div>
      </div>
    </div>
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useRouter } from 'vue-router'
import { useRoute, RouterView } from 'vue-router'
import { onMounted, Ref, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTitle } from '@vueuse/core'
import { useSettingsStore } from '@/stores/settings'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const title = useTitle()
const settingsStore = useSettingsStore()
const settings: Ref<
  {
    title: string
    name: string
    icon: string
    path: string
  }[]
> = ref([])

const routes = router.getRoutes()
const hasInitialized = ref(false)

// 获取默认的设置标签页
const getDefaultSettingsTab = (): string | null => {
  if (settings.value.length > 0) {
    return settings.value[0].name
  }
  return null
}

// 初始化设置标签页选择
const initializeSettingsTab = async () => {
  try {
    // 如果当前已经在具体的设置页面，保存当前选择并返回
    if (route.name && route.name !== 'settings') {
      await settingsStore.saveLastSelectedSettingsTab(route.name as string)
      return
    }
    
    // 如果在settings根路径，尝试加载上次选择的标签并重定向
    const lastSelectedTab = await settingsStore.loadLastSelectedSettingsTab()
    
    let targetTab: string | null = null
    
    // 验证上次选择的标签是否仍然有效
    if (lastSelectedTab) {
      const isValidTab = settings.value.some(s => s.name === lastSelectedTab)
      if (isValidTab) {
        targetTab = lastSelectedTab
      }
    }
    
    // 如果没有有效的上次选择，使用默认标签
    if (!targetTab) {
      targetTab = getDefaultSettingsTab()
    }
    
    // 跳转到目标标签页
    if (targetTab) {
      const targetSetting = settings.value.find(s => s.name === targetTab)
      if (targetSetting) {
        await router.replace(targetSetting.path)
      }
    }
  } catch (error) {
    console.error('设置标签页初始化失败:', error)
    // 发生错误时，尝试跳转到第一个可用标签
    const defaultTab = getDefaultSettingsTab()
    if (defaultTab) {
      const defaultSetting = settings.value.find(s => s.name === defaultTab)
      if (defaultSetting) {
        await router.replace(defaultSetting.path)
      }
    }
  }
}

onMounted(async () => {
  routes.forEach((route) => {
    if (route.name === 'settings') {
      route.children?.forEach((child) => {
        settings.value.push({
          title: child.meta?.titleKey as string,
          icon: child.meta?.icon as string,
          path: `/settings/${child.path}`,
          name: child.name as string
        })
      })
    }
  })
  
  // 在设置项准备好后进行初始化
  if (settings.value.length > 0 && !hasInitialized.value) {
    await initializeSettingsTab()
    hasInitialized.value = true
  }
})

// 监听设置项变化，确保在数据准备好后进行初始化
watch(
  () => settings.value.length,
  async () => {
    if (settings.value.length > 0 && !hasInitialized.value) {
      await initializeSettingsTab()
      hasInitialized.value = true
    }
  }
)

// 更新标题的函数
const updateTitle = () => {
  const currentRoute = route.name as string
  const currentSetting = settings.value.find((s) => s.name === currentRoute)
  if (currentSetting) {
    // 使用i18n翻译标题，中文习惯是不需要破折号
    title.value = t('routes.settings') + ' - ' + t(currentSetting.title)
  } else {
    title.value = t('routes.settings')
  }
}

// 监听路由变化
watch(
  () => route.name,
  async () => {
    updateTitle()
    // 保存当前选择的标签页
    if (route.name && route.name !== 'settings') {
      await settingsStore.saveLastSelectedSettingsTab(route.name as string)
    }
  },
  { immediate: true }
)

const handleClick = async (path: string) => {
  // 如果是模型API设置页面，先跳转到基础路径，让ModelProviderSettings组件处理自动选择
  if (path.includes('/settings/provider')) {
    await router.push('/settings/provider')
  } else {
    await router.push(path)
  }
}
</script>

<style></style>
