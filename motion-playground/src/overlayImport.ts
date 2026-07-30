import type { EffectId } from './types'

const legacyLineKeys = ['lineOne', 'lineTwo', 'lineThree'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export const OVERLAY_EFFECT_IDS = [
  'metric-focus',
  'compare-split',
  'quote-lockup',
  'signal-card',
  'picture-in-picture',
  'image-feature',
  'kinetic-text',
  'proof-frame',
  'dual-proof',
  'process-chain',
  'insight-grid',
  'chapter-callout',
  'icon-breath',
  'data-bars',
  'step-rail',
  'code-window',
  'module-grid',
] as const satisfies readonly EffectId[]

function normalizeEffectToken(value: string) {
  return value.trim().toLowerCase().replace(/[\s_·・-]+/g, '')
}

const canonicalEffectAliases = Object.fromEntries(
  OVERLAY_EFFECT_IDS.map((effectId) => [normalizeEffectToken(effectId), effectId]),
) as Record<string, EffectId>

const namedEffectAliases: Record<string, EffectId> = {
  核心数字动效: 'metric-focus',
  左右对比卡: 'compare-split',
  金句定格卡: 'quote-lockup',
  动态信息卡: 'signal-card',
  画中画动效: 'picture-in-picture',
  图片卡片动效: 'image-feature',
  文字卡片动效: 'kinetic-text',
  单图证据卡: 'proof-frame',
  双图数据卡: 'dual-proof',
  四步流程链: 'process-chain',
  四点洞察卡: 'insight-grid',
  章节重点卡: 'chapter-callout',
  图标聚焦循环: 'icon-breath',
  循环图标聚焦: 'icon-breath',
  数据条循环: 'data-bars',
  循环数据条: 'data-bars',
  三级步骤轨: 'step-rail',
  循环三级步骤轨: 'step-rail',
  代码窗口循环: 'code-window',
  循环代码窗口: 'code-window',
  模块矩阵循环: 'module-grid',
  循环模块矩阵: 'module-grid',
}

export function readOverlayEffectId(value: unknown): EffectId | undefined {
  if (typeof value !== 'string') return undefined
  const token = normalizeEffectToken(value)
  return canonicalEffectAliases[token] ?? namedEffectAliases[token]
}

export function readOverlayLine(record: Record<string, unknown>, lineNumber: 1 | 2 | 3) {
  const schemaValue = record[`line${lineNumber}`]
  if (schemaValue !== undefined && schemaValue !== null) return schemaValue
  return record[legacyLineKeys[lineNumber - 1]]
}

export function readExplicitOverlayPosition(record: Record<string, unknown>) {
  return isRecord(record.position) ? record.position : undefined
}

export function deriveOverlaySide(record: Record<string, unknown>): 'left' | 'right' | undefined {
  const rawX = record.x
  const x = typeof rawX === 'number' ? rawX : typeof rawX === 'string' && rawX.trim() ? Number(rawX) : Number.NaN
  if (!Number.isFinite(x)) return undefined
  return x >= 50 ? 'right' : 'left'
}
