// 文件管理组件
const FileManagement = {
  template: `
        <div class="file-management">
            <!-- 搜索和操作栏 -->
            <div class="table-toolbar">
                <div class="toolbar-left">
                    <el-input
                        v-model="searchQuery"
                        placeholder="搜索文件名..."
                        style="width: 300px"
                        clearable
                        @input="handleSearch"
                    >
                        <template #prefix>
                            <el-icon><Search /></el-icon>
                        </template>
                    </el-input>
                    <el-select
                        v-model="fileTypeFilter"
                        placeholder="文件类型"
                        style="width: 150px"
                        @change="handleFilterChange"
                    >
                        <el-option label="所有文件" value="all" />
                        <el-option label="正式文件" value="permanent" />
                        <el-option label="临时文件" value="temporary" />
                    </el-select>
                </div>
                <div class="toolbar-right">
                    <el-button type="warning" @click="cleanupTempFiles" :loading="cleanupLoading">
                        <el-icon><Delete /></el-icon>
                        清理临时文件
                    </el-button>
                    <el-button type="primary" @click="refreshData" :loading="loading">
                        <el-icon><Refresh /></el-icon>
                        刷新
                    </el-button>
                </div>
            </div>

            <!-- 文件上传区域 -->
            <el-card style="margin-bottom: 20px;">
                <template #header>
                    <div style="display: flex; align-items: center;">
                        <el-icon style="margin-right: 8px;"><Upload /></el-icon>
                        <span>文件上传</span>
                    </div>
                </template>
                
                <el-radio-group v-model="uploadType" style="margin-bottom: 15px;">
                    <el-radio label="permanent">正式文件</el-radio>
                    <el-radio label="temporary">临时文件</el-radio>
                </el-radio-group>
                
                <el-upload
                    ref="uploadRef"
                    :action="uploadAction"
                    :headers="uploadHeaders"
                    :on-success="handleUploadSuccess"
                    :on-error="handleUploadError"
                    :before-upload="beforeUpload"
                    multiple
                    drag
                    style="width: 100%;"
                >
                    <el-icon style="font-size: 67px; color: #c0c4cc;"><UploadFilled /></el-icon>
                    <div style="color: #606266; margin-top: 10px;">
                        将文件拖到此处，或<em>点击上传</em>
                    </div>
                    <template #tip>
                        <div style="color: #909399; font-size: 12px; margin-top: 5px;">
                            {{ uploadType === 'temporary' ? '临时文件上传（免认证，48小时后自动清理）' : '支持多种格式的文件上传' }}
                        </div>
                    </template>
                </el-upload>
            </el-card>

            <!-- 文件表格 -->
            <el-table
                :data="files"
                v-loading="loading"
                element-loading-text="加载中..."
                style="width: 100%"
                height="400"
                stripe
                border
            >
                <el-table-column prop="originalName" label="文件名" min-width="200" show-overflow-tooltip>
                    <template #default="{ row }">
                        <div style="display: flex; align-items: center;">
                            <el-icon style="margin-right: 8px; color: #409eff;"><Document /></el-icon>
                            <div>
                                <div style="font-weight: 500;">{{ row.originalName }}</div>
                                <div style="font-size: 12px; color: #909399;">{{ row.filename }}</div>
                            </div>
                        </div>
                    </template>
                </el-table-column>
                
                <el-table-column prop="fileType" label="类型" width="100">
                    <template #default="{ row }">
                        <el-tag :type="row.fileType === 'temporary' ? 'warning' : 'success'" size="small">
                            {{ row.fileType === 'temporary' ? '临时' : '正式' }}
                        </el-tag>
                    </template>
                </el-table-column>
                
                <el-table-column prop="size" label="大小" width="120">
                    <template #default="{ row }">
                        {{ formatFileSize(row.size) }}
                    </template>
                </el-table-column>
                
                <el-table-column prop="createdAt" label="上传时间" width="180">
                    <template #default="{ row }">
                        <el-icon style="margin-right: 5px;"><Calendar /></el-icon>
                        {{ formatDate(row.createdAt) }}
                    </template>
                </el-table-column>
                
                <el-table-column label="操作" width="200" fixed="right">
                    <template #default="{ row }">
                        <el-button
                            type="primary"
                            size="small"
                            @click="viewFile(row)"
                            :icon="View"
                        >
                            查看
                        </el-button>
                        <el-button
                            type="warning"
                            size="small"
                            @click="editFile(row)"
                            :icon="Edit"
                        >
                            编辑
                        </el-button>
                        <el-popconfirm
                            title="确定要删除这个文件吗？"
                            @confirm="deleteFile(row)"
                            confirm-button-text="确定"
                            cancel-button-text="取消"
                        >
                            <template #reference>
                                <el-button
                                    type="danger"
                                    size="small"
                                    :icon="Delete"
                                >
                                    删除
                                </el-button>
                            </template>
                        </el-popconfirm>
                    </template>
                </el-table-column>
            </el-table>

            <!-- 分页 -->
            <div style="margin-top: 20px; text-align: center;">
                <el-pagination
                    v-model:current-page="pagination.page"
                    v-model:page-size="pagination.limit"
                    :page-sizes="[10, 20, 50, 100]"
                    :total="pagination.total"
                    layout="total, sizes, prev, pager, next, jumper"
                    @size-change="handleSizeChange"
                    @current-change="handleCurrentChange"
                />
            </div>

            <!-- 编辑文件对话框 -->
            <el-dialog
                v-model="editDialog.visible"
                title="编辑文件信息"
                width="500px"
                @close="resetEditForm"
            >
                <el-form
                    ref="editFormRef"
                    :model="editDialog.form"
                    :rules="editDialog.rules"
                    label-width="80px"
                >
                    <el-form-item label="文件名" prop="originalName">
                        <el-input v-model="editDialog.form.originalName" />
                    </el-form-item>
                </el-form>
                
                <template #footer>
                    <el-button @click="editDialog.visible = false">取消</el-button>
                    <el-button type="primary" @click="saveFile" :loading="editDialog.saving">
                        保存
                    </el-button>
                </template>
            </el-dialog>
        </div>
    `,

  setup() {
    const { ref, reactive, computed, onMounted } = Vue
    const { ElMessage, ElMessageBox } = ElementPlus

    // 响应式数据
    const loading = ref(false)
    const cleanupLoading = ref(false)
    const files = ref([])
    const searchQuery = ref('')
    const fileTypeFilter = ref('all')
    const uploadType = ref('permanent')
    const uploadRef = ref(null)
    const editFormRef = ref(null)

    // 分页数据
    const pagination = reactive({
      page: 1,
      limit: 10,
      total: 0
    })

    // 编辑对话框数据
    const editDialog = reactive({
      visible: false,
      saving: false,
      form: {
        id: '',
        originalName: ''
      },
      rules: {
        originalName: [{ required: true, message: '请输入文件名', trigger: 'blur' }]
      }
    })

    // 计算上传地址和请求头
    const uploadAction = computed(() => {
      return uploadType.value === 'temporary' ? '/api/files/temp-upload' : '/api/files/upload'
    })

    const uploadHeaders = computed(() => {
      const headers = {}
      if (uploadType.value === 'permanent') {
        const token = window.authManager.getToken()
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
      }
      return headers
    })

    // 获取文件列表
    const fetchFiles = async () => {
      loading.value = true
      try {
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          search: searchQuery.value,
          fileType: fileTypeFilter.value
        }

        const response = await window.apiClient.files.getList(params)

        if (response.success) {
          files.value = response.data.files
          pagination.total = response.data.pagination.total
        } else {
          ElMessage.error(response.message || '获取文件列表失败')
        }
      } catch (error) {
        console.error('获取文件列表失败:', error)
        ElMessage.error('获取文件列表失败: ' + error.message)
      } finally {
        loading.value = false
      }
    }

    // 搜索处理
    let searchTimeout
    const handleSearch = () => {
      clearTimeout(searchTimeout)
      searchTimeout = setTimeout(() => {
        pagination.page = 1
        fetchFiles()
      }, 300)
    }

    // 筛选处理
    const handleFilterChange = () => {
      pagination.page = 1
      fetchFiles()
    }

    // 分页处理
    const handleSizeChange = (size) => {
      pagination.limit = size
      pagination.page = 1
      fetchFiles()
    }

    const handleCurrentChange = (page) => {
      pagination.page = page
      fetchFiles()
    }

    // 刷新数据
    const refreshData = () => {
      fetchFiles()
    }

    // 文件上传处理
    const beforeUpload = (file) => {
      const isLt50M = file.size / 1024 / 1024 < 50
      if (!isLt50M) {
        ElMessage.error('文件大小不能超过 50MB!')
      }
      return isLt50M
    }

    const handleUploadSuccess = (response, file) => {
      if (response.success) {
        ElMessage.success(`文件 ${file.name} 上传成功`)
        fetchFiles()
      } else {
        ElMessage.error(`文件 ${file.name} 上传失败: ${response.message}`)
      }
    }

    const handleUploadError = (error, file) => {
      console.error('文件上传失败:', error)
      ElMessage.error(`文件 ${file.name} 上传失败`)
    }

    // 查看文件
    const viewFile = (file) => {
      let fullUrl = file.url
      if (file.url.startsWith('/')) {
        fullUrl = window.location.origin + file.url
      }
      window.open(fullUrl, '_blank')
    }

    // 编辑文件
    const editFile = (file) => {
      editDialog.form.id = file._id
      editDialog.form.originalName = file.originalName
      editDialog.visible = true
    }

    // 保存文件
    const saveFile = async () => {
      try {
        await editFormRef.value.validate()

        editDialog.saving = true

        const { id, ...updateData } = editDialog.form
        const response = await window.apiClient.files.update(id, updateData)

        if (response.success) {
          ElMessage.success('文件信息更新成功')
          editDialog.visible = false
          fetchFiles()
        } else {
          ElMessage.error(response.message || '更新失败')
        }
      } catch (error) {
        if (error !== false) {
          console.error('更新文件失败:', error)
          ElMessage.error('更新文件失败: ' + error.message)
        }
      } finally {
        editDialog.saving = false
      }
    }

    // 删除文件
    const deleteFile = async (file) => {
      try {
        const response = await window.apiClient.files.delete(file._id)

        if (response.success) {
          ElMessage.success('文件删除成功')
          fetchFiles()
        } else {
          ElMessage.error(response.message || '删除失败')
        }
      } catch (error) {
        console.error('删除文件失败:', error)
        ElMessage.error('删除文件失败: ' + error.message)
      }
    }

    // 清理临时文件
    const cleanupTempFiles = async () => {
      try {
        await ElMessageBox.confirm(
          '确定要清理超过48小时的临时文件吗？此操作不可撤销。',
          '确认清理',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        cleanupLoading.value = true
        const response = await window.apiClient.files.cleanupTemp()

        if (response.success) {
          ElMessage.success(response.message)
          fetchFiles()
        } else {
          ElMessage.error(response.message || '清理失败')
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('清理临时文件失败:', error)
          ElMessage.error('清理失败: ' + error.message)
        }
      } finally {
        cleanupLoading.value = false
      }
    }

    // 重置编辑表单
    const resetEditForm = () => {
      if (editFormRef.value) {
        editFormRef.value.resetFields()
      }
      editDialog.form = {
        id: '',
        originalName: ''
      }
    }

    // 格式化文件大小
    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    // 格式化日期
    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleString('zh-CN')
    }

    // 组件挂载时获取数据
    onMounted(() => {
      fetchFiles()
    })

    // 暴露方法给父组件
    const refresh = () => {
      fetchFiles()
    }

    return {
      loading,
      cleanupLoading,
      files,
      searchQuery,
      fileTypeFilter,
      uploadType,
      uploadRef,
      pagination,
      editDialog,
      editFormRef,
      uploadAction,
      uploadHeaders,
      fetchFiles,
      handleSearch,
      handleFilterChange,
      handleSizeChange,
      handleCurrentChange,
      refreshData,
      beforeUpload,
      handleUploadSuccess,
      handleUploadError,
      viewFile,
      editFile,
      saveFile,
      deleteFile,
      cleanupTempFiles,
      resetEditForm,
      formatFileSize,
      formatDate,
      refresh,
      // Element Plus Icons
      Search: ElementPlusIconsVue.Search,
      Refresh: ElementPlusIconsVue.Refresh,
      Delete: ElementPlusIconsVue.Delete,
      Upload: ElementPlusIconsVue.Upload,
      UploadFilled: ElementPlusIconsVue.UploadFilled,
      Document: ElementPlusIconsVue.Document,
      View: ElementPlusIconsVue.View,
      Edit: ElementPlusIconsVue.Edit,
      Calendar: ElementPlusIconsVue.Calendar
    }
  }
}

// 注册组件
if (typeof window !== 'undefined') {
  window.FileManagement = FileManagement
}
