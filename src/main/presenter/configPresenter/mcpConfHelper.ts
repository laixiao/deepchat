import { eventBus, SendTarget } from '@/eventbus'
import { MCPServerConfig } from '@shared/presenter'
import { MCP_EVENTS } from '@/events'
import ElectronStore from 'electron-store'
import { app } from 'electron'
import { compare } from 'compare-versions'
import { presenter } from '..'

// NPM Registry缓存接口
export interface INpmRegistryCache {
  registry: string
  lastChecked: number
  isAutoDetect: boolean
}

// MCP设置的接口
interface IMcpSettings {
  mcpServers: Record<string, MCPServerConfig>
  defaultServer?: string // 保留旧字段以支持版本兼容
  defaultServers: string[] // 新增：多个默认服务器数组
  mcpEnabled: boolean // 添加MCP启用状态字段
  npmRegistryCache?: INpmRegistryCache // NPM源缓存
  customNpmRegistry?: string // 用户自定义NPM源
  autoDetectNpmRegistry?: boolean // 是否启用自动检测
  [key: string]: unknown // 允许任意键
}
export type MCPServerType = 'stdio' | 'sse' | 'inmemory' | 'http'

// Extended MCP server config with additional properties for ModelScope sync
export interface ExtendedMCPServerConfig {
  name: string
  description: string
  args: string[]
  env: Record<string, string>
  enabled: boolean
  type: MCPServerType
  package?: string
  version?: string
  source?: string
  logo_url?: string
  publisher?: string
  tags?: string[]
  view_count?: number
}

// 检查当前系统平台
function isMacOS(): boolean {
  return process.platform === 'darwin'
}

function isWindows(): boolean {
  return process.platform === 'win32'
}

function isLinux(): boolean {
  return process.platform === 'linux'
}

// 平台特有的 MCP 服务器配置
const PLATFORM_SPECIFIC_SERVERS: Record<string, MCPServerConfig> = {
  // macOS 特有服务
  ...(isMacOS()
    ? {
        'deepchat/apple-server': {
          args: [],
          descriptions: 'DeepChat内置Apple系统集成服务 (仅macOS)',
          icons: '🍎',
          autoApprove: ['all'],
          type: 'inmemory' as MCPServerType,
          command: 'deepchat/apple-server',
          env: {},
          disable: false
        }
      }
    : {}),

  // Windows 特有服务 (预留)
  ...(isWindows()
    ? {
        // 'deepchat-inmemory/windows-server': {
        //   args: [],
        //   descriptions: 'DeepChat内置Windows系统集成服务 (仅Windows)',
        //   icons: '🪟',
        //   autoApprove: ['all'],
        //   type: 'inmemory' as MCPServerType,
        //   command: 'deepchat-inmemory/windows-server',
        //   env: {},
        //   disable: false
        // }
      }
    : {}),

  // Linux 特有服务 (预留)
  ...(isLinux()
    ? {
        // 'deepchat-inmemory/linux-server': {
        //   args: [],
        //   descriptions: 'DeepChat内置Linux系统集成服务 (仅Linux)',
        //   icons: '🐧',
        //   autoApprove: ['all'],
        //   type: 'inmemory' as MCPServerType,
        //   command: 'deepchat-inmemory/linux-server',
        //   env: {},
        //   disable: false
        // }
      }
    : {})
}

// 抽取inmemory类型的服务为常量
const DEFAULT_INMEMORY_SERVERS: Record<string, MCPServerConfig> = {
  buildInFileSystem: {
    args: [app.getPath('home')],
    descriptions: 'DeepChat内置文件系统mcp服务',
    icons: '📁',
    autoApprove: ['read'],
    type: 'inmemory' as MCPServerType,
    command: 'filesystem',
    env: {},
    disable: true
  },
  Artifacts: {
    args: [],
    descriptions: 'DeepChat内置 artifacts mcp服务',
    icons: '🎨',
    autoApprove: ['all'],
    type: 'inmemory' as MCPServerType,
    command: 'artifacts',
    env: {},
    disable: false
  },
  bochaSearch: {
    args: [],
    descriptions: 'DeepChat内置博查搜索服务',
    icons: '🔍',
    autoApprove: ['all'],
    type: 'inmemory' as MCPServerType,
    command: 'bochaSearch',
    env: {
      apiKey: 'YOUR_BOCHA_API_KEY' // 需要用户提供实际的API Key
    },
    disable: false
  },
  braveSearch: {
    args: [],
    descriptions: 'DeepChat内置Brave搜索服务',
    icons: '🦁',
    autoApprove: ['all'],
    type: 'inmemory' as MCPServerType,
    command: 'braveSearch',
    env: {
      apiKey: 'YOUR_BRAVE_API_KEY' // 需要用户提供实际的API Key
    },
    disable: false
  },
  difyKnowledge: {
    args: [],
    descriptions: 'DeepChat内置Dify知识库检索服务',
    icons: '📚',
    autoApprove: ['all'],
    type: 'inmemory' as MCPServerType,
    command: 'difyKnowledge',
    env: {
      configs: [
        {
          description: 'this is a description for the current knowledge base',
          apiKey: 'YOUR_DIFY_API_KEY',
          datasetId: 'YOUR_DATASET_ID',
          endpoint: 'http://localhost:3000/v1'
        }
      ]
    },
    disable: false
  },
  mediaServer: {
    args: [],
    descriptions: 'Media processing MCP service (images, videos, audio)',
    icons: '🎬',
    autoApprove: ['read_media_base64', 'read_multiple_media_base64', 'get_media_info'], // Auto-approve reading, require confirmation for uploads
    type: 'inmemory' as MCPServerType,
    command: 'media', // We need to map this command to the MediaServer class later
    env: {},
    disable: false
  },
  powerpack: {
    args: [],
    descriptions: 'DeepChat内置增强工具包',
    icons: '🛠️',
    autoApprove: ['all'],
    type: 'inmemory' as MCPServerType,
    command: 'powerpack',
    env: {},
    disable: false
  },
  ragflowKnowledge: {
    args: [],
    descriptions: 'DeepChat内置RAGFlow知识库检索服务',
    icons: '📚',
    autoApprove: ['all'],
    type: 'inmemory' as MCPServerType,
    command: 'ragflowKnowledge',
    env: {
      configs: [
        {
          description: '默认RAGFlow知识库',
          apiKey: 'YOUR_RAGFLOW_API_KEY',
          datasetIds: ['YOUR_DATASET_ID'],
          endpoint: 'http://localhost:8000'
        }
      ]
    },
    disable: false
  },
  fastGptKnowledge: {
    args: [],
    descriptions: 'DeepChat内置FastGPT知识库检索服务',
    icons: '📚',
    autoApprove: ['all'],
    type: 'inmemory' as MCPServerType,
    command: 'fastGptKnowledge',
    env: {
      configs: [
        {
          description: 'this is a description for the current knowledge base',
          apiKey: 'YOUR_FastGPT_API_KEY',
          datasetId: 'YOUR_DATASET_ID',
          endpoint: 'http://localhost:3000/api'
        }
      ]
    },
    disable: false
  },
  builtinKnowledge: {
    args: [],
    descriptions: 'DeepChat内置知识库检索服务',
    icons: '📚',
    autoApprove: ['all'],
    type: 'inmemory' as MCPServerType,
    command: 'builtinKnowledge',
    env: {
      configs: []
    },
    disable: false
  },
  'deepchat-inmemory/deep-research-server': {
    args: [],
    descriptions:
      'DeepChat内置深度研究服务，使用博查搜索(注意该服务需要较长的上下文模型，请勿在短上下文的模型中使用)',
    icons: '🔬',
    autoApprove: ['all'],
    type: 'inmemory' as MCPServerType,
    command: 'deepchat-inmemory/deep-research-server',
    env: {
      BOCHA_API_KEY: 'YOUR_BOCHA_API_KEY'
    },
    disable: false
  },
  'deepchat-inmemory/auto-prompting-server': {
    args: [],
    descriptions: 'DeepChat内置自动模板提示词服务',
    icons: '📜',
    autoApprove: ['all'],
    type: 'inmemory' as MCPServerType,
    command: 'deepchat-inmemory/auto-prompting-server',
    env: {},
    disable: false
  },
  'deepchat-inmemory/conversation-search-server': {
    args: [],
    descriptions: 'DeepChat built-in conversation history search service',
    icons: '🔍',
    autoApprove: ['all'],
    type: 'inmemory' as MCPServerType,
    command: 'deepchat-inmemory/conversation-search-server',
    env: {},
    disable: false
  },
  'deepchat-inmemory/meeting-server': {
    args: [],
    descriptions: 'DeepChat内置会议服务，用于组织多Agent讨论',
    icons: '👥',
    autoApprove: ['all'],
    type: 'inmemory' as MCPServerType,
    command: 'deepchat-inmemory/meeting-server',
    env: {},
    disable: false
  },
  // 合并平台特有服务
  ...PLATFORM_SPECIFIC_SERVERS
}

const DEFAULT_MCP_SERVERS = {
  mcpServers: {
    // 先定义内置MCP服务器
    ...DEFAULT_INMEMORY_SERVERS,
    // 之后是默认的三方MCP服务器
    memory: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory'],
      env: {},
      descriptions: '内存存储服务',
      icons: '🧠',
      autoApprove: ['all'],
      disable: true,
      type: 'stdio' as MCPServerType
    }
  },
  defaultServers: [
    'Artifacts',
    // 根据平台添加默认启用的平台特有服务
    ...(isMacOS() ? ['deepchat/apple-server'] : [])
  ],
  mcpEnabled: false // 默认关闭MCP功能
}
// 这部分mcp有系统逻辑判断是否启用，不受用户配置控制，受软件环境控制
export const SYSTEM_INMEM_MCP_SERVERS: Record<string, MCPServerConfig> = {
  'deepchat-inmemory/custom-prompts-server': {
    command: 'deepchat-inmemory/custom-prompts-server',
    args: [],
    env: {},
    descriptions: 'DeepChat内置自定义提示词服务',
    icons: '📝',
    autoApprove: ['all'],
    type: 'inmemory' as MCPServerType,
    disable: false
  }
}

export class McpConfHelper {
  private mcpStore: ElectronStore<IMcpSettings>

  constructor() {
    // 初始化MCP设置存储
    this.mcpStore = new ElectronStore<IMcpSettings>({
      name: 'mcp-settings',
      defaults: {
        mcpServers: DEFAULT_MCP_SERVERS.mcpServers,
        defaultServers: DEFAULT_MCP_SERVERS.defaultServers,
        mcpEnabled: DEFAULT_MCP_SERVERS.mcpEnabled,
        autoDetectNpmRegistry: true,
        npmRegistryCache: undefined,
        customNpmRegistry: undefined
      }
    })
  }

  // 获取MCP服务器配置
  async getMcpServers(): Promise<Record<string, MCPServerConfig>> {
    const storedServers = this.mcpStore.get('mcpServers') || DEFAULT_MCP_SERVERS.mcpServers

    // 检查并补充缺少的inmemory服务
    const updatedServers = { ...storedServers }

    // 遍历所有默认的inmemory服务，确保它们都存在
    for (const [serverName, serverConfig] of Object.entries(DEFAULT_INMEMORY_SERVERS)) {
      if (!updatedServers[serverName]) {
        console.log(`添加缺少的inmemory服务: ${serverName}`)
        updatedServers[serverName] = serverConfig
      }
    }

    // 移除不支持当前平台的服务
    const serversToRemove: string[] = []
    for (const [serverName, serverConfig] of Object.entries(updatedServers)) {
      if (serverConfig.type === 'inmemory') {
        // 检查是否为平台特有服务
        if (serverName === 'deepchat/apple-server' && !isMacOS()) {
          serversToRemove.push(serverName)
        }
        // 可以在这里添加其他平台特有服务的检查
        // if (serverName === 'deepchat-inmemory/windows-server' && !isWindows()) {
        //   serversToRemove.push(serverName)
        // }
        // if (serverName === 'deepchat-inmemory/linux-server' && !isLinux()) {
        //   serversToRemove.push(serverName)
        // }
      }
    }

    // 移除不支持的平台特有服务
    for (const serverName of serversToRemove) {
      console.log(`移除不支持当前平台的服务: ${serverName}`)
      delete updatedServers[serverName]
    }

    // 移除不兼容的服务
    const builtinKnowledgeSupported = await presenter.knowledgePresenter.isSupported()
    if (!builtinKnowledgeSupported) {
      console.warn('内置知识库服务不支持当前环境，移除相关服务')
      delete updatedServers.builtinKnowledge
    }

    // 如果有变化，更新存储
    if (
      Object.keys(updatedServers).length !== Object.keys(storedServers).length ||
      serversToRemove.length > 0
    ) {
      this.mcpStore.set('mcpServers', updatedServers)
    }

    return Promise.resolve(updatedServers)
  }

  // 设置MCP服务器配置
  async setMcpServers(servers: Record<string, MCPServerConfig>): Promise<void> {
    this.mcpStore.set('mcpServers', servers)
    eventBus.send(MCP_EVENTS.CONFIG_CHANGED, SendTarget.ALL_WINDOWS, {
      mcpServers: servers,
      defaultServers: this.mcpStore.get('defaultServers') || [],
      mcpEnabled: this.mcpStore.get('mcpEnabled')
    })
  }

  // 获取默认服务器列表
  getMcpDefaultServers(): Promise<string[]> {
    return Promise.resolve(this.mcpStore.get('defaultServers') || [])
  }

  // 添加默认服务器
  async addMcpDefaultServer(serverName: string): Promise<void> {
    const defaultServers = this.mcpStore.get('defaultServers') || []
    const mcpServers = await this.getMcpServers() // 使用getMcpServers确保平台检查

    // 检测并清理失效的服务器
    const validDefaultServers = defaultServers.filter((server) => {
      const exists = mcpServers[server] !== undefined
      if (!exists) {
        console.log(`检测到失效的MCP服务器: ${server}，已从默认列表中移除`)
      }
      return exists
    })

    // 检查要添加的服务器是否存在且支持当前平台
    if (mcpServers[serverName]) {
      // 添加新服务器（如果不在列表中）
      if (!validDefaultServers.includes(serverName)) {
        validDefaultServers.push(serverName)
      }
    } else {
      console.log(`尝试添加不存在或不支持当前平台的MCP服务器: ${serverName}`)
      return
    }

    // 如果有变化则更新存储并发送事件
    if (
      validDefaultServers.length !== defaultServers.length ||
      !defaultServers.includes(serverName)
    ) {
      this.mcpStore.set('defaultServers', validDefaultServers)
      eventBus.send(MCP_EVENTS.CONFIG_CHANGED, SendTarget.ALL_WINDOWS, {
        mcpServers: mcpServers,
        defaultServers: validDefaultServers,
        mcpEnabled: this.mcpStore.get('mcpEnabled')
      })
    }
  }

  // 移除默认服务器
  async removeMcpDefaultServer(serverName: string): Promise<void> {
    const defaultServers = this.mcpStore.get('defaultServers') || []
    const updatedServers = defaultServers.filter((name) => name !== serverName)
    this.mcpStore.set('defaultServers', updatedServers)
    eventBus.send(MCP_EVENTS.CONFIG_CHANGED, SendTarget.ALL_WINDOWS, {
      mcpServers: this.mcpStore.get('mcpServers'),
      defaultServers: updatedServers,
      mcpEnabled: this.mcpStore.get('mcpEnabled')
    })
  }

  // 切换服务器的默认状态
  async toggleMcpDefaultServer(serverName: string): Promise<void> {
    const defaultServers = this.mcpStore.get('defaultServers') || []
    if (defaultServers.includes(serverName)) {
      await this.removeMcpDefaultServer(serverName)
    } else {
      await this.addMcpDefaultServer(serverName)
    }
  }

  // 设置MCP启用状态
  async setMcpEnabled(enabled: boolean): Promise<void> {
    this.mcpStore.set('mcpEnabled', enabled)
    eventBus.send(MCP_EVENTS.CONFIG_CHANGED, SendTarget.ALL_WINDOWS, {
      mcpServers: this.mcpStore.get('mcpServers'),
      defaultServers: this.mcpStore.get('defaultServers'),
      mcpEnabled: enabled
    })
  }

  // 获取MCP启用状态
  getMcpEnabled(): Promise<boolean> {
    return Promise.resolve(this.mcpStore.get('mcpEnabled') ?? DEFAULT_MCP_SERVERS.mcpEnabled)
  }

  // 添加MCP服务器
  async addMcpServer(name: string, config: MCPServerConfig): Promise<boolean> {
    const mcpServers = await this.getMcpServers()
    mcpServers[name] = config
    await this.setMcpServers(mcpServers)
    return true
  }

  // 获取NPM Registry缓存
  getNpmRegistryCache(): INpmRegistryCache | undefined {
    return this.mcpStore.get('npmRegistryCache')
  }

  // 设置NPM Registry缓存
  setNpmRegistryCache(cache: INpmRegistryCache): void {
    this.mcpStore.set('npmRegistryCache', cache)
  }

  // 检查缓存是否有效（24小时内）
  isNpmRegistryCacheValid(): boolean {
    const cache = this.getNpmRegistryCache()
    if (!cache) return false
    const now = Date.now()
    const cacheAge = now - cache.lastChecked
    const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24小时
    return cacheAge < CACHE_DURATION
  }

  // 获取有效的NPM Registry（按优先级：自定义源 > 缓存 > 默认）
  getEffectiveNpmRegistry(): string | null {
    const customRegistry = this.getCustomNpmRegistry()
    if (customRegistry) {
      console.log(`[NPM Registry] Using custom registry: ${customRegistry}`)
      return customRegistry
    }

    if (this.getAutoDetectNpmRegistry() && this.isNpmRegistryCacheValid()) {
      const cache = this.getNpmRegistryCache()
      if (cache?.registry) {
        console.log(`[NPM Registry] Using cached registry: ${cache.registry}`)
        return cache.registry
      }
    }

    console.log('[NPM Registry] No effective registry found, will use default or detect')
    return null
  }

  // 获取自定义NPM Registry
  getCustomNpmRegistry(): string | undefined {
    return this.mcpStore.get('customNpmRegistry')
  }

  // 标准化NPM Registry URL
  private normalizeNpmRegistryUrl(registry: string): string {
    let normalized = registry.trim()
    if (!normalized.endsWith('/')) {
      normalized += '/'
    }
    return normalized
  }

  // 设置自定义NPM Registry
  setCustomNpmRegistry(registry: string | undefined): void {
    if (registry === undefined) {
      this.mcpStore.delete('customNpmRegistry')
    } else {
      const normalizedRegistry = this.normalizeNpmRegistryUrl(registry)
      this.mcpStore.set('customNpmRegistry', normalizedRegistry)
      console.log(`[NPM Registry] Normalized custom registry: ${registry} -> ${normalizedRegistry}`)
    }
  }

  // 获取自动检测NPM Registry设置
  getAutoDetectNpmRegistry(): boolean {
    return this.mcpStore.get('autoDetectNpmRegistry') ?? true
  }

  // 设置自动检测NPM Registry
  setAutoDetectNpmRegistry(enabled: boolean): void {
    this.mcpStore.set('autoDetectNpmRegistry', enabled)
  }

  // 清除NPM Registry缓存
  clearNpmRegistryCache(): void {
    this.mcpStore.delete('npmRegistryCache')
  }

  // 移除MCP服务器
  async removeMcpServer(name: string): Promise<void> {
    const mcpServers = await this.getMcpServers()
    delete mcpServers[name]
    await this.setMcpServers(mcpServers)

    // 如果删除的服务器在默认服务器列表中，则从列表中移除
    const defaultServers = await this.getMcpDefaultServers()
    if (defaultServers.includes(name)) {
      await this.removeMcpDefaultServer(name)
    }
  }

  // 更新MCP服务器配置
  async updateMcpServer(name: string, config: Partial<MCPServerConfig>): Promise<void> {
    const mcpServers = await this.getMcpServers()
    if (!mcpServers[name]) {
      throw new Error(`MCP server ${name} not found`)
    }
    mcpServers[name] = {
      ...mcpServers[name],
      ...config
    }
    await this.setMcpServers(mcpServers)
  }

  // 恢复默认服务器配置
  async resetToDefaultServers(): Promise<void> {
    const currentServers = await this.getMcpServers()
    const updatedServers = { ...currentServers }

    // 删除所有类型为inmemory的服务
    for (const [serverName, serverConfig] of Object.entries(updatedServers)) {
      if (serverConfig.type === 'inmemory') {
        delete updatedServers[serverName]
      }
    }

    // 遍历所有默认服务，有则覆盖，无则新增
    for (const [serverName, serverConfig] of Object.entries(DEFAULT_MCP_SERVERS.mcpServers)) {
      updatedServers[serverName] = serverConfig
    }

    // 更新服务器配置
    await this.setMcpServers(updatedServers)

    // 恢复默认服务器设置，确保平台特有服务的正确处理
    const platformAwareDefaultServers = [
      'Artifacts',
      // 根据平台添加默认启用的平台特有服务
      ...(isMacOS() ? ['deepchat/apple-server'] : [])
    ]

    this.mcpStore.set('defaultServers', platformAwareDefaultServers)
    eventBus.send(MCP_EVENTS.CONFIG_CHANGED, SendTarget.ALL_WINDOWS, {
      mcpServers: updatedServers,
      defaultServers: platformAwareDefaultServers,
      mcpEnabled: this.mcpStore.get('mcpEnabled')
    })
  }

  /**
   * Batch import MCP servers from external source (like ModelScope)
   * @param servers - Array of MCP server configs to import
   * @param options - Import options
   * @returns Promise<{ imported: number; skipped: number; errors: string[] }>
   */
  async batchImportMcpServers(
    servers: Array<{
      name: string
      description: string
      package: string
      version?: string
      type?: MCPServerType
      args?: string[]
      env?: Record<string, string>
      enabled?: boolean
      source?: string
      [key: string]: unknown
    }>,
    options: {
      skipExisting?: boolean
      enableByDefault?: boolean
      overwriteExisting?: boolean
    } = {}
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    const { skipExisting = true, enableByDefault = false, overwriteExisting = false } = options
    const result = {
      imported: 0,
      skipped: 0,
      errors: [] as string[]
    }

    const existingServers = await this.getMcpServers()

    for (const serverConfig of servers) {
      try {
        // Generate unique server name based on package name
        const serverName = this.generateUniqueServerName(serverConfig.package, existingServers)
        const existingServer = existingServers[serverName]

        // Check if server already exists
        if (existingServer && !overwriteExisting) {
          if (skipExisting) {
            console.log(`Skipping existing MCP server: ${serverName}`)
            result.skipped++
            continue
          } else {
            result.errors.push(`Server ${serverName} already exists`)
            continue
          }
        }

        // Create MCP server config
        const mcpConfig: ExtendedMCPServerConfig = {
          name: serverConfig.name,
          description: serverConfig.description,
          args: serverConfig.args || [],
          env: serverConfig.env || {},
          enabled: serverConfig.enabled ?? enableByDefault,
          type: (serverConfig.type as MCPServerType) || 'stdio',
          package: serverConfig.package,
          version: serverConfig.version || 'latest',
          source: serverConfig.source as string | undefined,
          logo_url: serverConfig.logo_url as string | undefined,
          publisher: serverConfig.publisher as string | undefined,
          tags: serverConfig.tags as string[] | undefined,
          view_count: serverConfig.view_count as number | undefined
        }

        // Add or update the server
        const success = await this.addMcpServer(serverName, mcpConfig as unknown as MCPServerConfig)
        if (success || overwriteExisting) {
          if (existingServer && overwriteExisting) {
            await this.updateMcpServer(serverName, mcpConfig as unknown as Partial<MCPServerConfig>)
            console.log(`Updated MCP server: ${serverName}`)
          } else {
            console.log(`Imported MCP server: ${serverName}`)
          }
          result.imported++
        } else {
          result.errors.push(`Failed to import server: ${serverName}`)
        }
      } catch (error) {
        const errorMsg = `Error importing server ${serverConfig.name}: ${error instanceof Error ? error.message : String(error)}`
        console.error(errorMsg)
        result.errors.push(errorMsg)
      }
    }

    console.log(
      `MCP batch import completed. Imported: ${result.imported}, Skipped: ${result.skipped}, Errors: ${result.errors.length}`
    )

    // Emit event to notify about the import
    eventBus.sendToRenderer(MCP_EVENTS.CONFIG_CHANGED, SendTarget.ALL_WINDOWS, {
      action: 'batch_import',
      result
    })

    return result
  }

  /**
   * Generate a unique server name based on package name
   * @param packageName - The package name to base the server name on
   * @param existingServers - Existing servers to check against
   * @returns Unique server name
   */
  private generateUniqueServerName(
    packageName: string,
    existingServers: Record<string, MCPServerConfig>
  ): string {
    // Clean up package name to create a suitable server name
    let baseName = packageName
      .replace(/[@/]/g, '-')
      .replace(/[^a-zA-Z0-9-_]/g, '')
      .toLowerCase()

    // If the base name doesn't exist, use it directly
    if (!existingServers[baseName]) {
      return baseName
    }

    // If it exists, append a number suffix
    let counter = 1
    let uniqueName = `${baseName}-${counter}`
    while (existingServers[uniqueName]) {
      counter++
      uniqueName = `${baseName}-${counter}`
    }

    return uniqueName
  }

  /**
   * Check if a server with given package already exists
   * @param packageName - Package name to check
   * @returns Promise<string | null> - Returns server name if exists, null otherwise
   */
  async findServerByPackage(packageName: string): Promise<string | null> {
    const servers = await this.getMcpServers()

    for (const [serverName, config] of Object.entries(servers)) {
      const extendedConfig = config as unknown as ExtendedMCPServerConfig
      if (extendedConfig.package === packageName) {
        return serverName
      }
    }

    return null
  }

  public onUpgrade(oldVersion: string | undefined): void {
    console.log('onUpgrade', oldVersion)
    if (oldVersion && compare(oldVersion, '0.0.12', '<=')) {
      // 将旧版本的defaultServer迁移到新版本的defaultServers
      const oldDefaultServer = this.mcpStore.get('defaultServer') as string | undefined
      if (oldDefaultServer) {
        console.log(`迁移旧版本defaultServer: ${oldDefaultServer}到defaultServers`)
        const defaultServers = this.mcpStore.get('defaultServers') || []
        if (!defaultServers.includes(oldDefaultServer)) {
          defaultServers.push(oldDefaultServer)
          this.mcpStore.set('defaultServers', defaultServers)
        }
        // 删除旧的defaultServer字段，防止重复迁移
        this.mcpStore.delete('defaultServer')
      }

      // 迁移 filesystem 服务器到 buildInFileSystem
      try {
        const mcpServers = this.mcpStore.get('mcpServers') || {}
        // console.log('mcpServers', mcpServers)
        if (mcpServers.filesystem) {
          console.log('检测到旧版本的 filesystem MCP 服务器，开始迁移到 buildInFileSystem')

          // 检查 buildInFileSystem 是否已存在
          if (!mcpServers.buildInFileSystem) {
            // 创建 buildInFileSystem 配置
            mcpServers.buildInFileSystem = {
              args: [app.getPath('home')], // 默认值
              descriptions: '内置文件系统mcp服务',
              icons: '💾',
              autoApprove: ['read'],
              type: 'inmemory' as MCPServerType,
              command: 'filesystem',
              env: {},
              disable: false
            }
          }

          // 如果 filesystem 的 args 长度大于 2，将第三个参数及以后的参数迁移
          if (mcpServers.filesystem.args && mcpServers.filesystem.args.length > 2) {
            mcpServers.buildInFileSystem.args = mcpServers.filesystem.args.slice(2)
          }

          // 迁移 autoApprove 设置
          if (mcpServers.filesystem.autoApprove) {
            mcpServers.buildInFileSystem.autoApprove = [...mcpServers.filesystem.autoApprove]
          }

          delete mcpServers.filesystem
          // 更新 mcpServers
          this.mcpStore.set('mcpServers', mcpServers)

          // 如果 filesystem 是默认服务器，将 buildInFileSystem 添加到默认服务器列表
          const defaultServers = this.mcpStore.get('defaultServers') || []
          if (
            defaultServers.includes('filesystem') &&
            !defaultServers.includes('buildInFileSystem')
          ) {
            defaultServers.push('buildInFileSystem')
            this.mcpStore.set('defaultServers', defaultServers)
          }

          console.log('迁移 filesystem 到 buildInFileSystem 完成')
        }
      } catch (error) {
        console.error('迁移 filesystem 服务器时出错:', error)
      }
    }

    // 升级后检查并添加平台特有服务
    try {
      const mcpServers = this.mcpStore.get('mcpServers') || {}
      const defaultServers = this.mcpStore.get('defaultServers') || []
      let hasChanges = false

      // 检查是否需要添加平台特有服务
      if (isMacOS() && !mcpServers['deepchat/apple-server']) {
        console.log('检测到 macOS 平台，添加 Apple 系统集成服务')
        mcpServers['deepchat/apple-server'] = PLATFORM_SPECIFIC_SERVERS['deepchat/apple-server']
        hasChanges = true

        // 如果不在默认服务器列表中，添加到默认服务器列表
        if (!defaultServers.includes('deepchat/apple-server')) {
          defaultServers.push('deepchat/apple-server')
          this.mcpStore.set('defaultServers', defaultServers)
        }
      }

      // 移除不支持当前平台的服务
      const serversToRemove: string[] = []
      for (const [serverName] of Object.entries(mcpServers)) {
        if (serverName === 'deepchat/apple-server' && !isMacOS()) {
          serversToRemove.push(serverName)
        }
        // 可以在这里添加其他平台特有服务的检查
      }

      for (const serverName of serversToRemove) {
        console.log(`移除不支持当前平台的服务: ${serverName}`)
        delete mcpServers[serverName]
        hasChanges = true

        // 从默认服务器列表中移除
        const index = defaultServers.indexOf(serverName)
        if (index > -1) {
          defaultServers.splice(index, 1)
          this.mcpStore.set('defaultServers', defaultServers)
        }
      }

      if (hasChanges) {
        this.mcpStore.set('mcpServers', mcpServers)
        console.log('平台特有服务升级完成')
      }
    } catch (error) {
      console.error('升级平台特有服务时出错:', error)
    }
  }
}
