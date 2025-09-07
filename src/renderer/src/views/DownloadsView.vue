<template>
  <div class="flex flex-col h-full bg-background">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between p-6 border-b">
      <div class="flex items-center gap-3">
        <Icon icon="lucide:download" class="w-6 h-6 text-primary" />
        <div>
          <h1 class="text-2xl font-bold">{{ t('download.title') }}</h1>
          <p class="text-sm text-muted-foreground">{{ t('download.description') }}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                @click="startAll"
                variant="outline"
                size="sm"
                class="rounded-md"
              >
                <Icon icon="lucide:play" class="w-4 h-4" />
                <span class="ml-1">{{ t('download.actions.startAll') }}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{{ t('download.actions.startAll') }}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                @click="pauseAll"
                variant="outline"
                size="sm"
                class="rounded-md"
              >
                <Icon icon="lucide:pause" class="w-4 h-4" />
                <span class="ml-1">{{ t('download.actions.pauseAll') }}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{{ t('download.actions.pauseAll') }}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                @click="deleteAll"
                variant="destructive"
                size="sm"
                class="rounded-md"
              >
                <Icon icon="lucide:trash-2" class="w-4 h-4" />
                <span class="ml-1">{{ t('download.actions.deleteAll') }}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{{ t('download.actions.deleteAll') }}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>

    <!-- 下载列表 -->
    <div class="flex-1 overflow-auto">
      <!-- 空状态 -->
      <div v-if="downloads.length === 0" class="flex items-center justify-center h-64">
        <div class="text-center">
          <Icon icon="lucide:download-cloud" class="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p class="text-muted-foreground">{{ t('download.empty') }}</p>
        </div>
      </div>

      <!-- 下载项目列表 -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
        <DownloadItem
          v-for="download in downloads"
          :key="download.id"
          :download="download"
          @pause="pauseDownload"
          @resume="resumeDownload"
          @retry="retryDownload"
          @remove="removeDownload"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDownloadStore } from '@/stores/download'
import { Icon } from '@iconify/vue'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { DownloadItem as DownloadItemType } from '@/stores/download'
import { useTitle } from '@vueuse/core'
import DownloadItem from '@/components/download/DownloadItem.vue'

const { t } = useI18n()
const downloadStore = useDownloadStore()
const title = useTitle()
// 设置页面标题
title.value = t('download.title')

// 在组件挂载时初始化下载监听器
onMounted(() => {
  downloadStore.initDownloadListeners()
  // 页面加载时请求从全局存储同步下载任务
  syncDownloadsFromGlobalStore()
})

// 从全局存储同步下载任务
const syncDownloadsFromGlobalStore = () => {
  // 发送获取全局数据的请求
  window.electron.ipcRenderer.send('download-global-store', { action: 'get' })

  // 监听全局数据响应
  window.electron.ipcRenderer.once('download-global-data', (_event, allDownloads) => {
    if (allDownloads && Array.isArray(allDownloads)) {
      // 清空当前任务列表
      downloadStore.downloads.splice(0)

      // 添加从全局存储同步的任务
      for (const download of allDownloads) {
        // 检查是否已经存在相同的任务（避免重复）
        const existingIndex = downloadStore.downloads.findIndex(d => d.id === download.id)
        if (existingIndex === -1) {
          downloadStore.downloads.push(download)
        }
      }
    }
  })
}

// 监听 store.downloads 的变化
watch(
  () => downloadStore.downloads,
  () => {
    // 处理下载列表变化
  },
  { immediate: true, deep: true }
)

// 计算属性
const downloads = computed<DownloadItemType[]>(() => {
  // 保持原始顺序，不进行排序
  return downloadStore.downloads
})

// 方法
const pauseDownload = (id: string) => {
  downloadStore.pauseDownload(id)
}

const resumeDownload = (id: string) => {
  downloadStore.resumeDownload(id)
}

const retryDownload = (id: string) => {
  downloadStore.retryDownload(id)
}

const removeDownload = (id: string) => {
  downloadStore.removeDownload(id)
}

const startAll = () => {
  downloadStore.startAll()
}

const pauseAll = () => {
  downloadStore.pauseAll()
}

const deleteAll = () => {
  downloadStore.deleteAll()
}


// 格式化函数


</script>
