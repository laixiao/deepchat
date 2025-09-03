<template>
  <Dialog :open="downloadStore.isVisible" @update:open="downloadStore.setVisible">
    <DialogContent class="w-[90vw] h-[90vh] max-w-[90vw] max-h-[90vh] p-0 flex flex-col z-[150]">
      <!-- 弹窗头部 -->
      <DialogHeader class="flex-shrink-0 px-6 py-4 border-b">
        <DialogTitle class="text-xl font-bold flex items-center gap-2">
          <Icon icon="lucide:download" class="w-5 h-5 text-primary" />
          {{ t('download.title') }}
        </DialogTitle>
        <DialogDescription class="text-sm text-muted-foreground">
          {{ t('download.description') }}
        </DialogDescription>
      </DialogHeader>

      <!-- 下载列表 -->
      <div class="flex-1 min-h-0 overflow-y-auto p-6">
        <!-- 空状态 -->
        <div v-if="downloadStore.downloads.length === 0" class="flex items-center justify-center h-full">
          <div class="text-center">
            <Icon icon="lucide:download-cloud" class="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p class="text-muted-foreground">{{ t('download.empty') }}</p>
          </div>
        </div>

        <!-- 下载项目列表 -->
        <div v-else class="space-y-4">
          <div
            v-for="download in downloadStore.downloads"
            :key="download.id"
            class="border rounded-lg p-4 bg-card"
          >
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1">
                <h3 class="font-medium text-foreground mb-1">{{ download.filename }}</h3>
                <p class="text-xs text-muted-foreground break-all">{{ download.url }}</p>
              </div>
              <div class="flex items-center gap-2 ml-4">
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
                >
                  <Icon icon="lucide:pause" class="w-3 h-3" />
                </Button>
                <Button
                  v-else-if="download.status === 'paused'"
                  @click="resumeDownload(download.id)"
                  variant="outline"
                  size="sm"
                >
                  <Icon icon="lucide:play" class="w-3 h-3" />
                </Button>
                <Button
                  v-else-if="download.status === 'failed'"
                  @click="retryDownload(download.id)"
                  variant="outline"
                  size="sm"
                >
                  <Icon icon="lucide:refresh-cw" class="w-3 h-3" />
                </Button>
                <Button
                  v-if="download.status === 'completed'"
                  @click="openDownloadLocation(download.filePath)"
                  variant="outline"
                  size="sm"
                >
                  <Icon icon="lucide:folder-open" class="w-3 h-3" />
                </Button>
                <Button
                  @click="removeDownload(download.id)"
                  variant="outline"
                  size="sm"
                  class="text-destructive hover:text-destructive"
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
          </div>
        </div>
      </div>

      <!-- 弹窗底部 -->
      <div class="flex-shrink-0 flex justify-between items-center px-6 py-4 border-t bg-muted/30">
        <div class="text-sm text-muted-foreground">
          {{ t('download.activeDownloads', { count: activeDownloadsCount }) }}
        </div>
        <div class="flex gap-2">
          <Button
            v-if="hasDownloads"
            @click="clearCompleted"
            variant="outline"
          >
            {{ t('download.clearCompleted') }}
          </Button>
          <Button @click="downloadStore.setVisible(false)" variant="default">
            {{ t('download.close') }}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDownloadStore } from '@/stores/download'

const { t } = useI18n()
const downloadStore = useDownloadStore()

// 计算属性
const activeDownloadsCount = computed(() => {
  return downloadStore.downloads.filter(d => d.status === 'downloading').length
})

const hasDownloads = computed(() => {
  return downloadStore.downloads.length > 0
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
</script>