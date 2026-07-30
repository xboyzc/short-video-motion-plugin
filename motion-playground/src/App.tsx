import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toBlob } from 'html-to-image'
import { OverlayLayer } from './OverlayLayer'
import {
  deriveOverlaySide,
  OVERLAY_EFFECT_IDS,
  readExplicitOverlayPosition,
  readOverlayEffectId,
  readOverlayLine,
} from './overlayImport'
import {
  constrainMotionConfig,
  constrainOverlayClip,
  defaultOverlayPosition,
} from './overlaySafety'
import { getTextAppearance, normalizeTextStyles, TEXT_STYLE_DEFAULTS, TEXT_STYLE_FIELDS } from './textStyles'
import type {
  ComparePartId,
  ComparePartPositions,
  EffectDefinition,
  EffectId,
  EffectPosition,
  ModuleIconConfig,
  ModuleIconName,
  ModuleIconShape,
  MotionConfig,
  OverlayClip,
  TextAppearance,
  TextStyleId,
} from './types'

const effects: EffectDefinition[] = [
  {
    id: 'metric-focus',
    index: '01',
    name: 'MetricFocus',
    cnName: '核心数字动效',
    description: '强化关键数据与结论',
  },
  {
    id: 'compare-split',
    index: '02',
    name: 'CompareSplit',
    cnName: '左右对比卡',
    description: '两组观点清晰对照',
  },
  {
    id: 'quote-lockup',
    index: '03',
    name: 'QuoteLockup',
    cnName: '金句定格卡',
    description: '锁定一句核心表达',
  },
  {
    id: 'signal-card',
    index: '04',
    name: 'SignalCard',
    cnName: '动态信息卡',
    description: '逐句出现的信息提炼卡',
  },
  {
    id: 'picture-in-picture',
    index: '05',
    name: 'PictureInPicture',
    cnName: '画中画动效',
    description: '同步视频的浮动窗口',
  },
  {
    id: 'image-feature',
    index: '06',
    name: 'ImageFeature',
    cnName: '图片卡片动效',
    description: '图片与信息层级组合',
  },
  {
    id: 'kinetic-text',
    index: '07',
    name: 'KineticText',
    cnName: '文字卡片动效',
    description: '大字逐句节奏入场',
  },
  {
    id: 'proof-frame',
    index: '08',
    name: 'ProofFrame',
    cnName: '单图证据卡',
    description: '截图证据与核心数据联动',
  },
  {
    id: 'dual-proof',
    index: '09',
    name: 'DualProof',
    cnName: '双图数据卡',
    description: '双截图并列展示结果',
  },
  {
    id: 'process-chain',
    index: '10',
    name: 'ProcessChain',
    cnName: '四步流程链',
    description: '四个步骤依次连接出现',
  },
  {
    id: 'insight-grid',
    index: '11',
    name: 'InsightGrid',
    cnName: '四点洞察卡',
    description: '四个问题或观点分组呈现',
  },
  {
    id: 'chapter-callout',
    index: '12',
    name: 'ChapterCallout',
    cnName: '章节重点卡',
    description: '章节序号与关键结论定格',
  },
  {
    id: 'icon-breath',
    index: 'B1',
    name: 'IconBreath',
    cnName: '循环·图标聚焦',
    description: '参考 01 · 图标呼吸与章节停靠',
  },
  {
    id: 'data-bars',
    index: 'B3',
    name: 'DataBars',
    cnName: '循环·数据条',
    description: '参考 03 · 四组数据依次填充',
  },
  {
    id: 'step-rail',
    index: 'B4',
    name: 'StepRail',
    cnName: '循环·三级步骤轨',
    description: '参考 04 · 三个节点轮流点亮',
  },
  {
    id: 'code-window',
    index: 'B6',
    name: 'CodeWindow',
    cnName: '循环·代码窗口',
    description: '参考 06 · 截图悬浮与扫描线',
  },
  {
    id: 'module-grid',
    index: 'B7',
    name: 'ModuleGrid',
    cnName: '循环·模块矩阵',
    description: '参考 07 · 图标轮巡与光标闪烁',
  },
]

const initialComparePositions: ComparePartPositions = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  title: { x: 0, y: 0 },
  axis: { x: 0, y: 0 },
}

const defaultModuleIcons: ModuleIconConfig[] = [
  { icon: 'ai', shape: 'rounded', color: '#7546d8' },
  { icon: 'database', shape: 'rounded', color: '#7f42c8' },
  { icon: 'users', shape: 'rounded', color: '#cf3f83' },
  { icon: 'branch', shape: 'rounded', color: '#d99512' },
  { icon: 'document', shape: 'rounded', color: '#65727d' },
  { icon: 'bulb', shape: 'rounded', color: '#1fb77d' },
  { icon: 'book', shape: 'rounded', color: '#d36218' },
  { icon: 'writing', shape: 'rounded', color: '#1cae70' },
]

const UNIFIED_CARD_BLUE = '#58b8ff'
const UNIFIED_CARD_GLOW = 0.55
const LEGACY_CARD_COLORS = new Set(['#d7e3ed', '#64e6ad', '#61aef7'])

const initialConfig: MotionConfig = {
  metricLabel: '效率提升',
  metricValue: 73,
  metricSuffix: '%',
  metricDetail: '更少步骤，更快抵达结果',
  compareTitle: '工作方式的进化',
  compareLeftLabel: '传统流程',
  compareLeftValue: '7 DAYS',
  compareRightLabel: 'AI 协同',
  compareRightValue: '2 HOURS',
  comparePositions: initialComparePositions,
  quote: '真正的效率，不是做得更多，而是让每一步都更有价值。',
  quoteSource: 'THE NEXT INTERFACE',
  quoteKicker: '核心观点',
  signalKicker: 'SMART SUMMARY',
  signalLineOne: '复杂信息',
  signalLineTwo: '只看懂重点',
  signalLineThree: '就能做出判断',
  signalFooter: '关键内容已提炼',
  signalSide: 'left',
  signalStagger: 0.26,
  pipLabel: 'FOCUS WINDOW',
  pipTitle: '关键步骤演示',
  pipCaption: '画面局部同步放大，细节更清楚',
  pipSide: 'right',
  imageLabel: 'VISUAL NOTE',
  imageTitle: '一张图看懂重点',
  imageCaption: '用视觉素材补充口播信息，让观点更容易被记住。',
  imageSide: 'left',
  imageFit: 'cover',
  imageScale: 100,
  imagePositionX: 50,
  imagePositionY: 50,
  kineticKicker: 'THE NEW STANDARD',
  kineticLineOne: 'AI 时代',
  kineticLineTwo: '重新理解',
  kineticLineThree: '工作方式',
  kineticSide: 'left',
  kineticStagger: 0.22,
  proofKicker: 'RESULT / DATA PROOF',
  proofTitle: '一张图看见真实结果',
  proofValue: '45.5万',
  proofUnit: '累计触达',
  proofCaption: '14 DAYS / FROM ZERO',
  dualKicker: 'RESULT / TWO HITS',
  dualTitle: '两组结果同时得到验证',
  dualLeftValue: '20万',
  dualRightValue: '21.7万',
  dualCaption: '双样本 · 同周期',
  processKicker: 'METHOD / 4 STEPS',
  processTitle: '把完整方法拆成四步',
  processStepOne: '选题',
  processStepTwo: '文案',
  processStepThree: '剪辑',
  processStepFour: '复盘',
  processCaption: '从输入到发布，逐步拆开',
  insightKicker: 'STEP 01 / BENCHMARK',
  insightTitle: '先找到真正有效的样本',
  insightOne: '开头如何抓人？',
  insightTwo: '中段怎样反转？',
  insightThree: '哪句话引发评论？',
  insightFour: '哪一段值得收藏？',
  insightCaption: 'WHY IT WORKS',
  chapterKicker: 'KEY POINT / 01',
  chapterIndex: '01',
  chapterTitle: '先找对标',
  chapterDetail: '不是照着做，而是拆出有效结构',
  moduleIcons: defaultModuleIcons,
  textStyles: TEXT_STYLE_DEFAULTS,
  duration: 1.4,
  accent: UNIFIED_CARD_BLUE,
  cardScale: 1,
  edgeColor: UNIFIED_CARD_BLUE,
  edgeGlow: UNIFIED_CARD_GLOW,
  showSafeArea: true,
  showGrid: false,
}

const loopEffectPresets: Partial<Record<EffectId, Partial<MotionConfig>>> = {
  'icon-breath': {
    chapterKicker: 'CHAPTER / FOCUS',
    chapterTitle: '关键章节',
    chapterDetail: '用一个图标锁定一个核心概念',
    accent: UNIFIED_CARD_BLUE,
    edgeColor: UNIFIED_CARD_BLUE,
    edgeGlow: UNIFIED_CARD_GLOW,
    kineticSide: 'left',
  },
  'data-bars': {
    insightKicker: 'DATA / SIGNAL',
    insightTitle: '四层能力结构',
    insightOne: '基础层',
    insightTwo: '执行层',
    insightThree: '协同层',
    insightFour: '增长层',
    dualLeftValue: '28%',
    dualRightValue: '46%',
    proofValue: '71%',
    proofUnit: '92%',
    accent: UNIFIED_CARD_BLUE,
    edgeColor: UNIFIED_CARD_BLUE,
    edgeGlow: UNIFIED_CARD_GLOW,
    kineticSide: 'left',
  },
  'step-rail': {
    processKicker: 'METHOD / 3 STEPS',
    processTitle: '从输入到结果',
    processStepOne: '输入信息',
    processStepTwo: '提炼结构',
    processStepThree: '输出结果',
    processCaption: '节点依次点亮，持续显示当前阶段',
    accent: UNIFIED_CARD_BLUE,
    edgeColor: UNIFIED_CARD_BLUE,
    edgeGlow: UNIFIED_CARD_GLOW,
    kineticSide: 'left',
  },
  'code-window': {
    proofKicker: 'B-ROLL / LIVE WINDOW',
    proofTitle: '一张界面讲清整个过程',
    processStepOne: '导入参考素材',
    processStepTwo: '识别内容结构',
    processStepThree: '生成执行步骤',
    processStepFour: '输出可用结果',
    proofCaption: 'WINDOW FLOAT / AUTO SCAN',
    accent: UNIFIED_CARD_BLUE,
    edgeColor: UNIFIED_CARD_BLUE,
    edgeGlow: UNIFIED_CARD_GLOW,
    kineticSide: 'left',
  },
  'module-grid': {
    insightKicker: 'SYSTEM / 8 MODULES',
    insightTitle: '完整能力矩阵',
    insightOne: '素材输入',
    insightTwo: '内容记忆',
    insightThree: '人物关系',
    insightFour: '节奏管理',
    processStepOne: '选题策划',
    processStepTwo: '世界观',
    processStepThree: '大纲设计',
    processStepFour: '正文创作',
    chapterDetail: 'CODEX × 创作工作流',
    accent: UNIFIED_CARD_BLUE,
    edgeColor: UNIFIED_CARD_BLUE,
    edgeGlow: UNIFIED_CARD_GLOW,
    kineticSide: 'left',
  },
}

function createDefaultConfig(effectId: EffectId): MotionConfig {
  return {
    ...initialConfig,
    ...loopEffectPresets[effectId],
    comparePositions: {
      left: { ...initialComparePositions.left },
      right: { ...initialComparePositions.right },
      title: { ...initialComparePositions.title },
      axis: { ...initialComparePositions.axis },
    },
    moduleIcons: defaultModuleIcons.map((item) => ({ ...item })),
    textStyles: normalizeTextStyles(initialConfig.textStyles),
  }
}

const accentOptions = [
  { value: UNIFIED_CARD_BLUE, label: '荧光蓝' },
  { value: '#d7a4f4', label: '霓光紫' },
  { value: '#d7e3ed', label: '冰川银' },
  { value: '#ffffff', label: '纯净白' },
  { value: '#b7c4ad', label: '灰绿' },
  { value: '#c9b89b', label: '暖钛' },
]

const moduleIconOptions: Array<{ value: ModuleIconName; label: string }> = [
  { value: 'ai', label: 'AI 驱动' },
  { value: 'database', label: '创作记忆' },
  { value: 'users', label: '人物关系' },
  { value: 'branch', label: '分支管理' },
  { value: 'document', label: '通用规范' },
  { value: 'bulb', label: '选题策划' },
  { value: 'book', label: '世界观' },
  { value: 'target', label: '人物塑造' },
  { value: 'outline', label: '大纲设计' },
  { value: 'writing', label: '正文创作' },
  { value: 'spark', label: '闪光' },
  { value: 'code', label: '代码' },
  { value: 'chart', label: '图表' },
  { value: 'play', label: '播放' },
  { value: 'image', label: '图片' },
  { value: 'link', label: '链接' },
  { value: 'layers', label: '图层' },
  { value: 'check', label: '完成' },
]

const moduleShapeOptions: Array<{ value: ModuleIconShape; label: string }> = [
  { value: 'rounded', label: '圆角方形' },
  { value: 'ellipse', label: '椭圆' },
  { value: 'circle', label: '圆形' },
  { value: 'diamond', label: '菱形' },
]

const moduleNumberLabels = ['一', '二', '三', '四', '五', '六', '七', '八']

interface VideoAsset {
  url: string
  name: string
  size: number
  duration: number
  width: number
  height: number
}

interface ImageAsset {
  url: string
  name: string
  size: number
}

interface SubtitleCue {
  id: string
  startTime: number
  endTime: number
  text: string
}

interface DragState {
  mode: 'move' | 'resize'
  id: EffectId
  clipId?: string
  part?: ComparePartId
  pointerId: number
  startClientX: number
  startClientY: number
  startPosition: EffectPosition
  canvasWidth: number
  canvasHeight: number
  minimumX: number
  maximumX: number
  minimumY: number
  maximumY: number
  startScale: number
  targetWidth: number
  targetHeight: number
}

interface TimelineDragState {
  clipId: string
  pointerId: number
  startClientX: number
  startTime: number
  clipDuration: number
  laneWidth: number
  moved: boolean
}

interface TimelineScrubState {
  pointerId: number
  laneLeft: number
  laneWidth: number
}

const initialEffectPositions = Object.fromEntries(
  effects.map((effect) => [
    effect.id,
    defaultOverlayPosition(effect.id, createDefaultConfig(effect.id)),
  ]),
) as Record<EffectId, EffectPosition>

const EXPORT_WIDTH = 1920
const EXPORT_HEIGHT = 1080
const PROJECT_FPS = 25

type VideoFit = 'cover' | 'contain'
type TransparentExportFormat = 'png' | 'mov'
type ExportServiceState = 'checking' | 'ready' | 'unavailable'

function Icon({ name }: { name: 'play' | 'pause' | 'reset' | 'grid' | 'safe' | 'chevron' | 'upload' | 'volume' | 'mute' | 'trash' | 'video' | 'image' | 'download' | 'plus' }) {
  const paths = {
    play: <path d="M8.5 6.5v11l9-5.5-9-5.5Z" />,
    pause: <><path d="M9 7v10M15 7v10" /><path d="M9 7h.01M15 7h.01" /></>,
    reset: <><path d="M5.5 8.5A7 7 0 1 1 5 15" /><path d="M5.5 4.5v4h4" /></>,
    grid: <><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" /></>,
    safe: <><path d="M7 3H3v4M17 3h4v4M7 21H3v-4M17 21h4v-4" /><path d="M8 8h8v8H8z" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    upload: <><path d="M12 16V4M7.5 8.5 12 4l4.5 4.5" /><path d="M5 14v5h14v-5" /></>,
    volume: <><path d="M5 10v4h3l4 3V7l-4 3H5Z" /><path d="M15 9.5a4 4 0 0 1 0 5M17.5 7a7.2 7.2 0 0 1 0 10" /></>,
    mute: <><path d="M5 10v4h3l4 3V7l-4 3H5Z" /><path d="m16 10 4 4M20 10l-4 4" /></>,
    trash: <><path d="M5 7h14M9 7V4h6v3M8 10v7M12 10v7M16 10v7M7 7l1 14h8l1-14" /></>,
    video: <><rect x="3" y="6" width="13" height="12" rx="1" /><path d="m16 10 5-3v10l-5-3" /></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="1" /><circle cx="8.5" cy="9" r="1.5" /><path d="m4 18 5-5 3 3 2-2 6 5" /></>,
    download: <><path d="M12 4v12M7.5 11.5 12 16l4.5-4.5" /><path d="M5 19h14" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function TextField({ label, value, onChange, maxLength = 42 }: { label: string; value: string; onChange: (value: string) => void; maxLength?: number }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} />
      <i aria-hidden="true"><b /></i>
    </label>
  )
}

function TextStyleEditor({
  effectId,
  config,
  onChange,
  onReset,
}: {
  effectId: EffectId
  config: MotionConfig
  onChange: (id: TextStyleId, appearance: TextAppearance) => void
  onReset: (id: TextStyleId) => void
}) {
  return (
    <div className="text-style-editor">
      <div className="text-style-editor__heading">
        <span>可编辑文字样式</span>
        <small>颜色 · 大小 · 透明度</small>
      </div>
      {TEXT_STYLE_FIELDS[effectId].map((field) => {
        const appearance = getTextAppearance(config, field.id)
        return (
          <details className="text-style-item" key={field.id}>
            <summary>
              <span>{field.label}</span>
              <i style={{ background: appearance.color, opacity: appearance.opacity }} />
              <em>{appearance.size}% · {Math.round(appearance.opacity * 100)}%</em>
            </summary>
            <div className="text-style-item__controls">
              <label className="text-color-field">
                <span>颜色</span>
                <input
                  type="color"
                  value={appearance.color}
                  onChange={(event) => onChange(field.id, { ...appearance, color: event.target.value })}
                />
              </label>
              <label className="range-field text-style-range">
                <span><b>大小</b><em>{appearance.size}%</em></span>
                <input
                  type="range"
                  min="50"
                  max="300"
                  step="5"
                  value={appearance.size}
                  onChange={(event) => onChange(field.id, { ...appearance, size: Number(event.target.value) })}
                />
              </label>
              <label className="range-field text-style-range">
                <span><b>透明度</b><em>{Math.round(appearance.opacity * 100)}%</em></span>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={appearance.opacity}
                  onChange={(event) => onChange(field.id, { ...appearance, opacity: Number(event.target.value) })}
                />
              </label>
              <button className="text-style-reset" onClick={() => onReset(field.id)}>恢复默认</button>
            </div>
          </details>
        )
      })}
    </div>
  )
}

function formatTimecode(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const wholeSeconds = Math.floor(safeSeconds % 60)
  const frames = Math.floor((safeSeconds % 1) * 25)
  return [hours, minutes, wholeSeconds, frames].map((part) => String(part).padStart(2, '0')).join(':')
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function parseSrtTimestamp(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})$/)
  if (!match) return null
  const [, hours, minutes, seconds, milliseconds] = match
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds) + Number(milliseconds) / 1000
}

function parseSrt(source: string): SubtitleCue[] {
  return source
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((block, blockIndex) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
      const timingIndex = lines.findIndex((line) => line.includes('-->'))
      if (timingIndex < 0) return null
      const [startValue, endValue] = lines[timingIndex].split('-->').map((value) => value.trim().split(/\s+/)[0])
      const startTime = parseSrtTimestamp(startValue)
      const endTime = parseSrtTimestamp(endValue)
      const text = lines.slice(timingIndex + 1).join('\n')
      if (startTime === null || endTime === null || endTime <= startTime || !text) return null
      return { id: `subtitle-${blockIndex + 1}`, startTime, endTime, text }
    })
    .filter((cue): cue is SubtitleCue => cue !== null)
    .sort((left, right) => left.startTime - right.startTime)
}

type JsonRecord = Record<string, unknown>

interface ImportedJsonProject {
  clips: OverlayClip[]
  subtitles?: SubtitleCue[]
  subtitleLinkedCount: number
  autoMatchedCount: number
  duration: number
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readFiniteNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

function readJsonTime(value: unknown) {
  const numeric = readFiniteNumber(value)
  if (numeric !== null) return numeric
  if (typeof value !== 'string') return null
  return parseSrtTimestamp(value)
}

function readJsonPosition(value: unknown, fallback: EffectPosition = { x: 0, y: 0 }): EffectPosition {
  if (!isJsonRecord(value)) return { ...fallback }
  return {
    x: readFiniteNumber(value.x) ?? fallback.x,
    y: readFiniteNumber(value.y) ?? fallback.y,
  }
}

function normalizeModuleIcons(value: unknown, merged?: JsonRecord): ModuleIconConfig[] {
  const iconNames = new Set<ModuleIconName>(moduleIconOptions.map((option) => option.value))
  const shapeNames = new Set<ModuleIconShape>(moduleShapeOptions.map((option) => option.value))
  const source = Array.isArray(value) ? value : []

  return defaultModuleIcons.map((fallback, index) => {
    const item = isJsonRecord(source[index]) ? source[index] : {}
    const sequence = index + 1
    const flatIcon = merged?.[`icon${sequence}`] ?? merged?.[`moduleIcon${sequence}`]
    const flatShape = merged?.[`iconShape${sequence}`] ?? merged?.[`moduleShape${sequence}`]
    const flatColor = merged?.[`iconColor${sequence}`] ?? merged?.[`moduleColor${sequence}`]
    const rawIcon = item.icon ?? item.name ?? flatIcon
    const rawShape = item.shape ?? flatShape
    const rawColor = item.color ?? flatColor

    return {
      icon: typeof rawIcon === 'string' && iconNames.has(rawIcon as ModuleIconName)
        ? rawIcon as ModuleIconName
        : fallback.icon,
      shape: typeof rawShape === 'string' && shapeNames.has(rawShape as ModuleIconShape)
        ? rawShape as ModuleIconShape
        : fallback.shape,
      color: typeof rawColor === 'string' && /^#[0-9a-f]{6}$/i.test(rawColor)
        ? rawColor
        : fallback.color,
    }
  })
}

function readTextCandidate(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (!Array.isArray(value)) return null
  const joined = value
    .map((item) => typeof item === 'string' ? item.trim() : isJsonRecord(item) ? readTextCandidate(item.text ?? item.subtitle ?? item.content) : null)
    .filter((item): item is string => Boolean(item))
    .join(' ')
  return joined || null
}

function readOverlayText(record: JsonRecord): string | null {
  const keys = [
    'text',
    'subtitle',
    'subtitleText',
    'captionText',
    'transcript',
    'script',
    'copy',
    'narration',
    'voiceover',
    'sentences',
    'lines',
  ]
  for (const key of keys) {
    const value = readTextCandidate(record[key])
    if (value) return value
  }
  return null
}

function compactCardText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, Math.max(1, maxLength - 1))}…`
}

function splitSubtitleForCard(value: string, limit: number, maxLength: number) {
  const normalized = value.replace(/\r\n?/g, '\n').trim()
  const sentences = normalized
    .split(/[。！？!?；;\n]+/)
    .flatMap((sentence) => sentence.split(/[，,、：:]+/))
    .map((sentence) => sentence.trim())
    .filter(Boolean)
  const chunks: string[] = []
  for (const sentence of sentences) {
    if (sentence.length <= maxLength) {
      chunks.push(sentence)
    } else {
      for (let offset = 0; offset < sentence.length; offset += maxLength) {
        chunks.push(sentence.slice(offset, offset + maxLength))
      }
    }
    if (chunks.length >= limit) break
  }
  if (chunks.length === 0 && normalized) chunks.push(compactCardText(normalized, maxLength))
  return chunks.slice(0, limit)
}

function subtitleTextForRange(subtitles: SubtitleCue[] | undefined, startTime: number, endTime: number) {
  if (!subtitles) return null
  const text = subtitles
    .filter((cue) => cue.endTime > startTime && cue.startTime < endTime)
    .map((cue) => cue.text.trim())
    .filter(Boolean)
    .join(' ')
  return text || null
}

function collectClassifierText(record: JsonRecord, subtitleText?: string | null) {
  const content = isJsonRecord(record.content) ? record.content : {}
  const rawConfig = isJsonRecord(record.config) ? record.config : {}
  const merged: JsonRecord = { ...record, ...content, ...rawConfig }
  const ignoredKeys = new Set([
    'id', 'kind', 'effectId', 'type', 'name', 'start', 'end', 'startTime', 'endTime',
    'duration', 'x', 'y', 'w', 'fontSize', 'position', 'textStyles', 'moduleIcons',
    'accent', 'edgeColor', 'edgeGlow', 'cardScale',
  ])
  const fragments: string[] = []
  Object.entries(merged).forEach(([key, value]) => {
    if (ignoredKeys.has(key)) return
    if (typeof value === 'number' && Number.isFinite(value)) {
      fragments.push(String(value))
      return
    }
    const text = readTextCandidate(value)
    if (text) fragments.push(text)
  })
  if (subtitleText) fragments.push(subtitleText)
  return {
    merged,
    text: fragments.join(' ').replace(/\s+/g, ' ').trim(),
  }
}

function countKeywordHits(text: string, keywords: string[]) {
  const normalized = text.toLowerCase()
  return keywords.reduce((count, keyword) => count + (normalized.includes(keyword.toLowerCase()) ? 1 : 0), 0)
}

function resolveImportedEffectId(
  record: JsonRecord,
  requestedEffectId: EffectId,
  subtitleText?: string | null,
): { effectId: EffectId; autoMatched: boolean } {
  const loopEffects = new Set<EffectId>(['icon-breath', 'data-bars', 'step-rail', 'code-window', 'module-grid'])
  if (loopEffects.has(requestedEffectId)) return { effectId: requestedEffectId, autoMatched: false }
  const autoMatchSources = new Set<EffectId>(['signal-card', 'kinetic-text'])
  if (!autoMatchSources.has(requestedEffectId)) {
    return { effectId: requestedEffectId, autoMatched: false }
  }
  if (record.autoMatchNewEffects === false || record.lockKind === true || record.strictKind === true) {
    return { effectId: requestedEffectId, autoMatched: false }
  }
  if (requestedEffectId === 'picture-in-picture' || requestedEffectId === 'image-feature' || requestedEffectId === 'compare-split') {
    return { effectId: requestedEffectId, autoMatched: false }
  }

  const { merged, text } = collectClassifierText(record, subtitleText)
  if (!text) return { effectId: requestedEffectId, autoMatched: false }
  const clauses = splitSubtitleForCard(text, 12, 18)
  const numberTokens = text.match(/\d+(?:\.\d+)?(?:%|万|亿|倍|小时|天|分钟|秒)?/g) ?? []
  const explicitModules = Array.from({ length: 8 }, (_, index) => (
    readTextCandidate(merged[`module${index + 1}`] ?? merged[`item${index + 1}`])
  )).filter(Boolean).length
  const moduleArrayCount = Array.isArray(merged.modules)
    ? merged.modules.length
    : Array.isArray(merged.items) ? merged.items.length : 0
  const explicitSteps = Array.from({ length: 4 }, (_, index) => (
    readTextCandidate(merged[`step${index + 1}`] ?? merged[`stage${index + 1}`])
  )).filter(Boolean).length

  const moduleHits = countKeywordHits(text, [
    '模块', '系统', '体系', '矩阵', '能力', '技能', 'skill', '功能', '全链路', '工作流', '组件',
  ])
  const dataHits = countKeywordHits(text, [
    '数据', '指标', '增长', '比例', '播放', '转化', '触达', '结果', '统计', '同比', '环比',
  ])
  const stepHits = countKeywordHits(text, [
    '步骤', '流程', '阶段', '首先', '然后', '接着', '再', '最后', '第一', '第二', '第三', '从', '到',
  ])
  const codeHits = countKeywordHits(text, [
    '代码', '编程', 'codex', 'api', 'json', 'srt', '文件', '导入', '生成', '运行', '自动化', '脚本', '命令',
  ])
  const focusHits = countKeywordHits(text, ['核心', '重点', '关键', '聚焦', '主题', '记住'])

  const moduleScore = explicitModules * 2
    + Math.min(moduleArrayCount, 8)
    + moduleHits * 2
    + (clauses.length >= 5 ? 2 : clauses.length >= 3 ? 1 : 0)
  const dataScore = Math.min(numberTokens.length, 5) * 2 + dataHits * 2 + (clauses.length >= 3 ? 1 : 0)
  const stepScore = explicitSteps * 2 + stepHits * 2 + (clauses.length >= 3 ? 2 : 0)
  const codeScore = codeHits * 2 + (clauses.length >= 3 ? 2 : 0)
  const focusScore = focusHits * 2 + (text.length <= 32 ? 2 : 0)

  const candidates: Array<{ effectId: EffectId; score: number; threshold: number }> = [
    { effectId: 'module-grid', score: moduleScore, threshold: 5 },
    { effectId: 'data-bars', score: dataScore, threshold: 8 },
    { effectId: 'step-rail', score: stepScore, threshold: 7 },
    { effectId: 'code-window', score: codeScore, threshold: 8 },
    { effectId: 'icon-breath', score: focusScore, threshold: 6 },
  ]
  const winner = candidates
    .filter((candidate) => candidate.score >= candidate.threshold)
    .sort((left, right) => right.score - left.score)[0]
  return winner
    ? { effectId: winner.effectId, autoMatched: winner.effectId !== requestedEffectId }
    : { effectId: requestedEffectId, autoMatched: false }
}

function normalizeEffectId(record: JsonRecord): EffectId {
  const rawKind = record.effectId ?? record.kind ?? record.type ?? record.name
  if (typeof rawKind !== 'string') throw new Error('缺少卡片类型 effectId 或 kind。')
  const effectId = readOverlayEffectId(rawKind)
  if (!effectId) throw new Error(`不支持的卡片类型“${rawKind}”，只能导入现有卡片库。`)
  return effectId
}

function normalizeMotionConfig(record: JsonRecord, effectId: EffectId, matchedSubtitleText?: string | null): MotionConfig {
  const content = isJsonRecord(record.content) ? record.content : {}
  const rawConfig = isJsonRecord(record.config) ? record.config : {}
  const merged: JsonRecord = { ...record, ...content, ...rawConfig }
  const normalized = {
    ...createDefaultConfig(effectId),
    comparePositions: {
      left: { ...initialComparePositions.left },
      right: { ...initialComparePositions.right },
      title: { ...initialComparePositions.title },
      axis: { ...initialComparePositions.axis },
    },
  }
  const normalizedRecord = normalized as unknown as JsonRecord

  Object.entries(initialConfig).forEach(([key, fallback]) => {
    if (key === 'comparePositions' || key === 'textStyles') return
    const candidate = merged[key]
    if (typeof fallback === 'number') {
      const numberValue = readFiniteNumber(candidate)
      if (numberValue !== null) normalizedRecord[key] = numberValue
    } else if (typeof candidate === typeof fallback) {
      normalizedRecord[key] = candidate
    }
  })

  const positions = isJsonRecord(rawConfig.comparePositions)
    ? rawConfig.comparePositions
    : isJsonRecord(record.comparePositions) ? record.comparePositions : null
  if (positions) {
    normalized.comparePositions = {
      left: readJsonPosition(positions.left),
      right: readJsonPosition(positions.right),
      title: readJsonPosition(positions.title),
      axis: readJsonPosition(positions.axis),
    }
  }
  normalized.textStyles = normalizeTextStyles(rawConfig.textStyles ?? record.textStyles)
  normalized.moduleIcons = normalizeModuleIcons(
    rawConfig.moduleIcons ?? content.moduleIcons ?? record.moduleIcons,
    merged,
  )

  const text = readOverlayText(merged) ?? matchedSubtitleText ?? null
  const shortLines = text ? splitSubtitleForCard(text, 8, 12) : []
  const setString = (key: keyof MotionConfig, value: unknown) => {
    if (typeof value === 'string') normalizedRecord[key] = value
  }

  if (effectId === 'metric-focus') {
    setString('metricLabel', merged.label)
    const metricValue = readFiniteNumber(merged.value)
    if (metricValue !== null) normalized.metricValue = metricValue
    setString('metricSuffix', merged.suffix ?? merged.unit)
    setString('metricDetail', merged.detail ?? text)
  } else if (effectId === 'compare-split') {
    setString('compareTitle', merged.title ?? text)
    setString('compareLeftLabel', merged.leftLabel)
    setString('compareLeftValue', merged.leftValue)
    setString('compareRightLabel', merged.rightLabel)
    setString('compareRightValue', merged.rightValue)
  } else if (effectId === 'quote-lockup') {
    setString('quote', merged.quote ?? text)
    setString('quoteSource', merged.source)
    setString('quoteKicker', merged.kicker ?? merged.label)
  } else if (effectId === 'signal-card') {
    setString('signalKicker', merged.kicker ?? merged.label)
    setString('signalLineOne', readOverlayLine(merged, 1) ?? shortLines[0])
    setString('signalLineTwo', readOverlayLine(merged, 2) ?? shortLines[1])
    setString('signalLineThree', readOverlayLine(merged, 3) ?? shortLines[2])
    setString('signalFooter', merged.footer)
    if (merged.signalSide !== 'left' && merged.signalSide !== 'right') {
      normalized.signalSide = deriveOverlaySide(record) ?? initialConfig.signalSide
    }
  } else if (effectId === 'picture-in-picture') {
    setString('pipLabel', merged.label)
    setString('pipTitle', merged.title ?? text)
    setString('pipCaption', merged.caption)
    if (merged.pipSide !== 'left' && merged.pipSide !== 'right') {
      normalized.pipSide = deriveOverlaySide(record) ?? initialConfig.pipSide
    }
  } else if (effectId === 'image-feature') {
    setString('imageLabel', merged.label)
    setString('imageTitle', merged.title ?? text)
    setString('imageCaption', merged.caption)
    if (merged.imageSide !== 'left' && merged.imageSide !== 'right') {
      normalized.imageSide = deriveOverlaySide(record) ?? initialConfig.imageSide
    }
  } else if (effectId === 'kinetic-text') {
    setString('kineticKicker', merged.kicker ?? merged.label)
    setString('kineticLineOne', readOverlayLine(merged, 1) ?? shortLines[0])
    setString('kineticLineTwo', readOverlayLine(merged, 2) ?? shortLines[1])
    setString('kineticLineThree', readOverlayLine(merged, 3) ?? shortLines[2])
    if (merged.kineticSide !== 'left' && merged.kineticSide !== 'right') {
      normalized.kineticSide = deriveOverlaySide(record) ?? initialConfig.kineticSide
    }
  } else if (effectId === 'proof-frame') {
    setString('proofKicker', merged.kicker ?? merged.label)
    setString('proofTitle', merged.title ?? text)
    setString('proofValue', merged.value)
    setString('proofUnit', merged.unit)
    setString('proofCaption', merged.caption)
  } else if (effectId === 'dual-proof') {
    setString('dualKicker', merged.kicker ?? merged.label)
    setString('dualTitle', merged.title ?? text)
    setString('dualLeftValue', merged.leftValue)
    setString('dualRightValue', merged.rightValue)
    setString('dualCaption', merged.caption)
  } else if (effectId === 'process-chain') {
    setString('processKicker', merged.kicker ?? merged.label)
    setString('processTitle', merged.title ?? (text ? compactCardText(text, 18) : null))
    setString('processStepOne', readOverlayLine(merged, 1) ?? shortLines[0])
    setString('processStepTwo', readOverlayLine(merged, 2) ?? shortLines[1])
    setString('processStepThree', readOverlayLine(merged, 3) ?? shortLines[2])
    setString('processStepFour', merged.line4 ?? merged.lineFour ?? shortLines[3])
    setString('processCaption', merged.caption)
  } else if (effectId === 'insight-grid') {
    setString('insightKicker', merged.kicker ?? merged.label)
    setString('insightTitle', merged.title ?? (text ? compactCardText(text, 18) : null))
    setString('insightOne', readOverlayLine(merged, 1) ?? shortLines[0])
    setString('insightTwo', readOverlayLine(merged, 2) ?? shortLines[1])
    setString('insightThree', readOverlayLine(merged, 3) ?? shortLines[2])
    setString('insightFour', merged.line4 ?? merged.lineFour ?? shortLines[3])
    setString('insightCaption', merged.caption)
  } else if (effectId === 'chapter-callout') {
    setString('chapterKicker', merged.kicker ?? merged.label)
    setString('chapterIndex', merged.index)
    setString('chapterTitle', merged.title ?? text)
    setString('chapterDetail', merged.detail ?? merged.caption)
  } else if (effectId === 'icon-breath') {
    setString('chapterKicker', merged.kicker ?? merged.label)
    setString('chapterTitle', merged.title ?? (text ? compactCardText(text, 14) : null))
    setString('chapterDetail', merged.detail ?? merged.caption ?? text)
  } else if (effectId === 'data-bars') {
    setString('insightKicker', merged.kicker ?? merged.label)
    setString('insightTitle', merged.title ?? (text ? compactCardText(text, 18) : null))
    setString('insightOne', merged.label1 ?? merged.barOneLabel ?? shortLines[0])
    setString('insightTwo', merged.label2 ?? merged.barTwoLabel ?? shortLines[1])
    setString('insightThree', merged.label3 ?? merged.barThreeLabel ?? shortLines[2])
    setString('insightFour', merged.label4 ?? merged.barFourLabel ?? shortLines[3])
    const values = text?.match(/\d+(?:\.\d+)?(?:%|万|亿|倍|小时|天|分钟|秒)?/g) ?? []
    setString('dualLeftValue', merged.value1 ?? merged.barOneValue ?? values[0])
    setString('dualRightValue', merged.value2 ?? merged.barTwoValue ?? values[1])
    setString('proofValue', merged.value3 ?? merged.barThreeValue ?? values[2])
    setString('proofUnit', merged.value4 ?? merged.barFourValue ?? values[3])
  } else if (effectId === 'step-rail') {
    setString('processKicker', merged.kicker ?? merged.label)
    setString('processTitle', merged.title ?? (text ? compactCardText(text, 18) : null))
    setString('processStepOne', readOverlayLine(merged, 1) ?? shortLines[0])
    setString('processStepTwo', readOverlayLine(merged, 2) ?? shortLines[1])
    setString('processStepThree', readOverlayLine(merged, 3) ?? shortLines[2])
    setString('processCaption', merged.caption ?? merged.detail)
  } else if (effectId === 'code-window') {
    setString('proofKicker', merged.kicker ?? merged.label)
    setString('proofTitle', merged.title ?? (text ? compactCardText(text, 18) : null))
    setString('processStepOne', readOverlayLine(merged, 1) ?? shortLines[0])
    setString('processStepTwo', readOverlayLine(merged, 2) ?? shortLines[1])
    setString('processStepThree', readOverlayLine(merged, 3) ?? shortLines[2])
    setString('processStepFour', merged.line4 ?? merged.lineFour ?? shortLines[3])
    setString('proofCaption', merged.caption ?? merged.detail ?? text)
  } else if (effectId === 'module-grid') {
    const moduleMarker = text?.match(/(?:包括|包含|分别是|主要有|分为)[:：]?\s*/)
    const moduleSource = text && moduleMarker?.index !== undefined
      ? text.slice(moduleMarker.index + moduleMarker[0].length)
      : text
    const moduleTitleSource = text && moduleMarker?.index !== undefined
      ? text.slice(0, moduleMarker.index)
      : text
    const moduleLines = moduleSource ? splitSubtitleForCard(moduleSource, 8, 12) : shortLines
    setString('insightKicker', merged.kicker ?? merged.label)
    setString('insightTitle', merged.title ?? (moduleTitleSource ? compactCardText(moduleTitleSource, 18) : null))
    setString('insightOne', merged.module1 ?? merged.item1 ?? moduleLines[0])
    setString('insightTwo', merged.module2 ?? merged.item2 ?? moduleLines[1])
    setString('insightThree', merged.module3 ?? merged.item3 ?? moduleLines[2])
    setString('insightFour', merged.module4 ?? merged.item4 ?? moduleLines[3])
    setString('processStepOne', merged.module5 ?? merged.item5 ?? moduleLines[4])
    setString('processStepTwo', merged.module6 ?? merged.item6 ?? moduleLines[5])
    setString('processStepThree', merged.module7 ?? merged.item7 ?? moduleLines[6])
    setString('processStepFour', merged.module8 ?? merged.item8 ?? moduleLines[7])
    setString('chapterDetail', merged.caption ?? merged.detail ?? (text ? compactCardText(text, 24) : null))
  }

  normalized.duration = Math.max(0.1, Math.min(30, normalized.duration))
  normalized.cardScale = Math.max(0.45, Math.min(2.2, normalized.cardScale))
  normalized.edgeGlow = Math.max(0, Math.min(1, normalized.edgeGlow))
  if (!/^#[0-9a-f]{6}$/i.test(normalized.edgeColor)) normalized.edgeColor = initialConfig.edgeColor
  if (LEGACY_CARD_COLORS.has(normalized.edgeColor.toLowerCase())) normalized.edgeColor = UNIFIED_CARD_BLUE
  if (LEGACY_CARD_COLORS.has(normalized.accent.toLowerCase())) normalized.accent = UNIFIED_CARD_BLUE
  if (normalized.signalSide !== 'left' && normalized.signalSide !== 'right') normalized.signalSide = initialConfig.signalSide
  if (normalized.pipSide !== 'left' && normalized.pipSide !== 'right') normalized.pipSide = initialConfig.pipSide
  if (normalized.imageSide !== 'left' && normalized.imageSide !== 'right') normalized.imageSide = initialConfig.imageSide
  if (normalized.imageFit !== 'cover' && normalized.imageFit !== 'contain') normalized.imageFit = initialConfig.imageFit
  normalized.imageScale = Math.max(50, Math.min(250, normalized.imageScale))
  normalized.imagePositionX = Math.max(0, Math.min(100, normalized.imagePositionX))
  normalized.imagePositionY = Math.max(0, Math.min(100, normalized.imagePositionY))
  if (
    (['icon-breath', 'data-bars', 'step-rail', 'code-window', 'module-grid'] as EffectId[]).includes(effectId)
    && merged.kineticSide !== 'left'
    && merged.kineticSide !== 'right'
  ) {
    normalized.kineticSide = deriveOverlaySide(record) ?? normalized.kineticSide
  }
  if (normalized.kineticSide !== 'left' && normalized.kineticSide !== 'right') normalized.kineticSide = initialConfig.kineticSide
  return normalized
}

function normalizeOverlayClip(
  value: unknown,
  index: number,
  importedSubtitles?: SubtitleCue[],
): { clip: OverlayClip; autoMatched: boolean } {
  if (!isJsonRecord(value)) throw new Error(`第 ${index + 1} 个卡片不是有效对象。`)
  const requestedEffectId = normalizeEffectId(value)
  const startTime = Math.max(0, readJsonTime(value.startTime ?? value.start) ?? 0)
  const explicitDuration = readJsonTime(value.duration)
  const endTime = readJsonTime(value.endTime ?? value.end)
  const duration = explicitDuration !== null && explicitDuration > 0
    ? explicitDuration
    : endTime !== null && endTime > startTime ? endTime - startTime : null
  if (duration === null) throw new Error(`第 ${index + 1} 个卡片缺少有效的 duration 或 end 时间。`)
  const matchedSubtitleText = subtitleTextForRange(importedSubtitles, startTime, startTime + duration)
  const resolved = resolveImportedEffectId(value, requestedEffectId, matchedSubtitleText)
  const effectId = resolved.effectId
  const definition = effects.find((effect) => effect.id === effectId)
  const config = normalizeMotionConfig(value, effectId, matchedSubtitleText)
  const explicitPosition = readExplicitOverlayPosition(value)
  const position = explicitPosition
    ? readJsonPosition(explicitPosition)
    : defaultOverlayPosition(effectId, config)
  return {
    clip: {
      id: typeof value.id === 'string' && value.id.trim() ? value.id.trim() : `imported-overlay-${index + 1}`,
      effectId,
      name: resolved.autoMatched
        ? definition?.cnName ?? effectId
        : typeof value.name === 'string' && value.name.trim() ? value.name.trim() : definition?.cnName ?? effectId,
      startTime,
      duration,
      config,
      // Standard Overlay JSON x/y describe the component preset, not a user drag offset.
      // Only an explicit position object restores a persisted manual drag.
      position,
    },
    autoMatched: resolved.autoMatched,
  }
}

function normalizeImportedSubtitles(project: JsonRecord | null) {
  if (!project) return undefined
  const candidateKeys = ['subtitles', 'subtitleCues', 'captions', 'srt']
  let rawSubtitles: unknown[] | undefined
  for (const key of candidateKeys) {
    if (Array.isArray(project[key])) {
      rawSubtitles = project[key] as unknown[]
      break
    }
  }
  if (!rawSubtitles) return undefined

  return rawSubtitles.map((cue, index) => {
    if (!isJsonRecord(cue)) throw new Error(`第 ${index + 1} 条字幕不是有效对象。`)
    const startTime = readJsonTime(cue.startTime ?? cue.start)
    const endTime = readJsonTime(cue.endTime ?? cue.end)
    const text = readTextCandidate(cue.text ?? cue.subtitle ?? cue.caption ?? cue.content)
    if (startTime === null || endTime === null || endTime <= startTime || !text) {
      throw new Error(`第 ${index + 1} 条字幕的时间或文字无效。`)
    }
    return {
      id: typeof cue.id === 'string' ? cue.id : `imported-subtitle-${index + 1}`,
      startTime,
      endTime,
      text,
    }
  }).sort((left, right) => left.startTime - right.startTime)
}

function normalizeImportedJson(value: unknown): ImportedJsonProject {
  const project = isJsonRecord(value) ? value : null
  const importedSubtitles = normalizeImportedSubtitles(project)
  const rawClips = Array.isArray(value)
    ? value
    : project && Array.isArray(project.overlayJSON) ? project.overlayJSON
      : project && Array.isArray(project.overlays) ? project.overlays
        : project && (project.effectId || project.kind) ? [project] : null
  if (!rawClips) throw new Error('JSON 中没有找到 overlayJSON 动效数组。')
  if (rawClips.length > 1000) throw new Error('动效卡片超过 1000 个，请拆分项目后再导入。')

  const usedIds = new Set<string>()
  let autoMatchedCount = 0
  const clips = rawClips.map((clip, index) => {
    const result = normalizeOverlayClip(clip, index, importedSubtitles)
    const normalized = result.clip
    if (result.autoMatched) autoMatchedCount += 1
    if (usedIds.has(normalized.id)) normalized.id = `${normalized.id}-${index + 1}`
    usedIds.add(normalized.id)
    return normalized
  }).sort((left, right) => left.startTime - right.startTime)

  const clipEnd = clips.reduce((maximum, clip) => Math.max(maximum, clip.startTime + clip.duration), 0)
  const subtitleEnd = importedSubtitles?.reduce((maximum, cue) => Math.max(maximum, cue.endTime), 0) ?? 0
  const subtitleLinkedCount = importedSubtitles
    ? clips.filter((clip) => subtitleTextForRange(importedSubtitles, clip.startTime, clip.startTime + clip.duration)).length
    : 0
  const requestedDuration = project ? readJsonTime(project.duration) : null
  return {
    clips,
    subtitles: importedSubtitles,
    subtitleLinkedCount,
    autoMatchedCount,
    duration: Math.max(4, requestedDuration ?? 0, clipEnd, subtitleEnd),
  }
}

export default function App() {
  const [activeEffect, setActiveEffect] = useState<EffectId>('picture-in-picture')
  const [config, setConfig] = useState<MotionConfig>(initialConfig)
  const [animationKey, setAnimationKey] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoAsset, setVideoAsset] = useState<VideoAsset | null>(null)
  const [videoFit, setVideoFit] = useState<VideoFit>('contain')
  const [videoScale, setVideoScale] = useState(100)
  const [videoMuted, setVideoMuted] = useState(true)
  const [videoShade, setVideoShade] = useState(0.12)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [imageAsset, setImageAsset] = useState<ImageAsset | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [subtitles, setSubtitles] = useState<SubtitleCue[]>([])
  const [subtitleFileName, setSubtitleFileName] = useState('')
  const [subtitleError, setSubtitleError] = useState<string | null>(null)
  const [projectDuration, setProjectDuration] = useState(4)
  const [projectFileName, setProjectFileName] = useState('UNTITLED_01')
  const [jsonImportStatus, setJsonImportStatus] = useState('')
  const [effectPositions, setEffectPositions] = useState<Record<EffectId, EffectPosition>>(initialEffectPositions)
  const [draggingEffect, setDraggingEffect] = useState<EffectId | null>(null)
  const [overlayJSON, setOverlayJSON] = useState<OverlayClip[]>([])
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null)
  const [isTimelineScrubbing, setIsTimelineScrubbing] = useState(false)
  const [draftMode, setDraftMode] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<TransparentExportFormat | null>(null)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportStatus, setExportStatus] = useState('')
  const [exportRenderTime, setExportRenderTime] = useState(0)
  const [exportServiceState, setExportServiceState] = useState<ExportServiceState>('checking')
  const [exportServiceMessage, setExportServiceMessage] = useState('正在检测本地透明导出服务…')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const videoInputRef = useRef<HTMLInputElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const subtitleInputRef = useRef<HTMLInputElement | null>(null)
  const jsonInputRef = useRef<HTMLInputElement | null>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const timelineDragRef = useRef<TimelineDragState | null>(null)
  const timelineScrubRef = useRef<TimelineScrubState | null>(null)
  const suppressClipClickRef = useRef<string | null>(null)
  const exportSurfaceRef = useRef<HTMLDivElement | null>(null)
  const cancelExportRef = useRef(false)
  const playbackToggleRef = useRef<() => Promise<void>>(async () => undefined)

  const currentEffect = useMemo(
    () => effects.find((effect) => effect.id === activeEffect) ?? effects[0],
    [activeEffect],
  )
  const subtitleDuration = subtitles.length > 0 ? subtitles[subtitles.length - 1].endTime : 0
  const displayDuration = videoAsset?.duration || Math.max(4, projectDuration, subtitleDuration)

  const checkExportService = useCallback(async () => {
    try {
      const response = await fetch('/api/health', { cache: 'no-store' })
      const contentType = response.headers.get('content-type') ?? ''
      if (!response.ok || !contentType.includes('application/json')) {
        throw new Error(`HTTP ${response.status}`)
      }
      const health = await response.json() as {
        service?: string
        transparentMov?: boolean
        exports?: string
      }
      if (health.service !== 'motion-playground-export-server') {
        throw new Error('服务身份不匹配')
      }
      if (!health.transparentMov) {
        setExportServiceState('unavailable')
        setExportServiceMessage('本地服务已连接，但未检测到 FFmpeg，透明 MOV 暂不可用。')
        return { ok: true, transparentMov: false }
      }
      setExportServiceState('ready')
      setExportServiceMessage('本地编码服务已连接 · ProRes 4444 透明 MOV 可用')
      return { ok: true, transparentMov: true }
    } catch {
      setExportServiceState('unavailable')
      setExportServiceMessage('本地导出服务未连接，请双击桌面的“启动动效卡片编辑台”。')
      return { ok: false, transparentMov: false }
    }
  }, [])

  useEffect(() => {
    void checkExportService()
  }, [checkExportService])

  const updateConfig = useCallback(<K extends keyof MotionConfig>(key: K, value: MotionConfig[K]) => {
    setConfig((current) => ({ ...current, [key]: value }))
    if (selectedClipId) {
      setOverlayJSON((current) => current.map((clip) => clip.id === selectedClipId
        ? { ...clip, config: { ...clip.config, [key]: value } }
        : clip))
    }
  }, [selectedClipId])

  const updateModuleIcon = useCallback((index: number, patch: Partial<ModuleIconConfig>) => {
    const nextIcons = config.moduleIcons.map((item, itemIndex) => (
      itemIndex === index ? { ...item, ...patch } : item
    ))
    updateConfig('moduleIcons', nextIcons)
  }, [config.moduleIcons, updateConfig])

  const replayAnimation = useCallback(() => {
    setAnimationKey((value) => value + 1)
  }, [])

  const activeVideoUrl = videoAsset?.url
  useEffect(() => () => {
    if (activeVideoUrl) URL.revokeObjectURL(activeVideoUrl)
  }, [activeVideoUrl])

  const activeImageUrl = imageAsset?.url
  useEffect(() => () => {
    if (activeImageUrl) URL.revokeObjectURL(activeImageUrl)
  }, [activeImageUrl])

  const importVideoFile = useCallback((file: File) => {
    const supportedByType = file.type.startsWith('video/')
    const supportedByName = /\.(mp4|mov|m4v|webm|ogg)$/i.test(file.name)
    if (!supportedByType && !supportedByName) {
      setVideoError('请选择 MP4、MOV、M4V 或 WebM 视频文件。')
      return
    }

    const url = URL.createObjectURL(file)
    videoRef.current?.pause()
    setVideoAsset({ url, name: file.name, size: file.size, duration: 0, width: 0, height: 0 })
    setVideoFit('contain')
    setVideoScale(100)
    setVideoError(null)
    setCurrentTime(0)
    setProgress(0)
    setIsPlaying(false)
    setAnimationKey((value) => value + 1)
  }, [])

  const handleVideoInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) importVideoFile(file)
    event.target.value = ''
  }

  const importImageFile = useCallback((file: File) => {
    const supportedByType = file.type.startsWith('image/')
    const supportedByName = /\.(png|jpe?g|webp|gif|avif)$/i.test(file.name)
    if (!supportedByType && !supportedByName) {
      setImageError('请选择 PNG、JPG、WebP、GIF 或 AVIF 图片。')
      return
    }
    setImageAsset({ url: URL.createObjectURL(file), name: file.name, size: file.size })
    setImageError(null)
    setAnimationKey((value) => value + 1)
  }, [])

  const handleImageInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) importImageFile(file)
    event.target.value = ''
  }

  const handleSubtitleInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!/\.srt$/i.test(file.name)) {
      setSubtitleError('请选择 .srt 字幕文件。')
      return
    }
    try {
      const cues = parseSrt(await file.text())
      if (cues.length === 0) throw new Error('没有识别到有效字幕时间码。')
      setSubtitles(cues)
      setSubtitleFileName(file.name)
      setSubtitleError(null)
      if (!videoAsset) {
        setCurrentTime(0)
        setProgress(0)
      }
    } catch (error) {
      setSubtitleError(error instanceof Error ? error.message : 'SRT 文件读取失败。')
    }
  }

  const handleJsonInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!/\.json$/i.test(file.name)) {
      setJsonImportStatus('导入失败：请选择 .json 文件。')
      return
    }
    try {
      const imported = normalizeImportedJson(JSON.parse(await file.text()) as unknown)
      const firstClip = imported.clips[0]
      videoRef.current?.pause()
      setIsPlaying(false)
      setOverlayJSON(imported.clips)
      setProjectDuration(imported.duration)
      setProjectFileName(file.name.replace(/\.json$/i, ''))
      if (imported.subtitles) {
        setSubtitles(imported.subtitles)
        setSubtitleFileName(imported.subtitles.length > 0 ? `${file.name} · JSON` : '')
        setSubtitleError(null)
      }
      if (firstClip) {
        setSelectedClipId(firstClip.id)
        setDraftMode(false)
        setActiveEffect(firstClip.effectId)
        setConfig({ ...firstClip.config })
        setEffectPositions((current) => ({ ...current, [firstClip.effectId]: { ...firstClip.position } }))
      } else {
        setSelectedClipId(null)
        setDraftMode(true)
      }
      const nextTime = firstClip?.startTime ?? 0
      const effectiveDuration = videoAsset?.duration || imported.duration
      const boundedTime = Math.min(nextTime, effectiveDuration)
      setCurrentTime(boundedTime)
      setProgress(effectiveDuration > 0 ? boundedTime / effectiveDuration : 0)
      if (videoRef.current && videoAsset?.duration) videoRef.current.currentTime = boundedTime
      setAnimationKey((value) => value + 1)
      setExportStatus('')
      const importedKindCounts = imported.clips.reduce((counts, clip) => {
        counts.set(clip.effectId, (counts.get(clip.effectId) ?? 0) + 1)
        return counts
      }, new Map<EffectId, number>())
      const importedKindSummary = [...importedKindCounts.entries()]
        .map(([effectId, count]) => {
          const displayName = effects.find((effect) => effect.id === effectId)?.cnName ?? effectId
          return `${displayName}×${count}`
        })
        .join('、')
      setJsonImportStatus(
        `已导入 ${imported.clips.length} 个动效卡片，调用 ${importedKindCounts.size}/${OVERLAY_EFFECT_IDS.length} 种现有组件`
        + `${importedKindSummary ? `（${importedKindSummary}）` : ''}`
        + `${imported.subtitles ? `、${imported.subtitles.length} 条 SRT 分析片段` : ''}`
        + `${imported.subtitleLinkedCount > 0 ? `；字幕文字已按时间应用到 ${imported.subtitleLinkedCount} 个卡片` : ''}`
        + `${imported.autoMatchedCount > 0 ? `；内容自动匹配到 ${imported.autoMatchedCount} 个新循环模块` : ''}。`,
      )
    } catch (error) {
      setJsonImportStatus(`导入失败：${error instanceof Error ? error.message : 'JSON 文件无法解析。'}`)
    }
  }

  const removeSubtitles = () => {
    setSubtitles([])
    setSubtitleFileName('')
    setSubtitleError(null)
  }

  const removeImage = () => {
    setImageAsset(null)
    setImageError(null)
    replayAnimation()
  }

  const removeVideo = () => {
    videoRef.current?.pause()
    setVideoAsset(null)
    setVideoError(null)
    setCurrentTime(0)
    setProgress(0)
    setIsPlaying(true)
    replayAnimation()
  }

  const togglePlayback = async () => {
    const video = videoRef.current
    if (videoAsset && video) {
      if (video.paused) {
        try {
          await video.play()
          setVideoError(null)
        } catch {
          setVideoError('浏览器阻止了自动播放，请再次点击播放。')
        }
      } else {
        video.pause()
      }
      return
    }
    if (!isPlaying && currentTime >= displayDuration) {
      setCurrentTime(0)
      setProgress(0)
    }
    setIsPlaying((value) => !value)
  }

  useEffect(() => {
    playbackToggleRef.current = togglePlayback
  })

  useEffect(() => {
    const handlePlaybackShortcut = (event: KeyboardEvent) => {
      if (
        event.code !== 'Space'
        || event.repeat
        || event.defaultPrevented
        || event.metaKey
        || event.ctrlKey
        || event.altKey
        || isExporting
      ) return
      const target = event.target
      if (
        target instanceof HTMLElement
        && target.closest('input, textarea, select, button, a[href], [contenteditable="true"], [role="textbox"], [role="button"], [role="slider"]')
      ) return
      event.preventDefault()
      void playbackToggleRef.current()
    }
    window.addEventListener('keydown', handlePlaybackShortcut)
    return () => window.removeEventListener('keydown', handlePlaybackShortcut)
  }, [isExporting])

  useEffect(() => {
    if (videoAsset || !isPlaying || isExporting) return
    let frameRequest = 0
    let previousTime = window.performance.now()
    const tick = (timestamp: number) => {
      const elapsed = Math.max(0, Math.min(0.1, (timestamp - previousTime) / 1000))
      previousTime = timestamp
      setCurrentTime((time) => {
        const nextTime = Math.min(displayDuration, time + elapsed)
        setProgress(nextTime / displayDuration)
        if (nextTime >= displayDuration) setIsPlaying(false)
        return nextTime
      })
      frameRequest = window.requestAnimationFrame(tick)
    }
    frameRequest = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frameRequest)
  }, [displayDuration, isExporting, isPlaying, videoAsset])

  useEffect(() => {
    if (!videoAsset || !isPlaying || isExporting) return
    let frameRequest = 0
    const syncVideoClock = () => {
      const video = videoRef.current
      if (video && Number.isFinite(video.duration) && video.duration > 0) {
        setCurrentTime(video.currentTime)
        setProgress(video.currentTime / video.duration)
      }
      frameRequest = window.requestAnimationFrame(syncVideoClock)
    }
    frameRequest = window.requestAnimationFrame(syncVideoClock)
    return () => window.cancelAnimationFrame(frameRequest)
  }, [isExporting, isPlaying, videoAsset])

  const restartPreview = async () => {
    replayAnimation()
    setCurrentTime(0)
    setProgress(0)
    const video = videoRef.current
    if (videoAsset && video) {
      video.currentTime = 0
      try {
        await video.play()
        setVideoError(null)
      } catch {
        setIsPlaying(false)
      }
    } else {
      setIsPlaying(true)
    }
  }

  const seekPreview = (ratio: number) => {
    const nextProgress = Math.max(0, Math.min(1, ratio))
    const totalFrames = Math.ceil(displayDuration * PROJECT_FPS)
    const nextFrame = Math.max(0, Math.min(totalFrames, Math.round(nextProgress * totalFrames)))
    const nextTime = Math.min(displayDuration, nextFrame / PROJECT_FPS)
    setProgress(displayDuration > 0 ? nextTime / displayDuration : 0)
    setCurrentTime(nextTime)
    if (videoRef.current && videoAsset?.duration) videoRef.current.currentTime = nextTime
  }

  const beginTimelineScrub = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    const bounds = event.currentTarget.getBoundingClientRect()
    if (bounds.width <= 0) return
    videoRef.current?.pause()
    setIsPlaying(false)
    setIsTimelineScrubbing(true)
    timelineScrubRef.current = {
      pointerId: event.pointerId,
      laneLeft: bounds.left,
      laneWidth: bounds.width,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    seekPreview((event.clientX - bounds.left) / bounds.width)
  }

  const moveTimelineScrub = (event: React.PointerEvent<HTMLElement>) => {
    const scrub = timelineScrubRef.current
    if (!scrub || scrub.pointerId !== event.pointerId) return
    event.preventDefault()
    seekPreview((event.clientX - scrub.laneLeft) / scrub.laneWidth)
  }

  const endTimelineScrub = (event: React.PointerEvent<HTMLElement>) => {
    const scrub = timelineScrubRef.current
    if (!scrub || scrub.pointerId !== event.pointerId) return
    seekPreview((event.clientX - scrub.laneLeft) / scrub.laneWidth)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    timelineScrubRef.current = null
    setIsTimelineScrubbing(false)
  }

  const nudgeTimelinePlayhead = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    videoRef.current?.pause()
    setIsPlaying(false)
    const direction = event.key === 'ArrowLeft' ? -1 : 1
    const currentFrame = Math.round(currentTime * PROJECT_FPS)
    const totalFrames = Math.ceil(displayDuration * PROJECT_FPS)
    const nextFrame = Math.max(0, Math.min(totalFrames, currentFrame + direction))
    const nextTime = Math.min(displayDuration, nextFrame / PROJECT_FPS)
    setCurrentTime(nextTime)
    setProgress(displayDuration > 0 ? nextTime / displayDuration : 0)
    if (videoRef.current && videoAsset?.duration) videoRef.current.currentTime = nextTime
  }

  const beginEffectDrag = (
    event: React.PointerEvent<HTMLDivElement>,
    effectId: EffectId,
    position: EffectPosition,
    clipId?: string,
    part?: ComparePartId,
    mode: 'move' | 'resize' = 'move',
    cardScale = 1,
  ) => {
    const dragTarget = (event.target as HTMLElement).closest<HTMLElement>('[data-drag-target]')
    if (event.button !== 0 || !dragTarget) return
    event.preventDefault()
    const layerBounds = event.currentTarget.getBoundingClientRect()
    const canvasBounds = event.currentTarget.parentElement?.getBoundingClientRect() ?? layerBounds
    const targetBounds = dragTarget.getBoundingClientRect()
    const minimumX = position.x + ((canvasBounds.left - targetBounds.left) / canvasBounds.width) * 100
    const maximumX = position.x + ((canvasBounds.right - targetBounds.right) / canvasBounds.width) * 100
    const minimumY = position.y + ((canvasBounds.top - targetBounds.top) / canvasBounds.height) * 100
    const maximumY = position.y + ((canvasBounds.bottom - targetBounds.bottom) / canvasBounds.height) * 100
    dragStateRef.current = {
      mode,
      id: effectId,
      clipId,
      part: mode === 'resize' ? undefined : part,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPosition: position,
      canvasWidth: canvasBounds.width,
      canvasHeight: canvasBounds.height,
      minimumX,
      maximumX,
      minimumY,
      maximumY,
      startScale: cardScale,
      targetWidth: Math.max(1, targetBounds.width),
      targetHeight: Math.max(1, targetBounds.height),
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDraggingEffect(effectId)
  }

  const moveEffectDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (drag.mode === 'resize') {
      const horizontalChange = (event.clientX - drag.startClientX) / drag.targetWidth
      const verticalChange = (event.clientY - drag.startClientY) / drag.targetHeight
      const scaleChange = (horizontalChange + verticalChange) / 2
      const nextScale = Math.round(
        Math.max(0.45, Math.min(2.2, drag.startScale * (1 + scaleChange))) * 100,
      ) / 100

      if (drag.clipId) {
        setOverlayJSON((current) => current.map((clip) => {
          if (clip.id !== drag.clipId) return clip
          return { ...clip, config: { ...clip.config, cardScale: nextScale } }
        }))
        if (selectedClipId === drag.clipId) {
          setConfig((current) => ({ ...current, cardScale: nextScale }))
        }
      } else {
        setConfig((current) => ({ ...current, cardScale: nextScale }))
      }
      return
    }
    const nextX = drag.startPosition.x + ((event.clientX - drag.startClientX) / drag.canvasWidth) * 100
    const nextY = drag.startPosition.y + ((event.clientY - drag.startClientY) / drag.canvasHeight) * 100
    const nextPosition = {
      x: Math.max(drag.minimumX, Math.min(drag.maximumX, nextX)),
      y: Math.max(drag.minimumY, Math.min(drag.maximumY, nextY)),
    }
    if (drag.part) {
      if (drag.clipId) {
        setOverlayJSON((current) => current.map((clip) => {
          if (clip.id !== drag.clipId) return clip
          const nextConfig = {
            ...clip.config,
            comparePositions: {
              ...(clip.config.comparePositions ?? initialComparePositions),
              [drag.part as ComparePartId]: nextPosition,
            },
          }
          return { ...clip, config: nextConfig }
        }))
        if (selectedClipId === drag.clipId) {
          setConfig((current) => ({
            ...current,
            comparePositions: {
              ...(current.comparePositions ?? initialComparePositions),
              [drag.part as ComparePartId]: nextPosition,
            },
          }))
        }
        return
      }
      setConfig((current) => ({
        ...current,
        comparePositions: {
          ...(current.comparePositions ?? initialComparePositions),
          [drag.part as ComparePartId]: nextPosition,
        },
      }))
      return
    }
    if (drag.clipId) {
      setOverlayJSON((current) => current.map((clip) => clip.id === drag.clipId
        ? { ...clip, position: nextPosition }
        : clip))
      if (selectedClipId === drag.clipId) {
        setEffectPositions((current) => ({
          ...current,
          [drag.id]: nextPosition,
        }))
      }
      return
    }
    setEffectPositions((current) => ({
      ...current,
      [drag.id]: nextPosition,
    }))
  }

  const endEffectDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    dragStateRef.current = null
    setDraggingEffect(null)
  }

  const resetActivePosition = () => {
    const nextPosition = defaultOverlayPosition(activeEffect, config)
    setEffectPositions((current) => ({ ...current, [activeEffect]: nextPosition }))
    if (activeEffect === 'compare-split') {
      setConfig((current) => ({
        ...current,
        comparePositions: initialComparePositions,
      }))
    }
    if (selectedClipId) {
      setOverlayJSON((current) => current.map((clip) => clip.id === selectedClipId
        ? {
            ...clip,
            position: defaultOverlayPosition(clip.effectId, clip.config),
            config: clip.effectId === 'compare-split'
              ? { ...clip.config, comparePositions: initialComparePositions }
              : clip.config,
          }
        : clip))
    }
  }

  const fitClipToSubjectSafeArea = useCallback((clip: OverlayClip): OverlayClip => {
    const originalSafeAreaVisibility = clip.config.showSafeArea
    const safeConfig = constrainMotionConfig(clip.effectId, {
      ...clip.config,
      showSafeArea: true,
    })
    const fittedClip = constrainOverlayClip({
      ...clip,
      config: safeConfig,
    })
    return {
      ...fittedClip,
      config: {
        ...fittedClip.config,
        showSafeArea: originalSafeAreaVisibility,
      },
    }
  }, [])

  const fitCardsToSubjectSafeArea = useCallback(() => {
    const selectedClip = selectedClipId
      ? overlayJSON.find((clip) => clip.id === selectedClipId)
      : undefined

    setOverlayJSON((current) => current.map(fitClipToSubjectSafeArea))

    if (selectedClip) {
      const fittedClip = fitClipToSubjectSafeArea(selectedClip)
      setConfig({ ...fittedClip.config })
      setEffectPositions((current) => ({
        ...current,
        [fittedClip.effectId]: { ...fittedClip.position },
      }))
    } else {
      const fittedDraft = fitClipToSubjectSafeArea({
        id: 'draft-safe-fit',
        effectId: activeEffect,
        name: currentEffect.cnName,
        startTime: currentTime,
        duration: Math.max(1 / PROJECT_FPS, config.duration),
        config: { ...config },
        position: { ...effectPositions[activeEffect] },
      })
      setConfig({ ...fittedDraft.config })
      setEffectPositions((current) => ({
        ...current,
        [activeEffect]: { ...fittedDraft.position },
      }))
    }

    setExportStatus('已执行一次人物避让；卡片仍可继续自由拖动，并可放大到 220%。')
  }, [
    activeEffect,
    config,
    currentEffect.cnName,
    currentTime,
    effectPositions,
    fitClipToSubjectSafeArea,
    overlayJSON,
    selectedClipId,
  ])

  const handleVideoMetadata = () => {
    const video = videoRef.current
    if (!video) return
    setVideoAsset((current) => current ? {
      ...current,
      duration: Number.isFinite(video.duration) ? video.duration : 0,
      width: video.videoWidth,
      height: video.videoHeight,
    } : current)
  }

  const handleVideoTimeUpdate = () => {
    const video = videoRef.current
    if (!video) return
    setCurrentTime(video.currentTime)
    if (Number.isFinite(video.duration) && video.duration > 0) setProgress(video.currentTime / video.duration)
  }

  const reset = useCallback(() => {
    const nextConfig = createDefaultConfig(activeEffect)
    const nextPosition = defaultOverlayPosition(activeEffect, nextConfig)
    setConfig(nextConfig)
    setEffectPositions((current) => ({ ...current, [activeEffect]: nextPosition }))
    if (selectedClipId) {
      setOverlayJSON((current) => current.map((clip) => clip.id === selectedClipId
        ? { ...clip, config: nextConfig, position: nextPosition }
        : clip))
    }
    replayAnimation()
  }, [activeEffect, replayAnimation, selectedClipId])

  const selectEffect = (id: EffectId) => {
    setActiveEffect(id)
    if (loopEffectPresets[id]) {
      const nextConfig = createDefaultConfig(id)
      setConfig(nextConfig)
      setEffectPositions((current) => ({
        ...current,
        [id]: defaultOverlayPosition(id, nextConfig),
      }))
    }
    setSelectedClipId(null)
    setDraftMode(true)
    window.setTimeout(replayAnimation, 0)
  }

  const currentEffectPosition = effectPositions[activeEffect]
  const renderTime = isExporting ? exportRenderTime : currentTime
  const activeOverlayClips = overlayJSON.filter((clip) => (
    renderTime >= clip.startTime && renderTime < clip.startTime + clip.duration
  ))

  const setPreviewTime = (time: number) => {
    const nextTime = Math.max(0, Math.min(displayDuration, time))
    setCurrentTime(nextTime)
    setProgress(displayDuration > 0 ? nextTime / displayDuration : 0)
    if (videoRef.current && videoAsset?.duration) videoRef.current.currentTime = nextTime
  }

  const addActiveEffectToTrack = () => {
    const startTime = currentTime >= displayDuration - 1 / PROJECT_FPS
      ? 0
      : Math.max(0, currentTime)
    const clipDuration = Math.min(3, Math.max(1 / PROJECT_FPS, displayDuration - startTime))
    const id = typeof window.crypto?.randomUUID === 'function'
      ? `overlay-${window.crypto.randomUUID()}`
      : `overlay-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const clip: OverlayClip = {
      id,
      effectId: activeEffect,
      name: currentEffect.cnName,
      startTime,
      duration: clipDuration,
      config: { ...config },
      position: { ...currentEffectPosition },
    }
    setOverlayJSON((current) => [...current, clip])
    setSelectedClipId(id)
    setDraftMode(false)
    setPreviewTime(startTime)
    setExportStatus('')
  }

  const selectTimelineClip = (clip: OverlayClip, seekToClip = true) => {
    setSelectedClipId(clip.id)
    setDraftMode(false)
    setActiveEffect(clip.effectId)
    setConfig({ ...clip.config })
    setEffectPositions((current) => ({
      ...current,
      [clip.effectId]: { ...clip.position },
    }))
    if (seekToClip) setPreviewTime(clip.startTime)
  }

  const beginTimelineClipDrag = (event: React.PointerEvent<HTMLButtonElement>, clip: OverlayClip) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('[data-clip-delete]')) return
    const lane = event.currentTarget.parentElement
    if (!lane) return
    const laneWidth = lane.getBoundingClientRect().width
    if (laneWidth <= 0) return
    timelineDragRef.current = {
      clipId: clip.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startTime: clip.startTime,
      clipDuration: clip.duration,
      laneWidth,
      moved: false,
    }
    suppressClipClickRef.current = null
    event.currentTarget.setPointerCapture(event.pointerId)
    setDraggingClipId(clip.id)
    selectTimelineClip(clip, false)
  }

  const moveTimelineClipDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = timelineDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const deltaPixels = event.clientX - drag.startClientX
    if (!drag.moved && Math.abs(deltaPixels) < 3) return
    drag.moved = true
    event.preventDefault()
    const rawStartTime = drag.startTime + (deltaPixels / drag.laneWidth) * displayDuration
    const snappedStartTime = Math.round(rawStartTime * PROJECT_FPS) / PROJECT_FPS
    const maximumStartTime = Math.max(0, displayDuration - drag.clipDuration)
    const nextStartTime = Math.max(0, Math.min(maximumStartTime, snappedStartTime))
    setOverlayJSON((current) => current.map((clip) => clip.id === drag.clipId
      ? { ...clip, startTime: nextStartTime }
      : clip))
  }

  const endTimelineClipDrag = (event: React.PointerEvent<HTMLButtonElement>, cancelled = false) => {
    const drag = timelineDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (drag.moved && !cancelled) {
      suppressClipClickRef.current = drag.clipId
      window.setTimeout(() => {
        if (suppressClipClickRef.current === drag.clipId) suppressClipClickRef.current = null
      }, 0)
    }
    timelineDragRef.current = null
    setDraggingClipId(null)
  }

  const nudgeTimelineClip = (event: React.KeyboardEvent<HTMLButtonElement>, clip: OverlayClip) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    if ((event.target as HTMLElement).closest('[data-clip-delete]')) return
    event.preventDefault()
    const direction = event.key === 'ArrowLeft' ? -1 : 1
    const maximumStartTime = Math.max(0, displayDuration - clip.duration)
    const nextStartTime = Math.max(0, Math.min(maximumStartTime, clip.startTime + direction / PROJECT_FPS))
    setOverlayJSON((current) => current.map((currentClip) => currentClip.id === clip.id
      ? { ...currentClip, startTime: nextStartTime }
      : currentClip))
  }

  const removeTimelineClip = (clipId: string) => {
    setOverlayJSON((current) => current.filter((clip) => clip.id !== clipId))
    if (selectedClipId === clipId) {
      setSelectedClipId(null)
      setDraftMode(true)
    }
  }

  const exportProjectJson = () => {
    const project = {
      version: 1,
      canvas: { width: EXPORT_WIDTH, height: EXPORT_HEIGHT },
      fps: PROJECT_FPS,
      duration: displayDuration,
      overlayJSON,
      subtitles,
    }
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `motion-playground-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const waitForPaint = () => new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()))
  })

  const exportTransparentOverlay = async (format: TransparentExportFormat) => {
    if (isExporting) return
    if (overlayJSON.length === 0) {
      setExportStatus('请先把至少一个动效组件添加到轨道。')
      return
    }
    if (!exportSurfaceRef.current) {
      setExportStatus('透明动效画布尚未就绪，请刷新后重试。')
      return
    }

    const totalFrames = Math.ceil(displayDuration * PROJECT_FPS)
    const wasPlaying = isPlaying
    videoRef.current?.pause()
    setIsPlaying(false)
    cancelExportRef.current = false
    setIsExporting(true)
    setExportFormat(format)
    setExportProgress(0)
    setExportStatus(`正在准备 ${totalFrames} 帧透明${format === 'mov' ? ' MOV' : ' PNG'}…`)

    let exportId = ''
    try {
      const service = await checkExportService()
      if (!service.ok || (format === 'mov' && !service.transparentMov)) {
        throw new Error('本地透明导出服务不可用，请从桌面启动脚本重新打开编辑台。')
      }
      const startResponse = await fetch('/api/exports/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          width: EXPORT_WIDTH,
          height: EXPORT_HEIGHT,
          fps: PROJECT_FPS,
          duration: displayDuration,
          totalFrames,
          overlayJSON,
        }),
      })
      if (!startResponse.ok) {
        const failure = await startResponse.json().catch(() => null) as { error?: string } | null
        throw new Error(failure?.error || `本地导出服务创建任务失败（HTTP ${startResponse.status}）。`)
      }
      const startResult = await startResponse.json() as { exportId: string }
      exportId = startResult.exportId

      for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
        if (cancelExportRef.current) throw new Error('EXPORT_CANCELLED')
        const frameTime = frameIndex / PROJECT_FPS
        setExportRenderTime(frameTime)
        await waitForPaint()

        const surface = exportSurfaceRef.current
        if (!surface) throw new Error('透明动效画布已断开。')
        const bounds = surface.getBoundingClientRect()
        const blob = await toBlob(surface, {
          backgroundColor: 'transparent',
          width: bounds.width,
          height: bounds.height,
          canvasWidth: EXPORT_WIDTH,
          canvasHeight: EXPORT_HEIGHT,
          pixelRatio: 1,
          cacheBust: false,
          skipFonts: true,
          filter: (node) => !(node instanceof HTMLVideoElement),
        })
        if (!blob) throw new Error(`第 ${frameIndex + 1} 帧渲染失败。`)

        const frameResponse = await fetch(`/api/exports/${encodeURIComponent(exportId)}/frame?index=${frameIndex + 1}`, {
          method: 'POST',
          headers: { 'Content-Type': 'image/png' },
          body: blob,
        })
        if (!frameResponse.ok) throw new Error(`第 ${frameIndex + 1} 帧保存失败。`)
        const completed = frameIndex + 1
        const frameProgress = completed / totalFrames
        setExportProgress(format === 'mov' ? frameProgress * 0.95 : frameProgress)
        setExportStatus(`正在渲染 ${completed} / ${totalFrames} 帧`)
      }

      if (format === 'mov') {
        setExportProgress(0.97)
        setExportStatus('正在编码透明 ProRes 4444 MOV…')
        const movResponse = await fetch(`/api/exports/${encodeURIComponent(exportId)}/mov`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frameCount: totalFrames, cleanupFrames: true }),
        })
        const movResult = await movResponse.json() as { path?: string; error?: string; codec?: string }
        if (!movResponse.ok || !movResult.path) throw new Error(movResult.error || '透明 MOV 编码失败。')
        setExportProgress(1)
        setExportStatus(`已导出透明 MOV：${movResult.path}`)
      } else {
        const finishResponse = await fetch(`/api/exports/${encodeURIComponent(exportId)}/finish`, { method: 'POST' })
        if (!finishResponse.ok) throw new Error('PNG 序列完成确认失败。')
        const finishResult = await finishResponse.json() as { path: string; frameCount: number }
        if (finishResult.frameCount !== totalFrames) {
          throw new Error(`导出帧数不完整：应为 ${totalFrames} 帧，实际保存 ${finishResult.frameCount} 帧。`)
        }
        setExportProgress(1)
        setExportStatus(`已导出 ${finishResult.frameCount} 帧：${finishResult.path}`)
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'EXPORT_CANCELLED') {
        setExportStatus('导出已取消，已生成的帧保留在 exports 文件夹。')
      } else {
        setExportStatus(error instanceof Error ? error.message : `透明${format === 'mov' ? ' MOV' : ' PNG 序列'}导出失败。`)
      }
    } finally {
      setIsExporting(false)
      setExportFormat(null)
      cancelExportRef.current = false
      setExportRenderTime(0)
      if (wasPlaying && videoAsset && videoRef.current) {
        void videoRef.current.play().catch(() => setIsPlaying(false))
      } else if (wasPlaying && !videoAsset) {
        setIsPlaying(true)
      }
      replayAnimation()
    }
  }

  return (
    <main className="app-shell">
      <input
        ref={videoInputRef}
        className="visually-hidden"
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/*"
        onChange={handleVideoInput}
      />
      <input
        ref={imageInputRef}
        className="visually-hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/*"
        onChange={handleImageInput}
      />
      <input
        ref={subtitleInputRef}
        className="visually-hidden"
        type="file"
        accept=".srt,application/x-subrip,text/plain"
        onChange={handleSubtitleInput}
      />
      <input
        ref={jsonInputRef}
        className="visually-hidden"
        type="file"
        accept=".json,application/json"
        onChange={handleJsonInput}
      />
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><span /><span /></div>
          <div>
            <strong>MOTION / PLAYGROUND</strong>
            <span>动效组件预览台</span>
          </div>
        </div>
        <div className="project-meta">
          <span className="status-dot" />
          <span title={projectFileName}>PROJECT / {projectFileName}</span>
          <i />
          <span>1920 × 1080</span>
          <i />
          <span>25 FPS</span>
        </div>
        <div className="top-actions">
          <button className="json-import-button" onClick={() => jsonInputRef.current?.click()} disabled={isExporting}>
            <Icon name="upload" />
            <span>导入 JSON</span>
          </button>
          <button className="export-overlay-button" onClick={() => { void exportTransparentOverlay('mov') }} disabled={isExporting || overlayJSON.length === 0}>
            <Icon name="download" />
            <span>{isExporting ? `${Math.round(exportProgress * 100)}%` : '导出透明 MOV'}</span>
          </button>
          <button className="import-video-button" onClick={() => videoInputRef.current?.click()}>
            <Icon name="upload" />
            <span>{videoAsset ? '更换视频' : '导入视频'}</span>
          </button>
          <div className="version-badge">HTML <span>·</span> LIVE</div>
        </div>
      </header>

      <div className="studio-layout">
        <aside className="library-panel">
          <div className="panel-heading">
            <span>COMPONENT LIBRARY</span>
            <b>{String(effects.length).padStart(2, '0')}</b>
          </div>
          <div className="library-intro">
            <h1>动效组件</h1>
            <p>为人物口播设计的边缘信息层</p>
          </div>

          <nav className="effect-list" aria-label="动效组件">
            {effects.map((effect) => (
              <button
                key={effect.id}
                className={`effect-option ${activeEffect === effect.id ? 'is-active' : ''}`}
                onClick={() => selectEffect(effect.id)}
              >
                <span className="effect-option__index">{effect.index}</span>
                <span className="effect-option__preview" aria-hidden="true">
                  {effect.id === 'metric-focus' && <i className="mini-number">73</i>}
                  {effect.id === 'compare-split' && <><i className="mini-card" /><i className="mini-card" /></>}
                  {effect.id === 'quote-lockup' && <><i className="mini-quote">“</i><i className="mini-lines" /></>}
                  {effect.id === 'signal-card' && <><i className="mini-signal-card"><b /><b /><b /></i><i className="mini-spark">✦</i></>}
                  {effect.id === 'picture-in-picture' && <><i className="mini-pip-frame"><b /></i><i className="mini-pip-dot" /></>}
                  {effect.id === 'image-feature' && <><i className="mini-image-frame"><b /><span /></i></>}
                  {effect.id === 'kinetic-text' && <><i className="mini-kinetic"><b>AI</b><span /><span /></i></>}
                  {effect.id === 'proof-frame' && <><i className="mini-proof-frame"><b /></i><i className="mini-proof-value">45</i></>}
                  {effect.id === 'dual-proof' && <><i className="mini-dual-frame" /><i className="mini-dual-frame" /></>}
                  {effect.id === 'process-chain' && <i className="mini-process-chain"><b /><b /><b /><b /></i>}
                  {effect.id === 'insight-grid' && <i className="mini-insight-grid"><b /><b /><b /><b /></i>}
                  {effect.id === 'chapter-callout' && <><i className="mini-chapter-index">01</i><i className="mini-chapter-lines" /></>}
                  {effect.id === 'icon-breath' && <i className="mini-icon-breath"><b /><b /><b /></i>}
                  {effect.id === 'data-bars' && <i className="mini-data-bars"><b /><b /><b /><b /></i>}
                  {effect.id === 'step-rail' && <i className="mini-step-rail"><b /><b /><b /></i>}
                  {effect.id === 'code-window' && <i className="mini-code-window"><b /><b /><b /><b /></i>}
                  {effect.id === 'module-grid' && <i className="mini-module-grid"><b /><b /><b /><b /><b /><b /></i>}
                </span>
                <span className="effect-option__text">
                  <strong>{effect.name}</strong>
                  <small>{effect.cnName}</small>
                  <em>{effect.description}</em>
                </span>
                <span className="effect-option__arrow"><Icon name="chevron" /></span>
              </button>
            ))}
          </nav>

          <div className="library-note">
            <span>DESIGN NOTE</span>
            <p>所有组件默认避让画面中央 36% 人物安全区。</p>
          </div>
        </aside>

        <section className="preview-workspace">
          <div className="workspace-heading">
            <div>
              <span>ACTIVE COMPONENT / {currentEffect.index}</span>
              <h2>{currentEffect.name}</h2>
            </div>
            <div className="canvas-tools">
              <button
                className={config.showGrid ? 'is-active' : ''}
                onClick={() => updateConfig('showGrid', !config.showGrid)}
                title="显示构图网格"
                aria-label="显示构图网格"
              ><Icon name="grid" /></button>
              <button
                className={config.showSafeArea ? 'is-active' : ''}
                onClick={() => updateConfig('showSafeArea', !config.showSafeArea)}
                title="显示人物安全区"
                aria-label="显示人物安全区"
              ><Icon name="safe" /></button>
              <span>{videoAsset ? `${videoFit.toUpperCase()} · ${videoScale}%` : 'FIT'}</span>
            </div>
          </div>

          <div
            className={`canvas-mat ${videoAsset ? 'has-media' : ''}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              const file = event.dataTransfer.files?.[0]
              if (file) importVideoFile(file)
            }}
          >
            <div className={`preview-canvas ${config.showGrid ? 'show-grid' : ''} ${videoAsset ? 'has-video' : ''}`}>
              {videoAsset && (
                <video
                  ref={videoRef}
                  className={`preview-video fit-${videoFit}`}
                  style={{ transform: `scale(${videoScale / 100})` }}
                  src={videoAsset.url}
                  muted={videoMuted}
                  playsInline
                  preload="metadata"
                  onLoadedMetadata={handleVideoMetadata}
                  onTimeUpdate={handleVideoTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  onError={() => setVideoError('此视频编码暂不受浏览器支持，请尝试 H.264 MP4 或 WebM。')}
                />
              )}
              {videoAsset && <div className="video-shade" style={{ backgroundColor: `rgba(0, 0, 0, ${videoShade})` }} aria-hidden="true" />}
              <div className="canvas-vignette" aria-hidden="true" />
              {!videoAsset && (
                <div className="subject-placeholder" aria-label="中央人物占位">
                  <div className="subject-head" />
                  <div className="subject-body" />
                </div>
              )}

              {config.showSafeArea && (
                <div className="safe-area" aria-label="中央人物安全区">
                  <span className="safe-area__label">SUBJECT SAFE AREA · 36%</span>
                  <i className="corner corner--tl" /><i className="corner corner--tr" />
                  <i className="corner corner--bl" /><i className="corner corner--br" />
                </div>
              )}

              <div
                ref={exportSurfaceRef}
                className={`overlay-export-surface ${draftMode && !isExporting ? 'is-preview-hidden' : ''}`}
                aria-label="透明动效图层"
              >
                {activeOverlayClips.map((clip) => (
                  <OverlayLayer
                    key={`${clip.id}-${animationKey}`}
                    effectId={clip.effectId}
                    config={clip.config}
                    position={clip.position}
                    controlledTime={Math.max(0, renderTime - clip.startTime)}
                    playing={!isExporting && isPlaying}
                    clipId={clip.id}
                    dragging={draggingEffect === clip.effectId}
                    selected={clip.id === selectedClipId}
                    editable={!isExporting}
                    media={{
                      videoUrl: videoAsset?.url,
                      videoTime: renderTime,
                      videoPlaying: !isExporting && isPlaying,
                      imageUrl: imageAsset?.url,
                    }}
                    onPointerDown={beginEffectDrag}
                    onPointerMove={moveEffectDrag}
                    onPointerUp={endEffectDrag}
                    onDoubleClick={resetActivePosition}
                  />
                ))}
              </div>

              {draftMode && !isExporting && (
                <OverlayLayer
                  key={`${activeEffect}-${animationKey}`}
                  effectId={activeEffect}
                  config={config}
                  position={currentEffectPosition}
                  animationKey={animationKey}
                  playing
                  dragging={draggingEffect === activeEffect}
                  selected
                  editable
                  media={{
                    videoUrl: videoAsset?.url,
                    videoTime: currentTime,
                    videoPlaying: isPlaying,
                    imageUrl: imageAsset?.url,
                  }}
                  onPointerDown={beginEffectDrag}
                  onPointerMove={moveEffectDrag}
                  onPointerUp={endEffectDrag}
                  onDoubleClick={resetActivePosition}
                />
              )}

              {!videoAsset && (
                <button className={`canvas-import-hint ${activeEffect === 'picture-in-picture' && config.pipSide === 'right' ? 'is-left' : ''}`} onClick={() => videoInputRef.current?.click()}>
                  <Icon name="upload" />
                  <span><b>导入视频进行实时叠加</b><small>点击选择，或将视频拖到画布</small></span>
                </button>
              )}
            </div>
          </div>

          <div className="timeline">
            <div className="transport-row">
              <button className="transport-button" onClick={restartPreview} aria-label="从头播放"><Icon name="reset" /></button>
              <button
                className="transport-button transport-button--primary"
                onClick={togglePlayback}
                aria-label={isPlaying ? '暂停' : '播放'}
                title={isPlaying ? '暂停（空格）' : '播放（空格）'}
              >
                <Icon name={isPlaying ? 'pause' : 'play'} />
              </button>
              <span className="timecode">{formatTimecode(currentTime)}</span>
              <button
                className={`timeline-track ${isTimelineScrubbing ? 'is-scrubbing' : ''}`}
                onPointerDown={beginTimelineScrub}
                onPointerMove={moveTimelineScrub}
                onPointerUp={endTimelineScrub}
                onPointerCancel={endTimelineScrub}
                onKeyDown={nudgeTimelinePlayhead}
                aria-label="逐帧拖动预览时间轴"
                aria-valuetext={`${formatTimecode(currentTime)}，第 ${Math.round(currentTime * PROJECT_FPS)} 帧`}
              >
                <i style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
                <b style={{ left: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
              </button>
              <span className="timecode timecode--muted">{formatTimecode(displayDuration)}</span>
              <button className={`transport-button audio-button ${videoMuted ? '' : 'is-active'}`} onClick={() => setVideoMuted((value) => !value)} disabled={!videoAsset} aria-label={videoMuted ? '打开声音' : '静音'}>
                <Icon name={videoMuted ? 'mute' : 'volume'} />
              </button>
              <button className="add-track-button" onClick={addActiveEffectToTrack} disabled={isExporting}>
                <Icon name="plus" /> 添加到轨道
              </button>
            </div>
            <div className="timeline-editor">
              <div className="timeline-ruler-row">
                <span className="track-label">TIME</span>
                <div
                  className={`timeline-ruler ${isTimelineScrubbing ? 'is-scrubbing' : ''}`}
                  role="slider"
                  tabIndex={0}
                  aria-label="时间刻度"
                  aria-valuemin={0}
                  aria-valuemax={Math.ceil(displayDuration * PROJECT_FPS)}
                  aria-valuenow={Math.round(currentTime * PROJECT_FPS)}
                  onPointerDown={beginTimelineScrub}
                  onPointerMove={moveTimelineScrub}
                  onPointerUp={endTimelineScrub}
                  onPointerCancel={endTimelineScrub}
                  onKeyDown={nudgeTimelinePlayhead}
                >
                  {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
                    <span key={tick} style={{ left: `${tick * 100}%` }}>
                      {`${(displayDuration * tick).toFixed(1)}s`}
                    </span>
                  ))}
                </div>
                <span className="track-count">{PROJECT_FPS} FPS</span>
              </div>
              <div className="video-track-row">
                <span className="track-label">VIDEO</span>
                <div
                  className={`video-track-lane ${isTimelineScrubbing ? 'is-scrubbing' : ''}`}
                  role="slider"
                  tabIndex={0}
                  aria-label="视频轨道逐帧定位"
                  aria-valuemin={0}
                  aria-valuemax={Math.ceil(displayDuration * PROJECT_FPS)}
                  aria-valuenow={Math.round(currentTime * PROJECT_FPS)}
                  onPointerDown={beginTimelineScrub}
                  onPointerMove={moveTimelineScrub}
                  onPointerUp={endTimelineScrub}
                  onPointerCancel={endTimelineScrub}
                  onKeyDown={nudgeTimelinePlayhead}
                >
                  <div className={`video-track-clip ${videoAsset ? 'has-video' : ''}`}>
                    <Icon name="video" />
                    <span>{videoAsset?.name ?? '项目画布 · 等待导入视频'}</span>
                    <em>{displayDuration.toFixed(2)}s</em>
                  </div>
                  <b className="shared-playhead" style={{ left: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
                </div>
                <span className="track-count">F {String(Math.round(currentTime * PROJECT_FPS)).padStart(4, '0')}</span>
              </div>
              <div className="overlay-track-row">
                <span className="track-label">OVERLAY</span>
                <div
                  className="overlay-track-lane"
                  onPointerDown={(event) => {
                    if (event.target === event.currentTarget) beginTimelineScrub(event)
                  }}
                  onPointerMove={moveTimelineScrub}
                  onPointerUp={endTimelineScrub}
                  onPointerCancel={endTimelineScrub}
                >
                  {overlayJSON.length === 0 && <span className="empty-track-note">选择组件并添加到轨道；拖动上方视频轨道逐帧定位</span>}
                  {overlayJSON.map((clip) => (
                    <button
                      key={clip.id}
                      className={`overlay-clip ${selectedClipId === clip.id ? 'is-selected' : ''} ${draggingClipId === clip.id ? 'is-dragging' : ''}`}
                      style={{
                        left: `${(clip.startTime / displayDuration) * 100}%`,
                        width: `${Math.max(1.8, (clip.duration / displayDuration) * 100)}%`,
                      }}
                      onPointerDown={(event) => beginTimelineClipDrag(event, clip)}
                      onPointerMove={moveTimelineClipDrag}
                      onPointerUp={(event) => endTimelineClipDrag(event)}
                      onPointerCancel={(event) => endTimelineClipDrag(event, true)}
                      onClick={() => {
                        if (suppressClipClickRef.current === clip.id) {
                          suppressClipClickRef.current = null
                          return
                        }
                        selectTimelineClip(clip)
                      }}
                      onKeyDown={(event) => nudgeTimelineClip(event, clip)}
                      title={`${clip.name} · ${clip.startTime.toFixed(2)}s — ${(clip.startTime + clip.duration).toFixed(2)}s`}
                    >
                      <span>{clip.name}</span>
                      <i
                        role="button"
                        tabIndex={0}
                        data-clip-delete
                        aria-label={`删除${clip.name}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          removeTimelineClip(clip.id)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            event.stopPropagation()
                            removeTimelineClip(clip.id)
                          }
                        }}
                      >×</i>
                    </button>
                  ))}
                  <b className="shared-playhead" style={{ left: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
                </div>
                <span className="track-count">{String(overlayJSON.length).padStart(2, '0')} ITEMS</span>
              </div>
            </div>
          </div>
        </section>

        <aside className="inspector-panel">
          <div className="panel-heading">
            <span>INSPECTOR</span>
            <button onClick={reset}>RESET</button>
          </div>

          <div className="inspector-scroll">
            <section className="inspector-section media-inspector">
              <header><span>00</span><h3>视频底图</h3><b>−</b></header>
              <div className="form-grid">
                {videoAsset ? (
                  <>
                    <div className="media-source-card">
                      <span className="media-source-card__icon"><Icon name="video" /></span>
                      <div>
                        <strong title={videoAsset.name}>{videoAsset.name}</strong>
                        <small>
                          {videoAsset.width ? `${videoAsset.width} × ${videoAsset.height}` : '正在读取'}
                          <i />
                          {formatFileSize(videoAsset.size)}
                        </small>
                      </div>
                      <button onClick={removeVideo} title="移除视频" aria-label="移除视频"><Icon name="trash" /></button>
                    </div>
                    <button className="replace-media-button" onClick={() => videoInputRef.current?.click()}><Icon name="upload" /> 更换本地视频</button>
                    <div className="side-setting">
                      <span>画面适配</span>
                      <div>
                        <button className={videoFit === 'contain' ? 'is-active' : ''} onClick={() => setVideoFit('contain')}>完整不裁切</button>
                        <button className={videoFit === 'cover' ? 'is-active' : ''} onClick={() => setVideoFit('cover')}>填满裁切</button>
                      </div>
                    </div>
                    <p className="local-media-note">默认完整显示竖屏视频，不会自动截取画面。</p>
                    <label className="range-field">
                      <span><b>画面缩放</b><em>{videoScale}%</em></span>
                      <input
                        type="range"
                        min="25"
                        max="250"
                        step="1"
                        value={videoScale}
                        onChange={(event) => setVideoScale(Number(event.target.value))}
                        onDoubleClick={() => setVideoScale(100)}
                      />
                    </label>
                    {videoScale !== 100 && <button className="scale-reset-button" onClick={() => setVideoScale(100)}>恢复到 100%</button>}
                    <Toggle label="播放声音" value={!videoMuted} onChange={(value) => setVideoMuted(!value)} />
                    <label className="range-field">
                      <span><b>背景压暗</b><em>{Math.round(videoShade * 100)}%</em></span>
                      <input type="range" min="0" max="0.5" step="0.02" value={videoShade} onChange={(event) => setVideoShade(Number(event.target.value))} />
                    </label>
                  </>
                ) : (
                  <button className="video-drop-button" onClick={() => videoInputRef.current?.click()}>
                    <Icon name="upload" />
                    <span><b>选择本地视频</b><small>MP4 · MOV · WEBM · M4V</small></span>
                  </button>
                )}
                {videoError && <p className="video-error">{videoError}</p>}
                <p className="local-media-note">视频仅在当前浏览器本地读取，不会上传。</p>
                <div className="subtitle-tools">
                  <span>SRT 动效分析源</span>
                  {subtitleFileName ? (
                    <div className="subtitle-source-card">
                      <div><strong title={subtitleFileName}>{subtitleFileName}</strong><small>{subtitles.length} 条时间片段</small></div>
                      <button onClick={removeSubtitles} title="移除 SRT" aria-label="移除 SRT"><Icon name="trash" /></button>
                    </div>
                  ) : (
                    <button className="replace-media-button" onClick={() => subtitleInputRef.current?.click()}><Icon name="upload" /> 导入 SRT 分析源</button>
                  )}
                  {subtitleFileName && <button className="replace-media-button" onClick={() => subtitleInputRef.current?.click()}><Icon name="upload" /> 更换 SRT</button>}
                  {subtitleFileName && (
                    <button className="replace-media-button srt-json-import-button" onClick={() => jsonInputRef.current?.click()}>
                      <Icon name="upload" /> 导入生成的动效 JSON
                    </button>
                  )}
                  <p className="local-media-note">只用于按时间轴匹配动效卡片，不会在预览画面或透明动效层中显示字幕。</p>
                  {subtitleError && <p className="video-error">{subtitleError}</p>}
                </div>
              </div>
            </section>

            <section className="inspector-section">
              <header><span>01</span><h3>内容</h3><b>−</b></header>
              {activeEffect === 'metric-focus' && (
                <div className="form-grid">
                  <TextField label="标签" value={config.metricLabel} onChange={(value) => updateConfig('metricLabel', value)} />
                  <div className="field-row">
                    <label className="field">
                      <span>数字</span>
                      <input type="number" min="0" max="99999" value={config.metricValue} onChange={(event) => updateConfig('metricValue', Number(event.target.value))} />
                    </label>
                    <TextField label="单位" value={config.metricSuffix} onChange={(value) => updateConfig('metricSuffix', value)} maxLength={6} />
                  </div>
                  <TextField label="说明" value={config.metricDetail} onChange={(value) => updateConfig('metricDetail', value)} />
                </div>
              )}
              {activeEffect === 'compare-split' && (
                <div className="form-grid">
                  <TextField label="主题" value={config.compareTitle} onChange={(value) => updateConfig('compareTitle', value)} />
                  <div className="field-row">
                    <TextField label="左侧标签" value={config.compareLeftLabel} onChange={(value) => updateConfig('compareLeftLabel', value)} />
                    <TextField label="左侧数值" value={config.compareLeftValue} onChange={(value) => updateConfig('compareLeftValue', value)} />
                  </div>
                  <div className="field-row">
                    <TextField label="右侧标签" value={config.compareRightLabel} onChange={(value) => updateConfig('compareRightLabel', value)} />
                    <TextField label="右侧数值" value={config.compareRightValue} onChange={(value) => updateConfig('compareRightValue', value)} />
                  </div>
                </div>
              )}
              {activeEffect === 'quote-lockup' && (
                <div className="form-grid">
                  <TextField label="栏目标签" value={config.quoteKicker} onChange={(value) => updateConfig('quoteKicker', value)} />
                  <label className="field">
                    <span>金句</span>
                    <textarea value={config.quote} maxLength={72} rows={4} onChange={(event) => updateConfig('quote', event.target.value)} />
                    <small>{config.quote.length} / 72</small>
                  </label>
                  <TextField label="出处" value={config.quoteSource} onChange={(value) => updateConfig('quoteSource', value)} />
                </div>
              )}
              {activeEffect === 'signal-card' && (
                <div className="form-grid">
                  <TextField label="语境标签" value={config.signalKicker} onChange={(value) => updateConfig('signalKicker', value)} maxLength={24} />
                  <TextField label="第一句" value={config.signalLineOne} onChange={(value) => updateConfig('signalLineOne', value)} maxLength={16} />
                  <TextField label="第二句" value={config.signalLineTwo} onChange={(value) => updateConfig('signalLineTwo', value)} maxLength={16} />
                  <TextField label="第三句" value={config.signalLineThree} onChange={(value) => updateConfig('signalLineThree', value)} maxLength={16} />
                  <TextField label="脚注" value={config.signalFooter} onChange={(value) => updateConfig('signalFooter', value)} maxLength={24} />
                </div>
              )}
              {activeEffect === 'picture-in-picture' && (
                <div className="form-grid">
                  <TextField label="窗口标签" value={config.pipLabel} onChange={(value) => updateConfig('pipLabel', value)} maxLength={22} />
                  <TextField label="标题" value={config.pipTitle} onChange={(value) => updateConfig('pipTitle', value)} maxLength={18} />
                  <TextField label="说明" value={config.pipCaption} onChange={(value) => updateConfig('pipCaption', value)} maxLength={32} />
                  <p className="local-media-note">画中画会自动跟随“视频底图”中的当前视频和时间轴。</p>
                </div>
              )}
              {activeEffect === 'image-feature' && (
                <div className="form-grid">
                  {imageAsset ? (
                    <div className="media-source-card image-source-card">
                      <span className="media-source-card__icon"><Icon name="image" /></span>
                      <div>
                        <strong title={imageAsset.name}>{imageAsset.name}</strong>
                        <small>{formatFileSize(imageAsset.size)}<i />LOCAL IMAGE</small>
                      </div>
                      <button onClick={removeImage} title="移除图片" aria-label="移除图片"><Icon name="trash" /></button>
                    </div>
                  ) : (
                    <button className="video-drop-button image-upload-button" onClick={() => imageInputRef.current?.click()}>
                      <Icon name="image" />
                      <span><b>上传卡片图片</b><small>PNG · JPG · WEBP · GIF</small></span>
                    </button>
                  )}
                  {imageAsset && <button className="replace-media-button" onClick={() => imageInputRef.current?.click()}><Icon name="upload" /> 更换图片</button>}
                  {imageError && <p className="video-error">{imageError}</p>}
                  <div className="image-framing-controls">
                    <div className="image-framing-controls__heading">
                      <span>图片显示区域</span>
                      <small>FRAMING</small>
                    </div>
                    <div className="side-setting">
                      <span>填充方式</span>
                      <div>
                        <button className={config.imageFit === 'cover' ? 'is-active' : ''} onClick={() => updateConfig('imageFit', 'cover')}>填满裁切</button>
                        <button className={config.imageFit === 'contain' ? 'is-active' : ''} onClick={() => updateConfig('imageFit', 'contain')}>完整显示</button>
                      </div>
                    </div>
                    <label className="range-field">
                      <span><b>图片缩放</b><em>{config.imageScale}%</em></span>
                      <input type="range" min="50" max="250" step="1" value={config.imageScale} onChange={(event) => updateConfig('imageScale', Number(event.target.value))} />
                    </label>
                    <label className="range-field">
                      <span><b>水平位置</b><em>{config.imagePositionX}%</em></span>
                      <input type="range" min="0" max="100" step="1" value={config.imagePositionX} onChange={(event) => updateConfig('imagePositionX', Number(event.target.value))} />
                    </label>
                    <label className="range-field">
                      <span><b>垂直位置</b><em>{config.imagePositionY}%</em></span>
                      <input type="range" min="0" max="100" step="1" value={config.imagePositionY} onChange={(event) => updateConfig('imagePositionY', Number(event.target.value))} />
                    </label>
                    <button
                      className="scale-reset-button"
                      onClick={() => {
                        updateConfig('imageScale', 100)
                        updateConfig('imagePositionX', 50)
                        updateConfig('imagePositionY', 50)
                      }}
                    >恢复图片居中</button>
                  </div>
                  <TextField label="图片标签" value={config.imageLabel} onChange={(value) => updateConfig('imageLabel', value)} maxLength={22} />
                  <TextField label="标题" value={config.imageTitle} onChange={(value) => updateConfig('imageTitle', value)} maxLength={18} />
                  <TextField label="说明" value={config.imageCaption} onChange={(value) => updateConfig('imageCaption', value)} maxLength={42} />
                </div>
              )}
              {activeEffect === 'kinetic-text' && (
                <div className="form-grid">
                  <TextField label="语境标签" value={config.kineticKicker} onChange={(value) => updateConfig('kineticKicker', value)} maxLength={22} />
                  <TextField label="第一句" value={config.kineticLineOne} onChange={(value) => updateConfig('kineticLineOne', value)} maxLength={12} />
                  <TextField label="第二句" value={config.kineticLineTwo} onChange={(value) => updateConfig('kineticLineTwo', value)} maxLength={12} />
                  <TextField label="第三句" value={config.kineticLineThree} onChange={(value) => updateConfig('kineticLineThree', value)} maxLength={12} />
                </div>
              )}
              {(activeEffect === 'proof-frame' || activeEffect === 'dual-proof') && (
                <div className="form-grid">
                  {imageAsset ? (
                    <div className="media-source-card image-source-card">
                      <span className="media-source-card__icon"><Icon name="image" /></span>
                      <div>
                        <strong title={imageAsset.name}>{imageAsset.name}</strong>
                        <small>{formatFileSize(imageAsset.size)}<i />LOCAL IMAGE</small>
                      </div>
                      <button onClick={removeImage} title="移除图片" aria-label="移除图片"><Icon name="trash" /></button>
                    </div>
                  ) : (
                    <button className="video-drop-button image-upload-button" onClick={() => imageInputRef.current?.click()}>
                      <Icon name="image" />
                      <span><b>上传证据截图</b><small>PNG · JPG · WEBP · GIF</small></span>
                    </button>
                  )}
                  {imageAsset && <button className="replace-media-button" onClick={() => imageInputRef.current?.click()}><Icon name="upload" /> 更换截图</button>}
                  {imageError && <p className="video-error">{imageError}</p>}
                  {activeEffect === 'proof-frame' ? (
                    <>
                      <TextField label="证据标签" value={config.proofKicker} onChange={(value) => updateConfig('proofKicker', value)} maxLength={24} />
                      <TextField label="标题" value={config.proofTitle} onChange={(value) => updateConfig('proofTitle', value)} maxLength={24} />
                      <div className="field-row">
                        <TextField label="核心数据" value={config.proofValue} onChange={(value) => updateConfig('proofValue', value)} maxLength={10} />
                        <TextField label="数据说明" value={config.proofUnit} onChange={(value) => updateConfig('proofUnit', value)} maxLength={12} />
                      </div>
                      <TextField label="脚注" value={config.proofCaption} onChange={(value) => updateConfig('proofCaption', value)} maxLength={24} />
                    </>
                  ) : (
                    <>
                      <TextField label="对比标签" value={config.dualKicker} onChange={(value) => updateConfig('dualKicker', value)} maxLength={24} />
                      <TextField label="标题" value={config.dualTitle} onChange={(value) => updateConfig('dualTitle', value)} maxLength={24} />
                      <div className="field-row">
                        <TextField label="左侧数据" value={config.dualLeftValue} onChange={(value) => updateConfig('dualLeftValue', value)} maxLength={8} />
                        <TextField label="右侧数据" value={config.dualRightValue} onChange={(value) => updateConfig('dualRightValue', value)} maxLength={8} />
                      </div>
                      <TextField label="说明" value={config.dualCaption} onChange={(value) => updateConfig('dualCaption', value)} maxLength={24} />
                    </>
                  )}
                </div>
              )}
              {activeEffect === 'process-chain' && (
                <div className="form-grid">
                  <TextField label="流程标签" value={config.processKicker} onChange={(value) => updateConfig('processKicker', value)} maxLength={24} />
                  <TextField label="标题" value={config.processTitle} onChange={(value) => updateConfig('processTitle', value)} maxLength={24} />
                  <div className="field-row">
                    <TextField label="步骤一" value={config.processStepOne} onChange={(value) => updateConfig('processStepOne', value)} maxLength={8} />
                    <TextField label="步骤二" value={config.processStepTwo} onChange={(value) => updateConfig('processStepTwo', value)} maxLength={8} />
                  </div>
                  <div className="field-row">
                    <TextField label="步骤三" value={config.processStepThree} onChange={(value) => updateConfig('processStepThree', value)} maxLength={8} />
                    <TextField label="步骤四" value={config.processStepFour} onChange={(value) => updateConfig('processStepFour', value)} maxLength={8} />
                  </div>
                  <TextField label="脚注" value={config.processCaption} onChange={(value) => updateConfig('processCaption', value)} maxLength={28} />
                </div>
              )}
              {activeEffect === 'insight-grid' && (
                <div className="form-grid">
                  <TextField label="洞察标签" value={config.insightKicker} onChange={(value) => updateConfig('insightKicker', value)} maxLength={24} />
                  <TextField label="标题" value={config.insightTitle} onChange={(value) => updateConfig('insightTitle', value)} maxLength={24} />
                  <TextField label="要点一" value={config.insightOne} onChange={(value) => updateConfig('insightOne', value)} maxLength={18} />
                  <TextField label="要点二" value={config.insightTwo} onChange={(value) => updateConfig('insightTwo', value)} maxLength={18} />
                  <TextField label="要点三" value={config.insightThree} onChange={(value) => updateConfig('insightThree', value)} maxLength={18} />
                  <TextField label="要点四" value={config.insightFour} onChange={(value) => updateConfig('insightFour', value)} maxLength={18} />
                  <TextField label="脚注" value={config.insightCaption} onChange={(value) => updateConfig('insightCaption', value)} maxLength={22} />
                </div>
              )}
              {activeEffect === 'chapter-callout' && (
                <div className="form-grid">
                  <TextField label="章节标签" value={config.chapterKicker} onChange={(value) => updateConfig('chapterKicker', value)} maxLength={24} />
                  <div className="field-row">
                    <TextField label="序号" value={config.chapterIndex} onChange={(value) => updateConfig('chapterIndex', value)} maxLength={4} />
                    <TextField label="标题" value={config.chapterTitle} onChange={(value) => updateConfig('chapterTitle', value)} maxLength={14} />
                  </div>
                  <TextField label="说明" value={config.chapterDetail} onChange={(value) => updateConfig('chapterDetail', value)} maxLength={30} />
                </div>
              )}
              {activeEffect === 'icon-breath' && (
                <div className="form-grid">
                  <TextField label="章节标签" value={config.chapterKicker} onChange={(value) => updateConfig('chapterKicker', value)} maxLength={24} />
                  <TextField label="标题" value={config.chapterTitle} onChange={(value) => updateConfig('chapterTitle', value)} maxLength={16} />
                  <TextField label="说明" value={config.chapterDetail} onChange={(value) => updateConfig('chapterDetail', value)} maxLength={32} />
                </div>
              )}
              {activeEffect === 'data-bars' && (
                <div className="form-grid">
                  <TextField label="数据标签" value={config.insightKicker} onChange={(value) => updateConfig('insightKicker', value)} maxLength={24} />
                  <TextField label="标题" value={config.insightTitle} onChange={(value) => updateConfig('insightTitle', value)} maxLength={24} />
                  <div className="field-row">
                    <TextField label="数据一标签" value={config.insightOne} onChange={(value) => updateConfig('insightOne', value)} maxLength={10} />
                    <TextField label="数据一数值" value={config.dualLeftValue} onChange={(value) => updateConfig('dualLeftValue', value)} maxLength={8} />
                  </div>
                  <div className="field-row">
                    <TextField label="数据二标签" value={config.insightTwo} onChange={(value) => updateConfig('insightTwo', value)} maxLength={10} />
                    <TextField label="数据二数值" value={config.dualRightValue} onChange={(value) => updateConfig('dualRightValue', value)} maxLength={8} />
                  </div>
                  <div className="field-row">
                    <TextField label="数据三标签" value={config.insightThree} onChange={(value) => updateConfig('insightThree', value)} maxLength={10} />
                    <TextField label="数据三数值" value={config.proofValue} onChange={(value) => updateConfig('proofValue', value)} maxLength={8} />
                  </div>
                  <div className="field-row">
                    <TextField label="数据四标签" value={config.insightFour} onChange={(value) => updateConfig('insightFour', value)} maxLength={10} />
                    <TextField label="数据四数值" value={config.proofUnit} onChange={(value) => updateConfig('proofUnit', value)} maxLength={8} />
                  </div>
                </div>
              )}
              {activeEffect === 'step-rail' && (
                <div className="form-grid">
                  <TextField label="流程标签" value={config.processKicker} onChange={(value) => updateConfig('processKicker', value)} maxLength={24} />
                  <TextField label="标题" value={config.processTitle} onChange={(value) => updateConfig('processTitle', value)} maxLength={24} />
                  <TextField label="步骤一" value={config.processStepOne} onChange={(value) => updateConfig('processStepOne', value)} maxLength={14} />
                  <TextField label="步骤二" value={config.processStepTwo} onChange={(value) => updateConfig('processStepTwo', value)} maxLength={14} />
                  <TextField label="步骤三" value={config.processStepThree} onChange={(value) => updateConfig('processStepThree', value)} maxLength={14} />
                </div>
              )}
              {activeEffect === 'code-window' && (
                <div className="form-grid">
                  {imageAsset ? (
                    <div className="media-source-card image-source-card">
                      <span className="media-source-card__icon"><Icon name="image" /></span>
                      <div>
                        <strong title={imageAsset.name}>{imageAsset.name}</strong>
                        <small>{formatFileSize(imageAsset.size)}<i />LOCAL B-ROLL</small>
                      </div>
                      <button onClick={removeImage} title="移除界面截图" aria-label="移除界面截图"><Icon name="trash" /></button>
                    </div>
                  ) : (
                    <button className="video-drop-button image-upload-button" onClick={() => imageInputRef.current?.click()}>
                      <Icon name="image" />
                      <span><b>上传界面截图</b><small>PNG · JPG · WEBP · GIF</small></span>
                    </button>
                  )}
                  {imageAsset && <button className="replace-media-button" onClick={() => imageInputRef.current?.click()}><Icon name="upload" /> 更换界面截图</button>}
                  {imageError && <p className="video-error">{imageError}</p>}
                  <div className="image-framing-controls">
                    <div className="image-framing-controls__heading">
                      <span>截图显示区域</span>
                      <small>B-ROLL FRAMING</small>
                    </div>
                    <div className="side-setting">
                      <span>填充方式</span>
                      <div>
                        <button className={config.imageFit === 'cover' ? 'is-active' : ''} onClick={() => updateConfig('imageFit', 'cover')}>填满裁切</button>
                        <button className={config.imageFit === 'contain' ? 'is-active' : ''} onClick={() => updateConfig('imageFit', 'contain')}>完整显示</button>
                      </div>
                    </div>
                    <label className="range-field">
                      <span><b>截图缩放</b><em>{config.imageScale}%</em></span>
                      <input type="range" min="50" max="250" step="1" value={config.imageScale} onChange={(event) => updateConfig('imageScale', Number(event.target.value))} />
                    </label>
                    <label className="range-field">
                      <span><b>水平位置</b><em>{config.imagePositionX}%</em></span>
                      <input type="range" min="0" max="100" step="1" value={config.imagePositionX} onChange={(event) => updateConfig('imagePositionX', Number(event.target.value))} />
                    </label>
                    <label className="range-field">
                      <span><b>垂直位置</b><em>{config.imagePositionY}%</em></span>
                      <input type="range" min="0" max="100" step="1" value={config.imagePositionY} onChange={(event) => updateConfig('imagePositionY', Number(event.target.value))} />
                    </label>
                  </div>
                  <TextField label="窗口标签" value={config.proofKicker} onChange={(value) => updateConfig('proofKicker', value)} maxLength={24} />
                  <TextField label="标题" value={config.proofTitle} onChange={(value) => updateConfig('proofTitle', value)} maxLength={24} />
                  <TextField label="步骤一" value={config.processStepOne} onChange={(value) => updateConfig('processStepOne', value)} maxLength={18} />
                  <TextField label="步骤二" value={config.processStepTwo} onChange={(value) => updateConfig('processStepTwo', value)} maxLength={18} />
                  <TextField label="步骤三" value={config.processStepThree} onChange={(value) => updateConfig('processStepThree', value)} maxLength={18} />
                  <TextField label="步骤四" value={config.processStepFour} onChange={(value) => updateConfig('processStepFour', value)} maxLength={18} />
                  <TextField label="说明" value={config.proofCaption} onChange={(value) => updateConfig('proofCaption', value)} maxLength={28} />
                </div>
              )}
              {activeEffect === 'module-grid' && (
                <div className="form-grid">
                  <TextField label="矩阵标签" value={config.insightKicker} onChange={(value) => updateConfig('insightKicker', value)} maxLength={24} />
                  <TextField label="标题" value={config.insightTitle} onChange={(value) => updateConfig('insightTitle', value)} maxLength={24} />
                  <div className="field-row">
                    <TextField label="模块一" value={config.insightOne} onChange={(value) => updateConfig('insightOne', value)} maxLength={8} />
                    <TextField label="模块二" value={config.insightTwo} onChange={(value) => updateConfig('insightTwo', value)} maxLength={8} />
                  </div>
                  <div className="field-row">
                    <TextField label="模块三" value={config.insightThree} onChange={(value) => updateConfig('insightThree', value)} maxLength={8} />
                    <TextField label="模块四" value={config.insightFour} onChange={(value) => updateConfig('insightFour', value)} maxLength={8} />
                  </div>
                  <div className="field-row">
                    <TextField label="模块五" value={config.processStepOne} onChange={(value) => updateConfig('processStepOne', value)} maxLength={8} />
                    <TextField label="模块六" value={config.processStepTwo} onChange={(value) => updateConfig('processStepTwo', value)} maxLength={8} />
                  </div>
                  <div className="field-row">
                    <TextField label="模块七" value={config.processStepThree} onChange={(value) => updateConfig('processStepThree', value)} maxLength={8} />
                    <TextField label="模块八" value={config.processStepFour} onChange={(value) => updateConfig('processStepFour', value)} maxLength={8} />
                  </div>
                  <TextField label="收束标题" value={config.chapterDetail} onChange={(value) => updateConfig('chapterDetail', value)} maxLength={24} />
                  <div className="module-icon-editor">
                    <div className="module-icon-editor__heading">
                      <span>8 个图标位</span>
                      <small>图标 · 形状 · 颜色均可独立选择</small>
                    </div>
                    {config.moduleIcons.map((item, index) => (
                      <div className="module-icon-editor__row" key={`module-icon-${index}`}>
                        <strong>{String(index + 1).padStart(2, '0')}</strong>
                        <label>
                          <span>图标</span>
                          <select
                            aria-label={`模块${moduleNumberLabels[index]}图标`}
                            value={item.icon}
                            onChange={(event) => updateModuleIcon(index, { icon: event.target.value as ModuleIconName })}
                          >
                            {moduleIconOptions.map((option) => (
                              <option value={option.value} key={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span>外形</span>
                          <select
                            aria-label={`模块${moduleNumberLabels[index]}外形`}
                            value={item.shape}
                            onChange={(event) => updateModuleIcon(index, { shape: event.target.value as ModuleIconShape })}
                          >
                            {moduleShapeOptions.map((option) => (
                              <option value={option.value} key={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="module-icon-color" title={`选择模块${moduleNumberLabels[index]}图标颜色`}>
                          <span>颜色</span>
                          <i style={{ '--module-editor-color': item.color } as React.CSSProperties} />
                          <input
                            type="color"
                            aria-label={`模块${moduleNumberLabels[index]}颜色`}
                            value={item.color}
                            onChange={(event) => updateModuleIcon(index, { color: event.target.value })}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="inspector-section">
              <header><span>02</span><h3>视觉</h3><b>−</b></header>
              <div className="form-grid">
                <div className="color-setting">
                  <span>强调色</span>
                  <div className="color-options">
                    {accentOptions.map((option) => (
                      <button
                        key={option.value}
                        className={config.accent === option.value ? 'is-active' : ''}
                        style={{ '--swatch': option.value } as React.CSSProperties}
                        title={option.label}
                        aria-label={option.label}
                        onClick={() => updateConfig('accent', option.value)}
                      />
                    ))}
                  </div>
                </div>
                <div className="edge-color-setting">
                  <span>边缘光颜色</span>
                  <label title="选择卡片边缘光颜色">
                    <i style={{ '--edge-swatch': config.edgeColor } as React.CSSProperties} />
                    <em>{config.edgeColor.toUpperCase()}</em>
                    <input
                      type="color"
                      value={config.edgeColor}
                      onChange={(event) => updateConfig('edgeColor', event.target.value)}
                      aria-label="边缘光颜色"
                    />
                  </label>
                </div>
                <label className="range-field">
                  <span>
                    <b>卡片大小</b>
                    <em>{Math.round(config.cardScale * 100)}%</em>
                  </span>
                  <input
                    type="range"
                    min="45"
                    max="220"
                    step="1"
                    value={Math.round(config.cardScale * 100)}
                    onChange={(event) => updateConfig('cardScale', Number(event.target.value) / 100)}
                  />
                </label>
                <label className="range-field">
                  <span><b>边缘外光透明度</b><em>{Math.round(config.edgeGlow * 100)}%</em></span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={Math.round(config.edgeGlow * 100)}
                    onChange={(event) => updateConfig('edgeGlow', Number(event.target.value) / 100)}
                  />
                </label>
                <p className="direct-manipulation-note">人物安全区只作为构图参考，不限制拖动或缩放；卡片始终可在整张画布内自由移动，并可放大到 220%。</p>
                <TextStyleEditor
                  effectId={activeEffect}
                  config={config}
                  onChange={(id, appearance) => updateConfig('textStyles', {
                    ...config.textStyles,
                    [id]: appearance,
                  })}
                  onReset={(id) => updateConfig('textStyles', {
                    ...config.textStyles,
                    [id]: { ...TEXT_STYLE_DEFAULTS[id] },
                  })}
                />
                {activeEffect === 'signal-card' && (
                  <div className="side-setting">
                    <span>卡片位置</span>
                    <div>
                      <button className={config.signalSide === 'left' ? 'is-active' : ''} onClick={() => updateConfig('signalSide', 'left')}>左侧</button>
                      <button className={config.signalSide === 'right' ? 'is-active' : ''} onClick={() => updateConfig('signalSide', 'right')}>右侧</button>
                    </div>
                  </div>
                )}
                {activeEffect === 'picture-in-picture' && (
                  <div className="side-setting">
                    <span>初始位置</span>
                    <div>
                      <button className={config.pipSide === 'left' ? 'is-active' : ''} onClick={() => updateConfig('pipSide', 'left')}>左侧</button>
                      <button className={config.pipSide === 'right' ? 'is-active' : ''} onClick={() => updateConfig('pipSide', 'right')}>右侧</button>
                    </div>
                  </div>
                )}
                {activeEffect === 'image-feature' && (
                  <>
                    <div className="side-setting">
                      <span>卡片初始位置</span>
                      <div>
                        <button className={config.imageSide === 'left' ? 'is-active' : ''} onClick={() => updateConfig('imageSide', 'left')}>左侧</button>
                        <button className={config.imageSide === 'right' ? 'is-active' : ''} onClick={() => updateConfig('imageSide', 'right')}>右侧</button>
                      </div>
                    </div>
                    <p className="local-media-note">图片显示区域在“内容”中调整；整张卡片可以直接在画布上拖动。</p>
                  </>
                )}
                {activeEffect === 'kinetic-text' && (
                  <div className="side-setting">
                    <span>初始位置</span>
                    <div>
                      <button className={config.kineticSide === 'left' ? 'is-active' : ''} onClick={() => updateConfig('kineticSide', 'left')}>左侧</button>
                      <button className={config.kineticSide === 'right' ? 'is-active' : ''} onClick={() => updateConfig('kineticSide', 'right')}>右侧</button>
                    </div>
                  </div>
                )}
                {(['icon-breath', 'data-bars', 'step-rail', 'code-window', 'module-grid'] as EffectId[]).includes(activeEffect) && (
                  <div className="side-setting">
                    <span>初始位置</span>
                    <div>
                      <button className={config.kineticSide === 'left' ? 'is-active' : ''} onClick={() => updateConfig('kineticSide', 'left')}>左侧</button>
                      <button className={config.kineticSide === 'right' ? 'is-active' : ''} onClick={() => updateConfig('kineticSide', 'right')}>右侧</button>
                    </div>
                  </div>
                )}
                <div className="position-setting">
                  <span>{activeEffect === 'compare-split' ? '三区独立位置' : '画布位置'}</span>
                  <button onClick={resetActivePosition}>
                    {activeEffect === 'compare-split'
                      ? '左卡 · 右卡 · 主题'
                      : `X ${Math.round(currentEffectPosition.x)} · Y ${Math.round(currentEffectPosition.y)}`}
                    <b>重置</b>
                  </button>
                </div>
                <button className="safe-fit-button" onClick={fitCardsToSubjectSafeArea}>
                  一键避让人物
                  <span>执行后仍可自由调整</span>
                </button>
                <Toggle label="人物安全区参考线" value={config.showSafeArea} onChange={(value) => updateConfig('showSafeArea', value)} />
                <Toggle label="构图网格" value={config.showGrid} onChange={(value) => updateConfig('showGrid', value)} />
              </div>
            </section>

            <section className="inspector-section">
              <header><span>03</span><h3>动效</h3><b>−</b></header>
              <div className="form-grid">
                <label className="range-field">
                  <span>
                    <b>{(['icon-breath', 'data-bars', 'step-rail', 'code-window', 'module-grid'] as EffectId[]).includes(activeEffect) ? '循环节奏' : '入场时长'}</b>
                    <em>{config.duration.toFixed(1)}s</em>
                  </span>
                  <input
                    type="range"
                    min="0.6"
                    max="2.8"
                    step="0.1"
                    value={config.duration}
                    onChange={(event) => updateConfig('duration', Number(event.target.value))}
                    onMouseUp={replayAnimation}
                    onTouchEnd={replayAnimation}
                  />
                </label>
                {activeEffect === 'signal-card' && (
                  <label className="range-field">
                    <span><b>逐句间隔</b><em>{config.signalStagger.toFixed(2)}s</em></span>
                    <input
                      type="range"
                      min="0.12"
                      max="0.6"
                      step="0.02"
                      value={config.signalStagger}
                      onChange={(event) => updateConfig('signalStagger', Number(event.target.value))}
                      onMouseUp={replayAnimation}
                      onTouchEnd={replayAnimation}
                    />
                  </label>
                )}
                {activeEffect === 'kinetic-text' && (
                  <label className="range-field">
                    <span><b>逐句间隔</b><em>{config.kineticStagger.toFixed(2)}s</em></span>
                    <input
                      type="range"
                      min="0.12"
                      max="0.6"
                      step="0.02"
                      value={config.kineticStagger}
                      onChange={(event) => updateConfig('kineticStagger', Number(event.target.value))}
                      onMouseUp={replayAnimation}
                      onTouchEnd={replayAnimation}
                    />
                  </label>
                )}
                <div className="motion-curve">
                  <span>缓动曲线</span>
                  <button>CINEMATIC EASE <Icon name="chevron" /></button>
                </div>
                <button className="replay-button" onClick={replayAnimation}><Icon name="reset" /> REPLAY ANIMATION</button>
              </div>
            </section>

            <section className="inspector-section export-inspector">
              <header><span>04</span><h3>透明动效导出</h3><b>−</b></header>
              <div className="form-grid">
                <div className="export-specs">
                  <span><b>画布</b><em>{EXPORT_WIDTH} × {EXPORT_HEIGHT}</em></span>
                  <span><b>帧率</b><em>{PROJECT_FPS} FPS</em></span>
                  <span><b>项目时长</b><em>{displayDuration.toFixed(2)}s</em></span>
                  <span><b>透明编码</b><em>PRORES 4444</em></span>
                </div>
                <p className={`export-service-status is-${exportServiceState}`} aria-live="polite">
                  {exportServiceMessage}
                </p>
                <p className="export-note">MOV 与 PNG 都只包含当前 overlay 轨道中的动效卡片；原视频、字幕、画布辅助线和界面不会进入导出文件。</p>
                <button className="export-action-button export-mov-button" onClick={() => { void exportTransparentOverlay('mov') }} disabled={isExporting || overlayJSON.length === 0}>
                  <Icon name="download" />
                  {isExporting && exportFormat === 'mov' ? `正在导出 MOV ${Math.round(exportProgress * 100)}%` : '导出透明 MOV'}
                </button>
                <button className="export-action-button export-png-button" onClick={() => { void exportTransparentOverlay('png') }} disabled={isExporting || overlayJSON.length === 0}>
                  <Icon name="download" />
                  {isExporting && exportFormat === 'png' ? `正在导出 PNG ${Math.round(exportProgress * 100)}%` : '导出透明 PNG 序列'}
                </button>
                <button className="json-export-button" onClick={exportProjectJson} disabled={isExporting}>
                  <Icon name="download" /> 导出项目 JSON
                </button>
                <button className="json-import-action-button" onClick={() => jsonInputRef.current?.click()} disabled={isExporting}>
                  <Icon name="upload" /> 导入项目 / Overlay JSON
                </button>
                {jsonImportStatus && (
                  <p className={`json-import-status ${jsonImportStatus.startsWith('导入失败') ? 'is-error' : ''}`} aria-live="polite">
                    {jsonImportStatus}
                  </p>
                )}
                {isExporting && (
                  <button className="cancel-export-button" onClick={() => { cancelExportRef.current = true }}>
                    取消导出
                  </button>
                )}
                {(isExporting || exportStatus) && (
                  <div className="export-progress" aria-live="polite">
                    <div><i style={{ width: `${exportProgress * 100}%` }} /></div>
                    <p>{exportStatus}</p>
                  </div>
                )}
              </div>
            </section>

            <div className="inspector-footnote">
              <span>SAFE COMPOSITION</span>
              <p>卡片默认从画面两翼开始；人物安全区仅供参考，位置和大小始终由你自由决定。</p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
