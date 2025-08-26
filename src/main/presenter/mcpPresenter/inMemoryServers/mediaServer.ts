import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import fs from 'fs/promises'
import path from 'path'
import https from 'https'
import axios from 'axios'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { presenter } from '@/presenter'
import { ChatMessage, ChatMessageContent } from '@shared/presenter'
import { detectMimeType } from '@/presenter/filePresenter/mime'

// --- Zod Schemas for Tool Arguments ---

const ReadMediaBase64ArgsSchema = z.object({
  path: z.string().describe('Path to the media file.')
})

const UploadMediaArgsSchema = z.object({
  path: z.string().describe('Path to the media file to upload.')
})

const ReadMultipleMediaBase64ArgsSchema = z.object({
  paths: z.array(z.string()).describe('List of paths to the media files.')
})

const UploadMultipleMediaArgsSchema = z.object({
  paths: z.array(z.string()).describe('List of paths to the media files to upload.')
})

const QueryImageWithPromptArgsSchema = z.object({
  path: z.string().describe('Path to the image file to query.'),
  prompt: z
    .string()
    .describe('The prompt to use when querying the image with the multimodal model.')
})

const DescribeImageArgsSchema = z.object({
  path: z.string().describe('Path to the image file to do simple describe.')
})

const OcrImageArgsSchema = z.object({
  path: z.string().describe('Path to the image file for OCR text extraction.')
})

const GetMediaInfoArgsSchema = z.object({
  path: z.string().describe('Path to the media file to get information about.')
})

// --- Media Server Implementation ---

export class MediaServer {
  private server: Server
  private provider: string | null = null
  private model: string | null = null

  constructor(provider?: string, model?: string) {
    // 如果传入了provider和model，则使用传入的值
    if (provider && model) {
      this.provider = provider
      this.model = model
      console.log(`Using specified vision model: ${this.provider}/${this.model}`)
    } else {
      // 不设置默认值，实际使用时再检查配置
      console.log('No vision model specified, will check configuration when needed')
    }

    this.server = new Server(
      {
        name: 'media-processing-server',
        version: '0.1.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    )
    this.setupRequestHandlers()
  }

  // 动态获取视觉模型配置
  private async getVisionModelConfig(): Promise<{ provider: string; model: string }> {
    // 如果已经有配置，直接返回
    if (this.provider && this.model) {
      return { provider: this.provider, model: this.model }
    }

    // 从配置中获取视觉模型设置
    const visionModelConfig = presenter.configPresenter.getVisionModelSync()
    if (visionModelConfig) {
      this.provider = visionModelConfig.providerId
      this.model = visionModelConfig.modelId
      return { provider: this.provider, model: this.model }
    }

    // 如果没有配置，抛出错误
    throw new Error('Vision model not configured. Please set up a vision model in settings first.')
  }

  public startServer(transport: Transport): void {
    this.server.connect(transport)
  }

  // --- Media Upload Logic ---
  private async uploadMediaToService(filePath: string, fileBuffer: Buffer): Promise<string> {
    try {
      console.log(`Uploading ${filePath} (size: ${fileBuffer.length} bytes)...`)

      const fileName = path.basename(filePath)
      const boundary = `----formdata-${Date.now()}`

      // 检测文件的MIME类型
      const mimeType = await detectMimeType(filePath)
      console.log(`Detected MIME type: ${mimeType}`)

      // Build simple form data
      const formDataParts: Buffer[] = []
      formDataParts.push(Buffer.from(`--${boundary}\r\n`))
      formDataParts.push(
        Buffer.from(`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`)
      )
      formDataParts.push(Buffer.from(`Content-Type: ${mimeType}\r\n\r\n`))
      formDataParts.push(fileBuffer)
      formDataParts.push(Buffer.from(`\r\n--${boundary}--\r\n`))

      const formData = Buffer.concat(formDataParts)

      // Force direct connection for upload (bypass proxy)
      console.log('Using direct connection for upload (bypassing proxy)')

      const axiosConfig: any = {
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        timeout: 120000, // Increase timeout for large media files
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        }),
        // Force no proxy
        proxy: false
      }

      const response = await axios.post(
        'https://deepchat.vvvlin.com/api/files/temp-upload',
        formData,
        axiosConfig
      )

      console.log(`Upload response:`, response.data)

      if (response.data && response.data.success) {
        const url = response.data.data.url
        return url.startsWith('//') ? `https:${url}` : url
      } else {
        throw new Error(`Upload failed: ${response.data?.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error(`Upload error:`, error)
      throw new Error(`Failed to upload: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // --- Get Media Information ---
  private async getMediaInfo(filePath: string): Promise<string> {
    try {
      const stats = await fs.stat(filePath)
      const mimeType = await detectMimeType(filePath)
      const fileName = path.basename(filePath)
      const fileExtension = path.extname(filePath)

      const mediaInfo = {
        fileName,
        filePath,
        fileExtension,
        mimeType,
        fileSize: stats.size,
        fileSizeFormatted: this.formatFileSize(stats.size),
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString(),
        isImage: mimeType.startsWith('image/'),
        isVideo: mimeType.startsWith('video/'),
        isAudio: mimeType.startsWith('audio/')
      }

      return JSON.stringify(mediaInfo, null, 2)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to get media info: ${errorMessage}`)
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // --- Placeholder for Multimodal Model Interaction ---
  private async queryImageWithModel(
    filePath: string,
    fileBuffer: Buffer,
    prompt: string
  ): Promise<string> {
    // 获取视觉模型配置
    const { provider, model } = await this.getVisionModelConfig()

    // TODO: Implement actual API call to a multimodal model (e.g., GPT-4o, Gemini)
    console.log(
      `Querying ${filePath} (size: ${fileBuffer.length} bytes) using ${provider}/${model} with prompt: "${prompt}"...`
    )

    // Construct the messages array for the multimodal model
    const base64Image = fileBuffer.toString('base64')
    // TODO: Dynamically determine mime type if possible, otherwise assume common type like jpeg
    const dataUrl = `data:image/jpeg;base64,${base64Image}`

    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt }, // Use the provided prompt
          {
            type: 'image_url',
            image_url: { url: dataUrl }
          }
        ] as ChatMessageContent[] // Type assertion might be needed depending on ChatMessageContent definition
      }
    ]

    const modelConfig = presenter.configPresenter.getModelConfig(model, provider)

    try {
      const response = await presenter.llmproviderPresenter.generateCompletionStandalone(
        provider,
        messages,
        model,
        modelConfig?.temperature || 0.6,
        modelConfig?.maxTokens || 1000
      )
      console.log(`Model response received: ${response}`)
      return response ?? 'No response generated.' // Handle potential null/undefined response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`Error querying image: ${errorMessage}`)
      // Re-throw or return an error message
      throw new Error(`Failed to query image: ${errorMessage}`)
      // Or return `Error generating response: ${errorMessage}`;
    }
  }

  private async ocrImageWithModel(filePath: string, fileBuffer: Buffer): Promise<string> {
    // 获取视觉模型配置
    const { provider, model } = await this.getVisionModelConfig()

    // TODO: Implement actual API call to an OCR service or a multimodal model capable of OCR
    console.log(
      `Requesting OCR for ${filePath} (size: ${fileBuffer.length} bytes) using ${provider}/${model}...`
    )

    // Construct the messages array for the multimodal model
    const base64Image = fileBuffer.toString('base64')
    // TODO: Dynamically determine mime type if possible
    const dataUrl = `data:image/jpeg;base64,${base64Image}`

    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Perform OCR on this image and return the extracted text.' },
          {
            type: 'image_url',
            image_url: { url: dataUrl }
          }
        ] as ChatMessageContent[] // Type assertion
      }
    ]

    console.log(messages)

    const modelConfig = presenter.configPresenter.getModelConfig(model, provider)

    try {
      const ocrText = await presenter.llmproviderPresenter.generateCompletionStandalone(
        provider,
        messages,
        model,
        modelConfig?.temperature || 0.6,
        modelConfig?.maxTokens || 1000
      )
      console.log(`OCR text received: ${ocrText}`)
      return ocrText ?? 'No text extracted.' // Handle potential null/undefined response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`Error performing OCR: ${errorMessage}`)
      // Re-throw or return an error message
      throw new Error(`Failed to perform OCR: ${errorMessage}`)
      // Or return `Error performing OCR: ${errorMessage}`;
    }
  }

  // --- Request Handlers ---

  private setupRequestHandlers(): void {
    // List Tools Handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'read_media_base64',
            description:
              'Reads a media file (image, video, or audio) from the specified path and returns its base64 encoded content.',
            inputSchema: zodToJsonSchema(ReadMediaBase64ArgsSchema)
          },
          {
            name: 'upload_media',
            description:
              'Uploads a media file (image, video, or audio) from the specified path to a hosting service and returns the public URL.',
            inputSchema: zodToJsonSchema(UploadMediaArgsSchema)
          },
          {
            name: 'read_multiple_media_base64',
            description:
              'Reads multiple media files from the specified paths and returns their base64 encoded content.',
            inputSchema: zodToJsonSchema(ReadMultipleMediaBase64ArgsSchema)
          },
          {
            name: 'upload_multiple_media',
            description:
              'Uploads multiple media files from the specified paths to a hosting service and returns their public URLs.',
            inputSchema: zodToJsonSchema(UploadMultipleMediaArgsSchema)
          },
          {
            name: 'get_media_info',
            description:
              'Gets detailed information about a media file including size, type, and metadata.',
            inputSchema: zodToJsonSchema(GetMediaInfoArgsSchema)
          },
          {
            name: 'describe_image',
            description:
              'Uses a multimodal model to simply describe the image at the specified path.',
            inputSchema: zodToJsonSchema(DescribeImageArgsSchema)
          },
          {
            name: 'query_image_with_prompt',
            description:
              'Uses a multimodal model to answer a query (prompt) about the image at the specified path.',
            inputSchema: zodToJsonSchema(QueryImageWithPromptArgsSchema)
          },
          {
            name: 'ocr_image',
            description:
              'Performs Optical Character Recognition (OCR) on the image at the specified path and returns the extracted text.',
            inputSchema: zodToJsonSchema(OcrImageArgsSchema)
          }
        ]
      }
    })

    // Call Tool Handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params

        switch (name) {
          case 'read_media_base64': {
            const parsed = ReadMediaBase64ArgsSchema.safeParse(args)
            if (!parsed.success) {
              throw new Error(`Invalid arguments for ${name}: ${parsed.error}`)
            }
            const filePath = parsed.data.path
            const fileBuffer = await fs.readFile(filePath)
            const base64Content = fileBuffer.toString('base64')
            return {
              content: [{ type: 'text', text: base64Content }]
            }
          }

          case 'upload_media': {
            const parsed = UploadMediaArgsSchema.safeParse(args)
            if (!parsed.success) {
              throw new Error(`Invalid arguments for ${name}: ${parsed.error}`)
            }
            const filePath = parsed.data.path
            const fileBuffer = await fs.readFile(filePath)
            const mediaUrl = await this.uploadMediaToService(filePath, fileBuffer)
            return {
              content: [{ type: 'text', text: mediaUrl }]
            }
          }

          case 'read_multiple_media_base64': {
            const parsed = ReadMultipleMediaBase64ArgsSchema.safeParse(args)
            if (!parsed.success) {
              throw new Error(`Invalid arguments for ${name}: ${parsed.error}`)
            }
            const results = await Promise.allSettled(
              parsed.data.paths.map(async (filePath: string) => {
                try {
                  const fileBuffer = await fs.readFile(filePath)
                  return {
                    path: filePath,
                    base64: fileBuffer.toString('base64'),
                    status: 'fulfilled'
                  }
                } catch (error) {
                  const errorMessage = error instanceof Error ? error.message : String(error)
                  return Promise.reject({ path: filePath, error: errorMessage })
                }
              })
            )

            const formattedResults = results.map((result) => {
              if (result.status === 'fulfilled') {
                return { path: result.value.path, base64: result.value.base64 }
              } else {
                return { path: result.reason.path, error: result.reason.error }
              }
            })

            return {
              content: [{ type: 'text', text: JSON.stringify(formattedResults, null, 2) }]
            }
          }

          case 'upload_multiple_media': {
            const parsed = UploadMultipleMediaArgsSchema.safeParse(args)
            if (!parsed.success) {
              throw new Error(`Invalid arguments for ${name}: ${parsed.error}`)
            }

            const results = await Promise.allSettled(
              parsed.data.paths.map(async (filePath: string) => {
                try {
                  const fileBuffer = await fs.readFile(filePath)
                  const url = await this.uploadMediaToService(filePath, fileBuffer)
                  return { path: filePath, url: url, status: 'fulfilled' }
                } catch (error) {
                  const errorMessage = error instanceof Error ? error.message : String(error)
                  return Promise.reject({ path: filePath, error: errorMessage })
                }
              })
            )

            const formattedResults = results.map((result) => {
              if (result.status === 'fulfilled') {
                return { path: result.value.path, url: result.value.url }
              } else {
                return { path: result.reason.path, error: result.reason.error }
              }
            })

            return {
              content: [{ type: 'text', text: JSON.stringify(formattedResults, null, 2) }]
            }
          }

          case 'get_media_info': {
            const parsed = GetMediaInfoArgsSchema.safeParse(args)
            if (!parsed.success) {
              throw new Error(`Invalid arguments for ${name}: ${parsed.error}`)
            }
            const filePath = parsed.data.path
            const mediaInfo = await this.getMediaInfo(filePath)
            return {
              content: [{ type: 'text', text: mediaInfo }]
            }
          }

          case 'describe_image': {
            const parsed = DescribeImageArgsSchema.safeParse(args)
            if (!parsed.success) {
              throw new Error(`Invalid arguments for ${name}: ${parsed.error}`)
            }
            const filePath = parsed.data.path
            const fileBuffer = await fs.readFile(filePath)
            const description = await this.queryImageWithModel(
              filePath,
              fileBuffer,
              'Describe this image.'
            )
            return {
              content: [{ type: 'text', text: description }]
            }
          }

          case 'query_image_with_prompt': {
            const parsed = QueryImageWithPromptArgsSchema.safeParse(args)
            if (!parsed.success) {
              throw new Error(`Invalid arguments for ${name}: ${parsed.error}`)
            }
            const filePath = parsed.data.path
            const prompt = parsed.data.prompt
            const fileBuffer = await fs.readFile(filePath)
            const response = await this.queryImageWithModel(filePath, fileBuffer, prompt)
            return {
              content: [{ type: 'text', text: response }]
            }
          }

          case 'ocr_image': {
            const parsed = OcrImageArgsSchema.safeParse(args)
            if (!parsed.success) {
              throw new Error(`Invalid arguments for ${name}: ${parsed.error}`)
            }
            const filePath = parsed.data.path
            const fileBuffer = await fs.readFile(filePath)
            const ocrText = await this.ocrImageWithModel(filePath, fileBuffer)
            return {
              content: [{ type: 'text', text: ocrText }]
            }
          }

          default:
            throw new Error(`Unknown tool: ${name}`)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`Error processing tool call: ${errorMessage}`)
        return {
          content: [{ type: 'text', text: `Error: ${errorMessage}` }],
          isError: true
        }
      }
    })
  }
}
