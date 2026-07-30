import type { CSSProperties } from 'react'
import type { EffectId, MotionConfig, TextAppearance, TextStyleId, TextStyleMap } from './types'

export const TEXT_STYLE_FIELDS: Record<EffectId, Array<{ id: TextStyleId; label: string }>> = {
  'metric-focus': [
    { id: 'metricLabel', label: '标签' },
    { id: 'metricValue', label: '核心数字' },
    { id: 'metricSuffix', label: '单位' },
    { id: 'metricDetail', label: '说明' },
  ],
  'compare-split': [
    { id: 'compareTitle', label: '主题' },
    { id: 'compareLeftLabel', label: '左侧标签' },
    { id: 'compareLeftValue', label: '左侧数值' },
    { id: 'compareRightLabel', label: '右侧标签' },
    { id: 'compareRightValue', label: '右侧数值' },
  ],
  'quote-lockup': [
    { id: 'quoteKicker', label: '栏目标签' },
    { id: 'quote', label: '金句' },
    { id: 'quoteSource', label: '出处' },
  ],
  'signal-card': [
    { id: 'signalKicker', label: '语境标签' },
    { id: 'signalLineOne', label: '第一句' },
    { id: 'signalLineTwo', label: '第二句' },
    { id: 'signalLineThree', label: '第三句' },
    { id: 'signalFooter', label: '脚注' },
  ],
  'picture-in-picture': [
    { id: 'pipLabel', label: '窗口标签' },
    { id: 'pipTitle', label: '标题' },
    { id: 'pipCaption', label: '说明' },
  ],
  'image-feature': [
    { id: 'imageLabel', label: '图片标签' },
    { id: 'imageTitle', label: '标题' },
    { id: 'imageCaption', label: '说明' },
  ],
  'kinetic-text': [
    { id: 'kineticKicker', label: '语境标签' },
    { id: 'kineticLineOne', label: '第一句' },
    { id: 'kineticLineTwo', label: '第二句' },
    { id: 'kineticLineThree', label: '第三句' },
  ],
  'proof-frame': [
    { id: 'proofKicker', label: '证据标签' },
    { id: 'proofTitle', label: '标题' },
    { id: 'proofValue', label: '核心数据' },
    { id: 'proofUnit', label: '数据说明' },
    { id: 'proofCaption', label: '脚注' },
  ],
  'dual-proof': [
    { id: 'dualKicker', label: '对比标签' },
    { id: 'dualTitle', label: '标题' },
    { id: 'dualLeftValue', label: '左侧数据' },
    { id: 'dualRightValue', label: '右侧数据' },
    { id: 'dualCaption', label: '说明' },
  ],
  'process-chain': [
    { id: 'processKicker', label: '流程标签' },
    { id: 'processTitle', label: '标题' },
    { id: 'processStepOne', label: '步骤一' },
    { id: 'processStepTwo', label: '步骤二' },
    { id: 'processStepThree', label: '步骤三' },
    { id: 'processStepFour', label: '步骤四' },
    { id: 'processCaption', label: '脚注' },
  ],
  'insight-grid': [
    { id: 'insightKicker', label: '洞察标签' },
    { id: 'insightTitle', label: '标题' },
    { id: 'insightOne', label: '要点一' },
    { id: 'insightTwo', label: '要点二' },
    { id: 'insightThree', label: '要点三' },
    { id: 'insightFour', label: '要点四' },
    { id: 'insightCaption', label: '脚注' },
  ],
  'chapter-callout': [
    { id: 'chapterKicker', label: '章节标签' },
    { id: 'chapterIndex', label: '序号' },
    { id: 'chapterTitle', label: '标题' },
    { id: 'chapterDetail', label: '说明' },
  ],
  'icon-breath': [
    { id: 'chapterKicker', label: '章节标签' },
    { id: 'chapterTitle', label: '标题' },
    { id: 'chapterDetail', label: '说明' },
  ],
  'data-bars': [
    { id: 'insightKicker', label: '数据标签' },
    { id: 'insightTitle', label: '标题' },
    { id: 'insightOne', label: '数据一标签' },
    { id: 'insightTwo', label: '数据二标签' },
    { id: 'insightThree', label: '数据三标签' },
    { id: 'insightFour', label: '数据四标签' },
    { id: 'dualLeftValue', label: '数据一数值' },
    { id: 'dualRightValue', label: '数据二数值' },
    { id: 'proofValue', label: '数据三数值' },
    { id: 'proofUnit', label: '数据四数值' },
  ],
  'step-rail': [
    { id: 'processKicker', label: '流程标签' },
    { id: 'processTitle', label: '标题' },
    { id: 'processStepOne', label: '步骤一' },
    { id: 'processStepTwo', label: '步骤二' },
    { id: 'processStepThree', label: '步骤三' },
  ],
  'code-window': [
    { id: 'proofKicker', label: '窗口标签' },
    { id: 'proofTitle', label: '标题' },
    { id: 'processStepOne', label: '步骤一' },
    { id: 'processStepTwo', label: '步骤二' },
    { id: 'processStepThree', label: '步骤三' },
    { id: 'processStepFour', label: '步骤四' },
    { id: 'proofCaption', label: '说明' },
  ],
  'module-grid': [
    { id: 'insightKicker', label: '矩阵标签' },
    { id: 'insightTitle', label: '标题' },
    { id: 'insightOne', label: '模块一' },
    { id: 'insightTwo', label: '模块二' },
    { id: 'insightThree', label: '模块三' },
    { id: 'insightFour', label: '模块四' },
    { id: 'processStepOne', label: '模块五' },
    { id: 'processStepTwo', label: '模块六' },
    { id: 'processStepThree', label: '模块七' },
    { id: 'processStepFour', label: '模块八' },
    { id: 'chapterDetail', label: '收束标题' },
  ],
}

export const TEXT_STYLE_DEFAULTS: TextStyleMap = {
  metricLabel: { color: '#ffffff', size: 100, opacity: 0.78 },
  metricValue: { color: '#f1f1f0', size: 100, opacity: 1 },
  metricSuffix: { color: '#d7a4f4', size: 100, opacity: 1 },
  metricDetail: { color: '#ffffff', size: 100, opacity: 0.68 },
  compareTitle: { color: '#ffffff', size: 100, opacity: 0.92 },
  compareLeftLabel: { color: '#ffffff', size: 100, opacity: 0.78 },
  compareLeftValue: { color: '#e9e9e8', size: 100, opacity: 1 },
  compareRightLabel: { color: '#ffffff', size: 100, opacity: 0.78 },
  compareRightValue: { color: '#e9e9e8', size: 100, opacity: 1 },
  quoteKicker: { color: '#ffffff', size: 200, opacity: 0.76 },
  quote: { color: '#ececeb', size: 100, opacity: 1 },
  quoteSource: { color: '#ffffff', size: 100, opacity: 0.46 },
  signalKicker: { color: '#d7a4f4', size: 200, opacity: 1 },
  signalLineOne: { color: '#f3f1f4', size: 100, opacity: 1 },
  signalLineTwo: { color: '#f3f1f4', size: 100, opacity: 1 },
  signalLineThree: { color: '#f3f1f4', size: 100, opacity: 1 },
  signalFooter: { color: '#ffffff', size: 100, opacity: 0.5 },
  pipLabel: { color: '#d7a4f4', size: 100, opacity: 1 },
  pipTitle: { color: '#eeeeed', size: 100, opacity: 1 },
  pipCaption: { color: '#ffffff', size: 100, opacity: 0.55 },
  imageLabel: { color: '#d7a4f4', size: 100, opacity: 1 },
  imageTitle: { color: '#eeeeed', size: 100, opacity: 1 },
  imageCaption: { color: '#ffffff', size: 100, opacity: 0.58 },
  kineticKicker: { color: '#ffffff', size: 200, opacity: 0.72 },
  kineticLineOne: { color: '#f0f0ef', size: 100, opacity: 1 },
  kineticLineTwo: { color: '#ffffff', size: 100, opacity: 0.72 },
  kineticLineThree: { color: '#eadcf0', size: 100, opacity: 1 },
  proofKicker: { color: '#ffffff', size: 100, opacity: 0.9 },
  proofTitle: { color: '#ffffff', size: 100, opacity: 1 },
  proofValue: { color: '#d7e3ed', size: 100, opacity: 1 },
  proofUnit: { color: '#ffffff', size: 100, opacity: 0.9 },
  proofCaption: { color: '#ffffff', size: 100, opacity: 0.58 },
  dualKicker: { color: '#ffffff', size: 100, opacity: 0.9 },
  dualTitle: { color: '#ffffff', size: 100, opacity: 1 },
  dualLeftValue: { color: '#d7e3ed', size: 100, opacity: 1 },
  dualRightValue: { color: '#d7e3ed', size: 100, opacity: 1 },
  dualCaption: { color: '#ffffff', size: 100, opacity: 0.64 },
  processKicker: { color: '#ffffff', size: 100, opacity: 0.9 },
  processTitle: { color: '#ffffff', size: 100, opacity: 1 },
  processStepOne: { color: '#ffffff', size: 100, opacity: 1 },
  processStepTwo: { color: '#ffffff', size: 100, opacity: 1 },
  processStepThree: { color: '#ffffff', size: 100, opacity: 1 },
  processStepFour: { color: '#ffffff', size: 100, opacity: 1 },
  processCaption: { color: '#ffffff', size: 100, opacity: 0.68 },
  insightKicker: { color: '#ffffff', size: 100, opacity: 0.9 },
  insightTitle: { color: '#ffffff', size: 100, opacity: 1 },
  insightOne: { color: '#ffffff', size: 100, opacity: 1 },
  insightTwo: { color: '#ffffff', size: 100, opacity: 1 },
  insightThree: { color: '#ffffff', size: 100, opacity: 1 },
  insightFour: { color: '#ffffff', size: 100, opacity: 1 },
  insightCaption: { color: '#ffffff', size: 100, opacity: 0.62 },
  chapterKicker: { color: '#ffffff', size: 100, opacity: 0.9 },
  chapterIndex: { color: '#d7e3ed', size: 100, opacity: 1 },
  chapterTitle: { color: '#ffffff', size: 100, opacity: 1 },
  chapterDetail: { color: '#ffffff', size: 100, opacity: 0.82 },
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
}

export function normalizeTextStyles(value: unknown): TextStyleMap {
  const input = typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
  return Object.fromEntries(
    (Object.keys(TEXT_STYLE_DEFAULTS) as TextStyleId[]).map((id) => {
      const fallback = TEXT_STYLE_DEFAULTS[id]
      const candidate = typeof input[id] === 'object' && input[id] !== null && !Array.isArray(input[id])
        ? input[id] as Record<string, unknown>
        : {}
      const size = typeof candidate.size === 'number' && Number.isFinite(candidate.size)
        ? Math.max(50, Math.min(300, candidate.size))
        : fallback.size
      const opacity = typeof candidate.opacity === 'number' && Number.isFinite(candidate.opacity)
        ? Math.max(0.1, Math.min(1, candidate.opacity))
        : fallback.opacity
      const isLegacySignalDefault = (
        id === 'signalLineOne'
        && candidate.color === '#ffffff'
        && candidate.size === 100
        && candidate.opacity === 0.64
      ) || (
        id === 'signalLineThree'
        && candidate.color === '#eadcf0'
        && candidate.size === 100
        && candidate.opacity === 1
      )
      if (isLegacySignalDefault) return [id, { ...fallback }]
      return [id, {
        color: isHexColor(candidate.color) ? candidate.color : fallback.color,
        size,
        opacity,
      }]
    }),
  ) as TextStyleMap
}

export function getTextAppearance(config: MotionConfig, id: TextStyleId): TextAppearance {
  return config.textStyles?.[id] ?? TEXT_STYLE_DEFAULTS[id]
}

function colorWithOpacity(color: string, opacity: number) {
  const red = Number.parseInt(color.slice(1, 3), 16)
  const green = Number.parseInt(color.slice(3, 5), 16)
  const blue = Number.parseInt(color.slice(5, 7), 16)
  return `rgb(${red} ${green} ${blue} / ${opacity})`
}

interface TextAppearanceStyleOptions {
  includeScale?: boolean
  minScale?: number
  maxScale?: number
}

export function textAppearanceStyle(
  config: MotionConfig,
  id: TextStyleId,
  options: TextAppearanceStyleOptions = {},
): CSSProperties {
  const appearance = getTextAppearance(config, id)
  const includeScale = options.includeScale ?? true
  const minimum = options.minScale ?? 0.5
  const maximum = options.maxScale ?? 3
  const scale = Math.max(minimum, Math.min(maximum, appearance.size / 100))
  return {
    color: colorWithOpacity(appearance.color, appearance.opacity),
    ...(includeScale ? { '--text-scale': scale } : {}),
  } as CSSProperties
}
