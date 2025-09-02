/**
 * 项目相关API服务
 */
import { get } from './http'

/**
 * 项目数据接口
 */
export interface Project {
  _id: string
  name: string
  description: string
  workflows: Array<{
    name: string
    description: string
    _id: string
  }>
  status: 'online' | 'offline'
  createdAt: string
  updatedAt: string
  __v: number
  downloadLinks: Array<{
    filename: string
    hash: string
    url: string
    _id: string
  }>
}

/**
 * 分页信息接口
 */
export interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

/**
 * 项目详情响应接口
 * API返回的数据结构: { success: true, data: { project: Project } }
 */
export interface ProjectDetailResponse {
  project: Project
}

/**
 * 项目列表响应接口
 */
export interface ProjectsResponse {
  projects: Project[]
  pagination: Pagination
}

/**
 * 项目列表查询参数
 */
export interface ProjectsQueryParams {
  page?: number
  limit?: number
  search?: string
  status?: 'online' | 'offline'
}

/**
 * 获取公开项目列表
 * @param params 查询参数
 * @returns 项目列表数据
 */
export async function getProjects(params: ProjectsQueryParams = {}) {
  const queryParams = new URLSearchParams()

  // 设置默认值
  const { page = 1, limit = 10, search, status } = params

  queryParams.append('page', page.toString())
  queryParams.append('limit', limit.toString())

  if (search) {
    queryParams.append('search', search)
  }

  if (status) {
    queryParams.append('status', status)
  }

  const endpoint = `/api/public/projects?${queryParams.toString()}`

  return await get<ProjectsResponse>(endpoint)
}

/**
 * 根据ID获取项目详情
 * @param projectId 项目ID
 * @returns 项目详情数据
 */
export async function getProjectById(projectId: string) {
  const endpoint = `/api/public/projects/${projectId}`

  return await get<ProjectDetailResponse>(endpoint)
}

/**
 * 搜索项目
 * @param keyword 搜索关键词
 * @param params 其他查询参数
 * @returns 搜索结果
 */
export async function searchProjects(
  keyword: string,
  params: Omit<ProjectsQueryParams, 'search'> = {}
) {
  return await getProjects({
    ...params,
    search: keyword
  })
}

/**
 * 获取在线项目列表
 * @param params 查询参数
 * @returns 在线项目列表
 */
export async function getOnlineProjects(params: Omit<ProjectsQueryParams, 'status'> = {}) {
  return await getProjects({
    ...params,
    status: 'online'
  })
}
