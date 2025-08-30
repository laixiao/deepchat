import { exec } from 'child_process'
import { promisify } from 'util'
import { GpuInfo } from '@shared/types'

const execPromise = promisify(exec)

export class GpuPresenter {
  /**
   * 获取NVIDIA GPU信息
   */
  async getNvidiaGpuInfo(): Promise<GpuInfo[]> {
    try {
      // 检查是否安装了nvidia-smi
      await execPromise('nvidia-smi --version')

      // 使用nvidia-smi获取GPU信息
      const { stdout } = await execPromise(
        'nvidia-smi --query-gpu=index,name,driver_version,memory.total,memory.used,utilization.gpu,temperature.gpu,fan.speed,power.draw,power.limit,pcie.link.gen.current,clocks.current.graphics,clocks.current.memory --format=csv,noheader,nounits'
      )

      const gpuData: GpuInfo[] = []
      const lines = stdout.trim().split('\n')

      for (const line of lines) {
        const [
          index,
          name,
          driverVersion,
          memoryTotal,
          memoryUsed,
          gpuUtilization,
          temperature,
          fanSpeed,
          powerDraw,
          powerLimit,
          pcieGen,
          graphicsClock,
          memoryClock
        ] = line.split(', ').map((item) => item.trim())

        // 计算内存使用率
        const memoryTotalBytes = parseInt(memoryTotal) * 1024 * 1024
        const memoryUsedBytes = parseInt(memoryUsed) * 1024 * 1024
        const memoryUtilization =
          memoryTotalBytes > 0 ? (memoryUsedBytes / memoryTotalBytes) * 100 : 0

        // 计算功耗使用率
        const powerDrawNum = parseFloat(powerDraw)
        const powerLimitNum = parseFloat(powerLimit)
        const powerUtilization = powerLimitNum > 0 ? (powerDrawNum / powerLimitNum) * 100 : 0

        gpuData.push({
          id: parseInt(index),
          name,
          driverVersion,
          status: '正常',
          memoryTotal: memoryTotalBytes,
          memoryUsed: memoryUsedBytes,
          memoryUtilization,
          gpuUtilization: parseInt(gpuUtilization),
          temperature: parseInt(temperature),
          fanSpeed: parseInt(fanSpeed),
          powerDraw: powerDrawNum,
          powerLimit: powerLimitNum,
          powerUtilization,
          pcieLink: `PCIe ${pcieGen}`,
          graphicsClock: parseInt(graphicsClock),
          memoryClock: parseInt(memoryClock),
          processes: [] // 进程信息需要另外获取
        })
      }

      // 获取进程信息
      await this.getGpuProcesses(gpuData)

      return gpuData
    } catch (error) {
      // 如果nvidia-smi不可用，返回空数组
      if (error instanceof Error && error.message.includes('not found')) {
        throw new Error('未检测到NVIDIA显卡或未安装NVIDIA驱动程序')
      }
      throw error
    }
  }

  /**
   * 获取GPU进程信息
   */
  private async getGpuProcesses(gpuData: GpuInfo[]): Promise<void> {
    try {
      const { stdout } = await execPromise(
        'nvidia-smi --query-compute-apps=pid,process_name,used_memory --format=csv,noheader,nounits'
      )

      const lines = stdout.trim().split('\n')

      for (const line of lines) {
        if (line.trim() === '') continue

        const [pid, processName, usedMemory] = line.split(', ').map((item) => item.trim())
        const usedMemoryBytes = parseInt(usedMemory) * 1024 * 1024

        // 将进程信息添加到对应的GPU
        // 注意：nvidia-smi的compute-apps查询不直接提供GPU ID，需要额外处理
        // 这里简化处理，将进程添加到第一个GPU
        if (gpuData.length > 0) {
          gpuData[0].processes.push({
            pid: parseInt(pid),
            name: processName,
            memory: usedMemoryBytes
          })
        }
      }
    } catch (error) {
      // 忽略进程信息获取错误
      console.warn('Failed to get GPU processes:', error)
    }
  }

  /**
   * 检查是否支持GPU监控
   */
  async isGpuMonitoringSupported(): Promise<boolean> {
    try {
      await execPromise('nvidia-smi --version')
      return true
    } catch (error) {
      return false
    }
  }
}

export const gpuPresenter = new GpuPresenter()
