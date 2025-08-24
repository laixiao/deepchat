import mongoose, { Document, Schema } from 'mongoose'

// 用户接口定义
export interface IUser extends Document {
  username: string
  email: string
  password: string
  avatar?: string
  createdAt: Date
  updatedAt: Date
}

// 用户Schema定义
const UserSchema: Schema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    avatar: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
)

// 创建User模型
const User = mongoose.model<IUser>('User', UserSchema)
export default User
