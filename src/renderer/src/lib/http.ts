/**
 * HTTP 客户端封装
 * 统一管理网络请求和API配置
 */

// API 基础配置
const API_CONFIG = {
  // 默认基础URL，可以通过环境变量或配置文件覆盖
  BASE_URL: 'http://localhost:3010',
  TIMEOUT: 30000, // 30秒超时
  HEADERS: {
    'Content-Type': 'application/json',
    Accept: '*/*'
  }
}

/**
 * 网络请求错误类
 */
export class HttpError extends Error {
  public status: number
  public statusText: string
  public url: string

  constructor(status: number, statusText: string, url: string, message?: string) {
    super(message || `HTTP Error ${status}: ${statusText}`)
    this.status = status
    this.statusText = statusText
    this.url = url
    this.name = 'HttpError'
  }
}

/**
 * 请求选项接口
 */
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
  timeout?: number
  baseURL?: string
}

/**
 * 响应接口
 */
export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
}

/**
 * 创建完整的请求URL
 */
function createUrl(endpoint: string, baseURL?: string): string {
  const base = baseURL || API_CONFIG.BASE_URL
  // 确保基础URL没有尾部斜杠，端点有前导斜杠
  const normalizedBase = base.replace(/\/$/, '')
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${normalizedBase}${normalizedEndpoint}`
}

/**
 * 超时控制函数
 */
function withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timer = window.setTimeout(() => reject(new Error('Request timeout')), timeout)
      // 清理定时器的Promise不会被resolve，这是正常的
      promise.finally(() => window.clearTimeout(timer))
    })
  ])
}

/**
 * 通用HTTP请求函数
 */
export async function request<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', headers = {}, body, timeout = API_CONFIG.TIMEOUT, baseURL } = options

  const url = createUrl(endpoint, baseURL)

  const requestHeaders: Record<string, string> = {
    ...API_CONFIG.HEADERS,
    ...headers
  }

  const requestInit: RequestInit = {
    method,
    headers: requestHeaders
  }

  // 如果有请求体且不是GET请求，添加到请求中
  if (body && method !== 'GET') {
    if (typeof body === 'object') {
      requestInit.body = JSON.stringify(body)
    } else {
      requestInit.body = body
    }
  }

  try {
    console.log(`[HTTP] ${method} ${url}`, requestInit)

    const response = await withTimeout(fetch(url, requestInit), timeout)

    console.log(`[HTTP] Response: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      throw new HttpError(response.status, response.statusText, url)
    }

    const data = await response.json()

    console.log(`[HTTP] Response data:`, data)

    return data
  } catch (error) {
    console.error(`[HTTP] Request failed:`, error)

    if (error instanceof HttpError) {
      throw error
    }

    if (error instanceof Error) {
      throw new Error(`Network request failed: ${error.message}`)
    }

    throw new Error('Unknown network error')
  }
}

/**
 * GET请求封装
 */
export function get<T = any>(
  endpoint: string,
  options?: Omit<RequestOptions, 'method' | 'body'>
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, { ...options, method: 'GET' })
}

/**
 * POST请求封装
 */
export function post<T = any>(
  endpoint: string,
  body?: any,
  options?: Omit<RequestOptions, 'method'>
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, { ...options, method: 'POST', body })
}

/**
 * PUT请求封装
 */
export function put<T = any>(
  endpoint: string,
  body?: any,
  options?: Omit<RequestOptions, 'method'>
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, { ...options, method: 'PUT', body })
}

/**
 * DELETE请求封装
 */
export function del<T = any>(
  endpoint: string,
  options?: Omit<RequestOptions, 'method' | 'body'>
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, { ...options, method: 'DELETE' })
}

/**
 * PATCH请求封装
 */
export function patch<T = any>(
  endpoint: string,
  body?: any,
  options?: Omit<RequestOptions, 'method'>
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, { ...options, method: 'PATCH', body })
}

/**
 * 设置全局基础URL
 */
export function setBaseURL(url: string): void {
  API_CONFIG.BASE_URL = url
}

/**
 * 获取当前基础URL
 */
export function getBaseURL(): string {
  return API_CONFIG.BASE_URL
}

/**
 * 设置全局请求超时时间
 */
export function setTimeout(timeout: number): void {
  API_CONFIG.TIMEOUT = timeout
}

/**
 * 设置全局请求头
 */
export function setDefaultHeaders(headers: Record<string, string>): void {
  Object.assign(API_CONFIG.HEADERS, headers)
}
