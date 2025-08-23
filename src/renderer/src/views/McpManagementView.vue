<template>
  <div class="w-full h-full flex flex-col">
    <!-- 固定部分 -->
    <div class="flex-shrink-0 bg-background sticky top-0 z-10">
      <!-- 标题栏 -->
      <div class="bg-card border-b p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <Icon icon="lucide:cpu" class="w-6 h-6 text-primary" />
            <div>
              <h1 class="text-lg font-semibold">{{ t('mcp.capability.title') }}</h1>
              <p class="text-sm text-muted-foreground">{{ t('mcp.capability.description') }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Badge v-if="mcpEnabled" variant="default" class="text-xs">
              {{ t('mcp.status.enabled') }}
            </Badge>
            <Badge v-else variant="secondary" class="text-xs">
              {{ t('mcp.status.disabled') }}
            </Badge>
          </div>
        </div>
      </div>
    </div>

    <!-- 可滚动部分 -->
    <!-- MCP服务器管理 -->
    <div class="flex-grow overflow-y-auto">
      <div v-if="mcpEnabled" class="border-t h-full">
        <McpServers />
      </div>
      <div v-else class="p-4 text-center text-muted-foreground text-sm">
        {{ t('settings.mcp.enableToAccess') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import { useTitle } from '@vueuse/core'
import McpServers from '@/components/mcp-config/components/McpServers.vue'
import { Badge } from '@/components/ui/badge'
import { Icon } from '@iconify/vue'
import { useMcpStore } from '@/stores/mcp'

const { t } = useI18n()
const mcpStore = useMcpStore()
const title = useTitle()

// 设置页面标题
title.value = t('mcp.capability.title')

// 计算属性
const mcpEnabled = computed(() => mcpStore.mcpEnabled)
</script>

<style scoped>
/* 自定义样式如果需要 */
</style>