import mongoose, { Document, Schema } from 'mongoose'

// 文件接口定义
export interface IFile extends Document {
  filename: string
  originalName: string
  mimetype: string
  size: number
  path: string
  url: string
  md5: string
  userId?: string
  createdAt: Date
  updatedAt: Date
}

// 文件Schema定义
const FileSchema: Schema = new Schema(
  {
    filename: {
      type: String,
      required: true,
      trim: true
    },
    originalName: {
      type: String,
      required: true,
      trim: true
    },
    mimetype: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    md5: {
      type: String,
      required: true,
      index: true // 为MD5字段创建索引以提高查询性能
    },
    userId: {
      type: String,
      ref: 'User',
      required: false
    }
  },
  {
    timestamps: true
  }
)

// 创建File模型
const File = mongoose.model<IFile>('File', FileSchema)
export default File
