import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import AnalysisResult, { type AnalysisData } from '@/components/AnalysisResult'

interface StoredResult {
  success: boolean
  url: string
  analyzedAt: string
  data: AnalysisData
}

function isValidResult(r: unknown): r is StoredResult {
  if (!r || typeof r !== 'object') return false
  const obj = r as Record<string, unknown>
  return (
    obj.success === true &&
    typeof obj.data === 'object' &&
    obj.data !== null &&
    typeof (obj.data as Record<string, unknown>).reshapedTitle === 'string'
  )
}

export default function ResultPage() {
  const [result, setResult] = useState<StoredResult | null>(null)
  const [error, setError] = useState('')

  // Hook 必须在组件顶层调用（不可放在条件语句或 useEffect 里）
  Taro.useShareAppMessage(() => ({
    title: result?.data?.reshapedTitle
      ? `【AI PM 视界】${result.data.reshapedTitle}`
      : 'AI PM 视界 — One Link, Deep Insight.',
    path: '/pages/index/index',
  }))

  useEffect(() => {
    try {
      const stored = Taro.getStorageSync('analysisResult')
      if (isValidResult(stored)) {
        setResult(stored)
      } else {
        setError('分析结果不存在或已过期，请返回重新分析')
      }
    } catch {
      setError('读取结果失败，请返回重试')
    }
  }, [])

  if (error) {
    return (
      <View style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', background: '#f8f9fa' }}>
        <Text style={{ fontSize: '36px', display: 'block', textAlign: 'center', marginBottom: '16px' }}>⚠️</Text>
        <Text style={{ fontSize: '15px', color: '#64748b', textAlign: 'center', lineHeight: '1.6', display: 'block', marginBottom: '24px' }}>
          {error}
        </Text>
        <Button
          onClick={() => Taro.navigateBack()}
          style={{ background: '#002FA7', color: 'white', borderRadius: '12px', padding: '12px 32px', fontSize: '15px', fontWeight: '700', border: 'none' }}
        >
          <Text style={{ color: 'white', fontWeight: '700' }}>← 返回首页</Text>
        </Button>
      </View>
    )
  }

  if (!result) {
    return (
      <View style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
        <View style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #002FA7', borderTopColor: 'transparent' }} className='spin-slow' />
        <Text style={{ fontSize: '14px', color: '#94a3b8', marginTop: '14px', display: 'block' }}>加载中...</Text>
      </View>
    )
  }

  return (
    <View style={{ background: '#f8f9fa', minHeight: '100vh' }}>
      {/* 悬浮按钮 */}
      <View style={{ position: 'fixed', bottom: '24px', right: '16px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Button
          openType='share'
          style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#002FA7', border: 'none', boxShadow: '0 8px 24px -4px rgba(0,47,167,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0' }}
        >
          <Text style={{ fontSize: '20px', color: 'white' }}>↗</Text>
        </Button>
        <Button
          onClick={() => Taro.navigateBack()}
          style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0' }}
        >
          <Text style={{ fontSize: '20px', color: '#334155' }}>←</Text>
        </Button>
      </View>

      <AnalysisResult
        data={result.data}
        analyzedAt={result.analyzedAt}
        sourceUrl={result.url}
      />
    </View>
  )
}
