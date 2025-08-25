# Cross-Device File Move Fix

## Problem

The file upload functionality was failing with the following error when running in containerized environments:

```
Error: EXDEV: cross-device link not permitted, rename '/app/temp/file-xxx' -> '/root/deepchat/server/uploads/temp-xxx.webp'
```

This error occurs when trying to use `fs.renameSync()` to move files across different filesystems or devices. In Docker containers, the temp directory and uploads directory might be on different mounted volumes or filesystems.

## Root Cause

The error happens in two places in the file upload controller:

1. `uploadFile` function (line 89)
2. `uploadTempFile` function (line 270)

Both functions use `fs.renameSync(req.file.path, filePath)` to move uploaded files from the temporary multer storage location to the final uploads directory.

## Solution

Created a utility function `safeFileMove()` in `server/utils/paths.ts` that:

1. First attempts to use `fs.renameSync()` (fastest method)
2. If it fails with EXDEV error, falls back to `fs.copyFileSync()` + `fs.unlinkSync()` 
3. Re-throws any other errors

### Code Changes

#### 1. Added utility function in `server/utils/paths.ts`:

```typescript
/**
 * 安全地移动文件，处理跨设备移动的情况（同步版本）
 */
export function safeFileMove(sourcePath: string, destPath: string): void {
  try {
    fs.renameSync(sourcePath, destPath)
  } catch (error: any) {
    // 如果是跨设备错误，使用复制+删除的方式
    if (error.code === 'EXDEV') {
      fs.copyFileSync(sourcePath, destPath)
      fs.unlinkSync(sourcePath)
    } else {
      throw error
    }
  }
}

/**
 * 安全地移动文件，处理跨设备移动的情况（异步版本）
 */
export async function safeFileMoveAsync(sourcePath: string, destPath: string): Promise<void> {
  try {
    await fs.promises.rename(sourcePath, destPath)
  } catch (error: any) {
    // 如果是跨设备错误，使用复制+删除的方式
    if (error.code === 'EXDEV') {
      await fs.promises.copyFile(sourcePath, destPath)
      await fs.promises.unlink(sourcePath)
    } else {
      throw error
    }
  }
}
```

#### 2. Updated `server/controllers/file.controller.ts`:

- Imported `safeFileMove` from utils
- Replaced `fs.renameSync(req.file.path, filePath)` with `safeFileMove(req.file.path, filePath)` in both upload functions

## Benefits

1. **Backward Compatibility**: Still uses the fast `rename` operation when possible
2. **Cross-Device Support**: Automatically falls back to copy+delete for cross-device moves
3. **Error Handling**: Preserves original error handling for non-EXDEV errors
4. **Performance**: Minimal overhead - only uses slower copy+delete when necessary

## Testing

The fix has been tested and works correctly in both scenarios:
- Same filesystem: Uses fast rename operation
- Cross-device: Uses copy+delete fallback

## Future Considerations

The async version `safeFileMoveAsync()` is available for future use in async contexts. Other parts of the codebase that use `fs.rename()` or `fs.renameSync()` may benefit from similar fixes if cross-device issues are encountered.

## Related Files

- `server/controllers/file.controller.ts` - File upload handlers
- `server/utils/paths.ts` - Utility functions
- `server/routes/file.routes.ts` - Multer configuration
