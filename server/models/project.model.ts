import mongoose, { Document, Schema } from 'mongoose'

// 工作流接口定义
export interface IWorkflow {
  name: string
  description: string
  apiConfig: object
}

// 下载链接接口定义
export interface IDownloadLink {
  filename: string
  hash: string
  url: string
}

// 项目状态枚举
export enum ProjectStatus {
  DRAFT = 'draft', // 草稿
  REVIEWING = 'reviewing', // 审核中
  REJECTED = 'rejected', // 已驳回
  ONLINE = 'online', // 已上线
  OFFLINE = 'offline' // 已下架
}

// 项目接口定义
export interface IProject extends Document {
  name: string
  description?: string
  userId: string
  serverAddress: string
  port: number
  workflows: IWorkflow[] // 多个工作流配置
  downloadLinks: IDownloadLink[] // 多个下载链接
  status: ProjectStatus
  createdAt: Date
  updatedAt: Date
}

// 工作流Schema定义
const WorkflowSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    apiConfig: {
      type: Schema.Types.Mixed,
      required: true,
      validate: {
        validator: function (v: any) {
          try {
            // 如果是字符串，尝试解析为JSON
            if (typeof v === 'string') {
              JSON.parse(v)
              return true
            }
            // 如果是对象，直接返回true
            return typeof v === 'object' && v !== null
          } catch (error) {
            return false
          }
        },
        message: 'API配置必须是有效的JSON格式'
      }
    }
  },
  { _id: true }
)

// 下载链接Schema定义
const DownloadLinkSchema: Schema = new Schema(
  {
    filename: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255
    },
    hash: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255
    },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    }
  },
  { _id: true }
)

// 项目Schema定义
const ProjectSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    userId: {
      type: String,
      ref: 'User',
      required: true,
      index: true
    },
    serverAddress: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (v: string) {
          // 简单的IP地址或域名验证
          const ipRegex =
            /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
          const domainRegex =
            /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/
          return ipRegex.test(v) || domainRegex.test(v) || v === 'localhost'
        },
        message: '请输入有效的IP地址或域名'
      }
    },
    port: {
      type: Number,
      required: true,
      min: 1,
      max: 65535,
      validate: {
        validator: function (v: number) {
          return Number.isInteger(v)
        },
        message: '端口必须是1-65535之间的整数'
      }
    },
    workflows: {
      type: [WorkflowSchema],
      default: [],
      validate: {
        validator: function (v: any[]) {
          return Array.isArray(v) && v.length >= 0
        },
        message: '工作流必须是数组格式'
      }
    },
    downloadLinks: {
      type: [DownloadLinkSchema],
      default: []
    },
    status: {
      type: String,
      enum: Object.values(ProjectStatus),
      default: ProjectStatus.DRAFT,
      required: true
    }
  },
  {
    timestamps: true
  }
)

// 创建复合索引
ProjectSchema.index({ userId: 1, name: 1 }, { unique: true }) // 同一用户下项目名称唯一
ProjectSchema.index({ serverAddress: 1, port: 1 }) // 服务器地址和端口组合索引
ProjectSchema.index({ status: 1 }) // 状态索引
ProjectSchema.index({ createdAt: -1 }) // 创建时间索引

// 创建Project模型
const Project = mongoose.model<IProject>('Project', ProjectSchema)
export default Project
