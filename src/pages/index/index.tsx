import { useState, useCallback, useRef } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input, Textarea, Button } from '@tarojs/components'
import { SETTINGS_KEY, DEFAULT_SETTINGS, type AISettings } from '../settings/index'
import { fetchArticle, analyzeWithAI } from '../../lib/analyzer'

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

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  // ── 剪贴板授权 & 读取 ──
  const handleClipboardAuth = useCallback(async () => {
    try {
      let text = ''
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        text = await navigator.clipboard.readText()
        setClipboardGranted(true)
      } else {
        const res = await Taro.getClipboardData()
        text = res.data || ''
      }

      text = text.trim()
      if (!text) { Taro.showToast({ title: '剪贴板为空', icon: 'none' }); return }

      if (text.startsWith('http://') || text.startsWith('https://')) {
        setMode('url')
        setUrl(text)
        setError('')
        Taro.showToast({ title: '已读取链接', icon: 'success', duration: 1200 })
      } else if (text.length >= 30) {
        setMode('text')
        setManualText(text)
        setError('')
        Taro.showToast({ title: `已读取 ${text.length} 字正文`, icon: 'success', duration: 1500 })
      } else {
        Taro.showToast({ title: '内容太短，请手动粘贴', icon: 'none' })
      }
    } catch {
      Taro.showModal({
        title: '无法读取剪贴板',
        content: '请手动粘贴内容到输入框，或点击地址栏锁图标 → 权限 → 允许剪贴板访问',
        showCancel: false,
        confirmText: '知道了',
      })
    }
  }, [])

  // ── 发起分析 ──
  const doAnalyze = useCallback(async () => {
    setError('')
    setLoading(true)
    setStepIndex(0)

    const settings = getSettings()
    if (!settings.apiKey) {
      setError('请先点击右上角「⚙ 模型设置」配置 API Key')
      setLoading(false)
      return
    }

    try {
      let content = ''
      let sourceUrl = ''

      if (mode === 'text') {
        content = manualText.trim()
        sourceUrl = url.trim()
        setStepIndex(1)
      } else {
        sourceUrl = url.trim()
        setStepIndex(0)
        try {
          const fetched = await fetchArticle(sourceUrl)
          content = fetched.content
        } catch {
          // 抓取失败 → 提示切换手动粘贴
          setMode('text')
          setError('')
          Taro.showModal({
            title: '需要手动粘贴正文',
            content: '自动抓取失败（该平台可能需要登录）。\n\n请在浏览器打开文章，全选复制正文，切换到「粘贴正文」模式后重新分析。',
            showCancel: false,
            confirmText: '知道了',
          })
          return
        }
      }

      if (content.trim().length < 50) {
        setError('内容过短，请切换到「粘贴正文」手动粘贴')
        return
      }

      setStepIndex(1)
      const t1 = setTimeout(() => setStepIndex(2), 15000)
      timers.current = [t1]

      const result = await analyzeWithAI(content, sourceUrl, settings)
      clearTimers()

      Taro.setStorageSync('analysisResult', {
        success: true,
        url: sourceUrl,
        analyzedAt: new Date().toISOString(),
        data: result,
      })
      Taro.navigateTo({ url: '/pages/result/index' })

    } catch (err) {
      clearTimers()
      const msg = err instanceof Error ? err.message : '分析失败，请重试'
      setError(msg)
    } finally {
      clearTimers()
      setLoading(false)
      setStepIndex(0)
    }
  }, [mode, url, manualText, clearTimers])

  const handleAnalyze = useCallback(() => {
    if (mode === 'url') {
      const u = url.trim()
      if (!u) { setError('请粘贴文章链接'); return }
      if (!u.startsWith('http')) { setError('请输入有效的 http/https 链接'); return }
    } else {
      if (manualText.trim().length < 30) { setError('请粘贴文章正文（至少30字）'); return }
    }
    doAnalyze()
  }, [mode, url, manualText, doAnalyze])

  const switchMode = useCallback((m: InputMode) => { setMode(m); setError('') }, [])

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

          {/* 剪贴板授权 */}
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

          {/* 模式切换 */}
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

          {/* URL 输入 */}
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

          {/* 粘贴正文 */}
          {mode === 'text' && (
            <View>
              <View style={{ background: '#fff7ed', borderRadius: '8px', padding: '10px 12px', marginBottom: '10px', borderLeft: '3px solid #fb923c' }}>
                <Text style={{ fontSize: '12px', color: '#c2410c', lineHeight: '1.7', display: 'block' }}>
                  💡 <Text style={{ fontWeight: '700' }}>微信/知乎/掘金</Text> 文章：在浏览器打开 → 全选（Ctrl+A）→ 复制 → 点上方「授权剪贴板」
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
                  <Text onClick={() => { setManualText(''); setError('') }} style={{ fontSize: '11px', color: '#94a3b8', textDecoration: 'underline' }}>
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

        {/* 功能标签 */}
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
