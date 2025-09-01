import { Request, Response } from 'express'
import Project, { ProjectStatus } from '../models/project.model.js'
import User from '../models/user.model.js'
import { AuthRequest } from '../middleware/auth.middleware.js'

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: 项目管理相关接口
 */

/**
 * @swagger
 * /admin/projects:
 *   get:
 *     summary: 获取所有项目列表
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 每页数量
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, draft, reviewing, rejected, online, offline]
 *         description: 项目状态筛选
 *     responses:
 *       200:
 *         description: 获取项目列表成功
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器内部错误
 */
export const getAllProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const search = (req.query.search as string) || ''
    const status = req.query.status as string

    // 构建查询条件
    const query: any = {}
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { serverAddress: { $regex: search, $options: 'i' } }
      ]
    }
    if (status && status !== 'all') {
      query.status = status
    }

    // 获取项目总数
    const total = await Project.countDocuments(query)

    // 获取项目列表并关联用户信息
    const projects = await Project.find(query)
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    res.status(200).json({
      success: true,
      data: {
        projects,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('获取项目列表错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

/**
 * @swagger
 * /api/admin/projects/{id}:
 *   get:
 *     summary: 获取项目详情
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 项目ID
 *     responses:
 *       200:
 *         description: 获取项目详情成功
 *       404:
 *         description: 项目不存在
 *       500:
 *         description: 服务器内部错误
 */
export const getProjectInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const project = await Project.findById(id).populate('userId', 'username email')
    if (!project) {
      res.status(404).json({
        success: false,
        message: '项目不存在'
      })
      return
    }

    res.status(200).json({
      success: true,
      data: { project }
    })
  } catch (error) {
    console.error('获取项目详情错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

/**
 * @swagger
 * /admin/projects:
 *   post:
 *     summary: 创建新项目
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - userId
 *               - serverAddress
 *               - port
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               userId:
 *                 type: string
 *               serverAddress:
 *                 type: string
 *               port:
 *                 type: integer
 *               workflows:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     apiConfig:
 *                       type: object
 *               status:
 *                 type: string
 *                 enum: [draft, reviewing, rejected, online, offline]
 *     responses:
 *       201:
 *         description: 项目创建成功
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器内部错误
 */
export const createProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, userId, serverAddress, port, workflows, downloadLinks, status } =
      req.body

    // 验证必填字段
    if (!name || !userId || !serverAddress || !port) {
      res.status(400).json({
        success: false,
        message: '项目名称、所属用户、服务器地址和端口为必填项'
      })
      return
    }

    // 验证用户是否存在
    const user = await User.findById(userId)
    if (!user) {
      res.status(400).json({
        success: false,
        message: '指定的用户不存在'
      })
      return
    }

    // 检查同一用户下是否已存在同名项目
    const existingProject = await Project.findOne({ userId, name })
    if (existingProject) {
      res.status(400).json({
        success: false,
        message: '该用户下已存在同名项目'
      })
      return
    }

    // 验证工作流格式
    let validatedWorkflows = []
    if (workflows && Array.isArray(workflows)) {
      for (const workflow of workflows) {
        if (!workflow.name || !workflow.description || !workflow.apiConfig) {
          res.status(400).json({
            success: false,
            message: '工作流必须包含名称、描述和API配置'
          })
          return
        }
        validatedWorkflows.push({
          name: workflow.name,
          description: workflow.description,
          apiConfig: workflow.apiConfig
        })
      }
    }

    // 验证下载链接格式
    let validatedDownloadLinks = []
    if (downloadLinks && Array.isArray(downloadLinks)) {
      for (const link of downloadLinks) {
        if (!link.filename || !link.hash || !link.url) {
          res.status(400).json({
            success: false,
            message: '下载链接必须包含文件名、哈希值和URL地址'
          })
          return
        }
        validatedDownloadLinks.push({
          filename: link.filename,
          hash: link.hash,
          url: link.url
        })
      }
    }

    // 创建新项目
    const project = new Project({
      name,
      description,
      userId,
      serverAddress,
      port,
      workflows: validatedWorkflows,
      downloadLinks: validatedDownloadLinks,
      status: status || ProjectStatus.DRAFT
    })

    await project.save()

    // 返回创建的项目信息（包含用户信息）
    const populatedProject = await Project.findById(project._id).populate(
      'userId',
      'username email'
    )

    res.status(201).json({
      success: true,
      message: '项目创建成功',
      data: { project: populatedProject }
    })
  } catch (error) {
    console.error('创建项目错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

/**
 * @swagger
 * /api/admin/projects/{id}:
 *   put:
 *     summary: 更新项目信息
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 项目ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               serverAddress:
 *                 type: string
 *               port:
 *                 type: integer
 *               workflows:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     apiConfig:
 *                       type: object
 *               status:
 *                 type: string
 *                 enum: [draft, reviewing, rejected, online, offline]
 *     responses:
 *       200:
 *         description: 项目更新成功
 *       404:
 *         description: 项目不存在
 *       500:
 *         description: 服务器内部错误
 */
export const updateProjectInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { name, description, serverAddress, port, workflows, downloadLinks, status } = req.body

    const project = await Project.findById(id)
    if (!project) {
      res.status(404).json({
        success: false,
        message: '项目不存在'
      })
      return
    }

    // 如果要更新项目名称，检查同一用户下是否已存在同名项目
    if (name && name !== project.name) {
      const existingProject = await Project.findOne({ userId: project.userId, name })
      if (existingProject) {
        res.status(400).json({
          success: false,
          message: '该用户下已存在同名项目'
        })
        return
      }
    }

    // 验证工作流格式
    let validatedWorkflows
    if (workflows !== undefined) {
      if (!Array.isArray(workflows)) {
        res.status(400).json({
          success: false,
          message: '工作流必须是数组格式'
        })
        return
      }

      validatedWorkflows = []
      for (const workflow of workflows) {
        if (!workflow.name || !workflow.description || !workflow.apiConfig) {
          res.status(400).json({
            success: false,
            message: '工作流必须包含名称、描述和API配置'
          })
          return
        }
        validatedWorkflows.push({
          name: workflow.name,
          description: workflow.description,
          apiConfig: workflow.apiConfig
        })
      }
    }

    // 验证下载链接格式
    let validatedDownloadLinks
    if (downloadLinks !== undefined) {
      if (!Array.isArray(downloadLinks)) {
        res.status(400).json({
          success: false,
          message: '下载链接必须是数组格式'
        })
        return
      }

      validatedDownloadLinks = []
      for (const link of downloadLinks) {
        if (!link.filename || !link.hash || !link.url) {
          res.status(400).json({
            success: false,
            message: '下载链接必须包含文件名、哈希值和URL地址'
          })
          return
        }
        validatedDownloadLinks.push({
          filename: link.filename,
          hash: link.hash,
          url: link.url
        })
      }
    }

    // 更新项目信息
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (serverAddress !== undefined) updateData.serverAddress = serverAddress
    if (port !== undefined) updateData.port = port
    if (validatedWorkflows !== undefined) updateData.workflows = validatedWorkflows
    if (validatedDownloadLinks !== undefined) updateData.downloadLinks = validatedDownloadLinks
    if (status !== undefined) updateData.status = status

    const updatedProject = await Project.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    }).populate('userId', 'username email')

    res.status(200).json({
      success: true,
      message: '项目更新成功',
      data: { project: updatedProject }
    })
  } catch (error) {
    console.error('更新项目错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

/**
 * @swagger
 * /api/admin/projects/{id}:
 *   delete:
 *     summary: 删除项目
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 项目ID
 *     responses:
 *       200:
 *         description: 项目删除成功
 *       404:
 *         description: 项目不存在
 *       500:
 *         description: 服务器内部错误
 */
export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const project = await Project.findById(id)
    if (!project) {
      res.status(404).json({
        success: false,
        message: '项目不存在'
      })
      return
    }

    await Project.findByIdAndDelete(id)

    res.status(200).json({
      success: true,
      message: '项目删除成功'
    })
  } catch (error) {
    console.error('删除项目错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}
