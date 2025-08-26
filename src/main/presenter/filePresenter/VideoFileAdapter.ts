import { BaseFileAdapter } from './BaseFileAdapter'

export class VideoFileAdapter extends BaseFileAdapter {
  public async getLLMContent(): Promise<string | undefined> {
    // 只返回文件路径信息，不读取内容
    return `视频文件路径: ${this.filePath}`
  }

  constructor(filePath: string, maxFileSize: number) {
    super(filePath)
    // maxFileSize parameter is required by interface but not used in video adapter
    // Videos are typically handled by reference rather than content processing
    void maxFileSize // Explicitly mark as unused to avoid TypeScript warning
  }

  protected getFileDescription(): string | undefined {
    return '视频文件'
  }

  async getContent(): Promise<string | undefined> {
    // 对于视频文件，只返回路径信息，不读取内容
    return `视频文件路径: ${this.filePath}`
  }

  async getThumbnail(): Promise<string | undefined> {
    return ''
  }
}
