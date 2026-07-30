import {
  deriveOverlaySide,
  OVERLAY_EFFECT_IDS,
  readExplicitOverlayPosition,
  readOverlayEffectId,
  readOverlayLine,
} from '../src/overlayImport.ts'

function assertEqual(actual: unknown, expected: unknown) {
  if (actual !== expected) throw new Error(`Expected ${String(expected)}, received ${String(actual)}`)
}

assertEqual(readOverlayLine({ line1: '标准第一句' }, 1), '标准第一句')
assertEqual(readOverlayLine({ line2: '标准第二句' }, 2), '标准第二句')
assertEqual(readOverlayLine({ line3: '' }, 3), '')
assertEqual(readOverlayLine({ lineOne: '旧版第一句' }, 1), '旧版第一句')
assertEqual(readOverlayLine({ lineTwo: '旧版第二句' }, 2), '旧版第二句')
assertEqual(readOverlayLine({ lineThree: '旧版第三句' }, 3), '旧版第三句')
assertEqual(readOverlayLine({ line1: '标准优先', lineOne: '旧版备用' }, 1), '标准优先')

for (const effectId of OVERLAY_EFFECT_IDS) {
  assertEqual(readOverlayEffectId(effectId), effectId)
  assertEqual(readOverlayEffectId(effectId.toUpperCase()), effectId)
}
assertEqual(OVERLAY_EFFECT_IDS.length, 17)
const displayAliases = [
  ['核心数字动效', 'metric-focus'],
  ['左右对比卡', 'compare-split'],
  ['金句定格卡', 'quote-lockup'],
  ['动态信息卡', 'signal-card'],
  ['画中画动效', 'picture-in-picture'],
  ['图片卡片动效', 'image-feature'],
  ['文字卡片动效', 'kinetic-text'],
  ['单图证据卡', 'proof-frame'],
  ['双图数据卡', 'dual-proof'],
  ['四步流程链', 'process-chain'],
  ['四点洞察卡', 'insight-grid'],
  ['章节重点卡', 'chapter-callout'],
  ['循环·图标聚焦', 'icon-breath'],
  ['循环·数据条', 'data-bars'],
  ['循环·三级步骤轨', 'step-rail'],
  ['循环·代码窗口', 'code-window'],
  ['循环·模块矩阵', 'module-grid'],
] as const
for (const [displayName, effectId] of displayAliases) {
  assertEqual(readOverlayEffectId(displayName), effectId)
}
assertEqual(readOverlayEffectId('模块矩阵循环'), 'module-grid')
assertEqual(readOverlayEffectId('custom-card'), undefined)
assertEqual(readExplicitOverlayPosition({ x: 68.5, y: 19 }), undefined)
assertEqual((readExplicitOverlayPosition({ position: { x: 3, y: -4 } }) as { x: number }).x, 3)
assertEqual(deriveOverlaySide({ x: 68.5 }), 'right')
assertEqual(deriveOverlaySide({ x: 4.6 }), 'left')
assertEqual(deriveOverlaySide({ x: '68.2' }), 'right')
assertEqual(deriveOverlaySide({}), undefined)

console.log('Overlay import checks passed: all 17 canonical kinds, display aliases, legacy lines, positions, and side presets.')
