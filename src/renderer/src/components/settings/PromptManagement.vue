<template>
  <div class="w-full flex flex-col gap-4">
    <!-- 默认系统提示词设置区域 -->
    <div class="bg-muted/30 border border-border rounded-lg p-4">
      <div class="flex items-center gap-2 mb-3">
        <Icon
          :icon="getStatusIcon()"
          :class="[
            'w-5 h-5 transition-colors duration-200',
            getStatusColor(),
            defaultPromptSaveStatus === 'saving' ? 'animate-spin' : ''
          ]"
        />
        <Label class="text-base font-medium">{{ t('promptSetting.defaultSystemPrompt') }}</Label>
        <div class="flex items-center gap-1 text-xs text-muted-foreground">
          <span v-if="defaultPromptSaveStatus === 'typing'">{{ t('promptSetting.typing') }}</span>
          <span v-else-if="defaultPromptSaveStatus === 'saving'">{{ t('promptSetting.saving') }}</span>
          <span v-else-if="defaultPromptSaveStatus === 'saved'">{{ t('promptSetting.saved') }}</span>
        </div>
      </div>
      <div class="space-y-2">
        <textarea
          ref="defaultPromptTextarea"
          v-model="defaultSystemPrompt"
          class="w-full h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-y-auto"
          :placeholder="t('promptSetting.defaultSystemPromptPlaceholder')"
          @blur="handleDefaultPromptBlur"
        ></textarea>
        <p class="text-xs text-muted-foreground">
          {{ t('promptSetting.defaultSystemPromptDescription') }}
        </p>
      </div>
    </div>

    <!-- 操作按钮区域 -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Icon icon="lucide:scroll-text" class="w-5 h-5 text-primary" />
        <span class="text-base font-medium">Prompt模板</span>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" @click="exportPrompts">
          <Icon icon="lucide:download" class="w-4 h-4 mr-1" />
          {{ t('promptSetting.export') }}
        </Button>
        <Button variant="outline" size="sm" @click="importPrompts">
          <Icon icon="lucide:upload" class="w-4 h-4 mr-1" />
          {{ t('promptSetting.import') }}
        </Button>
        <Button variant="default" size="sm" @click="openAddDialog = true">
          <Icon icon="lucide:plus" class="w-4 h-4 mr-1" />
          {{ t('common.add') }}
        </Button>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="prompts.length === 0" class="text-center text-muted-foreground py-12">
      <Icon icon="lucide:book-open-text" class="w-12 h-12 mx-auto mb-4 opacity-50" />
      <p class="text-lg font-medium">{{ t('promptSetting.noPrompt') }}</p>
      <p class="text-sm mt-1">{{ t('promptSetting.noPromptDesc') }}</p>
    </div>

    <!-- Prompt卡片网格 -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="(prompt, index) in prompts"
        :key="prompt.id"
        class="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors duration-200"
      >
        <!-- 卡片头部 -->
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <div class="p-2 bg-primary/10 rounded-lg flex-shrink-0">
              <Icon icon="lucide:scroll-text" class="w-5 h-5 text-primary" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-sm truncate" :title="prompt.name">
                {{ prompt.name }}
              </div>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs px-2 py-0.5 bg-muted rounded-md text-muted-foreground">
                  {{ getSourceLabel(prompt.source) }}
                </span>
                <span
                  :class="[
                    'text-xs px-2 py-0.5 rounded-md cursor-pointer transition-colors',
                    prompt.enabled
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  ]"
                  :title="
                    prompt.enabled
                      ? t('promptSetting.clickToDisable')
                      : t('promptSetting.clickToEnable')
                  "
                  @click="togglePromptEnabled(index)"
                >
                  {{ prompt.enabled ? t('promptSetting.active') : t('promptSetting.inactive') }}
                </span>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex items-center gap-1 flex-shrink-0 ml-2">
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
              :title="t('common.edit')"
              @click="editPrompt(index)"
            >
              <Icon icon="lucide:pencil" class="w-3.5 h-3.5" />
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  :title="t('common.delete')"
                >
                  <Icon icon="lucide:trash-2" class="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{{
                    t('promptSetting.confirmDelete', { name: prompt.name })
                  }}</AlertDialogTitle>
                  <AlertDialogDescription>{{
                    t('promptSetting.confirmDeleteDescription')
                  }}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{{ t('common.cancel') }}</AlertDialogCancel>
                  <AlertDialogAction @click="deletePrompt(index)">{{
                    t('common.confirm')
                  }}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <!-- 描述和内容预览 -->
        <div class="text-xs text-muted-foreground mb-3 line-clamp-2" :title="prompt.description">
          {{ prompt.description || t('promptSetting.noDescription') }}
        </div>

        <div class="relative mb-3">
          <div
            :class="[
              'text-xs bg-muted/50 rounded-md p-2 border text-muted-foreground break-all',
              !isExpanded(prompt.id) && 'line-clamp-2'
            ]"
          >
            {{ prompt.content }}
          </div>
          <Button
            v-if="prompt.content.length > 100"
            variant="ghost"
            size="sm"
            class="text-xs text-primary h-6 px-2 mt-1"
            @click="toggleShowMore(prompt.id)"
          >
            {{ isExpanded(prompt.id) ? t('promptSetting.showLess') : t('promptSetting.showMore') }}
          </Button>
        </div>

        <!-- 底部统计信息 -->
        <div class="flex items-center justify-between pt-2 border-t border-border">
          <div class="flex items-center gap-4 text-xs text-muted-foreground">
            <div class="flex items-center gap-1">
              <Icon icon="lucide:type" class="w-3 h-3" />
              <span>{{ prompt.content.length }}</span>
            </div>
            <div v-if="prompt.parameters?.length" class="flex items-center gap-1">
              <Icon icon="lucide:settings" class="w-3 h-3" />
              <span>{{ prompt.parameters.length }}</span>
            </div>
          </div>
          <div class="text-xs text-muted-foreground">
            {{ formatDate(prompt.id) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑对话框占位符 -->
    <PromptEditDialog
      v-model:open="openAddDialog"
      :form="form"
      :editing-idx="editingIdx"
      @save="savePrompt"
      @close="closeDialog"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, toRaw, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/toast'
import { usePromptsStore } from '@/stores/prompts'
import { useSettingsStore } from '@/stores/settings'
import { useDebounceFn } from '@vueuse/core'
import { nanoid } from 'nanoid'
import { FileItem } from '@shared/presenter'
import PromptEditDialog from './PromptEditDialog.vue'

const { t } = useI18n()
const { toast } = useToast()
const promptsStore = usePromptsStore()
const settingsStore = useSettingsStore()

// 默认系统提示词相关状态
const defaultSystemPrompt = ref('')
const defaultPromptSaveStatus = ref<'idle' | 'typing' | 'saving' | 'saved'>('idle')
const defaultPromptTextarea = ref<HTMLTextAreaElement>()

interface PromptItem {
  id: string
  name: string
  description: string
  content: string
  parameters?: Array<{
    name: string
    description: string
    required: boolean
  }>
  files?: FileItem[]
  enabled?: boolean
  source?: 'local' | 'imported' | 'builtin'
  createdAt?: number
  updatedAt?: number
}

const prompts = ref<PromptItem[]>([])
const expandedPrompts = ref<Set<string>>(new Set())
const openAddDialog = ref(false)
const editingIdx = ref<number | null>(null)
const form = reactive<PromptItem>({
  id: '',
  name: '',
  description: '',
  content: '',
  parameters: [],
  files: [],
  enabled: true,
  source: 'local'
})

// 安全的深拷贝函数
const safeClone = (obj: unknown): unknown => {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  if (obj instanceof Date) {
    return new Date(obj.getTime())
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => safeClone(item))
  }
  const cloned: Record<string, unknown> = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = (obj as Record<string, unknown>)[key]
      if (
        typeof value !== 'function' &&
        typeof value !== 'symbol' &&
        typeof value !== 'undefined'
      ) {
        cloned[key] = safeClone(value)
      }
    }
  }
  return cloned
}

const loadPrompts = async () => {
  await promptsStore.loadPrompts()
  let needsMigration = false
  const migratedPrompts = promptsStore.prompts.map((prompt) => {
    const hasNewFields = prompt.enabled !== undefined && prompt.source !== undefined
    if (!hasNewFields) {
      needsMigration = true
    }
    return {
      ...prompt,
      enabled: prompt.enabled ?? true,
      source: prompt.source ?? 'local',
      createdAt: prompt.createdAt ?? Date.now(),
      updatedAt: prompt.updatedAt ?? Date.now()
    }
  }) as PromptItem[]

  if (needsMigration) {
    try {
      const safePrompts = migratedPrompts.map((p) => safeClone(toRaw(p)) as PromptItem)
      await promptsStore.savePrompts(safePrompts)
    } catch (error) {
      console.warn('Failed to migrate prompt data:', error)
    }
  }
  prompts.value = migratedPrompts
}

const isExpanded = (promptId: string) => expandedPrompts.value.has(promptId)

const toggleShowMore = (promptId: string) => {
  if (expandedPrompts.value.has(promptId)) {
    expandedPrompts.value.delete(promptId)
  } else {
    expandedPrompts.value.add(promptId)
  }
}

const resetForm = () => {
  form.id = ''
  form.name = ''
  form.description = ''
  form.content = ''
  form.parameters = []
  form.files = []
  form.enabled = true
  form.source = 'local'
  editingIdx.value = null
}

const savePrompt = async () => {
  try {
    const promptData = {
      ...form,
      id: form.id || nanoid(),
      updatedAt: Date.now(),
      createdAt: form.createdAt || Date.now()
    }

    if (editingIdx.value !== null) {
      await promptsStore.updatePrompt(promptData.id, promptData)
    } else {
      await promptsStore.addPrompt(promptData)
    }

    await loadPrompts()
    closeDialog()
    
    toast({
      title: editingIdx.value !== null ? '编辑成功' : t('promptSetting.addSuccess'),
      variant: 'default'
    })
  } catch {
    toast({
      title: t('promptSetting.addFailed'),
      variant: 'destructive'
    })
  }
}

const editPrompt = (idx: number) => {
  const p = prompts.value[idx]
  form.id = p.id
  form.name = p.name
  form.description = p.description
  form.content = p.content
  form.enabled = p.enabled ?? true
  form.source = p.source ?? 'local'
  if (p.parameters) {
    form.parameters = p.parameters.map((param) => ({
      name: param.name,
      description: param.description,
      required: !!param.required
    }))
  } else {
    form.parameters = []
  }
  if (p.files) {
    form.files = [...p.files]
  } else {
    form.files = []
  }
  editingIdx.value = idx
  openAddDialog.value = true
}

const deletePrompt = async (idx: number) => {
  const prompt = prompts.value[idx]
  try {
    await promptsStore.deletePrompt(prompt.id)
    await loadPrompts()
    toast({
      title: t('promptSetting.deleteSuccess'),
      variant: 'default'
    })
  } catch {
    toast({
      title: t('promptSetting.deleteFailed'),
      variant: 'destructive'
    })
  }
}

const togglePromptEnabled = async (idx: number) => {
  const prompt = prompts.value[idx]
  const newEnabled = !(prompt.enabled ?? true)

  try {
    prompts.value[idx] = {
      ...prompt,
      enabled: newEnabled,
      updatedAt: Date.now()
    }

    await promptsStore.updatePrompt(prompt.id, {
      enabled: newEnabled,
      updatedAt: Date.now()
    })

    toast({
      title: newEnabled ? t('promptSetting.enableSuccess') : t('promptSetting.disableSuccess'),
      variant: 'default'
    })
  } catch {
    await loadPrompts()
    toast({
      title: t('promptSetting.toggleFailed'),
      variant: 'destructive'
    })
  }
}

const exportPrompts = () => {
  try {
    const data = JSON.stringify(
      prompts.value.map((prompt) => toRaw(prompt)),
      null,
      2
    )
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'prompts.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast({
      title: t('promptSetting.exportSuccess'),
      variant: 'default'
    })
  } catch {
    toast({
      title: t('promptSetting.exportFailed'),
      variant: 'destructive'
    })
  }
}

const importPrompts = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string
          const importedPrompts = JSON.parse(content)

          if (Array.isArray(importedPrompts)) {
            const currentPrompts = [...prompts.value]
            const currentPromptsMap = new Map(currentPrompts.map((p) => [p.id, p]))
            let addedCount = 0
            let updatedCount = 0
            const timestamp = Date.now()

            for (const importedPrompt of importedPrompts) {
              if (!importedPrompt.id) {
                importedPrompt.id = nanoid()
              }
              if (!importedPrompt.source) {
                importedPrompt.source = 'imported'
              }
              if (importedPrompt.enabled === undefined) {
                importedPrompt.enabled = true
              }
              if (!importedPrompt.createdAt) {
                importedPrompt.createdAt = timestamp
              }
              importedPrompt.updatedAt = timestamp

              if (currentPromptsMap.has(importedPrompt.id)) {
                const index = currentPrompts.findIndex((p) => p.id === importedPrompt.id)
                if (index !== -1) {
                  currentPrompts[index] = importedPrompt
                  updatedCount++
                }
              } else {
                currentPrompts.push(importedPrompt)
                addedCount++
              }
            }

            const rawPrompts = currentPrompts.map(
              (prompt) => safeClone(toRaw(prompt)) as PromptItem
            )
            await promptsStore.savePrompts(rawPrompts)
            await loadPrompts()

            toast({
              title: t('promptSetting.importSuccess'),
              description: `${t('promptSetting.importStats', { added: addedCount, updated: updatedCount })}`,
              variant: 'default'
            })
          } else {
            throw new Error('Invalid format: not an array')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          toast({
            title: t('promptSetting.importFailed'),
            description: `错误: ${errorMessage}`,
            variant: 'destructive'
          })
        }
      }
      reader.readAsText(file)
    }
  }
  input.click()
}

const formatDate = (id: string) => {
  try {
    const timestamp = parseInt(id)
    if (isNaN(timestamp)) {
      return t('promptSetting.customDate')
    }
    const date = new Date(timestamp)
    return date.toLocaleDateString()
  } catch {
    return t('promptSetting.customDate')
  }
}

const getSourceLabel = (source?: string) => {
  switch (source) {
    case 'local':
      return t('promptSetting.sourceLocal')
    case 'imported':
      return t('promptSetting.sourceImported')
    case 'builtin':
      return t('promptSetting.sourceBuiltin')
    default:
      return t('promptSetting.sourceLocal')
  }
}

const closeDialog = () => {
  openAddDialog.value = false
  resetForm()
}

// 保存默认系统提示词的防抖函数
const saveDefaultSystemPrompt = useDebounceFn(async (prompt: string) => {
  if (defaultPromptSaveStatus.value === 'saving') return

  defaultPromptSaveStatus.value = 'saving'
  try {
    await settingsStore.setDefaultSystemPrompt(prompt)
    defaultPromptSaveStatus.value = 'saved'

    setTimeout(() => {
      if (defaultPromptSaveStatus.value === 'saved') {
        defaultPromptSaveStatus.value = 'idle'
      }
    }, 2000)
  } catch {
    defaultPromptSaveStatus.value = 'idle'
    toast({
      title: t('promptSetting.saveDefaultPromptFailed'),
      variant: 'destructive'
    })
  }
}, 1000)

// 监听默认系统提示词变化
watch(defaultSystemPrompt, (newValue) => {
  if (defaultPromptSaveStatus.value !== 'saving') {
    defaultPromptSaveStatus.value = 'typing'
  }
  saveDefaultSystemPrompt(newValue)
})

const handleDefaultPromptBlur = () => {
  if (defaultPromptSaveStatus.value === 'typing') {
    saveDefaultSystemPrompt(defaultSystemPrompt.value)
  }
}

const getStatusIcon = () => {
  switch (defaultPromptSaveStatus.value) {
    case 'typing':
      return 'lucide:edit-3'
    case 'saving':
      return 'lucide:loader-2'
    case 'saved':
      return 'lucide:check'
    default:
      return 'lucide:settings'
  }
}

const getStatusColor = () => {
  switch (defaultPromptSaveStatus.value) {
    case 'typing':
      return 'text-blue-500'
    case 'saving':
      return 'text-yellow-500'
    case 'saved':
      return 'text-green-500'
    default:
      return 'text-primary'
  }
}

onMounted(async () => {
  await loadPrompts()
  defaultSystemPrompt.value = await settingsStore.getDefaultSystemPrompt()
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>