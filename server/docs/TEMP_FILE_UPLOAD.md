# 临时文件上传功能

## 概述

本功能新增了临时文件上传接口，允许用户在不提供认证token的情况下上传文件，并提供了管理后台清理超过48小时的临时文件的功能。

## 新增功能

### 1. 文件类型标记

在文件模型中新增了 `fileType` 字段，用于区分文件类型：

- `permanent`: 正式文件（默认值）
- `temporary`: 临时文件

### 2. 临时文件上传接口

**接口地址**: `POST /api/files/temp-upload`

**特点**:
- 无需认证token
- 自动标记为临时文件
- 支持MD5去重
- 文件名前缀为 `temp-`

**请求参数**:
```
Content-Type: multipart/form-data

file: 文件（必需）
md5: 文件MD5值（可选，用于去重）
```

**响应示例**:
```json
{
  "success": true,
  "message": "临时文件上传成功",
  "data": {
    "url": "/uploads/temp-1640995200000-abc123.jpg",
    "fileId": "61c8f1234567890123456789"
  }
}
```

### 3. 清理临时文件接口

**接口地址**: `POST /api/admin/cleanup-temp-files`

**权限**: 需要管理员认证

**功能**: 清理创建时间超过48小时的临时文件

**响应示例**:
```json
{
  "success": true,
  "message": "成功清理了 5 个临时文件",
  "data": {
    "deletedCount": 5,
    "deletedFiles": [
      "temp-file1.jpg",
      "temp-file2.pdf",
      "temp-file3.docx"
    ]
  }
}
```

## 管理后台功能

### 文件列表筛选

在文件管理页面新增了文件类型筛选功能：

1. **筛选选项**：
   - 所有文件：显示所有文件
   - 正式文件：只显示正式文件
   - 临时文件：只显示临时文件

2. **文件类型显示**：
   - 在文件列表中新增"类型"列
   - 正式文件显示为绿色"正式文件"
   - 临时文件显示为橙色"临时文件"

### 集成文件上传功能

在文件上传页面新增了上传类型选择：

1. **上传类型选择**：
   - 正式文件：需要认证，永久保存
   - 临时文件：免认证，48小时后自动清理

2. **动态提示**：
   - 选择临时文件时显示橙色提示文字
   - 自动切换API端点和认证方式

### 清理临时文件按钮

在管理后台的文件管理页面新增了"清理临时文件"按钮：

1. 点击按钮会弹出确认对话框
2. 确认后会调用清理接口
3. 显示清理结果和删除的文件列表
4. 自动刷新文件列表

## 使用场景

### 临时文件上传

适用于以下场景：
- 用户预览功能
- 临时文件分享
- 无需注册的文件上传
- 测试和演示

### 定期清理

建议定期清理临时文件以：
- 释放存储空间
- 保持系统性能
- 清理无用数据

## 测试

### 管理后台测试

1. **登录管理后台**：`http://localhost:3002/admin`

2. **测试文件筛选功能**：
   - 进入文件管理页面
   - 使用筛选下拉菜单切换不同文件类型
   - 观察文件列表的变化和类型显示

3. **测试临时文件上传**：
   - 进入文件上传页面
   - 选择"临时文件（免认证）"选项
   - 上传文件并观察提示变化
   - 返回文件管理页面查看上传的临时文件

4. **测试清理功能**：
   - 在文件管理页面点击"清理临时文件"按钮
   - 确认清理操作
   - 查看清理结果和文件列表更新

## 技术实现

### 数据库变更

```typescript
// 文件类型枚举
export enum FileType {
  PERMANENT = 'permanent', // 正式文件
  TEMPORARY = 'temporary'  // 临时文件
}

// 文件模型新增字段
fileType: {
  type: String,
  enum: Object.values(FileType),
  default: FileType.PERMANENT,
  required: true
}
```

### 路由配置

```typescript
// 临时文件上传（免token）
router.post('/temp-upload', upload.single('file'), uploadTempFile)

// 清理临时文件（需要管理员权限）
router.post('/cleanup-temp-files', authenticateToken, authorizeAdmin, cleanupTempFiles)
```

### 清理逻辑

```typescript
// 查找超过48小时的临时文件
const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)
const tempFiles = await File.find({
  fileType: FileType.TEMPORARY,
  createdAt: { $lt: fortyEightHoursAgo }
})
```

## 安全考虑

1. **文件大小限制**: 继承现有的文件大小限制配置
2. **文件类型限制**: 可根据需要添加文件类型白名单
3. **频率限制**: 建议添加IP级别的上传频率限制
4. **存储清理**: 定期清理避免存储空间耗尽

## 配置选项

可通过环境变量配置：

```bash
# 文件大小限制
FILE_SIZE_LIMIT=50mb

# 上传目录
UPLOAD_DIR=uploads

# 临时目录
TEMP_DIR=temp
```

## 注意事项

1. 临时文件不关联用户ID
2. 清理操作不可撤销
3. 建议定期备份重要文件
4. 监控存储空间使用情况
