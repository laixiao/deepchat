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
      <div class="flex gap-2">
        <Button @click="clearCompleted" variant="outline" size="sm">
          <Icon icon="lucide:check-circle" class="w-4 h-4 mr-2" />
          {{ t('download.clearCompleted') }}
        </Button>
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
      <div v-else class="grid grid-cols-1 gap-4 p-6">
        <Card 
          v-for="download in downloads" 
          :key="download.id"
          class="hover:shadow-md transition-shadow duration-200"
        >
          <CardContent class="p-4">
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1 min-w-0">
                <h3 class="font-medium text-foreground mb-1 truncate">{{ download.filename }}</h3>
                <p class="text-xs text-muted-foreground break-all line-clamp-2">{{ download.url }}</p>
              </div>
              <div class="flex items-center gap-2 ml-4 flex-shrink-0">
                <!-- 状态图标 -->
                <Icon
                  v-if="download.status === 'downloading'"
                  icon="lucide:loader-2"
                  class="w-4 h-4 text-blue-500 animate-spin"
                />
                <Icon
                  v-else-if="download.status === 'completed'"
                  icon="lucide:check-circle"
                  class="w-4 h-4 text-green-500"
                />
                <Icon
                  v-else-if="download.status === 'failed'"
                  icon="lucide:x-circle"
                  class="w-4 h-4 text-red-500"
                />
                <Icon
                  v-else-if="download.status === 'paused'"
                  icon="lucide:pause-circle"
                  class="w-4 h-4 text-yellow-500"
                />
                
                <!-- 操作按钮 -->
                <Button
                  v-if="download.status === 'downloading'"
                  @click="pauseDownload(download.id)"
                  variant="outline"
                  size="sm"
                  class="h-8 w-8 p-0"
                >
                  <Icon icon="lucide:pause" class="w-3 h-3" />
                </Button>
                <Button
                  v-else-if="download.status === 'paused'"
                  @click="resumeDownload(download.id)"
                  variant="outline"
                  size="sm"
                  class="h-8 w-8 p-0"
                >
                  <Icon icon="lucide:play" class="w-3 h-3" />
                </Button>
                <Button
                  v-else-if="download.status === 'failed'"
                  @click="retryDownload(download.id)"
                  variant="outline"
                  size="sm"
                  class="h-8 w-8 p-0"
                >
                  <Icon icon="lucide:refresh-cw" class="w-3 h-3" />
                </Button>
                <Button
                  v-if="download.status === 'completed'"
                  @click="openDownloadLocation(download.filePath)"
                  variant="outline"
                  size="sm"
                  class="h-8 w-8 p-0"
                >
                  <Icon icon="lucide:folder-open" class="w-3 h-3" />
                </Button>
                <Button
                  @click="removeDownload(download.id)"
                  variant="outline"
                  size="sm"
                  class="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Icon icon="lucide:trash-2" class="w-3 h-3" />
                </Button>
              </div>
            </div>

            <!-- 进度条 -->
            <div v-if="download.status === 'downloading' || download.status === 'paused'" class="mb-2">
              <div class="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{{ formatBytes(download.downloadedBytes) }} / {{ formatBytes(download.totalBytes) }}</span>
                <span>{{ Math.round(download.progress) }}%</span>
              </div>
              <div class="w-full bg-muted rounded-full h-2">
                <div
                  class="bg-primary h-2 rounded-full transition-all duration-300"
                  :style="{ width: `${download.progress}%` }"
                ></div>
              </div>
            </div>

            <!-- 下载速度和剩余时间 -->
            <div v-if="download.status === 'downloading'" class="flex items-center justify-between text-xs text-muted-foreground">
              <span>{{ formatSpeed(download.speed) }}</span>
              <span v-if="download.remainingTime">{{ formatTime(download.remainingTime) }}</span>
            </div>

            <!-- 错误信息 -->
            <div v-if="download.status === 'failed' && download.error" class="mt-2">
              <p class="text-xs text-destructive">{{ download.error }}</p>
            </div>

            <!-- 已完成的文件信息 -->
            <div v-if="download.status === 'completed'" class="mt-2 text-xs text-muted-foreground">
              <span>{{ t('download.completedAt') }}: {{ formatDate(download.completedAt) }}</span>
            </div>

            <!-- 时间信息 -->
            <div class="flex items-center justify-between text-xs text-muted-foreground mt-3">
              <span>{{ t('download.createdAt') }}: {{ formatDate(download.createdAt) }}</span>
              <span v-if="download.status !== 'pending' && download.status !== 'downloading'">
                {{ getStatusText(download.status) }}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useDownloadStore } from '@/stores/download'
import type { DownloadItem } from '@/stores/download'
import { useTitle } from '@vueuse/core'

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
const downloads = computed(() => {
  return [...downloadStore.downloads].sort((a, b) => {
    // 按状态排序：进行中 > 暂停 > 失败 > 完成 > 等待
    const statusOrder = {
      downloading: 0,
      pending: 1,
      paused: 2,
      failed: 3,
      completed: 4
    }
    return statusOrder[a.status] - statusOrder[b.status] || b.createdAt - a.createdAt
  })
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

const clearCompleted = () => {
  downloadStore.clearCompleted()
}

const openDownloadLocation = (filePath?: string) => {
  if (filePath) {
    window.electron?.ipcRenderer.invoke('show-item-in-folder', filePath)
  }
}

// 格式化函数
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatSpeed = (bytesPerSecond: number): string => {
  return formatBytes(bytesPerSecond) + '/s'
}

const formatTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)}m`
  } else {
    return `${Math.round(seconds / 3600)}h`
  }
}

const formatDate = (timestamp?: number): string => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleString()
}

const getStatusText = (status: DownloadItem['status']): string => {
  switch (status) {
    case 'pending':
      return t('download.status.pending')
    case 'downloading':
      return t('download.status.downloading')
    case 'paused':
      return t('download.status.paused')
    case 'completed':
      return t('download.status.completed')
    case 'failed':
      return t('download.status.failed')
    default:
      return status
  }
}


</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
