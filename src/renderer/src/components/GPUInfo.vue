<template>
  <div class="flex flex-col h-full w-full p-6">
    <div class="flex-1 overflow-y-auto">
      <!-- 加载状态 -->
      <div v-if="loading" class="flex items-center justify-center h-64">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground"></div>
        <span class="ml-3">{{ t('gpuInfo.loading') }}</span>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="bg-destructive/20 border border-destructive/30 rounded-lg p-4 mb-6 dark:bg-destructive/30 dark:border-destructive/50">
        <div class="flex items-center">
          <Icon icon="lucide:alert-circle" class="w-5 h-5 text-destructive mr-2" />
          <span class="font-medium text-destructive dark:text-destructive-foreground">{{ t('gpuInfo.error') }}</span>
        </div>
        <p class="mt-2 text-sm text-destructive/80 dark:text-destructive-foreground/90">{{ error }}</p>
        <Button variant="outline" size="sm" class="mt-3" @click="refreshData">
          <Icon icon="lucide:refresh-cw" class="w-4 h-4 mr-2" />
          {{ t('gpuInfo.retry') }}
        </Button>
      </div>

      <!-- 显卡信息 -->
      <div v-else>
        
        
        <!-- 显卡使用情况 -->
        <div class="mt-8 pt-4 border-t">
          <h3 class="font-medium mb-3">{{ t('gpuInfo.gpuUsage') }}</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="index in gpuCount" :key="index" class="bg-muted/50 rounded-lg p-4">
              <div class="flex justify-between items-center mb-2">
                <h4 class="font-medium">{{ gpuData[index - 1].name || t('gpuInfo.gpu') + ' ' + (index + 1) }}</h4>
                <Badge variant="secondary">{{ gpuData[index - 1].status }}</Badge>
              </div>
              
              <!-- 显卡基本信息 -->
              <div class="grid grid-cols-2 gap-2 text-sm mt-2 mb-3">
                <div>
                  <span class="text-muted-foreground">{{ t('gpuInfo.driverVersion') }}:</span>
                  <span class="ml-1">{{ gpuData[index - 1].driverVersion }}</span>
                </div>
                <div>
                  <span class="text-muted-foreground">{{ t('gpuInfo.pcie') }}:</span>
                  <span class="ml-1">{{ gpuData[index - 1].pcieLink }}</span>
                </div>
                <div>
                  <span class="text-muted-foreground">{{ t('gpuInfo.clock') }}:</span>
                  <span class="ml-1">{{ gpuData[index - 1].graphicsClock }} MHz</span>
                </div>
                <div>
                  <span class="text-muted-foreground">{{ t('gpuInfo.memoryClock') }}:</span>
                  <span class="ml-1">{{ gpuData[index - 1].memoryClock }} MHz</span>
                </div>
              </div>
              
              <!-- GPU负载 -->
              <div class="mb-3">
                <div class="flex justify-between items-center mb-1">
                  <div class="flex items-center">
                    <Icon icon="lucide:cpu" class="w-4 h-4 mr-2 text-muted-foreground" />
                    <h5 class="font-medium text-sm">{{ t('gpuInfo.gpuUtilization') }}</h5>
                  </div>
                  <span class="text-sm font-mono">{{ gpuData[index - 1].gpuUtilization }}%</span>
                </div>
                <div class="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                  <div 
                    class="bg-primary h-2.5 rounded-full transition-all duration-3000 ease-out" 
                    :class="{ 'bg-red-500 animate-pulse': gpuData[index - 1].gpuUtilization >= GPU_UTILIZATION_THRESHOLD }"
                    :style="{ width: gpuData[index - 1].gpuUtilization + '%' }"
                  ></div>
                </div>
              </div>
              
              <!-- 显存使用情况 -->
              <div class="mb-3">
                <div class="flex justify-between items-center mb-1">
                  <div class="flex items-center">
                    <Icon icon="lucide:memory-stick" class="w-4 h-4 mr-2 text-muted-foreground" />
                    <h5 class="font-medium text-sm">{{ t('gpuInfo.memory') }}</h5>
                  </div>
                  <span class="text-sm font-mono">{{ formatBytes(gpuData[index - 1].memoryUsed) }} / {{ formatBytes(gpuData[index - 1].memoryTotal) }}</span>
                </div>
                <div class="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                  <div
                    class="bg-primary h-2.5 rounded-full transition-all duration-3000 ease-out"
                    :class="{ 'bg-red-500 animate-pulse': gpuData[index - 1].memoryUtilization >= GPU_MEMORY_THRESHOLD }"
                    :style="{ width: gpuData[index - 1].memoryUtilization + '%' }"
                  ></div>
                </div>
              </div>
              
              <!-- 温度 -->
              <div class="mb-3">
                <div class="flex justify-between items-center mb-1">
                  <div class="flex items-center">
                    <Icon icon="lucide:thermometer" class="w-4 h-4 mr-2 text-muted-foreground" />
                    <h5 class="font-medium text-sm">{{ t('gpuInfo.temperature') }}</h5>
                  </div>
                  <span class="text-sm font-mono">{{ gpuData[index - 1].temperature }}°C</span>
                </div>
                <div class="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                  <div
                    class="bg-primary h-2.5 rounded-full transition-all duration-3000 ease-out"
                    :class="{ 'bg-red-500 animate-pulse': gpuData[index - 1].temperature >= GPU_TEMPERATURE_THRESHOLD }"
                    :style="{ width: (gpuData[index - 1].temperature / 100) * 100 + '%' }"
                  ></div>
                </div>
              </div>
              
              <!-- 功耗 -->
              <div>
                <div class="flex justify-between items-center mb-1">
                  <div class="flex items-center">
                    <Icon icon="lucide:zap" class="w-4 h-4 mr-2 text-muted-foreground" />
                    <h5 class="font-medium text-sm">{{ t('gpuInfo.power') }}</h5>
                  </div>
                  <span class="text-sm font-mono">{{ gpuData[index - 1].powerDraw }}W / {{ gpuData[index - 1].powerLimit }}W</span>
                </div>
                <div class="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                  <div
                    class="bg-primary h-2.5 rounded-full transition-all duration-3000 ease-out"
                    :class="{ 'bg-red-500 animate-pulse': gpuData[index - 1].powerUtilization >= POWER_UTILIZATION_THRESHOLD }"
                    :style="{ width: gpuData[index - 1].powerUtilization + '%' }"
                  ></div>
                </div>
              </div>
              
            </div>
          </div>
        </div>
        
        <!-- CPU和内存使用情况 -->
        <div class="mt-8 pt-4 border-t">
          <h3 class="font-medium mb-3">{{ t('gpuInfo.cpuAndMemoryUsage') }}</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- CPU使用情况 -->
            <div class="bg-muted/50 rounded-lg p-4">
              <div class="flex justify-between items-center mb-2">
                <h4 class="font-medium">{{ t('gpuInfo.cpuUtilization') }}</h4>
                <span class="text-sm font-mono">{{ cpuUsage.toFixed(1) }}%</span>
              </div>
              <div class="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                <div 
                  class="bg-primary h-2.5 rounded-full transition-all duration-3000 ease-out" 
                  :class="{ 'bg-red-500 animate-pulse': cpuUsage >= CPU_UTILIZATION_THRESHOLD }"
                  :style="{ width: cpuUsage + '%' }"
                ></div>
              </div>
            </div>
            
            <!-- 内存使用情况 -->
            <div class="bg-muted/50 rounded-lg p-4">
              <div class="flex justify-between items-center mb-2">
                <h4 class="font-medium">{{ t('gpuInfo.memoryUtilization') }}</h4>
                <span class="text-sm font-mono">{{ formatBytes(getUsedMemory()) }} / {{ formatBytes(getTotalMemory()) }}</span>
              </div>
              <div class="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                <div
                  class="bg-primary h-2.5 rounded-full transition-all duration-3000 ease-out"
                  :class="{ 'bg-red-500 animate-pulse': memoryUsage >= MEMORY_UTILIZATION_THRESHOLD }"
                  :style="{ width: memoryUsage + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 硬盘使用情况 -->
        <div class="mt-8 pt-4 border-t">
          <h3 class="font-medium mb-3">{{ t('gpuInfo.diskUsage') }}</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="(disk, diskIndex) in diskData" :key="diskIndex" class="bg-muted/50 rounded-lg p-4">
              <div class="flex justify-between items-center mb-2">
                <h4 class="font-medium">{{ disk.drive }}</h4>
                <span class="text-sm font-mono">{{ formatBytes(disk.used) }} / {{ formatBytes(disk.total) }}</span>
              </div>
              <div class="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                <div 
                  class="bg-primary h-2.5 rounded-full transition-all duration-3000 ease-out" 
                  :style="{ width: disk.utilization + '%' }"
                ></div>
              </div>
              
              <!-- 硬盘性能监控 -->
              <div v-if="disk.performance !== undefined" class="mt-3 pt-3 border-t border-muted">
                <div class="flex justify-between items-center mb-2">
                  <div class="flex items-center">
                    <Icon icon="lucide:activity" class="w-4 h-4 mr-2 text-muted-foreground" />
                    <h4 class="font-medium text-sm">{{ t('gpuInfo.diskPerformance') }}</h4>
                  </div>
                  <span class="text-sm font-mono">{{ disk.performance }}%</span>
                </div>
                <div class="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                  <div
                    class="bg-primary h-2.5 rounded-full transition-all duration-3000 ease-out"
                    :class="{ 'bg-red-500 animate-pulse': disk.performance !== undefined && disk.performance >= DISK_PERFORMANCE_THRESHOLD }"
                    :style="{ width: disk.performance + '%' }"
                  ></div>
                </div>
                <!-- 硬盘性能警告 -->
                <div v-if="disk.performance !== undefined && disk.performance >= DISK_PERFORMANCE_THRESHOLD" class="mt-2 p-2 bg-red-500/20 rounded text-red-500 text-sm flex items-center animate-pulse">
                  <Icon icon="lucide:alert-triangle" class="w-4 h-4 mr-1" />
                  <span>{{ t('gpuInfo.highDiskPerformanceWarning', { threshold: disk.performance, drive: disk.drive }) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>


      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Icon } from '@iconify/vue'
import {
  GPU_MEMORY_THRESHOLD,
  GPU_UTILIZATION_THRESHOLD,
  GPU_TEMPERATURE_THRESHOLD,
  POWER_UTILIZATION_THRESHOLD,
  CPU_UTILIZATION_THRESHOLD,
  DISK_PERFORMANCE_THRESHOLD,
  MEMORY_UTILIZATION_THRESHOLD
} from '@shared/constants'

const { t } = useI18n()

// GPU数据状态 - 使用响应式对象而不是数组
const gpuData = ref<Record<number, any>>({})
const loading = ref(true)
const error = ref<string | null>(null)
const refreshInterval = ref<number | null>(null)
const isSupported = ref<boolean>(true)
const gpuCount = ref(0)

// CPU、内存和硬盘监控数据
const cpuUsage = ref<number>(0)
const memoryUsage = ref<number>(0)
const totalMemory = ref<number>(0)
const diskData = ref<Array<{ drive: string; total: number; free: number; used: number; utilization: number; performance?: number }>>([])

// GPU内存使用率阈值

// 格式化字节大小
const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

// 计算已使用的内存量（字节）
const getUsedMemory = (): number => {
  return (memoryUsage.value / 100) * totalMemory.value
}

// 获取总内存
const getTotalMemory = (): number => {
  return totalMemory.value
}

// 检查GPU支持
const checkGpuSupport = async () => {
  try {
    isSupported.value = await window.electron.ipcRenderer.invoke('gpu:is-supported')
    return isSupported.value
  } catch (err) {
    console.error('Failed to check GPU support:', err)
    isSupported.value = false
    return false
  }
}

// 获取GPU信息
const fetchGPUInfo = async () => {
  try {
    // 只在首次加载时显示loading状态
    if (loading.value) {
      error.value = null
    }
    
    // 检查GPU支持
    const supported = await checkGpuSupport()
    if (!supported) {
      error.value = t('gpuInfo.notSupported')
      return
    }
    
    // 调用主进程的GPU Presenter获取真实数据
    const gpuDataResponse = await window.electron.ipcRenderer.invoke('gpu:get-info')
    
    // 获取CPU使用率
    const cpuUsageResponse = await window.electron.ipcRenderer.invoke('presenter:call', 'devicePresenter', 'getCPUUsage')

    // 获取内存使用率
    const memoryUsageResponse = await window.electron.ipcRenderer.invoke('presenter:call', 'devicePresenter', 'getMemoryUsage')

    // 获取设备信息（包括总内存）
    const deviceInfoResponse = await window.electron.ipcRenderer.invoke('presenter:call', 'devicePresenter', 'getDeviceInfo')

    // 获取各磁盘使用情况
    const diskSpaceResponse = await window.electron.ipcRenderer.invoke('presenter:call', 'devicePresenter', 'getDisksSpace')

    // 获取各磁盘性能情况
    const diskPerformanceResponse = await window.electron.ipcRenderer.invoke('presenter:call', 'devicePresenter', 'getDisksPerformance')

    // 更新CPU使用率
    cpuUsage.value = cpuUsageResponse

    // 更新内存使用率（计算百分比）
    memoryUsage.value = (memoryUsageResponse.used / memoryUsageResponse.total) * 100
    
    // 更新总内存
    totalMemory.value = deviceInfoResponse.totalMemory
    
    // 合并磁盘空间和性能数据
    const mergedDiskData = diskSpaceResponse.map(disk => {
      const performanceData = diskPerformanceResponse.find(p => p.drive === disk.drive)
      return {
        ...disk,
        performance: performanceData ? performanceData.performance : undefined
      }
    })
    
    // 更新磁盘数据
    diskData.value = mergedDiskData
    
    // 首次加载时初始化数据
    if (loading.value) {
      const newData: Record<number, any> = {}
      gpuDataResponse.forEach((gpu: any, index: number) => {
        newData[index] = { ...gpu }
      })
      gpuData.value = newData
      gpuCount.value = gpuDataResponse.length
    } else {
      // 后续刷新时只更新数据属性，不替换整个对象
      gpuDataResponse.forEach((gpu: any, index: number) => {
        if (gpuData.value[index]) {
          // 只更新数值属性，保持对象引用不变
          Object.keys(gpu).forEach(key => {
            if (typeof gpu[key] === 'number' || typeof gpu[key] === 'string') {
              gpuData.value[index][key] = gpu[key]
            }
          })
        } else {
          // 如果是新GPU，添加新对象
          gpuData.value[index] = { ...gpu }
        }
      })
      gpuCount.value = gpuDataResponse.length
    }
  } catch (err) {
    console.error('Failed to fetch GPU info:', err)
    // 只在首次加载时设置错误状态
    if (loading.value) {
      error.value = err instanceof Error ? err.message : String(err)
    }
  } finally {
    loading.value = false
  }
}

// 刷新数据
const refreshData = () => {
  fetchGPUInfo()
}

// 启动定时刷新
const startAutoRefresh = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
  refreshInterval.value = window.setInterval(refreshData, 3000) // 每3秒刷新
}

// 停止定时刷新
const stopAutoRefresh = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    refreshInterval.value = null
  }
}

// 组件挂载时获取数据并启动定时刷新
onMounted(() => {
  fetchGPUInfo()
  startAutoRefresh()
})

// 组件卸载时停止定时刷新
onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
/* 可以添加自定义样式 */
</style>