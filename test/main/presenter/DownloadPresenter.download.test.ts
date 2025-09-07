import { describe, test, expect, vi } from 'vitest'

// 实际网络下载的集成测试：使用你提供的 URL
// 注意：该测试需要外网访问权限，可能耗时较长

describe('DownloadPresenter integration download test', () => {
  test('should download file successfully from modelscope URL', async () => {
    // 取消全局对 fs 和 path 的 mock，确保使用真实文件系统与路径行为
    vi.unmock('fs')
    vi.unmock('path')

    // 动态导入真实模块（在 unmock 之后）
    const fs = await import('fs')
    const path = await import('path')
    const os = await import('os')

    // 动态导入被测对象（使用相对路径避免别名在某些环境下的类型提示问题）
    const { DownloadPresenter } = await import(
      '../../../src/main/presenter/downloadPresenter/index'
    )

    const presenter = new DownloadPresenter()

    const url =
      'https://modelscope.cn/api/v1/models/XiaoLai/AGI/repo?Revision=HeyGem&FilePath=HeyGem.safetensors'
    const filename = 'HeyGem.safetensors'

    const baseTempDir = path.join(os.tmpdir(), 'deepchat-download-tests')
    const downloadDir = path.join(baseTempDir, `run-${Date.now()}`)
    fs.mkdirSync(downloadDir, { recursive: true })

    const id = `dl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const result = await presenter.downloadFile({
      id,
      url,
      filename,
      downloadDir
    })

    expect(result.success).toBe(true)
    expect(result.filePath).toBeTruthy()

    const filePath = result.filePath!
    expect(fs.existsSync(filePath)).toBe(true)

    const stats = fs.statSync(filePath)
    expect(stats.size).toBeGreaterThan(0)
  }, 900_000) // 设置较长超时（15分钟），避免大文件/网络波动导致失败
})
