/**
 * 统一请求工具
 * 封装 Taro.request，提供超时、重试、错误处理
 */

import Taro from '@tarojs/taro'

const BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3000/api'
  : 'https://your-production-domain.com/api'  // 生产环境替换为实际域名

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: Record<string, unknown>
  timeout?: number
  retries?: number
}

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  detail?: string
  suggestion?: string
}

export async function request<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'POST', data, timeout = 60000, retries = 1 } = options
  const url = `${BASE_URL}${path}`

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await Taro.request({
        url,
        method,
        data,
        timeout,
        header: {
          'Content-Type': 'application/json',
        },
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        return res.data as ApiResponse<T>
      }

      // 服务端错误不重试
      const errData = res.data as ApiResponse<T>
      return {
        success: false,
        error: errData?.error || `请求失败 (${res.statusCode})`,
        detail: errData?.detail,
        suggestion: errData?.suggestion,
      }

    } catch (err) {
      if (attempt === retries) {
        const message = err instanceof Error ? err.message : String(err)

        if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
          return { success: false, error: '请求超时，请稍后重试' }
        }
        if (message.includes('ECONNREFUSED') || message.includes('connect')) {
          return { success: false, error: '无法连接服务器，请检查网络' }
        }
        return { success: false, error: '网络错误，请重试' }
      }
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }

  return { success: false, error: '请求失败，请重试' }
}

export { BASE_URL }
