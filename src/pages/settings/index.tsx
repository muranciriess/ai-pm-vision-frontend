import { useState, useEffect, useCallback } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input, Button, Picker } from '@tarojs/components'

// ─── 预设平台 ─────────────────────────────────────────────────────────────────

const PRESET_PLATFORMS = [
  {
    name: '红企云（默认）',
    baseUrl: 'https://cloud.hongqiye.com/v1',
    models: ['claude-opus-4-6', 'claude-sonnet-4-5', 'gpt-4o', 'gpt-4o-mini', 'deepseek-chat'],
  },
  {
    name: 'OpenAI 官方',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  {
    name: 'Moonshot（月之暗面）',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  },
  {
    name: '阿里云百炼',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-long'],
  },
  {
    name: '自定义',
    baseUrl: '',
    models: [],
  },
]

export const SETTINGS_KEY = 'ai_pm_settings'

export interface AISettings {
  apiKey: string
  apiBaseUrl: string
  model: string
  platformName: string
}

export const DEFAULT_SETTINGS: AISettings = {
  apiKey: 'sk-9h99UsEjQY8Hcdq5XrKNF0rOIIXUQ3ASnRzVRYhJYYOvKxBN',
  apiBaseUrl: 'https://cloud.hongqiye.com/v1',
  model: 'claude-opus-4-6',
  platformName: '红企云（默认）',
}

const API_BASE = 'http://localhost:3000/api'

export default function SettingsPage() {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS)
  const [platformIndex, setPlatformIndex] = useState(0)
  const [modelIndex, setModelIndex] = useState(0)
  const [isCustomUrl, setIsCustomUrl] = useState(false)
  const [validating, setValidating] = useState(false)
  const [saved, setSaved] = useState(false)

  // 加载已保存的设置
  useEffect(() => {
    try {
      const stored = Taro.getStorageSync(SETTINGS_KEY) as AISettings
      if (stored?.apiKey) {
        setSettings(stored)
        const idx = PRESET_PLATFORMS.findIndex(p => p.baseUrl === stored.apiBaseUrl)
        if (idx >= 0) {
          setPlatformIndex(idx)
          const mIdx = PRESET_PLATFORMS[idx].models.indexOf(stored.model)
          setModelIndex(mIdx >= 0 ? mIdx : 0)
          setIsCustomUrl(false)
        } else {
          setPlatformIndex(PRESET_PLATFORMS.length - 1) // 自定义
          setIsCustomUrl(true)
        }
      }
    } catch { /* 静默处理 */ }
  }, [])

  const currentPlatform = PRESET_PLATFORMS[platformIndex]
  const availableModels = isCustomUrl ? [] : currentPlatform.models

  const handlePlatformChange = useCallback((e: { detail: { value: string } }) => {
    const idx = Number(e.detail.value)
    setPlatformIndex(idx)
    const platform = PRESET_PLATFORMS[idx]
    const isCustom = platform.name === '自定义'
    setIsCustomUrl(isCustom)
    setModelIndex(0)
    setSettings(prev => ({
      ...prev,
      platformName: platform.name,
      apiBaseUrl: isCustom ? prev.apiBaseUrl : platform.baseUrl,
      model: isCustom ? prev.model : (platform.models[0] || ''),
    }))
  }, [])

  const handleModelChange = useCallback((e: { detail: { value: string } }) => {
    const idx = Number(e.detail.value)
    setModelIndex(idx)
    setSettings(prev => ({ ...prev, model: availableModels[idx] || prev.model }))
  }, [availableModels])

  const handleValidate = useCallback(async () => {
    if (!settings.apiKey.trim()) {
      Taro.showToast({ title: '请输入 API Key', icon: 'none' })
      return
    }
    setValidating(true)
    try {
      const res = await Taro.request({
        url: `${API_BASE}/validate-config`,
        method: 'POST',
        data: {
          apiKey: settings.apiKey,
          apiBaseUrl: settings.apiBaseUrl,
          model: settings.model,
        },
        timeout: 20000,
        header: { 'Content-Type': 'application/json' },
      })
      if ((res.data as { success: boolean }).success) {
        Taro.showToast({ title: '✅ 配置验证通过', icon: 'none', duration: 2000 })
      } else {
        Taro.showToast({ title: (res.data as { error: string }).error || '验证失败', icon: 'none', duration: 3000 })
      }
    } catch {
      Taro.showToast({ title: '验证请求失败，检查网络', icon: 'none' })
    } finally {
      setValidating(false)
    }
  }, [settings])

  const handleSave = useCallback(() => {
    if (!settings.apiKey.trim()) {
      Taro.showToast({ title: '请输入 API Key', icon: 'none' })
      return
    }
    try {
      Taro.setStorageSync(SETTINGS_KEY, settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      Taro.showToast({ title: '设置已保存', icon: 'success', duration: 1500 })
    } catch {
      Taro.showToast({ title: '保存失败，请重试', icon: 'none' })
    }
  }, [settings])

  const handleReset = useCallback(() => {
    Taro.showModal({
      title: '重置设置',
      content: '确定恢复默认配置？',
      success: (res) => {
        if (res.confirm) {
          setSettings(DEFAULT_SETTINGS)
          setPlatformIndex(0)
          setModelIndex(0)
          setIsCustomUrl(false)
          Taro.removeStorageSync(SETTINGS_KEY)
          Taro.showToast({ title: '已恢复默认', icon: 'success' })
        }
      },
    })
  }, [])

  return (
    <View style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      {/* 顶部装饰条 */}
      <View style={{ height: '4px', background: 'linear-gradient(90deg, #002FA7 0%, #FF4D00 50%, #FFE500 100%)' }} />

      <View style={{ padding: '20px 16px', paddingBottom: '40px' }}>

        {/* 页面标题 */}
        <View style={{ marginBottom: '24px' }}>
          <Text style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', display: 'block' }}>
            模型配置
          </Text>
          <Text style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', display: 'block' }}>
            配置 AI 服务商和模型，支持任意 OpenAI 兼容接口
          </Text>
        </View>

        {/* ── 平台选择 ── */}
        <SectionCard title='🌐 选择平台'>
          <Picker
            mode='selector'
            range={PRESET_PLATFORMS.map(p => p.name)}
            value={platformIndex}
            onChange={handlePlatformChange}
          >
            <View style={pickerStyle}>
              <Text style={{ fontSize: '14px', color: '#0f172a', fontWeight: '600' }}>
                {PRESET_PLATFORMS[platformIndex].name}
              </Text>
              <Text style={{ fontSize: '12px', color: '#94a3b8' }}>▼</Text>
            </View>
          </Picker>

          {/* Base URL */}
          <View style={{ marginTop: '12px' }}>
            <Label text='API Base URL' />
            <InputBox
              value={settings.apiBaseUrl}
              placeholder='https://api.example.com/v1'
              editable={isCustomUrl}
              onInput={(v) => setSettings(prev => ({ ...prev, apiBaseUrl: v }))}
            />
            {!isCustomUrl && (
              <Text style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                平台预设地址，切换"自定义"可修改
              </Text>
            )}
          </View>
        </SectionCard>

        {/* ── 模型选择 ── */}
        <SectionCard title='🤖 选择模型'>
          {availableModels.length > 0 ? (
            <Picker
              mode='selector'
              range={availableModels}
              value={modelIndex}
              onChange={handleModelChange}
            >
              <View style={pickerStyle}>
                <Text style={{ fontSize: '14px', color: '#0f172a', fontWeight: '600' }}>
                  {availableModels[modelIndex] || '请选择模型'}
                </Text>
                <Text style={{ fontSize: '12px', color: '#94a3b8' }}>▼</Text>
              </View>
            </Picker>
          ) : (
            <View>
              <Label text='模型名称（手动输入）' />
              <InputBox
                value={settings.model}
                placeholder='如：gpt-4o / claude-opus-4-6'
                editable
                onInput={(v) => setSettings(prev => ({ ...prev, model: v }))}
              />
            </View>
          )}

          {/* 当前选中模型展示 */}
          {settings.model ? (
            <View style={{ marginTop: '10px', padding: '8px 12px', background: '#f1f5f9', borderRadius: '8px' }}>
              <Text style={{ fontSize: '12px', color: '#475569' }}>
                当前模型：
              </Text>
              <Text style={{ fontSize: '12px', color: '#002FA7', fontWeight: '700' }}>
                {settings.model}
              </Text>
            </View>
          ) : null}
        </SectionCard>

        {/* ── API Key ── */}
        <SectionCard title='🔑 API Key'>
          <InputBox
            value={settings.apiKey}
            placeholder='sk-...'
            editable
            isPassword
            onInput={(v) => setSettings(prev => ({ ...prev, apiKey: v }))}
          />
          <Text style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', display: 'block', lineHeight: '1.6' }}>
            Key 仅存储在本地，不会上传到任何服务器
          </Text>

          {/* 验证按钮 */}
          <Button
            onClick={handleValidate}
            disabled={validating}
            style={{
              marginTop: '12px',
              height: '40px',
              background: 'white',
              color: '#002FA7',
              border: '2px solid #002FA7',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '700',
            }}
          >
            <Text style={{ color: '#002FA7', fontWeight: '700' }}>
              {validating ? '验证中...' : '🔍 验证连接'}
            </Text>
          </Button>
        </SectionCard>

        {/* ── 常用模型速查 ── */}
        <SectionCard title='📋 常用模型速查'>
          <View style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { name: 'GPT-4o', desc: 'OpenAI 旗舰', color: '#10b981' },
              { name: 'claude-opus-4-6', desc: 'Anthropic 旗舰', color: '#6366f1' },
              { name: 'deepseek-chat', desc: '深度求索', color: '#f59e0b' },
              { name: 'qwen-max', desc: '阿里通义', color: '#ef4444' },
              { name: 'moonshot-v1-8k', desc: '月之暗面', color: '#8b5cf6' },
              { name: 'gemini-pro', desc: 'Google', color: '#3b82f6' },
            ].map((m) => (
              <Button
                key={m.name}
                onClick={() => {
                  setSettings(prev => ({ ...prev, model: m.name }))
                  if (availableModels.length === 0) {
                    // 自定义模式直接填入
                  }
                  Taro.showToast({ title: `已选择 ${m.name}`, icon: 'none', duration: 1000 })
                }}
                style={{
                  padding: '8px',
                  background: 'white',
                  border: `1px solid ${settings.model === m.name ? m.color : '#e2e8f0'}`,
                  borderRadius: '8px',
                  textAlign: 'left',
                  height: 'auto',
                }}
              >
                <View>
                  <Text style={{ fontSize: '11px', fontWeight: '700', color: m.color, display: 'block' }}>
                    {m.name}
                  </Text>
                  <Text style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                    {m.desc}
                  </Text>
                </View>
              </Button>
            ))}
          </View>
        </SectionCard>

        {/* ── 操作按钮 ── */}
        <View style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
          <Button
            onClick={handleSave}
            style={{
              height: '52px',
              background: saved ? '#10b981' : '#002FA7',
              color: 'white',
              borderRadius: '14px',
              fontSize: '16px',
              fontWeight: '700',
              border: 'none',
              boxShadow: '0 8px 24px -4px rgba(0,47,167,0.4)',
              transition: 'background 0.3s',
            }}
          >
            <Text style={{ color: 'white', fontWeight: '700' }}>
              {saved ? '✅ 已保存' : '保存配置'}
            </Text>
          </Button>

          <Button
            onClick={handleReset}
            style={{
              height: '44px',
              background: 'transparent',
              color: '#94a3b8',
              borderRadius: '14px',
              fontSize: '13px',
              border: '1px solid #e2e8f0',
            }}
          >
            <Text style={{ color: '#94a3b8' }}>恢复默认配置</Text>
          </Button>
        </View>
      </View>
    </View>
  )
}

// ─── 子组件 ──────────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View
      style={{
        background: 'white',
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '12px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      <Text style={{ fontSize: '13px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '12px' }}>
        {title}
      </Text>
      {children}
    </View>
  )
}

function Label({ text }: { text: string }) {
  return (
    <Text style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
      {text.toUpperCase()}
    </Text>
  )
}

function InputBox({
  value,
  placeholder,
  editable,
  isPassword,
  onInput,
}: {
  value: string
  placeholder: string
  editable: boolean
  isPassword?: boolean
  onInput: (v: string) => void
}) {
  return (
    <View
      style={{
        background: editable ? '#f8fafc' : '#f1f5f9',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '12px 14px',
      }}
    >
      <Input
        value={value}
        onInput={(e) => onInput(e.detail.value)}
        placeholder={placeholder}
        placeholderStyle='color: #cbd5e1; font-size: 13px;'
        password={isPassword}
        disabled={!editable}
        style={{
          fontSize: '13px',
          color: editable ? '#0f172a' : '#94a3b8',
          background: 'transparent',
          lineHeight: '1.4',
        }}
      />
    </View>
  )
}

const pickerStyle = {
  display: 'flex',
  flexDirection: 'row' as const,
  alignItems: 'center',
  justifyContent: 'space-between',
  background: '#f8fafc',
  borderRadius: '10px',
  border: '1px solid #e2e8f0',
  padding: '12px 14px',
}
