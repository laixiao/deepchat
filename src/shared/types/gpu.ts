export interface GpuProcess {
  pid: number
  name: string
  memory: number // bytes
}

export interface GpuInfo {
  id: number
  name: string
  driverVersion: string
  status: string
  memoryTotal: number // bytes
  memoryUsed: number // bytes
  memoryUtilization: number // percentage
  gpuUtilization: number // percentage
  temperature: number // Celsius
  fanSpeed: number // percentage
  powerDraw: number // watts
  powerLimit: number // watts
  powerUtilization: number // percentage
  pcieLink: string
  graphicsClock: number // MHz
  memoryClock: number // MHz
  processes: GpuProcess[]
}
