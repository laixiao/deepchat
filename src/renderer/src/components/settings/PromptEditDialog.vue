<template>
  <Sheet :open="open" @update:open="(value) => $emit('update:open', value)">
    <SheetContent
      side="right"
      class="!w-[75vw] !max-w-[95vw] h-full flex flex-col p-0 bg-background"
    >
      <SheetHeader class="px-6 py-4 border-b bg-card/50">
        <SheetTitle class="flex items-center gap-2">
          <Icon
            :icon="editingIdx === null ? 'lucide:plus-circle' : 'lucide:edit-3'"
            class="w-5 h-5 text-primary"
          />
          <span>
            {{ editingIdx === null ? t('promptSetting.addTitle') : t('promptSetting.editTitle') }}
          </span>
        </SheetTitle>
        <SheetDescription>
          {{
            editingIdx === null
              ? t('promptSetting.addDescription')
              : t('promptSetting.editDescription')
          }}
        </SheetDescription>
      </SheetHeader>

      <ScrollArea class="flex-1 px-6">
        <div class="py-6 space-y-6">
          <!-- 基本信息区域 -->
          <div class="space-y-4">
            <div class="flex items-center gap-2 pb-2 border-b border-border">
              <Icon icon="lucide:info" class="w-4 h-4 text-primary" />
              <Label class="text-sm font-medium text-muted-foreground">{{
                t('promptSetting.basicInfo')
              }}</Label>
            </div>

            <div class="space-y-4">
              <div>
                <Label class="text-sm font-medium">{{ t('promptSetting.name') }}</Label>
                <Input
                  v-model="form.name"
                  :placeholder="t('promptSetting.namePlaceholder')"
                  class="mt-2"
                />
              </div>
              <div>
                <Label class="text-sm font-medium">{{ t('promptSetting.description') }}</Label>
                <Input
                  v-model="form.description"
                  :placeholder="t('promptSetting.descriptionPlaceholder')"
                  class="mt-2"
                />
              </div>
            </div>

            <div class="flex items-center space-x-2 pt-2">
              <Checkbox
                id="prompt-enabled"
                :checked="form.enabled"
                @update:checked="(value) => (form.enabled = value)"
              />
              <Label for="prompt-enabled" class="text-sm">{{
                t('promptSetting.enablePrompt')
              }}</Label>
            </div>
          </div>

          <!-- 内容区域 -->
          <div class="space-y-4">
            <div class="flex items-center gap-2 pb-2 border-b border-border">
              <Icon icon="lucide:file-text" class="w-4 h-4 text-primary" />
              <Label class="text-sm font-medium text-muted-foreground">{{
                t('promptSetting.content')
              }}</Label>
            </div>

            <div>
              <textarea
                v-model="form.content"
                class="w-full min-h-48 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono resize-y"
                :placeholder="t('promptSetting.contentPlaceholder')"
              ></textarea>
              <p class="text-xs text-muted-foreground mt-2">
                {{ t('promptSetting.contentTip', { openBrace: '{', closeBrace: '}' }) }}
              </p>
            </div>
          </div>

          <!-- 参数区域 -->
          <div class="space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-border">
              <div class="flex items-center gap-2">
                <Icon icon="lucide:settings" class="w-4 h-4 text-primary" />
                <Label class="text-sm font-medium text-muted-foreground">{{
                  t('promptSetting.parameters')
                }}</Label>
              </div>
              <Button variant="outline" size="sm" @click="addParameter">
                <Icon icon="lucide:plus" class="w-4 h-4 mr-1" />
                {{ t('promptSetting.addParameter') }}
              </Button>
            </div>

            <div v-if="form.parameters?.length" class="space-y-4">
              <div
                v-for="(param, index) in form.parameters"
                :key="index"
                class="relative p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <!-- 删除按钮 -->
                <Button
                  variant="ghost"
                  size="icon"
                  class="absolute top-3 right-3 h-7 w-7 bg-background/80 border border-border/50 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all duration-200"
                  :title="t('common.delete')"
                  @click="removeParameter(index)"
                >
                  <Icon icon="lucide:x" class="w-3.5 h-3.5" />
                </Button>

                <div class="space-y-3 pr-10">
                  <!-- 参数名称和必需状态 -->
                  <div class="flex items-center gap-3">
                    <div class="flex-1">
                      <Label class="text-sm text-muted-foreground">{{
                        t('promptSetting.parameterName')
                      }}</Label>
                      <Input
                        v-model="param.name"
                        :placeholder="t('promptSetting.parameterNamePlaceholder')"
                        class="mt-2"
                      />
                    </div>
                    <div class="flex items-center space-x-2 pt-5">
                      <Checkbox
                        :id="`param-required-${index}`"
                        :checked="param.required"
                        @update:checked="(value) => (param.required = value)"
                      />
                      <Label :for="`param-required-${index}`" class="text-sm">
                        {{ t('promptSetting.required') }}
                      </Label>
                    </div>
                  </div>

                  <!-- 参数描述 -->
                  <div>
                    <Label class="text-sm text-muted-foreground">{{
                      t('promptSetting.parameterDescription')
                    }}</Label>
                    <Input
                      v-model="param.description"
                      :placeholder="t('promptSetting.parameterDescriptionPlaceholder')"
                      class="mt-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div
              v-else
              class="text-center text-muted-foreground py-12 border-2 border-dashed border-muted rounded-lg bg-muted/20"
            >
              <Icon icon="lucide:settings" class="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p class="text-sm">{{ t('promptSetting.noParameters') }}</p>
              <p class="text-xs text-muted-foreground/70 mt-1">
                {{ t('promptSetting.noParametersDesc') }}
              </p>
            </div>
          </div>

          <!-- 文件管理区域 -->
          <div class="space-y-4">
            <div class="flex items-center gap-2 pb-2 border-b border-border">
              <Icon icon="lucide:folder" class="w-4 h-4 text-primary" />
              <Label class="text-sm font-medium text-muted-foreground">{{
                t('promptSetting.fileManagement')
              }}</Label>
            </div>

            <!-- 上传选项 -->
            <div>
              <div
                class="group border-2 border-dashed border-muted rounded-lg p-4 hover:border-primary/50 hover:bg-muted/20 transition-all cursor-pointer"
                @click="uploadFile"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors"
                  >
                    <Icon icon="lucide:upload" class="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p class="text-sm font-medium">{{ t('promptSetting.uploadFromDevice') }}</p>
                    <p class="text-xs text-muted-foreground">
                      {{ t('promptSetting.uploadFromDeviceDesc') }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- 已上传文件列表 -->
            <div v-if="form.files?.length" class="space-y-2">
              <Label class="text-sm font-medium text-muted-foreground">{{
                t('promptSetting.uploadedFiles')
              }}</Label>
              <div class="space-y-2 max-h-32 overflow-y-auto">
                <div
                  v-for="(file, index) in form.files"
                  :key="file.id"
                  class="flex items-center justify-between p-2 bg-muted/50 rounded-md border"
                >
                  <div class="flex items-center gap-2 flex-1 min-w-0">
                    <Icon
                      :icon="getMimeTypeIcon(file.type)"
                      class="w-4 h-4 text-muted-foreground flex-shrink-0"
                    />
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium truncate" :title="file.name">
                        {{ file.name }}
                      </p>
                      <p class="text-xs text-muted-foreground">
                        {{ formatFileSize(file.size) }}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    :title="t('common.delete')"
                    @click="removeFile(index)"
                  >
                    <Icon icon="lucide:x" class="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            <div
              v-else
              class="text-center text-muted-foreground py-8 border-2 border-dashed border-muted rounded-lg bg-muted/20"
            >
              <Icon icon="lucide:folder" class="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p class="text-sm">{{ t('promptSetting.noFiles') }}</p>
              <p class="text-xs text-muted-foreground/70 mt-1">
                {{ t('promptSetting.noFilesUploadDesc') }}
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>

      <SheetFooter class="px-6 py-4 border-t bg-card/50">
        <div class="flex justify-between w-full">
          <div class="text-xs text-muted-foreground flex items-center">
            <Icon icon="lucide:info" class="w-4 h-4 mr-1" />
            {{ form.content.length }} {{ t('promptSetting.characters') }}
          </div>
          <div class="flex gap-2">
            <Button variant="outline" @click="$emit('close')">{{ t('common.cancel') }}</Button>
            <Button :disabled="!form.name || !form.content" @click="$emit('save')">
              <Icon
                :icon="editingIdx === null ? 'lucide:plus' : 'lucide:save'"
                class="w-4 h-4 mr-1"
              />
              {{ t('common.confirm') }}
            </Button>
          </div>
        </div>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet'
import { useToast } from '@/components/ui/toast'
import { MessageFile } from '@shared/chat'
import { usePresenter } from '@/composables/usePresenter'
import { nanoid } from 'nanoid'
import { getMimeTypeIcon } from '@/lib/utils'
import { FileItem } from '@shared/presenter'

interface Props {
  open: boolean
  form: any
  editingIdx: number | null
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'save'): void
  (e: 'close'): void
}

const props = defineProps<Props>()
defineEmits<Emits>()

const { t } = useI18n()
const { toast } = useToast()
const filePresenter = usePresenter('filePresenter')

const addParameter = () => {
  if (!props.form.parameters) {
    props.form.parameters = []
  }
  props.form.parameters.push({
    name: '',
    description: '',
    required: true
  })
}

const removeParameter = (index: number) => {
  props.form.parameters?.splice(index, 1)
}

const uploadFile = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.multiple = true
  input.accept = '.txt,.md,.csv,.json,.xml,.pdf,.doc,.docx'
  input.onchange = async (e) => {
    const files = (e.target as HTMLInputElement).files
    if (files) {
      await Promise.all(
        Array.from(files).map(async (file) => {
          const path = window.api.getPathForFile(file)
          const mimeType = await filePresenter.getMimeType(path)
          const fileInfo: MessageFile = await filePresenter.prepareFile(path, mimeType)

          const fileItem: FileItem = {
            id: nanoid(8),
            name: fileInfo.name,
            type: fileInfo.mimeType,
            size: fileInfo.metadata.fileSize,
            path: fileInfo.path,
            description: fileInfo.metadata.fileDescription,
            content: fileInfo.content,
            createdAt: Date.now()
          }

          if (!props.form.files) {
            props.form.files = []
          }
          props.form.files.push(fileItem)
        })
      )
      toast({
        title: t('promptSetting.uploadSuccess'),
        description: `${t('promptSetting.uploadedCount', { count: files.length })}`,
        variant: 'default'
      })
    }
  }
  input.click()
}

const removeFile = (index: number) => {
  if (props.form.files) {
    props.form.files.splice(index, 1)
  }
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

</script>

<style scoped>
/* Custom styles if needed */
</style>