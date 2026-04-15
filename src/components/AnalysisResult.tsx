/**
 * AnalysisResult.tsx — 杂志风结果展示
 *
 * 信息层级（从上到下，重要性递减）：
 *   0. Hero        — 重塑标题 + 一句话概括（最大字号，用户第一眼就看懂）
 *   1. 快读卡片     — 3条核心收获（30秒读完）
 *   2. 情报卡片     — 结构化元信息
 *   3. 核心逻辑     — Timeline 拆解
 *   4. PM 深度洞察  — 深色权威块
 *   5. 术语百科     — Grid 词条
 */

import { View, Text, ScrollView } from '@tarojs/components'

// ─── 类型 ─────────────────────────────────────────────────────────────────────

export interface IntelligenceCard {
  originTitle: string
  source: string
  coreValue: string
  targetUser: string
  maturityLevel: string
  pmOpportunity: string
}

export interface CoreLogicStep {
  step: number
  title: string
  content: string
}

export interface PmInsight {
  dimension: string
  insight: string
  actionable: string
}

export interface GlossaryItem {
  term: string
  zhTerm: string
  definition: string
  pmRelevance: string
}

export interface AnalysisData {
  reshapedTitle: string
  oneLiner: string
  keyTakeaways: string[]
  techTags: string[]
  intelligenceCard: IntelligenceCard
  coreLogic: CoreLogicStep[]
  pmInsights: PmInsight[]
  glossary: GlossaryItem[]
  isEnglishSource: boolean
}

interface AnalysisResultProps {
  data: AnalysisData
  analyzedAt?: string
  sourceUrl?: string
}

// ─── 颜色映射 ─────────────────────────────────────────────────────────────────

const DIM_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  场景: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  能力: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  成本: { bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
  落地: { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe' },
}

const MATURITY_COLORS: Record<string, string> = {
  实验室: '#f59e0b',
  早期商用: '#3b82f6',
  成熟落地: '#10b981',
}

// ─── 工具组件 ─────────────────────────────────────────────────────────────────

function SectionLabel({ num, label }: { num: string; label: string }) {
  return (
    <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
      <View style={{ padding: '3px 8px', background: '#002FA7', borderRadius: '5px' }}>
        <Text style={{ fontSize: '10px', fontWeight: '900', color: 'white', letterSpacing: '0.1em' }}>{num}</Text>
      </View>
      <Text style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{label}</Text>
      <View style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
    </View>
  )
}

function InfoItem({ label, value, valueStyle = {} }: { label: string; value: string; valueStyle?: Record<string, string> }) {
  return (
    <View>
      <Text style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600', letterSpacing: '0.06em', display: 'block', marginBottom: '3px' }}>{label}</Text>
      <Text style={{ fontSize: '13px', color: '#334155', fontWeight: '600', display: 'block', ...valueStyle }}>{value || '—'}</Text>
    </View>
  )
}

// ─── Section 0：Hero — 标题 + 一句话 ─────────────────────────────────────────

function HeroSection({ data, analyzedAt }: { data: AnalysisData; analyzedAt?: string }) {
  return (
    <View
      style={{
        background: 'white',
        borderRadius: '20px',
        padding: '24px 20px',
        marginBottom: '12px',
        boxShadow: '0 20px 60px -10px rgba(0,0,0,.1),0 0 0 1px rgba(0,0,0,.04)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 装饰光圈 */}
      <View style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', background: 'radial-gradient(circle,rgba(0,47,167,.08) 0%,transparent 70%)', borderRadius: '50%' }} />

      {/* 翻译标注 */}
      {data.isEnglishSource && (
        <View style={{ display: 'inline-flex', padding: '3px 10px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '9999px', marginBottom: '10px' }}>
          <Text style={{ fontSize: '11px', color: '#166534', fontWeight: '600' }}>🌐 英文原文 · 已翻译</Text>
        </View>
      )}

      {/* 重塑标题 */}
      <Text
        style={{
          fontSize: '26px', fontWeight: '900', color: '#0f172a',
          lineHeight: '1.25', letterSpacing: '-0.5px', display: 'block',
          marginBottom: '16px',
        }}
      >
        {data.reshapedTitle}
      </Text>

      {/* ★ 一句话核心 —— 最重要，最大展示 */}
      <View
        style={{
          background: 'linear-gradient(135deg,#002FA7 0%,#1a4fc7 100%)',
          borderRadius: '14px',
          padding: '16px 18px',
          marginBottom: '16px',
        }}
      >
        <Text style={{ fontSize: '11px', color: 'rgba(255,255,255,.65)', fontWeight: '700', letterSpacing: '0.1em', display: 'block', marginBottom: '6px' }}>
          💬 一句话读懂
        </Text>
        <Text
          style={{
            fontSize: '18px', fontWeight: '800', color: 'white',
            lineHeight: '1.5', display: 'block',
          }}
        >
          {data.oneLiner}
        </Text>
      </View>

      {/* 技术标签 */}
      <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '8px', marginBottom: analyzedAt ? '12px' : '0' }}>
        {(data.techTags || []).map((tag, i) => (
          <View
            key={i}
            style={{
              padding: '4px 12px',
              background: i === 0 ? '#002FA7' : '#f1f5f9',
              borderRadius: '9999px',
            }}
          >
            <Text style={{ fontSize: '12px', fontWeight: '700', color: i === 0 ? 'white' : '#334155' }}>{tag}</Text>
          </View>
        ))}
      </View>

      {analyzedAt && (
        <Text style={{ fontSize: '11px', color: '#cbd5e1', display: 'block', marginTop: '8px' }}>
          分析于 {new Date(analyzedAt).toLocaleString('zh-CN')}
        </Text>
      )}
    </View>
  )
}

// ─── Section 1：快读卡片 — 3条核心收获 ───────────────────────────────────────

function KeyTakeawaysSection({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null

  const icons = ['🥇', '🥈', '🥉']
  const colors = ['#002FA7', '#0ea5e9', '#6366f1']

  return (
    <View style={{ marginBottom: '12px' }}>
      <SectionLabel num='速读' label='30秒核心收获' />
      <View style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.slice(0, 3).map((item, i) => (
          <View
            key={i}
            style={{
              display: 'flex', flexDirection: 'row', alignItems: 'center',
              background: 'white', borderRadius: '12px', padding: '14px 16px',
              boxShadow: '0 2px 12px rgba(0,0,0,.06)',
              borderLeft: `4px solid ${colors[i] || '#002FA7'}`,
            }}
          >
            <Text style={{ fontSize: '20px', marginRight: '12px', flexShrink: 0 }}>{icons[i]}</Text>
            <Text style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', lineHeight: '1.4', flex: 1 }}>
              {item}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Section 2：情报卡片 ──────────────────────────────────────────────────────

function IntelligenceCardSection({
  card, isEnglishSource,
}: {
  card: IntelligenceCard
  isEnglishSource?: boolean
}) {
  const maturityColor = MATURITY_COLORS[card.maturityLevel] || '#6b7280'

  return (
    <View style={{ marginBottom: '12px' }}>
      <SectionLabel num='01' label='产品情报卡片' />
      <View
        style={{
          background: 'white', borderRadius: '16px', padding: '18px',
          boxShadow: '0 20px 60px -10px rgba(0,0,0,.1),0 0 0 1px rgba(0,0,0,.04)',
          position: 'relative', overflow: 'hidden',
        }}
      >
        <View style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'linear-gradient(180deg,#002FA7 0%,#FF4D00 100%)' }} />
        <View style={{ paddingLeft: '12px' }}>
          {/* 原文标题 */}
          <Text style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', display: 'block', marginBottom: '3px' }}>原文标题</Text>
          <Text style={{ fontSize: '15px', color: '#0f172a', fontWeight: '700', lineHeight: '1.4', display: 'block', marginBottom: '14px' }}>
            {card.originTitle}
          </Text>

          {/* 核心价值 */}
          <View style={{ background: '#002FA7', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
            <Text style={{ fontSize: '10px', color: 'rgba(255,255,255,.7)', fontWeight: '600', letterSpacing: '0.08em', display: 'block', marginBottom: '4px' }}>🚀 核心价值</Text>
            <Text style={{ fontSize: '15px', color: 'white', fontWeight: '800', lineHeight: '1.3', display: 'block' }}>{card.coreValue}</Text>
          </View>

          {/* 信息网格 */}
          <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
            <View style={{ flex: '1 1 40%' }}><InfoItem label='来源' value={card.source} /></View>
            <View style={{ flex: '1 1 40%' }}><InfoItem label='技术成熟度' value={card.maturityLevel} valueStyle={{ color: maturityColor, fontWeight: '700' }} /></View>
            <View style={{ flex: '1 1 40%' }}><InfoItem label='目标用户' value={card.targetUser} /></View>
            <View style={{ flex: '1 1 40%' }}><InfoItem label='来源语言' value={isEnglishSource ? '英文（已翻译）' : '中文'} /></View>
          </View>

          {/* PM 机会点 */}
          <View style={{ background: '#fef9c3', borderRadius: '10px', padding: '12px 14px', borderLeft: '3px solid #fbbf24' }}>
            <Text style={{ fontSize: '10px', color: '#92400e', fontWeight: '700', letterSpacing: '0.06em', display: 'block', marginBottom: '4px' }}>💡 PM 机会点</Text>
            <Text style={{ fontSize: '14px', color: '#78350f', fontWeight: '600', lineHeight: '1.5', display: 'block' }}>{card.pmOpportunity}</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

// ─── Section 3：核心逻辑 Timeline ────────────────────────────────────────────

function CoreLogicSection({ steps }: { steps: CoreLogicStep[] }) {
  if (!steps || steps.length === 0) return null
  return (
    <View style={{ marginBottom: '12px' }}>
      <SectionLabel num='02' label='核心逻辑拆解' />
      <View style={{ paddingLeft: '4px' }}>
        {steps.map((step, idx) => (
          <View
            key={step.step}
            style={{ display: 'flex', flexDirection: 'row', marginBottom: idx < steps.length - 1 ? '14px' : 0, position: 'relative' }}
          >
            {idx < steps.length - 1 && (
              <View style={{ position: 'absolute', left: '15px', top: '32px', width: '2px', height: 'calc(100% + 6px)', background: 'linear-gradient(180deg,#002FA7 0%,rgba(0,47,167,.1) 100%)' }} />
            )}
            <View style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#002FA7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
              <Text style={{ color: 'white', fontWeight: '900', fontSize: '12px' }}>{String(step.step).padStart(2, '0')}</Text>
            </View>
            <View style={{ marginLeft: '12px', flex: 1, paddingTop: '4px' }}>
              <Text style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', display: 'block', marginBottom: '5px', lineHeight: '1.3' }}>{step.title}</Text>
              <Text style={{ fontSize: '13px', color: '#475569', lineHeight: '1.7', display: 'block' }}>{step.content}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Section 4：PM 深度洞察 ───────────────────────────────────────────────────

function PmInsightsSection({ insights }: { insights: PmInsight[] }) {
  if (!insights || insights.length === 0) return null
  return (
    <View style={{ marginBottom: '12px' }}>
      <SectionLabel num='03' label='PM 深度洞察' />
      <View
        style={{
          background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)',
          borderRadius: '16px', padding: '20px', position: 'relative', overflow: 'hidden',
        }}
      >
        <View style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', background: 'radial-gradient(circle,rgba(0,47,167,.4) 0%,transparent 70%)', borderRadius: '50%' }} />
        {insights.map((item, idx) => {
          const colors = DIM_COLORS[item.dimension] || DIM_COLORS['场景']
          return (
            <View
              key={idx}
              style={{ marginBottom: idx < insights.length - 1 ? '16px' : 0, paddingBottom: idx < insights.length - 1 ? '16px' : 0, borderBottom: idx < insights.length - 1 ? '1px solid rgba(255,255,255,.08)' : 'none' }}
            >
              <View style={{ display: 'inline-flex', padding: '3px 10px', background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '9999px', marginBottom: '8px' }}>
                <Text style={{ fontSize: '11px', fontWeight: '700', color: colors.text }}>{item.dimension}</Text>
              </View>
              <Text style={{ fontSize: '14px', color: '#e2e8f0', lineHeight: '1.7', display: 'block', marginBottom: '8px' }}>{item.insight}</Text>
              <View style={{ display: 'flex', flexDirection: 'row', gap: '6px' }}>
                <Text style={{ fontSize: '12px', color: '#FFE500', fontWeight: '700', flexShrink: 0 }}>→</Text>
                <Text style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', fontStyle: 'italic' }}>{item.actionable}</Text>
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

// ─── Section 5：术语百科 ──────────────────────────────────────────────────────

function GlossarySection({ items }: { items: GlossaryItem[] }) {
  if (!items || items.length === 0) return null
  return (
    <View style={{ marginBottom: '12px' }}>
      <SectionLabel num='04' label='AI 术语百科' />
      <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '10px' }}>
        {items.map((item, idx) => (
          <View
            key={idx}
            style={{ flex: '1 1 44%', background: 'white', borderRadius: '12px', padding: '14px', boxShadow: '0 2px 12px rgba(0,0,0,.06)', borderTop: '3px solid #002FA7' }}
          >
            <Text style={{ fontSize: '11px', color: '#002FA7', fontWeight: '800', letterSpacing: '0.05em', display: 'block', marginBottom: '2px' }}>{item.term}</Text>
            <Text style={{ fontSize: '14px', color: '#0f172a', fontWeight: '700', display: 'block', marginBottom: '6px' }}>{item.zhTerm}</Text>
            <Text style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.5', display: 'block', marginBottom: '8px' }}>{item.definition}</Text>
            <View style={{ background: '#f8fafc', borderRadius: '6px', padding: '6px 8px' }}>
              <Text style={{ fontSize: '11px', color: '#475569', lineHeight: '1.5', display: 'block' }}>{item.pmRelevance}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export default function AnalysisResult({ data, analyzedAt, sourceUrl }: AnalysisResultProps) {
  return (
    <ScrollView scrollY style={{ height: '100vh', background: '#f1f5f9' }}>
      <View style={{ height: '4px', background: 'linear-gradient(90deg,#002FA7 0%,#FF4D00 50%,#FFE500 100%)' }} />
      <View style={{ padding: '16px', paddingBottom: '80px' }}>

        {/* 0. Hero */}
        <HeroSection data={data} analyzedAt={analyzedAt} />

        {/* 1. 快读 */}
        <KeyTakeawaysSection items={data.keyTakeaways} />

        {/* 分割线 */}
        <View style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', gap: '8px' }}>
          <View style={{ width: '32px', height: '3px', background: '#002FA7', borderRadius: '2px' }} />
          <View style={{ width: '8px', height: '8px', background: '#FF4D00', borderRadius: '50%' }} />
          <View style={{ flex: 1, height: '1px', background: '#cbd5e1' }} />
          <Text style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600', letterSpacing: '0.1em' }}>深度分析</Text>
          <View style={{ flex: 1, height: '1px', background: '#cbd5e1' }} />
        </View>

        {/* 2. 情报卡片 */}
        <IntelligenceCardSection card={data.intelligenceCard} isEnglishSource={data.isEnglishSource} />

        {/* 3. 核心逻辑 */}
        <CoreLogicSection steps={data.coreLogic} />

        {/* 4. PM 洞察 */}
        <PmInsightsSection insights={data.pmInsights} />

        {/* 5. 术语百科 */}
        <GlossarySection items={data.glossary} />

        {/* 底部品牌 */}
        <View style={{ textAlign: 'center', paddingTop: '20px' }}>
          <Text style={{ fontSize: '11px', color: '#cbd5e1', letterSpacing: '0.05em' }}>AI PM 视界 · One Link, Deep Insight.</Text>
        </View>
      </View>
    </ScrollView>
  )
}
