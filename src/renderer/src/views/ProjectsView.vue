<template>
  <div class="flex flex-col h-full bg-background">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between p-6 border-b">
      <div class="flex items-center gap-3">
        <Icon icon="lucide:folder" class="w-6 h-6 text-primary" />
        <div>
          <h1 class="text-2xl font-bold">{{ t('projects.title') }}</h1>
          <p class="text-sm text-muted-foreground">{{ t('projects.description') }}</p>
        </div>
      </div>
      <Button @click="refreshProjects" :disabled="loading" variant="outline" size="sm">
        <Icon 
          icon="lucide:refresh-cw" 
          class="w-4 h-4 mr-2" 
          :class="{ 'animate-spin': loading }"
        />
        {{ t('projects.refresh') }}
      </Button>
    </div>

    <!-- 搜索和筛选 -->
    <div class="flex items-center gap-4 p-6 border-b bg-muted/30">
      <div class="flex-1 max-w-md">
        <div class="relative">
          <Icon icon="lucide:search" class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            v-model="searchKeyword"
            :placeholder="t('projects.searchPlaceholder')"
            class="pl-10"
            @keyup.enter="searchProjects"
          />
        </div>
      </div>
      
      <Select v-model="statusFilter">
        <SelectTrigger class="w-32">
          <SelectValue :placeholder="t('projects.status')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{{ t('projects.statusAll') }}</SelectItem>
          <SelectItem value="online">{{ t('projects.statusOnline') }}</SelectItem>
          <SelectItem value="offline">{{ t('projects.statusOffline') }}</SelectItem>
        </SelectContent>
      </Select>

      <Button @click="searchProjects" :disabled="loading">
        <Icon icon="lucide:search" class="w-4 h-4 mr-2" />
        {{ t('projects.search') }}
      </Button>
    </div>

    <!-- 项目列表 -->
    <div class="flex-1 overflow-auto">
      <!-- 加载状态 -->
      <div v-if="loading && projects.length === 0" class="flex items-center justify-center h-64">
        <div class="flex items-center gap-2 text-muted-foreground">
          <Icon icon="lucide:loader-2" class="w-5 h-5 animate-spin" />
          <span>{{ t('projects.loading') }}</span>
        </div>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="flex items-center justify-center h-64">
        <div class="text-center">
          <Icon icon="lucide:alert-circle" class="w-8 h-8 text-destructive mx-auto mb-2" />
          <p class="text-destructive font-medium">{{ t('projects.error') }}</p>
          <p class="text-sm text-muted-foreground mt-1">{{ error }}</p>
          <Button @click="loadProjects" variant="outline" size="sm" class="mt-4">
            {{ t('projects.retry') }}
          </Button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="projects.length === 0" class="flex items-center justify-center h-64">
        <div class="text-center">
          <Icon icon="lucide:folder-x" class="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p class="text-muted-foreground">{{ t('projects.empty') }}</p>
        </div>
      </div>

      <!-- 项目网格 -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        <Card 
          v-for="project in projects" 
          :key="project._id"
          class="cursor-pointer hover:shadow-md transition-shadow duration-200"
          @click="selectProject(project)"
        >
          <CardHeader class="pb-3">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-2">
                <Icon icon="lucide:folder" class="w-5 h-5 text-primary" />
                <Badge 
                  :variant="project.status === 'online' ? 'default' : 'secondary'"
                  class="text-xs"
                >
                  {{ project.status === 'online' ? t('projects.statusOnline') : t('projects.statusOffline') }}
                </Badge>
              </div>
              <Icon icon="lucide:external-link" class="w-4 h-4 text-muted-foreground" />
            </div>
            <CardTitle class="text-lg line-clamp-2">{{ project.name }}</CardTitle>
          </CardHeader>
          
          <CardContent class="space-y-4">
            <p class="text-sm text-muted-foreground line-clamp-3">
              {{ project.description }}
            </p>
            
            <!-- 工作流信息 -->
            <div v-if="project.workflows?.length" class="space-y-2">
              <div class="flex items-center gap-2 text-xs font-medium text-primary">
                <Icon icon="lucide:workflow" class="w-3 h-3" />
                <span>{{ t('projects.workflows') }} ({{ project.workflows.length }})</span>
              </div>
              <div class="space-y-1">
                <div 
                  v-for="workflow in project.workflows.slice(0, 2)" 
                  :key="workflow._id"
                  class="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1"
                >
                  {{ workflow.name }}
                </div>
                <div v-if="project.workflows.length > 2" class="text-xs text-muted-foreground">
                  +{{ project.workflows.length - 2 }} {{ t('projects.moreWorkflows') }}
                </div>
              </div>
            </div>

            <!-- 下载链接 -->
            <div v-if="project.downloadLinks?.length" class="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon icon="lucide:download" class="w-3 h-3" />
              <span>{{ project.downloadLinks.length }} {{ t('projects.downloadLinks') }}</span>
            </div>

            <!-- 时间信息 -->
            <div class="flex items-center justify-between text-xs text-muted-foreground">
              <span>{{ t('projects.created') }}: {{ formatDate(project.createdAt) }}</span>
              <span>{{ t('projects.updated') }}: {{ formatDate(project.updatedAt) }}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- 分页 -->
      <div v-if="pagination && pagination.pages > 1" class="flex justify-center py-6 border-t">
        <div class="flex items-center gap-2">
          <Button
            @click="changePage(pagination.page - 1)"
            :disabled="pagination.page <= 1 || loading"
            variant="outline"
            size="sm"
          >
            <Icon icon="lucide:chevron-left" class="w-4 h-4" />
          </Button>
          
          <span class="text-sm text-muted-foreground px-3">
            {{ pagination.page }} / {{ pagination.pages }}
          </span>
          
          <Button
            @click="changePage(pagination.page + 1)"
            :disabled="pagination.page >= pagination.pages || loading"
            variant="outline"
            size="sm"
          >
            <Icon icon="lucide:chevron-right" class="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>

    <!-- 项目详情弹窗 -->
    <ProjectDetailDialog 
      v-model:open="showDetailDialog" 
      :project-id="selectedProjectId"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ProjectDetailDialog from '@/components/ProjectDetailDialog.vue'
import { useTitle } from '@vueuse/core'
import type { Project, Pagination } from '@/lib/projects'
import { getProjects } from '@/lib/projects'

const { t } = useI18n()
const title = useTitle()

// 设置页面标题
title.value = t('projects.title')

// 响应式数据
const loading = ref(false)
const error = ref<string | null>(null)
const projects = ref<Project[]>([])
const pagination = ref<Pagination | null>(null)
const searchKeyword = ref('')
const statusFilter = ref<'all' | 'online' | 'offline'>('all')
const currentPage = ref(1)

// 弹窗状态
const showDetailDialog = ref(false)
const selectedProjectId = ref<string | null>(null)

// 加载项目列表
const loadProjects = async (page = 1) => {
  try {
    loading.value = true
    error.value = null
    
    const params = {
      page,
      limit: 12,
      ...(searchKeyword.value && { search: searchKeyword.value }),
      ...(statusFilter.value !== 'all' && { status: statusFilter.value })
    }
    
    const response = await getProjects(params)
    
    if (response.success) {
      projects.value = response.data.projects
      pagination.value = response.data.pagination
      currentPage.value = page
    } else {
      throw new Error(response.message || t('projects.loadError'))
    }
  } catch (err) {
    console.error('Failed to load projects:', err)
    error.value = err instanceof Error ? err.message : t('projects.unknownError')
  } finally {
    loading.value = false
  }
}

// 刷新项目列表
const refreshProjects = () => {
  loadProjects(currentPage.value)
}

// 搜索项目
const searchProjects = () => {
  loadProjects(1) // 搜索时从第一页开始
}

// 切换页面
const changePage = (page: number) => {
  if (page >= 1 && pagination.value && page <= pagination.value.pages) {
    loadProjects(page)
  }
}

// 选择项目（打开详情弹窗）
const selectProject = (project: Project) => {
  selectedProjectId.value = project._id
  showDetailDialog.value = true
}

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// 组件挂载时加载数据
onMounted(() => {
  loadProjects()
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>