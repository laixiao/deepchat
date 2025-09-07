<template>
  <Card class="hover:shadow-md transition-shadow duration-200">
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
            @click="pauseDownload"
            variant="outline"
            size="sm"
            class="h-8 w-8 p-0"
          >
            <Icon icon="lucide:pause" class="w-3 h-3" />
          </Button>
          <Button
            v-else-if="download.status === 'paused'"
            @click="resumeDownload"
            variant="outline"
            size="sm"
            class="h-8 w-8 p-0"
            :title="t('download.actions.resume')"
          >
            <Icon icon="lucide:play" class="w-3 h-3" />
          </Button>
          <Button
            v-else-if="download.status === 'failed'"
            @click="retryDownload"
            variant="outline"
            size="sm"
            class="h-8 w-8 p-0"
            :title="t('download.actions.retry')"
          >
            <Icon icon="lucide:refresh-cw" class="w-3 h-3" />
          </Button>
          <Button
            v-if="download.status === 'completed'"
            @click="openDownloadLocation"
            variant="outline"
            size="sm"
            class="h-8 w-8 p-0"
          >
            <Icon icon="lucide:folder-open" class="w-3 h-3" />
          </Button>
          <Button
            @click="removeDownload"
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
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { DownloadItem } from '@/stores/download'

const props = defineProps<{
  download: DownloadItem
}>()

const emit = defineEmits<{
  (e: 'pause', id: string): void
  (e: 'resume', id: string): void
  (e: 'retry', id: string): void
  (e: 'remove', id: string): void
}>()

const { t } = useI18n()

// 方法
const pauseDownload = () => {
  emit('pause', props.download.id)
}

const resumeDownload = () => {
  emit('resume', props.download.id)
}

const retryDownload = () => {
  emit('retry', props.download.id)
}

const removeDownload = () => {
  emit('remove', props.download.id)
}

const openDownloadLocation = () => {
  if (props.download.filePath) {
    window.electron?.ipcRenderer.invoke('show-item-in-folder', props.download.filePath)
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