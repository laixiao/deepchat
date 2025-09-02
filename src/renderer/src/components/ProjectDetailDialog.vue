<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="w-[90vw] h-[90vh] max-w-[90vw] max-h-[90vh] p-0 flex flex-col">
      <!-- 弹窗头部 -->
      <DialogHeader class="flex-shrink-0 px-6 py-4 border-b">
        <DialogTitle class="text-xl font-bold flex items-center gap-2">
          <Icon icon="lucide:folder" class="w-5 h-5 text-primary" />
          {{ t('projects.detail.title') }}
        </DialogTitle>
        <DialogDescription class="text-sm text-muted-foreground">
          {{ t('projects.detail.description') }}
        </DialogDescription>
      </DialogHeader>

      <!-- 弹窗内容 - 可滚动区域 -->
      <div class="flex-1 min-h-0 overflow-y-auto scrollable-content">
        <!-- 加载状态 -->
        <div v-if="loading" class="flex items-center justify-center h-64">
          <div class="flex items-center gap-2 text-muted-foreground">
            <Icon icon="lucide:loader-2" class="w-5 h-5 animate-spin" />
            <span>{{ t('projects.detail.loading') }}</span>
          </div>
        </div>

        <!-- 错误状态 -->
        <div v-else-if="error" class="flex items-center justify-center h-64">
          <div class="text-center">
            <Icon icon="lucide:alert-circle" class="w-8 h-8 text-destructive mx-auto mb-2" />
            <p class="text-destructive font-medium">{{ t('projects.detail.error') }}</p>
            <p class="text-sm text-muted-foreground mt-1">{{ error }}</p>
            <Button @click="loadProjectDetail" variant="outline" size="sm" class="mt-4">
              {{ t('projects.detail.retry') }}
            </Button>
          </div>
        </div>

        <!-- 项目详情内容 -->
        <div v-else-if="projectDetail" class="p-6 space-y-6">
          <!-- 基本信息 -->
          <div class="bg-card rounded-lg border p-4">
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-center gap-2">
                <Icon icon="lucide:folder" class="w-6 h-6 text-primary" />
                <h2 class="text-lg font-semibold">{{ t('projects.detail.basicInfo') }}</h2>
              </div>
              <Badge 
                :variant="projectDetail.status === 'online' ? 'default' : 'secondary'"
                class="text-sm"
              >
                {{ projectDetail.status === 'online' ? t('projects.statusOnline') : t('projects.statusOffline') }}
              </Badge>
            </div>
            
            <div class="space-y-3">
              <div>
                <h3 class="text-xl font-bold text-primary">{{ projectDetail.name }}</h3>
                <p class="text-sm text-muted-foreground mt-1">ID: {{ projectDetail._id }}</p>
              </div>
              
              <div>
                <h4 class="text-sm font-medium text-foreground mb-2">{{ t('projects.detail.description') }}</h4>
                <p class="text-sm text-muted-foreground leading-relaxed">{{ projectDetail.description }}</p>
              </div>
            </div>
          </div>

          <!-- 工作流信息 -->
          <div v-if="projectDetail.workflows?.length" class="bg-card rounded-lg border p-4">
            <div class="flex items-center gap-2 mb-4">
              <Icon icon="lucide:workflow" class="w-5 h-5 text-primary" />
              <h2 class="text-lg font-semibold">{{ t('projects.detail.workflows') }}</h2>
              <Badge variant="outline" class="text-xs">{{ projectDetail.workflows.length }}</Badge>
            </div>
            
            <div class="space-y-4">
              <div 
                v-for="workflow in projectDetail.workflows" 
                :key="workflow._id"
                class="border rounded-lg p-4 bg-muted/30"
              >
                <h3 class="font-medium text-foreground mb-2">{{ workflow.name }}</h3>
                <p class="text-sm text-muted-foreground leading-relaxed">{{ workflow.description }}</p>
                <div class="mt-2 text-xs text-muted-foreground">
                  ID: {{ workflow._id }}
                </div>
              </div>
            </div>
          </div>

          <!-- 下载链接 -->
          <div v-if="projectDetail.downloadLinks?.length" class="bg-card rounded-lg border p-4">
            <div class="flex items-center gap-2 mb-4">
              <Icon icon="lucide:download" class="w-5 h-5 text-primary" />
              <h2 class="text-lg font-semibold">{{ t('projects.detail.downloadLinks') }}</h2>
              <Badge variant="outline" class="text-xs">{{ projectDetail.downloadLinks.length }}</Badge>
            </div>
            
            <div class="space-y-3">
              <div 
                v-for="link in projectDetail.downloadLinks" 
                :key="link._id"
                class="border rounded-lg p-4 bg-muted/30"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <h3 class="font-medium text-foreground mb-1">{{ link.filename }}</h3>
                    <p class="text-xs text-muted-foreground mb-2">
                      {{ t('projects.detail.hash') }}: {{ link.hash }}
                    </p>
                    <div class="text-xs text-muted-foreground break-all">
                      {{ link.url }}
                    </div>
                  </div>
                  <Button
                    @click="openDownloadLink(link.url)"
                    variant="outline"
                    size="sm"
                    class="ml-4 flex-shrink-0"
                  >
                    <Icon icon="lucide:external-link" class="w-4 h-4 mr-1" />
                    {{ t('projects.detail.open') }}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <!-- 技术信息 -->
          <div class="bg-card rounded-lg border p-4">
            <div class="flex items-center gap-2 mb-4">
              <Icon icon="lucide:info" class="w-5 h-5 text-primary" />
              <h2 class="text-lg font-semibold">{{ t('projects.detail.technicalInfo') }}</h2>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span class="font-medium">{{ t('projects.detail.version') }}:</span>
                <span class="text-muted-foreground ml-2">{{ projectDetail.__v }}</span>
              </div>
              <div>
                <span class="font-medium">{{ t('projects.detail.projectId') }}:</span>
                <span class="text-muted-foreground ml-2 font-mono text-xs">{{ projectDetail._id }}</span>
              </div>
            </div>
            
            <!-- 时间信息放在技术信息区域底部，字体更小，颜色更淡 -->
            <div class="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-border/50">
              <div class="text-xs text-muted-foreground/70">
                <span>{{ t('projects.created') }}:</span>
                <div class="mt-1">{{ formatDate(projectDetail.createdAt) }}</div>
              </div>
              <div class="text-xs text-muted-foreground/70">
                <span>{{ t('projects.updated') }}:</span>
                <div class="mt-1">{{ formatDate(projectDetail.updatedAt) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 弹窗底部 -->
      <div class="flex-shrink-0 flex justify-end gap-2 px-6 py-4 border-t bg-muted/30">
        <Button @click="$emit('update:open', false)" variant="outline">
          {{ t('projects.detail.close') }}
        </Button>
        <Button 
          v-if="projectDetail"
          @click="refreshDetail"
          variant="default"
          :disabled="loading"
        >
          <Icon 
            icon="lucide:refresh-cw" 
            class="w-4 h-4 mr-2" 
            :class="{ 'animate-spin': loading }"
          />
          {{ t('projects.detail.refresh') }}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Project } from '@/lib/projects'
import { getProjectById } from '@/lib/projects'

interface Props {
  open: boolean
  projectId: string | null
}

defineEmits<{
  'update:open': [value: boolean]
}>()

const props = defineProps<Props>()
const { t } = useI18n()

// 响应式数据
const loading = ref(false)
const error = ref<string | null>(null)
const projectDetail = ref<Project | null>(null)

// 加载项目详情
const loadProjectDetail = async () => {
  if (!props.projectId) return

  try {
    loading.value = true
    error.value = null
    
    const response = await getProjectById(props.projectId)
    
    if (response.success) {
      // 正确处理嵌套的数据结构: response.data.project
      projectDetail.value = response.data.project
    } else {
      throw new Error(response.message || t('projects.detail.loadError'))
    }
  } catch (err) {
    console.error('Failed to load project detail:', err)
    error.value = err instanceof Error ? err.message : t('projects.detail.unknownError')
  } finally {
    loading.value = false
  }
}

// 刷新详情
const refreshDetail = () => {
  loadProjectDetail()
}

// 打开下载链接
const openDownloadLink = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer')
}

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 监听弹窗打开状态和项目ID变化
watch(
  [() => props.open, () => props.projectId],
  ([isOpen, projectId]) => {
    if (isOpen && projectId) {
      loadProjectDetail()
    } else if (!isOpen) {
      // 弹窗关闭时清空数据
      projectDetail.value = null
      error.value = null
    }
  },
  { immediate: true }
)
</script>

<style scoped>
/* 自定义滚动条样式 */
.scrollable-content::-webkit-scrollbar {
  width: 8px;
}

.scrollable-content::-webkit-scrollbar-track {
  background: transparent;
}

.scrollable-content::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 4px;
}

.scrollable-content::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--border)) / 0.8;
}

/* 确保内容可以正常滚动 */
.scrollable-content {
  scroll-behavior: smooth;
  overscroll-behavior: contain;
}

/* 修复可能的布局问题 */
:deep(.dialog-content) {
  display: flex !important;
  flex-direction: column !important;
}
</style>