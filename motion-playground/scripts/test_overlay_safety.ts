import { OVERLAY_EFFECT_IDS } from '../src/overlayImport.ts'
import {
  constrainMotionConfig,
  constrainOverlayClip,
  constrainOverlayPosition,
  defaultOverlayPosition,
  overlayHorizontalSide,
  SUBJECT_SAFE_GAP,
  SUBJECT_SAFE_LEFT,
  SUBJECT_SAFE_MAX_SCALE,
  SUBJECT_SAFE_RIGHT,
} from '../src/overlaySafety.ts'
import type {
  ComparePartPositions,
  EffectId,
  MotionConfig,
  OverlayClip,
} from '../src/types.ts'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const comparePositions: ComparePartPositions = {
  left: { x: 0, y: 0 },
  right: { x: 0, y: 0 },
  title: { x: 0, y: 0 },
  axis: { x: 0, y: 0 },
}

function config(overrides: Partial<MotionConfig> = {}) {
  return {
    cardScale: 1,
    showSafeArea: true,
    signalSide: 'left',
    pipSide: 'right',
    imageSide: 'left',
    kineticSide: 'left',
    comparePositions,
    ...overrides,
  } as MotionConfig
}

const expectedSides: Record<EffectId, 'left' | 'right' | 'split'> = {
  'metric-focus': 'left',
  'compare-split': 'split',
  'quote-lockup': 'left',
  'signal-card': 'left',
  'picture-in-picture': 'right',
  'image-feature': 'left',
  'kinetic-text': 'left',
  'proof-frame': 'left',
  'dual-proof': 'left',
  'process-chain': 'left',
  'insight-grid': 'left',
  'chapter-callout': 'left',
  'icon-breath': 'left',
  'data-bars': 'left',
  'step-rail': 'left',
  'code-window': 'left',
  'module-grid': 'left',
}

assert(SUBJECT_SAFE_LEFT === 31.8, 'safe-area left boundary drifted')
assert(SUBJECT_SAFE_RIGHT === 68.2, 'safe-area right boundary drifted')
assert(SUBJECT_SAFE_GAP >= 0.8, 'safe-area glow gap is too small')
assert(SUBJECT_SAFE_MAX_SCALE === 1, 'one-click safe fitting must reduce oversized cards')
assert(OVERLAY_EFFECT_IDS.length === Object.keys(expectedSides).length, 'safety catalog is incomplete')

for (const effectId of OVERLAY_EFFECT_IDS) {
  const currentConfig = config()
  const side = overlayHorizontalSide(effectId, currentConfig)
  assert(side === expectedSides[effectId], `${effectId} has the wrong default side`)

  const initial = defaultOverlayPosition(effectId, currentConfig)
  if (side === 'left') assert(initial.x <= -SUBJECT_SAFE_GAP, `${effectId} lacks a left glow gap`)
  if (side === 'right') assert(initial.x >= SUBJECT_SAFE_GAP, `${effectId} lacks a right glow gap`)
  if (side === 'split') assert(initial.x === 0, `${effectId} must keep the split root centered`)

  const hostilePosition = constrainOverlayPosition(effectId, currentConfig, { x: 50, y: 12 })
  if (side === 'left') assert(hostilePosition.x <= -SUBJECT_SAFE_GAP, `${effectId} can enter from the left`)
  if (side === 'right') assert(hostilePosition.x >= SUBJECT_SAFE_GAP, `${effectId} can enter from the right`)
  if (side === 'split') assert(hostilePosition.x === 0, `${effectId} split root can drift`)

  const enlarged = constrainMotionConfig(effectId, config({ cardScale: 2.2 }))
  assert(enlarged.cardScale === SUBJECT_SAFE_MAX_SCALE, `${effectId} can enlarge into the subject`)
}

for (const [effectId, sideKey] of [
  ['signal-card', 'signalSide'],
  ['picture-in-picture', 'pipSide'],
  ['image-feature', 'imageSide'],
  ['kinetic-text', 'kineticSide'],
  ['icon-breath', 'kineticSide'],
  ['data-bars', 'kineticSide'],
  ['step-rail', 'kineticSide'],
  ['code-window', 'kineticSide'],
  ['module-grid', 'kineticSide'],
] as const) {
  const rightConfig = config({ [sideKey]: 'right' } as Partial<MotionConfig>)
  assert(overlayHorizontalSide(effectId, rightConfig) === 'right', `${effectId} cannot switch right safely`)
  assert(
    constrainOverlayPosition(effectId, rightConfig, { x: -50, y: 0 }).x >= SUBJECT_SAFE_GAP,
    `${effectId} can cross the subject after switching right`,
  )
}

const compareConfig = constrainMotionConfig('compare-split', config({
  cardScale: 2.2,
  comparePositions: {
    left: { x: 50, y: 2 },
    right: { x: -50, y: 3 },
    title: { x: 50, y: 4 },
    axis: { x: 50, y: 5 },
  },
}))
assert(compareConfig.cardScale === 1, 'compare card scale was not protected')
assert(compareConfig.comparePositions.left.x <= -SUBJECT_SAFE_GAP, 'compare left card can enter subject')
assert(compareConfig.comparePositions.right.x >= SUBJECT_SAFE_GAP, 'compare right card can enter subject')
assert(compareConfig.comparePositions.title.x <= 0, 'compare title can enter subject')
assert(compareConfig.comparePositions.axis.x === 0, 'removed compare axis must not drift')

const unsafeClip = {
  id: 'unsafe',
  effectId: 'insight-grid',
  name: '四点洞察卡',
  startTime: 0,
  duration: 3,
  config: config({ cardScale: 2.2 }),
  position: { x: 50, y: 7 },
} satisfies OverlayClip
const protectedClip = constrainOverlayClip(unsafeClip)
assert(protectedClip.config.cardScale === 1, 'clip scale protection failed')
assert(protectedClip.position.x <= -SUBJECT_SAFE_GAP, 'clip position protection failed')

const unlockedConfig = config({ showSafeArea: false, cardScale: 2.2 })
assert(constrainMotionConfig('signal-card', unlockedConfig).cardScale === 2.2, 'manual unlock lost resize freedom')
assert(
  constrainOverlayPosition('signal-card', unlockedConfig, { x: 50, y: 0 }).x === 50,
  'manual unlock lost horizontal freedom',
)

console.log('Optional one-click subject-safe fitting checks passed for all 17 effects.')
