// 项目管理组件
const ProjectManagement = {
  template: `
        <div class="project-management">
            <!-- 搜索和操作栏 -->
            <div class="table-toolbar">
                <div class="toolbar-left">
                    <el-input
                        v-model="searchQuery"
                        placeholder="搜索项目名称、描述或服务器地址..."
                        style="width: 350px"
                        clearable
                        @input="handleSearch"
                    >
                        <template #prefix>
                            <el-icon><Search /></el-icon>
                        </template>
                    </el-input>
                    <el-select
                        v-model="statusFilter"
                        placeholder="项目状态"
                        style="width: 150px"
                        @change="handleFilterChange"
                    >
                        <el-option label="所有状态" value="all" />
                        <el-option label="草稿" value="draft" />
                        <el-option label="审核中" value="reviewing" />
                        <el-option label="已驳回" value="rejected" />
                        <el-option label="已上线" value="online" />
                        <el-option label="已下架" value="offline" />
                    </el-select>
                </div>
                <div class="toolbar-right">
                    <el-button type="success" @click="addProject">
                        <el-icon><Plus /></el-icon>
                        新增项目
                    </el-button>
                    <el-button type="primary" @click="refreshData" :loading="loading">
                        <el-icon><Refresh /></el-icon>
                        刷新
                    </el-button>
                </div>
            </div>

            <!-- 项目表格 -->
            <el-table
                id="project-table"
                :data="projects"
                v-loading="loading"
                element-loading-text="加载中..."
                style="width: 100%"
                height="500"
                stripe
                border
            >
                <el-table-column prop="name" label="项目名称" min-width="150" show-overflow-tooltip>
                    <template #default="{ row }">
                        <div style="display: flex; align-items: center;">
                            <el-icon style="margin-right: 8px; color: #409eff;"><Box /></el-icon>
                            <div>
                                <div style="font-weight: 500;">{{ row.name }}</div>
                                <div v-if="row.description" style="font-size: 12px; color: #909399;">
                                    {{ row.description }}
                                </div>
                            </div>
                        </div>
                    </template>
                </el-table-column>
                
                <el-table-column prop="userId" label="所属用户" width="150">
                    <template #default="{ row }">
                        <div v-if="row.userId">
                            <div style="font-weight: 500;">{{ row.userId.username }}</div>
                            <div style="font-size: 12px; color: #909399;">{{ row.userId.email }}</div>
                        </div>
                        <span v-else style="color: #909399;">未知用户</span>
                    </template>
                </el-table-column>
                
                <el-table-column label="服务器信息" width="180">
                    <template #default="{ row }">
                        <div>
                            <div style="font-weight: 500;">{{ row.serverAddress }}</div>
                            <div style="font-size: 12px; color: #409eff;">端口: {{ row.port }}</div>
                        </div>
                    </template>
                </el-table-column>
                
                <el-table-column prop="workflows" label="工作流" width="100">
                    <template #default="{ row }">
                        <el-tag v-if="row.workflows && row.workflows.length > 0" type="info" size="small">
                            {{ row.workflows.length }} 个
                        </el-tag>
                        <span v-else style="color: #909399;">无</span>
                    </template>
                </el-table-column>
                
                <el-table-column prop="status" label="状态" width="100">
                    <template #default="{ row }">
                        <el-tag :type="getStatusType(row.status)" size="small">
                            {{ getStatusText(row.status) }}
                        </el-tag>
                    </template>
                </el-table-column>
                
                <el-table-column prop="createdAt" label="创建时间" width="180">
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
                            @click="editProject(row)"
                            :icon="Edit"
                        >
                            编辑
                        </el-button>
                        <el-popconfirm
                            title="确定要删除这个项目吗？"
                            @confirm="deleteProject(row)"
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

            <!-- 项目编辑对话框 -->
            <el-dialog
                v-model="projectDialog.visible"
                :title="projectDialog.title"
                width="90%"
                max-width="1000px"
                @close="resetProjectForm"
                :close-on-click-modal="false"
            >
                <el-form
                    ref="projectFormRef"
                    :model="projectDialog.form"
                    :rules="projectDialog.rules"
                    label-width="100px"
                    style="max-height: 70vh; overflow-y: auto; padding-right: 10px;"
                >
                    <el-form-item label="项目名称" prop="name">
                        <el-input v-model="projectDialog.form.name" />
                    </el-form-item>
                    
                    <el-form-item label="项目描述" prop="description">
                        <el-input
                            v-model="projectDialog.form.description"
                            type="textarea"
                            :rows="3"
                            placeholder="可选"
                        />
                    </el-form-item>
                    
                    <el-form-item label="所属用户" prop="userId" v-if="!projectDialog.form.id">
                        <el-select
                            v-model="projectDialog.form.userId"
                            placeholder="请选择用户"
                            style="width: 100%;"
                            filterable
                            remote
                            reserve-keyword
                            :remote-method="searchUsers"
                            :loading="userSearchLoading"
                            clearable
                            @focus="loadInitialUsers"
                            @visible-change="handleUserSelectVisibleChange"
                            popper-class="user-select-dropdown"
                            :no-data-text="userSearchLoading ? '搜索中...' : '暂无数据'"
                        >
                            <el-option
                                v-for="user in userOptions"
                                :key="user._id"
                                :label="user.username + ' (' + user.email + ')'"
                                :value="user._id"
                            >
                                <div style="display: flex; align-items: center; width: 100%; overflow: hidden;">
                                    <el-avatar :size="24" style="margin-right: 8px; flex-shrink: 0;">
                                        {{ user.username.charAt(0).toUpperCase() }}
                                    </el-avatar>
                                    <div style="flex: 1; min-width: 0;">
                                        <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                            {{ user.username }}
                                        </div>
                                        <div style="font-size: 12px; color: #909399; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                            {{ user.email }}
                                        </div>
                                    </div>
                                </div>
                            </el-option>
                            <template v-if="userOptions.length === 0 && !userSearchLoading">
                                <el-option disabled value="" label="暂无用户数据">
                                    <div style="text-align: center; padding: 10px; color: #909399;">
                                        <div>暂无用户数据</div>
                                        <el-button
                                            type="primary"
                                            size="small"
                                            @click="refreshUserList"
                                            style="margin-top: 8px;"
                                        >
                                            点击加载用户
                                        </el-button>
                                    </div>
                                </el-option>
                            </template>
                        </el-select>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                            <div style="font-size: 12px; color: #909399;">
                                输入用户名或邮箱进行搜索，已加载 {{ userOptions.length }} 个用户
                            </div>
                            <el-button
                                type="primary"
                                :icon="Refresh"
                                @click="refreshUserList"
                                :loading="userSearchLoading"
                                title="刷新用户列表"
                                size="small"
                            />
                        </div>
                    </el-form-item>

                    <el-row :gutter="16">
                        <el-col :span="16">
                            <el-form-item label="服务器地址" prop="serverAddress">
                                <el-input v-model="projectDialog.form.serverAddress" placeholder="例如: 192.168.1.100 或 example.com" />
                                <div style="font-size: 12px; color: #909399; margin-top: 5px;">
                                    默认输入http://localhost:8188
                                </div>
                            </el-form-item>
                        </el-col>
                        <el-col :span="8">
                            <el-form-item label="端口" prop="port">
                                <el-input-number
                                    v-model="projectDialog.form.port"
                                    :min="1"
                                    :max="65535"
                                    style="width: 100%"
                                />
                            </el-form-item>
                        </el-col>
                    </el-row>
                    
                    <el-form-item label="项目状态" prop="status">
                        <el-select v-model="projectDialog.form.status" style="width: 100%">
                            <el-option label="草稿" value="draft" />
                            <el-option label="审核中" value="reviewing" />
                            <el-option label="已驳回" value="rejected" />
                            <el-option label="已上线" value="online" />
                            <el-option label="已下架" value="offline" />
                        </el-select>
                    </el-form-item>
                    
                    <el-form-item label="工作流配置">
                        <div style="width: 100%;">
                            <!-- 拖拽上传区域 -->
                            <div
                                class="workflow-upload-area"
                                :class="{ 'is-dragover': isDragOver }"
                                @drop="handleFileDrop"
                                @dragover.prevent="handleDragOver"
                                @dragleave="handleDragLeave"
                                @click="triggerFileInput"
                                style="border: 2px dashed #dcdfe6; border-radius: 6px; padding: 20px; text-align: center; margin-bottom: 15px; cursor: pointer; transition: all 0.3s;"
                            >
                                <input
                                    ref="fileInputRef"
                                    type="file"
                                    accept=".json,.txt"
                                    @change="handleFileSelect"
                                    style="display: none;"
                                />
                                <el-icon style="font-size: 28px; color: #8c939d; margin-bottom: 8px;"><Upload /></el-icon>
                                <div style="color: #606266; font-size: 14px; margin-bottom: 4px;">
                                    拖拽工作流文件到此处，或点击选择文件
                                </div>
                                <div style="color: #909399; font-size: 12px;">
                                    支持 JSON 格式的工作流配置文件
                                </div>
                            </div>

                            <div v-for="(workflow, index) in projectDialog.form.workflows" :key="index" class="workflow-container theme-workflow">
                                <div class="workflow-header">
                                    <span class="workflow-title">工作流 {{ index + 1 }}</span>
                                    <el-button
                                        type="danger"
                                        size="small"
                                        @click="removeWorkflow(index)"
                                        :icon="Delete"
                                    >
                                        删除
                                    </el-button>
                                </div>

                                <el-form-item label="名称" :prop="'workflows.' + index + '.name'" style="margin-bottom: 10px;">
                                    <el-input v-model="workflow.name" placeholder="工作流名称" />
                                </el-form-item>

                                <el-form-item label="描述" :prop="'workflows.' + index + '.description'" style="margin-bottom: 10px;">
                                    <el-input
                                        v-model="workflow.description"
                                        type="textarea"
                                        :rows="2"
                                        placeholder="工作流作用描述"
                                    />
                                </el-form-item>

                                <el-form-item label="API配置" :prop="'workflows.' + index + '.apiConfig'" style="margin-bottom: 0;">
                                    <el-input
                                        v-model="workflow.apiConfigText"
                                        type="textarea"
                                        :autosize="{ minRows: 4, maxRows: 12 }"
                                        placeholder='例如: {"url": "https://api.example.com", "method": "POST", "headers": {"Content-Type": "application/json"}}'
                                        class="json-editor"
                                        @blur="validateWorkflowJson(workflow, index)"
                                        @input="formatJsonInput(workflow)"
                                    />
                                    <div style="font-size: 12px; color: #909399; margin-top: 5px;">
                                        支持JSON格式，输入框会自动调整高度
                                    </div>
                                </el-form-item>
                            </div>

                            <el-button
                                type="success"
                                @click="addWorkflow"
                                :icon="Plus"
                                style="width: 100%; margin-top: 10px;"
                            >
                                添加工作流
                            </el-button>
                        </div>
                    </el-form-item>
                </el-form>
                
                <template #footer>
                    <div style="display: flex; justify-content: flex-end; align-items: center; width: 100%; gap: 10px;">
                        <el-button
                            type="warning"
                            @click="aiAutoFill"
                            :icon="Magic"
                            :loading="aiAutoFillLoading"
                        >
                            AI智能填写
                        </el-button>
                        <el-button @click="projectDialog.visible = false">取消</el-button>
                        <el-button type="primary" @click="saveProject" :loading="projectDialog.saving">
                            保存
                        </el-button>
                    </div>
                </template>
            </el-dialog>
        </div>
    `,

  setup() {
    const { ref, reactive, onMounted } = Vue
    const { ElMessage, ElMessageBox } = ElementPlus

    // 响应式数据
    const loading = ref(false)
    const projects = ref([])
    const searchQuery = ref('')
    const statusFilter = ref('all')
    const projectFormRef = ref(null)
    const fileInputRef = ref(null)
    const userOptions = ref([])
    const userSearchLoading = ref(false)
    const isDragOver = ref(false)
    const aiAutoFillLoading = ref(false)

    // 分页数据
    const pagination = reactive({
      page: 1,
      limit: 10,
      total: 0
    })

    // 项目对话框数据
    const projectDialog = reactive({
      visible: false,
      title: '新增项目',
      saving: false,
      form: {
        id: '',
        name: '',
        description: '',
        userId: '',
        serverAddress: '',
        port: 3000,
        status: 'draft',
        workflows: []
      },
      rules: {
        name: [
          { required: true, message: '请输入项目名称', trigger: 'blur' },
          { min: 1, max: 100, message: '项目名称长度在 1 到 100 个字符', trigger: 'blur' }
        ],
        userId: [{ required: true, message: '请选择所属用户', trigger: 'change' }],
        serverAddress: [{ required: true, message: '请输入服务器地址', trigger: 'blur' }],
        port: [
          { required: true, message: '请输入端口', trigger: 'blur' },
          { type: 'number', min: 1, max: 65535, message: '端口范围为 1-65535', trigger: 'blur' }
        ],
        status: [{ required: true, message: '请选择项目状态', trigger: 'change' }]
      }
    })

    // 状态映射
    const statusMap = {
      draft: { text: '草稿', type: 'info' },
      reviewing: { text: '审核中', type: 'warning' },
      rejected: { text: '已驳回', type: 'danger' },
      online: { text: '已上线', type: 'success' },
      offline: { text: '已下架', type: 'info' }
    }

    const getStatusText = (status) => statusMap[status]?.text || status
    const getStatusType = (status) => statusMap[status]?.type || 'info'

    // 获取项目列表
    const fetchProjects = async () => {
      loading.value = true
      try {
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          search: searchQuery.value,
          status: statusFilter.value
        }

        const response = await window.apiClient.projects.getList(params)

        if (response.success) {
          projects.value = response.data.projects
          pagination.total = response.data.pagination.total
        } else {
          ElMessage.error(response.message || '获取项目列表失败')
        }
      } catch (error) {
        console.error('获取项目列表失败:', error)
        ElMessage.error('获取项目列表失败: ' + error.message)
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
        fetchProjects()
      }, 300)
    }

    // 筛选处理
    const handleFilterChange = () => {
      pagination.page = 1
      fetchProjects()
    }

    // 分页处理
    const handleSizeChange = (size) => {
      pagination.limit = size
      pagination.page = 1
      fetchProjects()
    }

    const handleCurrentChange = (page) => {
      pagination.page = page
      fetchProjects()
    }

    // 刷新数据
    const refreshData = () => {
      fetchProjects()
    }

    // 搜索用户
    const searchUsers = async (query) => {
      if (!query || query.trim() === '') {
        // 如果没有查询条件，加载初始用户列表
        await loadInitialUsers()
        return
      }

      userSearchLoading.value = true
      try {
        const response = await window.apiClient.users.getList({
          page: 1,
          limit: 50, // 增加搜索结果数量
          search: query.trim()
        })

        if (response.success) {
          userOptions.value = response.data.users || []
        } else {
          userOptions.value = []
          ElMessage.warning('搜索用户失败: ' + (response.message || '未知错误'))
        }
      } catch (error) {
        console.error('搜索用户失败:', error)
        userOptions.value = []
        ElMessage.error('搜索用户失败: ' + error.message)
      } finally {
        userSearchLoading.value = false
      }
    }

    // 加载初始用户列表
    const loadInitialUsers = async () => {
      if (userOptions.value.length > 0) {
        return // 已经有数据，不重复加载
      }

      userSearchLoading.value = true
      try {
        const response = await window.apiClient.users.getList({
          page: 1,
          limit: 100 // 加载更多用户供选择
        })

        if (response.success) {
          userOptions.value = response.data.users || []
        } else {
          userOptions.value = []
          ElMessage.warning('加载用户列表失败: ' + (response.message || '未知错误'))
        }
      } catch (error) {
        console.error('加载用户列表失败:', error)
        userOptions.value = []
        ElMessage.error('加载用户列表失败: ' + error.message)
      } finally {
        userSearchLoading.value = false
      }
    }

    // 刷新用户列表
    const refreshUserList = async () => {
      userOptions.value = [] // 清空现有列表
      await loadInitialUsers()
    }

    // 处理用户选择下拉框可见性变化
    const handleUserSelectVisibleChange = (visible) => {
      if (visible && userOptions.value.length === 0) {
        // 下拉框打开时，如果没有数据则自动加载
        loadInitialUsers()
      }
    }

    // 新增项目
    const addProject = () => {
      projectDialog.title = '新增项目'
      projectDialog.form = {
        id: '',
        name: '',
        description: '',
        userId: '',
        serverAddress: '',
        port: 3000,
        status: 'draft',
        workflows: []
      }
      // 不清空用户选项，保持已加载的用户列表
      // userOptions.value = [];
      projectDialog.visible = true
    }

    // 编辑项目
    const editProject = async (project) => {
      projectDialog.title = '编辑项目'
      projectDialog.form = {
        id: project._id,
        name: project.name,
        description: project.description || '',
        userId: project.userId._id || project.userId,
        serverAddress: project.serverAddress,
        port: project.port,
        status: project.status,
        workflows: (project.workflows || []).map((w) => ({
          name: w.name,
          description: w.description,
          apiConfig: w.apiConfig,
          apiConfigText: JSON.stringify(w.apiConfig, null, 2)
        }))
      }

      // 设置用户选项
      if (project.userId && typeof project.userId === 'object') {
        userOptions.value = [project.userId]
      }

      projectDialog.visible = true
    }

    // 添加工作流
    const addWorkflow = () => {
      projectDialog.form.workflows.push({
        name: '',
        description: '',
        apiConfig: {},
        apiConfigText: ''
      })
    }

    // 删除工作流
    const removeWorkflow = (index) => {
      projectDialog.form.workflows.splice(index, 1)
    }

    // 验证工作流JSON
    const validateWorkflowJson = (workflow, index) => {
      if (!workflow.apiConfigText.trim()) {
        workflow.apiConfig = {}
        return
      }

      try {
        workflow.apiConfig = JSON.parse(workflow.apiConfigText)
      } catch (error) {
        ElMessage.error(`工作流 ${index + 1} 的API配置不是有效的JSON格式`)
        workflow.apiConfig = {}
      }
    }

    // 格式化JSON输入
    const formatJsonInput = (workflow) => {
      // 简单的JSON格式化提示
      if (workflow.apiConfigText.trim()) {
        try {
          JSON.parse(workflow.apiConfigText)
          // 如果解析成功，可以选择性地格式化
          // workflow.apiConfigText = JSON.stringify(JSON.parse(workflow.apiConfigText), null, 2);
        } catch (error) {
          // 输入过程中的错误不需要提示
        }
      }
    }

    // 拖拽处理函数
    const handleDragOver = (e) => {
      e.preventDefault()
      isDragOver.value = true
    }

    const handleDragLeave = (e) => {
      e.preventDefault()
      isDragOver.value = false
    }

    const handleFileDrop = (e) => {
      e.preventDefault()
      isDragOver.value = false

      const files = e.dataTransfer.files
      if (files.length > 0) {
        processWorkflowFile(files[0])
      }
    }

    const triggerFileInput = () => {
      fileInputRef.value?.click()
    }

    const handleFileSelect = (e) => {
      const files = e.target.files
      if (files.length > 0) {
        processWorkflowFile(files[0])
      }
      // 清空文件输入，允许重复选择同一文件
      e.target.value = ''
    }

    // 处理工作流文件
    const processWorkflowFile = async (file) => {
      try {
        // 检查文件类型
        if (
          !file.name.toLowerCase().endsWith('.json') &&
          !file.name.toLowerCase().endsWith('.txt')
        ) {
          ElMessage.warning('请选择 JSON 或 TXT 格式的文件')
          return
        }

        // 读取文件内容
        const text = await readFileAsText(file)

        try {
          // 尝试解析为JSON
          const workflowData = JSON.parse(text)

          // 检查是否是单个工作流对象还是工作流数组
          if (Array.isArray(workflowData)) {
            // 工作流数组
            for (const workflow of workflowData) {
              addWorkflowFromData(workflow)
            }
            ElMessage.success(`成功导入 ${workflowData.length} 个工作流`)
          } else if (workflowData && typeof workflowData === 'object') {
            // 单个工作流对象
            addWorkflowFromData(workflowData)
            ElMessage.success('成功导入 1 个工作流')
          } else {
            ElMessage.error('文件格式不正确，请确保是有效的工作流配置')
          }
        } catch (error) {
          ElMessage.error('文件内容不是有效的 JSON 格式')
        }
      } catch (error) {
        console.error('处理文件失败:', error)
        ElMessage.error('处理文件失败: ' + error.message)
      }
    }

    // 从数据添加工作流
    const addWorkflowFromData = (data) => {
      const workflow = {
        name: data.name || data.title || '未命名工作流',
        description: data.description || data.desc || '从文件导入的工作流',
        apiConfig: data.apiConfig || data.config || data,
        apiConfigText: JSON.stringify(data.apiConfig || data.config || data, null, 2)
      }

      projectDialog.form.workflows.push(workflow)
    }

    // 读取文件为文本
    const readFileAsText = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = (e) => reject(new Error('读取文件失败'))
        reader.readAsText(file, 'UTF-8')
      })
    }

    // AI自动填写功能
    const aiAutoFill = async () => {
      try {
        // 检查OpenAI配置
        const openaiConfig = window.settingsManager.getOpenAIConfig()
        if (!openaiConfig.apiKey) {
          ElMessage.warning('请先在设置中配置 OpenAI API Key')
          return
        }

        aiAutoFillLoading.value = true

        // 构建项目信息
        const projectInfo = `项目名称: ${projectDialog.form.name || '未填写'}
项目描述: ${projectDialog.form.description || '未填写'}
服务器地址: ${projectDialog.form.serverAddress || '未填写'}
端口: ${projectDialog.form.port || '未填写'}`

        // 构建工作流信息
        const workflowsInfo = projectDialog.form.workflows
          .map((workflow, index) => {
            return `工作流 ${index + 1}:
名称: ${workflow.name || '未填写'}
描述: ${workflow.description || '未填写'}
API配置: ${workflow.apiConfigText || '未填写'}`
          })
          .join('\n\n')

        const prompt = `请分析以下项目信息和工作流配置，并为项目和每个工作流自动填写或优化名称和描述字段。请根据API配置的内容来推断工作流的用途和功能。

项目信息:
${projectInfo}

${workflowsInfo ? '工作流信息:' + workflowsInfo : '暂无工作流'}

请返回JSON格式的结果，包含项目建议和每个工作流的建议名称和描述：
{
  "project": {
    "name": "建议的项目名称",
    "description": "详细的项目描述，说明项目的主要功能和用途"
  },
  "workflows": [
    {
      "name": "建议的工作流名称",
      "description": "详细的工作流描述，说明其功能和用途"
    }
  ]
}

要求：
1. 项目名称要简洁明了，体现项目的核心功能
2. 项目描述要详细说明项目的主要功能、目标用户和使用场景
3. 工作流名称要简洁明了，体现工作流的核心功能
4. 工作流描述要详细说明工作流的作用、输入输出和使用场景
5. 如果API配置包含URL，请根据URL推断服务类型
6. 如果已有名称和描述，请优化使其更准确和专业
7. 如果没有工作流，返回空数组
8. 返回的工作流数量必须与输入的工作流数量一致`

        // 调用OpenAI API
        const response = await fetch(`${openaiConfig.baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiConfig.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: openaiConfig.model,
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 2000
          })
        })

        if (!response.ok) {
          throw new Error(`OpenAI API 请求失败: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        const aiResponse = data.choices[0]?.message?.content

        if (!aiResponse) {
          throw new Error('AI 响应为空')
        }

        // 解析AI响应
        try {
          // 提取JSON内容，去除markdown代码块标记
          let cleanResponse = aiResponse.trim()
          if (cleanResponse.startsWith('```json')) {
            cleanResponse = cleanResponse.substring(7)
          }
          if (cleanResponse.startsWith('```')) {
            cleanResponse = cleanResponse.substring(3)
          }
          if (cleanResponse.endsWith('```')) {
            cleanResponse = cleanResponse.slice(0, -3)
          }
          cleanResponse = cleanResponse.trim()

          const result = JSON.parse(cleanResponse)

          // 应用项目建议
          if (result.project) {
            if (result.project.name && !projectDialog.form.name) {
              projectDialog.form.name = result.project.name
            }
            if (result.project.description && !projectDialog.form.description) {
              projectDialog.form.description = result.project.description
            }
          }

          // 应用工作流建议
          if (result.workflows && Array.isArray(result.workflows)) {
            // 应用AI建议
            result.workflows.forEach((suggestion, index) => {
              if (index < projectDialog.form.workflows.length) {
                if (suggestion.name) {
                  projectDialog.form.workflows[index].name = suggestion.name
                }
                if (suggestion.description) {
                  projectDialog.form.workflows[index].description = suggestion.description
                }
              }
            })
            ElMessage.success('AI 自动填写完成！已优化项目和工作流信息')
          } else if (result.project) {
            ElMessage.success('AI 自动填写完成！已优化项目信息')
          } else {
            throw new Error('AI 响应格式不正确')
          }
        } catch (parseError) {
          console.error('解析AI响应失败:', parseError)
          ElMessage.error('AI 响应格式解析失败，请重试')
        }
      } catch (error) {
        console.error('AI自动填写失败:', error)
        ElMessage.error('AI 自动填写失败: ' + error.message)
      } finally {
        aiAutoFillLoading.value = false
      }
    }

    // 保存项目
    const saveProject = async () => {
      try {
        await projectFormRef.value.validate()

        // 验证所有工作流的JSON
        for (let i = 0; i < projectDialog.form.workflows.length; i++) {
          const workflow = projectDialog.form.workflows[i]
          if (workflow.apiConfigText.trim()) {
            try {
              workflow.apiConfig = JSON.parse(workflow.apiConfigText)
            } catch (error) {
              ElMessage.error(`工作流 ${i + 1} 的API配置不是有效的JSON格式`)
              return
            }
          }
        }

        projectDialog.saving = true

        const { id, workflows, ...formData } = projectDialog.form

        // 处理工作流数据
        const processedWorkflows = workflows
          .map((w) => ({
            name: w.name,
            description: w.description,
            apiConfig: w.apiConfig
          }))
          .filter((w) => w.name && w.description)

        const requestData = {
          ...formData,
          workflows: processedWorkflows
        }

        let response
        if (id) {
          response = await window.apiClient.projects.update(id, requestData)
        } else {
          response = await window.apiClient.projects.create(requestData)
        }

        if (response.success) {
          ElMessage.success(id ? '项目更新成功' : '项目创建成功')
          projectDialog.visible = false
          fetchProjects()
        } else {
          ElMessage.error(response.message || '操作失败')
        }
      } catch (error) {
        if (error !== false) {
          console.error('保存项目失败:', error)
          ElMessage.error('保存项目失败: ' + error.message)
        }
      } finally {
        projectDialog.saving = false
      }
    }

    // 删除项目
    const deleteProject = async (project) => {
      try {
        const response = await window.apiClient.projects.delete(project._id)

        if (response.success) {
          ElMessage.success('项目删除成功')
          fetchProjects()
        } else {
          ElMessage.error(response.message || '删除失败')
        }
      } catch (error) {
        console.error('删除项目失败:', error)
        ElMessage.error('删除项目失败: ' + error.message)
      }
    }

    // 重置项目表单
    const resetProjectForm = () => {
      if (projectFormRef.value) {
        projectFormRef.value.resetFields()
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
        const table = document.querySelector('#project-table .el-table')
        if (table) {
          table.style.display = 'none'
          table.offsetHeight // 触发重排
          table.style.display = ''
        }
      }, 0)
    }

    // 组件挂载时获取数据
    onMounted(() => {
      fetchProjects()

      // 监听主题变化
      document.addEventListener('el-theme-change', handleThemeChange)
    })

    // 暴露方法给父组件
    const refresh = () => {
      fetchProjects()
    }

    return {
      loading,
      projects,
      searchQuery,
      statusFilter,
      pagination,
      projectDialog,
      projectFormRef,
      fileInputRef,
      userOptions,
      userSearchLoading,
      isDragOver,
      aiAutoFillLoading,
      getStatusText,
      getStatusType,
      fetchProjects,
      handleSearch,
      handleFilterChange,
      handleSizeChange,
      handleCurrentChange,
      refreshData,
      searchUsers,
      loadInitialUsers,
      refreshUserList,
      handleUserSelectVisibleChange,
      addProject,
      editProject,
      addWorkflow,
      removeWorkflow,
      validateWorkflowJson,
      formatJsonInput,
      handleDragOver,
      handleDragLeave,
      handleFileDrop,
      triggerFileInput,
      handleFileSelect,
      aiAutoFill,
      saveProject,
      deleteProject,
      resetProjectForm,
      formatDate,
      refresh,
      // Element Plus Icons
      Search: ElementPlusIconsVue.Search,
      Refresh: ElementPlusIconsVue.Refresh,
      Plus: ElementPlusIconsVue.Plus,
      Edit: ElementPlusIconsVue.Edit,
      Delete: ElementPlusIconsVue.Delete,
      Box: ElementPlusIconsVue.Box,
      Calendar: ElementPlusIconsVue.Calendar,
      Upload: ElementPlusIconsVue.Upload,
      Magic: ElementPlusIconsVue.Magic
    }
  }
}

// 注册组件
if (typeof window !== 'undefined') {
  window.ProjectManagement = ProjectManagement
}
