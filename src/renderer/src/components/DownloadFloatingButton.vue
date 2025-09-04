<template>
  <div 
    v-if="hasDownloads" 
    class="fixed bottom-6 right-6 z-[200] bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
    @click="openDownloadManager"
  >
    <div class="relative">
      <!-- 按钮内容 -->
      <div class="flex items-center px-4 py-3">
        <Icon 
          icon="lucide:download" 
          class="w-5 h-5 mr-2" 
          :class="{ 'animate-bounce': hasActiveDownloads }"
        />
        <span class="font-medium">
          {{ t('routes.downloads') }}
        </span>
      </div>
      
      <!-- 进度环 -->
      <div 
        v-if="hasActiveDownloads" 
        class="absolute -top-1 -right-1 w-6 h-6"
      >
        <svg class="w-6 h-6" viewBox="0 0 24 24">
          <circle
            class="text-primary-foreground/20"
            stroke-width="2"
            stroke="currentColor"
            fill="transparent"
            r="9"
            cx="12"
            cy="12"
          />
          <circle
            class="text-primary-foreground"
            stroke-width="2"
            :stroke-dasharray="`${circumference} ${circumference}`"
            :stroke-dashoffset="strokeDashoffset"
            stroke-linecap="round"
            fill="transparent"
            r="9"
            cx="12"
            cy="12"
            transform="rotate(-90 12 12)"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useDownloadStore } from '@/stores/download'
import { useI18n } from 'vue-i18n'

const downloadStore = useDownloadStore()
const { t } = useI18n()

// 计算属性
const hasDownloads = computed(() => {
  return downloadStore.downloads.length > 0
})

const hasActiveDownloads = computed(() => {
  return downloadStore.downloads.some(d => d.status === 'downloading' || d.status === 'pending' || d.status === 'paused')
})



const totalProgress = computed(() => {
  if (downloadStore.downloads.length === 0) return 0
  
  const activeDownloads = downloadStore.downloads.filter(d => d.status === 'downloading' || d.status === 'pending' || d.status === 'paused')
  if (activeDownloads.length === 0) return 100
  
  const totalProgress = activeDownloads.reduce((sum, download) => sum + download.progress, 0)
  return totalProgress / activeDownloads.length
})

// 进度环计算
const circumference = 2 * Math.PI * 9
const strokeDashoffset = computed(() => {
  return circumference - (totalProgress.value / 100) * circumference
})

// 方法
const openDownloadManager = () => {
  // 这里需要获取全局的 tabStore 实例来创建或切换到下载管理标签页
  // 由于这是在 renderer 进程中，我们需要通过 IPC 调用主进程来处理标签页
  window.electron?.ipcRenderer.invoke('open-downloads-tab')
}
</script>
