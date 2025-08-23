<template>
  <div class="w-full h-full flex flex-col">
    <div class="p-4 border-b bg-card sticky top-0 z-10 flex items-center gap-2">
      <Icon icon="lucide:shopping-bag" class="w-4 h-4" />
      <h3 class="text-sm font-medium">{{ t('mcp.market.builtinTitle') }}</h3>
      <a
        href="https://mcprouter.co/"
        target="_blank"
        class="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {{ t('mcp.market.poweredBy') }}
      </a>
      <div class="ml-auto flex items-center gap-2">
        <div class="flex items-center gap-2">
          <Input
            v-model="apiKeyInput"
            type="password"
            :placeholder="t('mcp.market.apiKeyPlaceholder')"
            class="w-64"
          />
          <Button size="sm" @click="saveApiKey">{{ t('common.save') }}</Button>
        </div>
      </div>
    </div>

    <!-- API Key 获取提示 -->
    <div class="px-4 py-2 bg-muted/30 border-b text-xs text-muted-foreground">
      {{ t('mcp.market.keyHelpText') }}
      <Button
        variant="link"
        size="sm"
        class="text-xs p-0 h-auto font-normal text-primary hover:underline"
        @click="openHowToGetKey"
      >
        {{ t('mcp.market.keyGuide') }}
      </Button>
      {{ t('mcp.market.keyHelpEnd') }}
    </div>

    <!-- MCP全局开关 -->
    <div class="p-4 border-b bg-card">
      <div class="flex items-center justify-between">
        <div :dir="languageStore.dir">
          <h3 class="text-sm font-medium">{{ t('settings.mcp.enabledTitle') }}</h3>
          <p class="text-xs text-muted-foreground mt-1">
            {{ t('settings.mcp.enabledDescription') }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <Badge v-if="mcpEnabled" variant="default" class="text-xs">
            {{ t('mcp.status.enabled') }}
          </Badge>
          <Badge v-else variant="secondary" class="text-xs">
            {{ t('mcp.status.disabled') }}
          </Badge>
          <Switch dir="ltr" :checked="mcpEnabled" @update:checked="handleMcpEnabledChange" />
        </div>
      </div>
    </div>

    <!-- NPM源配置区域 -->
    <div class="border-b bg-card">
      <div class="p-4">
        <h4 class="text-sm font-medium mb-3">{{ t('settings.mcp.npmRegistry.title') }}</h4>
        <div class="space-y-3">
          <!-- 当前源状态 -->
          <div class="flex items-center justify-between bg-muted/30 rounded p-3">
            <div class="flex items-center gap-2">
              <Icon icon="lucide:globe" class="w-4 h-4 text-muted-foreground" />
              <div>
                <div class="text-xs text-muted-foreground">{{ t('settings.mcp.npmRegistry.currentRegistry') }}</div>
                <div class="text-sm font-mono truncate max-w-[300px]" :title="npmRegistryStatus.currentRegistry || undefined">
                  {{ npmRegistryStatus.currentRegistry || t('settings.mcp.npmRegistry.detecting') }}
                </div>
                <div v-if="npmRegistryStatus.lastChecked" class="text-xs text-muted-foreground mt-0.5">
                  {{ t('settings.mcp.npmRegistry.lastChecked') }}: {{ formatLastChecked(npmRegistryStatus.lastChecked) }}
                  <Badge v-if="npmRegistryStatus.isFromCache" variant="outline" class="ml-1 text-xs">
                    {{ t('settings.mcp.npmRegistry.cached') }}
                  </Badge>
                </div>
              </div>
            </div>
            <Button size="sm" @click="refreshNpmRegistry" :disabled="refreshing">
              <Icon v-if="refreshing" icon="lucide:loader-2" class="w-3.5 h-3.5 mr-1 animate-spin" />
              <Icon v-else icon="lucide:refresh-cw" class="w-3.5 h-3.5 mr-1" />
              {{ t('settings.mcp.npmRegistry.refresh') }}
            </Button>
          </div>

          <!-- 自动检测开关 -->
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-medium">{{ t('settings.mcp.npmRegistry.autoDetect') }}</div>
              <div class="text-xs text-muted-foreground">{{ t('settings.mcp.npmRegistry.autoDetectDesc') }}</div>
            </div>
            <Switch
              :checked="npmRegistryStatus.autoDetectEnabled"
              @update:checked="setAutoDetectNpmRegistry"
            />
          </div>

          <!-- 高级设置按钮 -->
          <div class="pt-1">
            <Dialog v-model:open="advancedDialogOpen">
              <DialogTrigger as-child>
                <Button variant="outline" size="sm" class="w-full">
                  <Icon icon="lucide:settings" class="w-3.5 h-3.5 mr-1" />
                  {{ t('settings.mcp.npmRegistry.advancedSettings') }}
                </Button>
              </DialogTrigger>
              <DialogContent class="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{{ t('settings.mcp.npmRegistry.advancedSettings') }}</DialogTitle>
                  <DialogDescription>
                    {{ t('settings.mcp.npmRegistry.advancedSettingsDesc') }}
                  </DialogDescription>
                </DialogHeader>
                <div class="space-y-4">
                  <div class="space-y-2">
                    <label class="text-sm font-medium">{{ t('settings.mcp.npmRegistry.customRegistry') }}</label>
                    <div class="flex gap-2">
                      <Input
                        v-model="customRegistryInput"
                        :placeholder="t('settings.mcp.npmRegistry.registryUrlPlaceholder')"
                        class="flex-1"
                      />
                      <Button size="sm" @click="saveCustomNpmRegistry">
                        {{ t('common.save') }}
                      </Button>
                    </div>
                    <div class="text-xs text-muted-foreground">
                      {{ t('settings.mcp.npmRegistry.customRegistryDesc') }}
                    </div>
                  </div>
                  <div v-if="npmRegistryStatus.customRegistry" class="space-y-2">
                    <div class="text-xs text-muted-foreground">
                      {{ t('settings.mcp.npmRegistry.currentCustom') }}: {{ npmRegistryStatus.customRegistry }}
                    </div>
                    <Button variant="outline" size="sm" @click="clearCustomNpmRegistry" class="w-full">
                      <Icon icon="lucide:trash-2" class="w-3.5 h-3.5 mr-1" />
                      {{ t('settings.mcp.npmRegistry.clearCustom') }}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>

    <!-- 外部MCP市场入口 -->
    <div class="p-4 border-b bg-card">
      <h4 class="text-sm font-medium mb-3">{{ t('mcp.market.externalMarkets') }}</h4>
      <div class="space-y-2">
        <div class="flex gap-2">
          <Button v-if="false" variant="outline" class="flex-1 flex items-center justify-center gap-2" @click="openMcpMarketplace">
            <Icon icon="lucide:shopping-bag" class="w-4 h-4" />
            <span>{{ t('settings.mcp.marketplace') }}</span>
            <Icon icon="lucide:external-link" class="w-3.5 h-3.5 text-muted-foreground" />
          </Button>

          <!-- Higress MCP Marketplace 入口 -->
          <Button variant="outline" class="flex-1 flex items-center justify-center gap-2" @click="openHigressMcpMarketplace">
            <img src="@/assets/mcp-icons/higress.avif" class="w-4 h-4" />
            <span>{{ t('settings.mcp.higressMarket') }}</span>
            <Icon icon="lucide:external-link" class="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </div>
        <div class="text-xs text-muted-foreground">
          {{ t('mcp.market.externalMarketsDesc') }}
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-auto" ref="scrollContainer" @scroll="onScroll">
      <div
        class="p-4 grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
      >
        <div
          v-for="item in items"
          :key="item.uuid"
          class="border rounded-lg p-3 bg-card hover:bg-accent/30 transition-colors flex flex-col"
        >
          <div class="text-xs text-muted-foreground">{{ item.author_name }}</div>
          <div class="text-sm font-semibold mt-1 line-clamp-1" :title="item.title">
            {{ item.title }}
          </div>
          <div class="text-xs mt-1 text-muted-foreground line-clamp-3" :title="item.description">
            {{ item.description }}
          </div>
          <div class="mt-2 flex items-center justify-between">
            <span class="text-xs font-mono px-2 py-0.5 bg-muted rounded">{{
              item.server_key
            }}</span>
            <Button
              size="sm"
              :variant="installedServers.has(item.server_key) ? 'secondary' : 'default'"
              :disabled="installedServers.has(item.server_key)"
              @click="install(item)"
            >
              <Icon
                :icon="installedServers.has(item.server_key) ? 'lucide:check' : 'lucide:download'"
                class="w-3.5 h-3.5 mr-1"
              />
              {{
                installedServers.has(item.server_key)
                  ? t('mcp.market.installed')
                  : t('mcp.market.install')
              }}
            </Button>
          </div>
        </div>
      </div>

      <div v-if="loading" class="py-4 text-center text-xs text-muted-foreground">
        <Icon icon="lucide:loader-2" class="inline w-4 h-4 animate-spin mr-1" />
        {{ t('common.loading') }}
      </div>
      <div v-if="showPullToLoad && !loading" class="py-4 text-center text-xs text-muted-foreground">
        {{ t('mcp.market.pullDownToLoad') }}
      </div>
      <div
        v-if="!hasMore && !showPullToLoad && items.length > 0"
        class="py-4 text-center text-xs text-muted-foreground"
      >
        {{ t('mcp.market.noMore') }}
      </div>
      <div
        v-if="!loading && items.length === 0"
        class="py-8 text-center text-xs text-muted-foreground"
      >
        {{ t('mcp.market.empty') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { usePresenter } from '@/composables/usePresenter'
import { useToast } from '@/components/ui/toast'
import { useMcpStore } from '@/stores/mcp'
import { useLanguageStore } from '@/stores/language'
import { MCP_MARKETPLACE_URL, HIGRESS_MCP_MARKETPLACE_URL } from '@/components/mcp-config/const'

const { t } = useI18n()
const { toast } = useToast()
const mcpP = usePresenter('mcpPresenter')
const mcpStore = useMcpStore()
const languageStore = useLanguageStore()

type MarketItem = {
  uuid: string
  created_at: string
  updated_at: string
  name: string
  author_name: string
  title: string
  description: string
  content?: string
  server_key: string
  config_name?: string
  server_url?: string
}

const items = ref<MarketItem[]>([])
const page = ref(1)
const limit = ref(20)
const loading = ref(false)
const hasMore = ref(true)
const scrollContainer = ref<HTMLDivElement | null>(null)
const showPullToLoad = ref(false)
const canPullMore = ref(false)
const installedServers = ref<Set<string>>(new Set())

const apiKeyInput = ref('')

// NPM Registry 相关状态
const npmRegistryStatus = ref<{
  currentRegistry: string | null
  isFromCache: boolean
  lastChecked?: number
  autoDetectEnabled: boolean
  customRegistry?: string
}>({
  currentRegistry: null,
  isFromCache: false,
  lastChecked: undefined,
  autoDetectEnabled: true,
  customRegistry: undefined
})

const refreshing = ref(false)
const customRegistryInput = ref('')
const advancedDialogOpen = ref(false)

// MCP全局开关相关
const mcpEnabled = computed(() => mcpStore.mcpEnabled)

// 处理MCP开关状态变化
const handleMcpEnabledChange = async (enabled: boolean) => {
  await mcpStore.setMcpEnabled(enabled)
}

// 外部市场相关方法
const openMcpMarketplace = () => {
  window.open(MCP_MARKETPLACE_URL, '_blank')
}

const openHigressMcpMarketplace = () => {
  window.open(HIGRESS_MCP_MARKETPLACE_URL, '_blank')
}

const loadApiKey = async () => {
  try {
    const key = await mcpP.getMcpRouterApiKey?.()
    apiKeyInput.value = key || ''
  } catch {}
}

const saveApiKey = async () => {
  try {
    const newKey = apiKeyInput.value.trim()
    await mcpP.setMcpRouterApiKey?.(newKey)

    // 更新现有 mcprouter 服务器的 Authorization header
    if (newKey) {
      await mcpP.updateMcpRouterServersAuth?.(newKey)
    }

    toast({ title: t('common.saved') })
  } catch (e) {
    toast({ title: t('common.error'), description: String(e), variant: 'destructive' })
  }
}

const openHowToGetKey = () => {
  window.open('https://mcprouter.co/settings/keys', '_blank')
}

const checkInstalledServers = async () => {
  const installed = new Set<string>()
  for (const item of items.value) {
    try {
      // 使用 server_key 作为 sourceId 检查安装状态，因为这是我们在安装时保存的标识符
      const isInstalled = await mcpP.isServerInstalled?.('mcprouter', item.server_key)
      if (isInstalled) {
        installed.add(item.server_key)
      }
    } catch (e) {
      console.error('Failed to check installation status:', e)
    }
  }
  installedServers.value = installed
}

const fetchPage = async (forcePull = false) => {
  if (loading.value || (!hasMore.value && !forcePull)) return
  loading.value = true
  showPullToLoad.value = false

  try {
    const data = await mcpP.listMcpRouterServers?.(page.value, limit.value)
    const list = data?.servers || []
    if (list.length === 0) {
      hasMore.value = false
      canPullMore.value = false
      return
    }
    items.value.push(...list)
    page.value += 1

    // 检查安装状态
    await checkInstalledServers()

    // 如果是强制拉取且成功获取到数据，重新启用拉取功能
    if (forcePull) {
      hasMore.value = true
      canPullMore.value = true
    }
  } catch (e) {
    toast({
      title: t('settings.provider.operationFailed'),
      description: String(e),
      variant: 'destructive'
    })
    // 错误时重置状态
    if (forcePull) {
      canPullMore.value = false
    }
  } finally {
    loading.value = false
  }
}

const onScroll = () => {
  const el = scrollContainer.value
  if (!el || loading.value) return

  const scrollTop = el.scrollTop
  const clientHeight = el.clientHeight
  const scrollHeight = el.scrollHeight
  const nearBottom = scrollTop + clientHeight >= scrollHeight - 400

  // 正常滚动加载
  if (hasMore.value && nearBottom) {
    fetchPage()
    return
  }

  // 检测过度滚动（内容不足一屏或已滚动到底部且没有更多内容）
  if (!hasMore.value) {
    const atBottom = scrollTop + clientHeight >= scrollHeight - 50
    const overScroll = scrollTop + clientHeight > scrollHeight
    const contentTooShort = scrollHeight <= clientHeight

    // 启用强制拉取模式
    if ((atBottom || overScroll || contentTooShort) && !canPullMore.value) {
      canPullMore.value = true
      showPullToLoad.value = true
    }

    // 检测强制拉取触发条件
    if (canPullMore.value && (overScroll || (contentTooShort && scrollTop > 0))) {
      fetchPage(true)
    }
  }
}

const install = async (item: MarketItem) => {
  try {
    if (!apiKeyInput.value.trim()) {
      toast({
        title: t('mcp.market.apiKeyRequiredTitle'),
        description: t('mcp.market.apiKeyRequiredDesc'),
        variant: 'destructive'
      })
      return
    }
    await mcpP.setMcpRouterApiKey?.(apiKeyInput.value.trim())
    const ok = await mcpP.installMcpRouterServer?.(item.server_key)
    if (ok) {
      toast({ title: t('mcp.market.installSuccess') })
      // 更新安装状态 - 使用 server_key 作为标识符
      installedServers.value.add(item.server_key)
    } else {
      toast({ title: t('mcp.market.installFailed'), variant: 'destructive' })
    }
  } catch (e) {
    toast({ title: t('mcp.market.installFailed'), description: String(e), variant: 'destructive' })
  }
}

// NPM Registry 相关方法
const loadNpmRegistryStatus = async () => {
  try {
    const status = await mcpStore.getNpmRegistryStatus()
    npmRegistryStatus.value = status
    customRegistryInput.value = status.customRegistry || ''
  } catch (error) {
    console.error('Failed to load npm registry status:', error)
  }
}

const refreshNpmRegistry = async () => {
  try {
    refreshing.value = true
    await mcpStore.refreshNpmRegistry()
    await loadNpmRegistryStatus()
    toast({
      title: t('settings.mcp.npmRegistry.refreshSuccess'),
      description: t('settings.mcp.npmRegistry.refreshSuccessDesc')
    })
  } catch (error) {
    console.error('Failed to refresh npm registry:', error)
    toast({
      title: t('settings.mcp.npmRegistry.refreshFailed'),
      description: error instanceof Error ? error.message : String(error),
      variant: 'destructive'
    })
  } finally {
    refreshing.value = false
  }
}

const setAutoDetectNpmRegistry = async (enabled: boolean) => {
  try {
    await mcpStore.setAutoDetectNpmRegistry(enabled)
    await loadNpmRegistryStatus()
    toast({
      title: t('settings.mcp.npmRegistry.autoDetectUpdated'),
      description: enabled
        ? t('settings.mcp.npmRegistry.autoDetectEnabled')
        : t('settings.mcp.npmRegistry.autoDetectDisabled')
    })
  } catch (error) {
    console.error('Failed to set auto detect npm registry:', error)
    toast({
      title: t('settings.mcp.npmRegistry.updateFailed'),
      description: error instanceof Error ? error.message : String(error),
      variant: 'destructive'
    })
  }
}

const normalizeNpmRegistryUrl = (registry: string): string => {
  let normalized = registry.trim()
  if (!normalized.endsWith('/')) {
    normalized += '/'
  }
  return normalized
}

// 验证自定义NPM源是否可用
const validateCustomRegistry = async (registry: string): Promise<boolean> => {
  try {
    if (!registry.startsWith('http://') && !registry.startsWith('https://')) {
      toast({
        title: t('settings.mcp.npmRegistry.invalidUrl'),
        description: t('settings.mcp.npmRegistry.invalidUrlDesc'),
        variant: 'destructive'
      })
      return false
    }
    const normalizedRegistry = normalizeNpmRegistryUrl(registry)
    const testPackage = 'tiny-runtime-injector'
    const testUrl = `${normalizedRegistry}${testPackage}`
    toast({
      title: t('settings.mcp.npmRegistry.testing'),
      description: t('settings.mcp.npmRegistry.testingDesc', { registry: normalizedRegistry })
    })
    const response = await fetch(testUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000)
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return true
  } catch (error) {
    console.error('Custom registry validation failed:', error)
    toast({
      title: t('settings.mcp.npmRegistry.testFailed'),
      description: t('settings.mcp.npmRegistry.testFailedDesc', {
        registry: normalizeNpmRegistryUrl(registry),
        error: error instanceof Error ? error.message : String(error)
      }),
      variant: 'destructive'
    })
    return false
  }
}

const saveCustomNpmRegistry = async () => {
  try {
    const registry = customRegistryInput.value.trim()
    if (!registry) {
      return
    }
    const isValid = await validateCustomRegistry(registry)
    if (!isValid) {
      return
    }
    await mcpStore.setCustomNpmRegistry(registry)
    await loadNpmRegistryStatus()
    const normalizedRegistry = npmRegistryStatus.value.customRegistry
    if (normalizedRegistry) {
      customRegistryInput.value = normalizedRegistry
    }
    toast({
      title: t('settings.mcp.npmRegistry.customSourceSet'),
      description: t('settings.mcp.npmRegistry.customSourceSetDesc', {
        registry: normalizedRegistry || registry
      })
    })
  } catch (error) {
    console.error('Failed to save custom npm registry:', error)
    toast({
      title: t('settings.mcp.npmRegistry.updateFailed'),
      description: error instanceof Error ? error.message : String(error),
      variant: 'destructive'
    })
  }
}

const clearCustomNpmRegistry = async () => {
  try {
    await mcpStore.setCustomNpmRegistry(undefined)
    customRegistryInput.value = ''
    await mcpStore.clearNpmRegistryCache()
    toast({
      title: t('settings.mcp.npmRegistry.customSourceCleared'),
      description: t('settings.mcp.npmRegistry.redetectingOptimal')
    })
    try {
      await mcpStore.refreshNpmRegistry()
      await loadNpmRegistryStatus()
      toast({
        title: t('settings.mcp.npmRegistry.redetectComplete'),
        description: t('settings.mcp.npmRegistry.redetectCompleteDesc')
      })
      advancedDialogOpen.value = false
    } catch (detectError) {
      console.error('Failed to re-detect optimal registry:', detectError)
      await loadNpmRegistryStatus()
      toast({
        title: t('settings.mcp.npmRegistry.redetectFailed'),
        description: t('settings.mcp.npmRegistry.redetectFailedDesc'),
        variant: 'destructive'
      })
      advancedDialogOpen.value = false
    }
  } catch (error) {
    console.error('Failed to clear custom npm registry:', error)
    toast({
      title: t('settings.mcp.npmRegistry.updateFailed'),
      description: error instanceof Error ? error.message : String(error),
      variant: 'destructive'
    })
  }
}

const formatLastChecked = (timestamp: number) => {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (minutes < 1) {
    return t('settings.mcp.npmRegistry.justNow')
  } else if (minutes < 60) {
    return t('settings.mcp.npmRegistry.minutesAgo', { minutes })
  } else if (hours < 24) {
    return t('settings.mcp.npmRegistry.hoursAgo', { hours })
  } else {
    return t('settings.mcp.npmRegistry.daysAgo', { days })
  }
}

onMounted(async () => {
  await loadApiKey()
  await loadNpmRegistryStatus()
  await fetchPage()

  // 初始加载后检查是否需要启用强制拉取模式
  setTimeout(() => {
    const el = scrollContainer.value
    if (el && !hasMore.value) {
      const contentTooShort = el.scrollHeight <= el.clientHeight
      if (contentTooShort && items.value.length > 0) {
        canPullMore.value = true
        showPullToLoad.value = true
      }
    }
  }, 100)
})
</script>

<style scoped></style>
