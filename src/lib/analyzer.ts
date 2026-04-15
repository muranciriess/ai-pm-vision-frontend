/**
 * analyzer.ts — 纯前端分析引擎
 * 不依赖后端，直接调用 Jina.ai 抓取 + AI API 分析
 */

import { type AISettings } from '../pages/settings/index'

const MAX_CHARS = 30000

// ─── 内容抓取 ─────────────────────────────────────────────────────────────────

async function fetchViaJina(url: string): Promise<string> {
  const res = await fetch(`https://r.jina.ai/${url}`, {
    headers: {
      'Accept': 'text/plain',
      'X-Return-Format': 'markdown',
      'X-No-Cache': 'true',
    },
  })
  if (!res.ok) throw new Error(`Jina 返回 ${res.status}`)
  const text = await res.text()
  if (!text || text.length < 100) throw new Error('Jina 返回内容过短')
  return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + '\n\n[内容已截断]' : text
}

async function fetchViaAltReader(url: string): Promise<string> {
  const res = await fetch(`https://md.dhr.wtf/?url=${encodeURIComponent(url)}`, {
    headers: { 'Accept': 'text/plain' },
  })
  if (!res.ok) throw new Error(`备用Reader 返回 ${res.status}`)
  const text = await res.text()
  if (!text || text.length < 100) throw new Error('备用Reader 返回内容过短')
  return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + '\n\n[内容已截断]' : text
}

export interface FetchResult {
  content: string
  method: string
}

export async function fetchArticle(url: string): Promise<FetchResult> {
  const errors: string[] = []

  try {
    const content = await fetchViaJina(url)
    return { content, method: 'Jina.ai' }
  } catch (e) {
    errors.push(`Jina: ${(e as Error).message}`)
  }

  try {
    const content = await fetchViaAltReader(url)
    return { content, method: '备用Reader' }
  } catch (e) {
    errors.push(`备用Reader: ${(e as Error).message}`)
  }

  throw new Error(`所有抓取方式均失败：${errors.join(' | ')}`)
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const PM_SYSTEM_PROMPT = `你是一位拥有10年经验的资深 AI 产品专家，专门为产品经理拆解前沿技术文章。

## 核心原则
**先让读者看懂，再让读者深思。**
文章分析必须从"这篇文章到底在说什么"出发，用最简单的语言讲清楚核心，再展开深度分析。

## 分析框架
围绕【场景、能力、成本、落地】四维度展开。

## 输出规范
必须严格按以下 JSON 结构返回，直接输出纯 JSON，不添加任何 Markdown 代码块包裹：

{
  "reshapedTitle": "重塑后的中文标题（15字以内，突出核心价值）",
  "oneLiner": "一句话说清楚这篇文章在讲什么——像给完全不懂的人解释，不超过40字",
  "keyTakeaways": [
    "最重要的收获1（15字以内，直接说结论）",
    "最重要的收获2（15字以内）",
    "最重要的收获3（15字以内）"
  ],
  "techTags": ["技术标签1", "技术标签2", "技术标签3"],
  "intelligenceCard": {
    "originTitle": "原文标题",
    "source": "来源域名",
    "coreValue": "核心价值（20字以内）",
    "targetUser": "目标用户群体",
    "maturityLevel": "技术成熟度（实验室/早期商用/成熟落地）",
    "pmOpportunity": "PM机会点（30字以内）"
  },
  "coreLogic": [
    { "step": 1, "title": "步骤标题", "content": "详细说明，要具体，不要废话" }
  ],
  "pmInsights": [
    { "dimension": "场景/能力/成本/落地之一", "insight": "深度洞察", "actionable": "可立即执行的PM建议" }
  ],
  "glossary": [
    { "term": "术语", "zhTerm": "中文译名", "definition": "30字以内简明定义", "pmRelevance": "对PM的实际意义" }
  ],
  "isEnglishSource": true
}

## 语言要求
- oneLiner：用大白话，像跟朋友说话，不用专业术语
- keyTakeaways：直接说结论，不说废话，每条就像一条微博热搜
- 其余内容：精准专业，有料有干货
- 原文为英文时全部用中文输出，专业术语附英文原词`

// ─── AI 分析 ──────────────────────────────────────────────────────────────────

export interface AnalyzeResult {
  reshapedTitle: string
  oneLiner: string
  keyTakeaways: string[]
  techTags: string[]
  intelligenceCard: {
    originTitle: string
    source: string
    coreValue: string
    targetUser: string
    maturityLevel: string
    pmOpportunity: string
  }
  coreLogic: Array<{ step: number; title: string; content: string }>
  pmInsights: Array<{ dimension: string; insight: string; actionable: string }>
  glossary: Array<{ term: string; zhTerm: string; definition: string; pmRelevance: string }>
  isEnglishSource: boolean
}

export async function analyzeWithAI(
  content: string,
  sourceUrl: string,
  settings: AISettings
): Promise<AnalyzeResult> {
  if (!settings.apiKey) throw new Error('缺少 API Key，请在设置中配置')

  const res = await fetch(`${settings.apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: PM_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `请分析以下文章，严格按 JSON 格式输出。\n\n来源：${sourceUrl || '用户粘贴正文'}\n\n内容：\n${content}`,
        },
      ],
    }),
  })

  if (res.status === 401) throw new Error('API Key 无效，请在设置中检查')
  if (res.status === 429) throw new Error('调用频率超限，请稍后重试')
  if (!res.ok) throw new Error(`AI 请求失败（${res.status}）`)

  const json = await res.json()
  const raw: string = json.choices?.[0]?.message?.content || ''
  const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()

  try {
    const result = JSON.parse(clean) as AnalyzeResult
    if (!result.oneLiner) result.oneLiner = result.intelligenceCard?.coreValue || ''
    if (!result.keyTakeaways) result.keyTakeaways = []
    return result
  } catch {
    throw new Error(`AI 返回格式异常，请重试。（原始响应前200字：${raw.slice(0, 200)}）`)
  }
}
