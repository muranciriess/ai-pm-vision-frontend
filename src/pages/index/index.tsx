import { useState, useCallback, useRef } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input, Textarea, Button } from '@tarojs/components'
import { SETTINGS_KEY, DEFAULT_SETTINGS, type AISettings } from '../settings/index'

const API_BASE = process.env.TARO_APP_API_BASE || 'http://localhost:3000/api'

// 已知需要登录、无法自动抓取的域名
const BLOCKED_DOMAINS = [
  'mp.weixin.qq.com', 'weixin.qq.com',
  'zhihu.com', 'zhuanlan.zhihu.com',
  'toutiao.com', 'ixigua.com',
  'douyin.com', 'xiaohongshu.com', 'xhslink.com',
  'juejin.cn',
]

function isBlockedDomain(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return BLOCKED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))
  } catch {
    return false
  }
}

function getSettings(): AISettings {
  try {
    const stored = Taro.getStorageSync(SETTINGS_KEY) as AISettings
    return stored?.apiKey ? stored : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

type InputMode = 'url' | 'text'
type Step = { emoji: string; label: string }

const STEPS: Step[] = [
  { emoji: '📖', label: '读取文章内容...' },
  { emoji: '🧠', label: 'AI 深度分析中...' },
  { emoji: '💡', label: '生成 PM 洞察...' },
]

export default function IndexPage() {
  const [url, setUrl] = useState('')
  const [manualText, setManualText] = useState('')
  const [mode, setMode] = useState<InputMode>('url')
  const [loading, setLoading] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [error, setError] = useState('')
  const [clipboardGranted, setClipboardGranted] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  // ── 清除所有定时器 ──
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  // ── 剪贴板授权 & 读取 ──
  const handleClipboardAuth = useCallback(async () => {
    try {
      // H5 环境：使用 navigator.clipboard（需要用户手势触发）
      let text = ''
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        text = await navigator.clipboard.readText()
        setClipboardGranted(true)
      } else {
        // 降级到 Taro API
        const res = await Taro.getClipboardData()
        text = res.data || ''
      }

      text = text.trim()
      if (!text) {
        Taro.showToast({ title: '剪贴板为空', icon: 'none' })
        return
      }

      // 智能判断：URL → 填入链接框；长文本 → 切换粘贴模式
      if (text.startsWith('http://') || text.startsWith('https://')) {
        setMode('url')
        setUrl(text)
        setError('')
        // 如果是已知不可抓取域名，自动提示切换
        if (isBlockedDomain(text)) {
          Taro.showModal({
            title: '检测到微信/知乎等平台链接',
            content: '该平台需要登录才能抓取内容。\n\n建议：在浏览器中打开文章，全选并复制正文，点击「粘贴正文」分析。',
            confirmText: '切换粘贴正文',
            cancelText: '保留链接',
            success: (r) => { if (r.confirm) setMode('text') },
          })
        } else {
          Taro.showToast({ title: '已读取链接', icon: 'success', duration: 1200 })
        }
      } else if (text.length >= 30) {
        setMode('text')
        setManualText(text)
        setError('')
        Taro.showToast({ title: `已读取 ${text.length} 字正文`, icon: 'success', duration: 1500 })
      } else {
        Taro.showToast({ title: '内容太短，请手动粘贴', icon: 'none' })
      }
    } catch (err) {
      // 权限被拒或不支持
      Taro.showModal({
        title: '无法读取剪贴板',
        content: '浏览器拒绝了剪贴板权限，请手动粘贴内容到输入框。\n\n提示：点击地址栏旁的锁图标 → 权限 → 允许剪贴板访问',
        showCancel: false,
        confirmText: '知道了',
      })
    }
  }, [])

  // ── 发起分析请求 ──
  const doAnalyze = useCallback(async () => {
    setError('')
    setLoading(true)
    setStepIndex(0)

    const t1 = setTimeout(() => setStepIndex(1), 5000)
    const t2 = setTimeout(() => setStepIndex(2), 25000)
    timers.current = [t1, t2]

    const settings = getSettings()
    const body: Record<string, string> = {
      apiKey: settings.apiKey,
      apiBaseUrl: settings.apiBaseUrl,
      model: settings.model,
    }

    if (mode === 'text') {
      body.content = manualText.trim()
      if (url.trim()) body.url = url.trim()
    } else {
      body.url = url.trim()
    }

    try {
      const res = await Taro.request({
        url: `${API_BASE}/analyze`,
        method: 'POST',
        data: body,
        timeout: 90000,
        header: { 'Content-Type': 'application/json' },
      })

      clearTimers()

      const data = res.data as {
        success?: boolean
        error?: string
        canManualInput?: boolean
        suggestion?: string
        data?: unknown
      }

      if (res.statusCode === 200 && data.success) {
        Taro.setStorageSync('analysisResult', res.data)
        Taro.navigateTo({ url: '/pages/result/index' })
        return
      }

      // 可切换到手动粘贴
      if (data.canManualInput) {
        setMode('text')
        setError('')
        Taro.showModal({
          title: '需要手动粘贴正文',
          content: data.suggestion || '请复制文章全文后粘贴到下方文本框',
          showCancel: false,
          confirmText: '知道了',
        })
        return
      }

      if (res.statusCode === 401) {
        setError('API Key 无效，请点击右上角「⚙ 设置」检查')
        return
      }

      setError(data.error || `请求失败（${res.statusCode}）`)

    } catch (err) {
      clearTimers()
      const msg = err instanceof Error ? err.message : ''
      setError(msg.includes('timeout') ? '请求超时，文章可能较长，请稍后重试' : '网络错误，请检查服务是否启动')
    } finally {
      clearTimers()
      setLoading(false)
      setStepIndex(0)
    }
  }, [mode, url, manualText, clearTimers])

  // ── 点击分析按钮 ──
  const handleAnalyze = useCallback(() => {
    if (mode === 'url') {
      const u = url.trim()
      if (!u) { setError('请粘贴文章链接'); return }
      if (!u.startsWith('http')) { setError('请输入有效的 http/https 链接'); return }
    } else {
      if (manualText.trim().length < 30) {
        setError('请粘贴文章正文（至少30字）')
        return
      }
    }
    doAnalyze()
  }, [mode, url, manualText, doAnalyze])

  const switchMode = useCallback((m: InputMode) => {
    setMode(m)
    setError('')
  }, [])

  return (
    <View style={{ minHeight: '100vh', background: 'white', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部彩条 */}
      <View style={{ height: '4px', background: 'linear-gradient(90deg,#002FA7 0%,#FF4D00 50%,#FFE500 100%)' }} />

      {/* 顶部操作栏 */}
      <View style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px 0' }}>
        <Button
          onClick={() => Taro.navigateTo({ url: '/pages/settings/index' })}
          style={{ background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '6px 14px', fontSize: '12px', height: 'auto' }}
        >
          <Text style={{ color: '#64748b', fontSize: '12px', fontWeight: '600' }}>⚙ 模型设置</Text>
        </Button>
      </View>

      {/* 主体 */}
      <View style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 20px 60px' }}>

        {/* Logo */}
        <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <View style={{ width: '68px', height: '68px', background: '#002FA7', borderRadius: '16px', boxShadow: '8px 8px 0 rgba(0,47,167,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <Text style={{ fontSize: '30px', color: 'white', fontWeight: '900' }}>P</Text>
          </View>
          <Text style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.5px' }}>AI PM 视界</Text>
          <Text style={{ fontSize: '12px', color: '#002FA7', fontWeight: '700', letterSpacing: '0.12em', marginTop: '4px' }}>ONE LINK · DEEP INSIGHT</Text>
        </View>

        {/* 输入卡片 */}
        <View style={{ width: '100%', background: 'white', borderRadius: '20px', boxShadow: '0 20px 60px -10px rgba(0,0,0,.12),0 0 0 1px rgba(0,0,0,.06)', padding: '20px' }}>

          {/* ── 剪贴板授权按钮 ── */}
          <Button
            onClick={handleClipboardAuth}
            style={{
              width: '100%', height: '44px', marginBottom: '14px',
              background: clipboardGranted ? '#f0fdf4' : '#EFF6FF',
              border: `1px solid ${clipboardGranted ? '#86efac' : '#bfdbfe'}`,
              borderRadius: '10px', fontSize: '13px', fontWeight: '700',
            }}
          >
            <Text style={{ color: clipboardGranted ? '#166534' : '#1d4ed8', fontSize: '13px', fontWeight: '700' }}>
              {clipboardGranted ? '✅ 剪贴板已授权 · 点击重新读取' : '📋 授权读取剪贴板（自动识别链接/正文）'}
            </Text>
          </Button>

          {/* ── 模式切换 Tab ── */}
          <View style={{ display: 'flex', flexDirection: 'row', background: '#f1f5f9', borderRadius: '10px', padding: '3px', marginBottom: '14px' }}>
            {(['url', 'text'] as InputMode[]).map((m) => (
              <Button
                key={m}
                onClick={() => switchMode(m)}
                style={{
                  flex: 1, height: '36px',
                  background: mode === m ? 'white' : 'transparent',
                  borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: '600',
                  boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
                }}
              >
                <Text style={{ color: mode === m ? '#002FA7' : '#64748b', fontSize: '13px', fontWeight: '600' }}>
                  {m === 'url' ? '🔗 链接分析' : '📋 粘贴正文'}
                </Text>
              </Button>
            ))}
          </View>

          {/* ── URL 输入 ── */}
          {mode === 'url' && (
            <View style={{ background: '#f8fafc', borderRadius: '12px', border: `2px solid ${error ? '#ef4444' : '#e2e8f0'}`, padding: '13px 15px' }}>
              <Input
                value={url}
                onInput={(e) => { setUrl(e.detail.value); setError('') }}
                placeholder='https://example.com/article...'
                placeholderStyle='color:#94a3b8;font-size:14px'
                style={{ fontSize: '14px', color: '#0f172a', background: 'transparent' }}
              />
            </View>
          )}

          {/* ── 粘贴正文 ── */}
          {mode === 'text' && (
            <View>
              <View style={{ background: '#fff7ed', borderRadius: '8px', padding: '10px 12px', marginBottom: '10px', borderLeft: '3px solid #fb923c' }}>
                <Text style={{ fontSize: '12px', color: '#c2410c', lineHeight: '1.7', display: 'block' }}>
                  💡 <Text style={{ fontWeight: '700' }}>微信/知乎/掘金</Text> 文章：在浏览器打开 → 全选（Ctrl+A）→ 复制 → 点上方「授权剪贴板」按钮，或直接粘贴到下方
                </Text>
              </View>
              <View style={{ background: '#f8fafc', borderRadius: '12px', border: `2px solid ${error ? '#ef4444' : '#e2e8f0'}`, padding: '12px 14px' }}>
                <Textarea
                  value={manualText}
                  onInput={(e) => { setManualText(e.detail.value); setError('') }}
                  placeholder='粘贴文章正文内容...'
                  placeholderStyle='color:#94a3b8;font-size:13px'
                  style={{ fontSize: '13px', color: '#0f172a', background: 'transparent', width: '100%', minHeight: '140px', lineHeight: '1.7' }}
                  autoHeight
                  maxlength={50000}
                />
              </View>
              <View style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                <Text style={{ fontSize: '11px', color: manualText.length > 40000 ? '#ef4444' : '#94a3b8' }}>
                  {manualText.length.toLocaleString()} / 50,000 字
                </Text>
                {manualText.length > 0 && (
                  <Text
                    onClick={() => { setManualText(''); setError('') }}
                    style={{ fontSize: '11px', color: '#94a3b8', textDecoration: 'underline' }}
                  >
                    清空
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* 错误提示 */}
          {error ? (
            <View style={{ marginTop: '8px', padding: '8px 12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
              <Text style={{ fontSize: '12px', color: '#dc2626', lineHeight: '1.5', display: 'block' }}>⚠ {error}</Text>
            </View>
          ) : null}

          {/* 分析按钮 / 进度 */}
          {!loading ? (
            <Button
              onClick={handleAnalyze}
              style={{ marginTop: '14px', width: '100%', height: '52px', background: '#002FA7', borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px -4px rgba(0,47,167,.4)' }}
            >
              <Text style={{ color: 'white', fontSize: '16px', fontWeight: '700' }}>
                {mode === 'text' ? '分析粘贴内容 →' : '开始深度分析 →'}
              </Text>
            </Button>
          ) : (
            <View style={{ marginTop: '14px', background: '#f8fafc', borderRadius: '14px', padding: '18px', border: '1px solid #e2e8f0' }}>
              {STEPS.map((step, idx) => {
                const done = idx < stepIndex
                const active = idx === stepIndex
                return (
                  <View key={idx} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', marginBottom: idx < STEPS.length - 1 ? '12px' : 0, opacity: done ? 0.35 : active ? 1 : 0.25 }}>
                    <View style={{ width: '26px', height: '26px', borderRadius: '50%', background: done ? '#10b981' : active ? '#002FA7' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Text style={{ fontSize: done ? '13px' : '11px', color: done || active ? 'white' : '#94a3b8', fontWeight: '700' }}>
                        {done ? '✓' : active ? '●' : String(idx + 1)}
                      </Text>
                    </View>
                    <Text style={{ fontSize: '13px', fontWeight: active ? '700' : '400', color: active ? '#002FA7' : '#64748b' }}>
                      {step.emoji} {step.label}
                    </Text>
                  </View>
                )
              })}
              <Text style={{ fontSize: '11px', color: '#94a3b8', display: 'block', textAlign: 'center', marginTop: '14px', lineHeight: '1.6' }}>
                通常需要 20-60 秒，请耐心等待 ☕
              </Text>
            </View>
          )}
        </View>

        {/* 功能说明标签 */}
        <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '8px', marginTop: '18px', justifyContent: 'center' }}>
          {['🎯 四维分析框架', '🌐 英文自动翻译', '💡 PM 深度洞察', '📚 术语百科'].map(tag => (
            <View key={tag} style={{ padding: '4px 12px', background: '#f1f5f9', borderRadius: '9999px' }}>
              <Text style={{ fontSize: '11px', color: '#475569', fontWeight: '500' }}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ paddingBottom: '16px', textAlign: 'center' }}>
        <Text style={{ fontSize: '11px', color: '#d1d5db' }}>AI 驱动 · 专为产品经理设计</Text>
      </View>
    </View>
  )
}
