// 用户管理组件
const UserManagement = {
  template: `
        <div class="user-management">
            <!-- 搜索和操作栏 -->
            <div class="table-toolbar">
                <div class="toolbar-left">
                    <el-input
                        v-model="searchQuery"
                        placeholder="搜索用户名或邮箱..."
                        style="width: 300px"
                        clearable
                        @input="handleSearch"
                    >
                        <template #prefix>
                            <el-icon><Search /></el-icon>
                        </template>
                    </el-input>
                </div>
                <div class="toolbar-right">
                    <el-button type="primary" @click="refreshData" :loading="loading">
                        <el-icon><Refresh /></el-icon>
                        刷新
                    </el-button>
                </div>
            </div>

            <!-- 用户表格 -->
            <el-table
                id="user-table"
                :data="users"
                v-loading="loading"
                element-loading-text="加载中..."
                style="width: 100%"
                height="500"
                stripe
                border
            >
                <el-table-column prop="username" label="用户名" width="150" show-overflow-tooltip>
                    <template #default="{ row }">
                        <div style="display: flex; align-items: center;">
                            <el-avatar :size="32" style="margin-right: 10px;">
                                {{ row.username.charAt(0).toUpperCase() }}
                            </el-avatar>
                            <span style="font-weight: 500;">{{ row.username }}</span>
                        </div>
                    </template>
                </el-table-column>
                
                <el-table-column prop="email" label="邮箱" min-width="200" show-overflow-tooltip>
                    <template #default="{ row }">
                        <el-link type="primary" :href="'mailto:' + row.email">
                            {{ row.email }}
                        </el-link>
                    </template>
                </el-table-column>
                
                <el-table-column prop="createdAt" label="注册时间" width="180">
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
                            @click="editUser(row)"
                            :icon="Edit"
                        >
                            编辑
                        </el-button>
                        <el-popconfirm
                            title="确定要删除这个用户吗？"
                            @confirm="deleteUser(row)"
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

            <!-- 编辑用户对话框 -->
            <el-dialog
                v-model="editDialog.visible"
                :title="editDialog.title"
                width="500px"
                @close="resetEditForm"
            >
                <el-form
                    ref="editFormRef"
                    :model="editDialog.form"
                    :rules="editDialog.rules"
                    label-width="80px"
                >
                    <el-form-item label="用户名" prop="username">
                        <el-input v-model="editDialog.form.username" />
                    </el-form-item>
                    <el-form-item label="邮箱" prop="email">
                        <el-input v-model="editDialog.form.email" type="email" />
                    </el-form-item>
                    <el-form-item label="头像URL" prop="avatar">
                        <el-input v-model="editDialog.form.avatar" placeholder="可选" />
                    </el-form-item>
                </el-form>
                
                <template #footer>
                    <el-button @click="editDialog.visible = false">取消</el-button>
                    <el-button type="primary" @click="saveUser" :loading="editDialog.saving">
                        保存
                    </el-button>
                </template>
            </el-dialog>
        </div>
    `,

  setup() {
    const { ref, reactive, onMounted, nextTick } = Vue
    const { ElMessage, ElMessageBox } = ElementPlus

    // 响应式数据
    const loading = ref(false)
    const users = ref([])
    const searchQuery = ref('')
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
      title: '编辑用户',
      saving: false,
      form: {
        id: '',
        username: '',
        email: '',
        avatar: ''
      },
      rules: {
        username: [
          { required: true, message: '请输入用户名', trigger: 'blur' },
          { min: 3, max: 30, message: '用户名长度在 3 到 30 个字符', trigger: 'blur' }
        ],
        email: [
          { required: true, message: '请输入邮箱', trigger: 'blur' },
          { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
        ]
      }
    })

    // 获取用户列表
    const fetchUsers = async () => {
      loading.value = true
      try {
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          search: searchQuery.value
        }

        const response = await window.apiClient.users.getList(params)

        if (response.success) {
          users.value = response.data.users
          pagination.total = response.data.pagination.total
        } else {
          ElMessage.error(response.message || '获取用户列表失败')
        }
      } catch (error) {
        console.error('获取用户列表失败:', error)
        ElMessage.error('获取用户列表失败: ' + error.message)
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
        fetchUsers()
      }, 300)
    }

    // 分页处理
    const handleSizeChange = (size) => {
      pagination.limit = size
      pagination.page = 1
      fetchUsers()
    }

    const handleCurrentChange = (page) => {
      pagination.page = page
      fetchUsers()
    }

    // 刷新数据
    const refreshData = () => {
      fetchUsers()
    }

    // 编辑用户
    const editUser = (user) => {
      editDialog.form.id = user._id
      editDialog.form.username = user.username
      editDialog.form.email = user.email
      editDialog.form.avatar = user.avatar || ''
      editDialog.visible = true
    }

    // 保存用户
    const saveUser = async () => {
      try {
        await editFormRef.value.validate()

        editDialog.saving = true

        const { id, ...updateData } = editDialog.form
        const response = await window.apiClient.users.update(id, updateData)

        if (response.success) {
          ElMessage.success('用户信息更新成功')
          editDialog.visible = false
          fetchUsers()
        } else {
          ElMessage.error(response.message || '更新失败')
        }
      } catch (error) {
        if (error !== false) {
          // 不是表单验证错误
          console.error('更新用户失败:', error)
          ElMessage.error('更新用户失败: ' + error.message)
        }
      } finally {
        editDialog.saving = false
      }
    }

    // 删除用户
    const deleteUser = async (user) => {
      try {
        const response = await window.apiClient.users.delete(user._id)

        if (response.success) {
          ElMessage.success('用户删除成功')
          fetchUsers()
        } else {
          ElMessage.error(response.message || '删除失败')
        }
      } catch (error) {
        console.error('删除用户失败:', error)
        ElMessage.error('删除用户失败: ' + error.message)
      }
    }

    // 重置编辑表单
    const resetEditForm = () => {
      if (editFormRef.value) {
        editFormRef.value.resetFields()
      }
      editDialog.form = {
        id: '',
        username: '',
        email: '',
        avatar: ''
      }
    }

    // 格式化日期
    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleString('zh-CN')
    }

    // 监听主题变化
    const handleThemeChange = () => {
      // 强制重新渲染表格
      setTimeout(() => {
        const table = document.querySelector('#user-table .el-table')
        if (table) {
          table.style.display = 'none'
          table.offsetHeight // 触发重排
          table.style.display = ''
        }
      }, 0)
    }

    // 组件挂载时获取数据
    onMounted(() => {
      fetchUsers()

      // 监听主题变化
      document.addEventListener('el-theme-change', handleThemeChange)
    })

    // 暴露方法给父组件
    const refresh = () => {
      fetchUsers()
    }

    return {
      loading,
      users,
      searchQuery,
      pagination,
      editDialog,
      editFormRef,
      fetchUsers,
      handleSearch,
      handleSizeChange,
      handleCurrentChange,
      refreshData,
      editUser,
      saveUser,
      deleteUser,
      resetEditForm,
      formatDate,
      refresh,
      // Element Plus Icons
      Search: ElementPlusIconsVue.Search,
      Refresh: ElementPlusIconsVue.Refresh,
      Edit: ElementPlusIconsVue.Edit,
      Delete: ElementPlusIconsVue.Delete,
      Calendar: ElementPlusIconsVue.Calendar
    }
  }
}

// 注册组件
if (typeof window !== 'undefined') {
  window.UserManagement = UserManagement
}
