import type {
  ComparePartPositions,
  EffectId,
  EffectPosition,
  MotionConfig,
  OverlayClip,
} from './types'

export const SUBJECT_SAFE_LEFT = 31.8
export const SUBJECT_SAFE_RIGHT = 68.2
export const SUBJECT_SAFE_GAP = 1
export const SUBJECT_SAFE_MAX_SCALE = 1

type HorizontalSide = 'left' | 'right' | 'split'

const OUTER_MARGIN_BY_EFFECT: Record<EffectId, number> = {
  'metric-focus': 7.3,
  'compare-split': 4.5,
  'quote-lockup': 5.8,
  'signal-card': 4.6,
  'picture-in-picture': 4.6,
  'image-feature': 4.6,
  'kinetic-text': 4.5,
  'proof-frame': 4.2,
  'dual-proof': 4,
  'process-chain': 3.8,
  'insight-grid': 4,
  'chapter-callout': 4.2,
  'icon-breath': 4,
  'data-bars': 3,
  'step-rail': 4,
  'code-window': 1.5,
  'module-grid': 3,
}

function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value))
}

export function overlayHorizontalSide(effectId: EffectId, config: MotionConfig): HorizontalSide {
  if (effectId === 'compare-split') return 'split'
  if (effectId === 'signal-card') return config.signalSide
  if (effectId === 'picture-in-picture') return config.pipSide
  if (effectId === 'image-feature') return config.imageSide
  if (
    effectId === 'kinetic-text'
    || effectId === 'icon-breath'
    || effectId === 'data-bars'
    || effectId === 'step-rail'
    || effectId === 'code-window'
    || effectId === 'module-grid'
  ) {
    return config.kineticSide
  }
  return 'left'
}

function safeOutwardLimit(effectId: EffectId) {
  return Math.max(SUBJECT_SAFE_GAP, OUTER_MARGIN_BY_EFFECT[effectId] - SUBJECT_SAFE_GAP)
}

export function defaultOverlayPosition(effectId: EffectId, config: MotionConfig): EffectPosition {
  if (!config.showSafeArea) return { x: 0, y: 0 }
  const side = overlayHorizontalSide(effectId, config)
  return {
    x: side === 'left' ? -SUBJECT_SAFE_GAP : side === 'right' ? SUBJECT_SAFE_GAP : 0,
    y: 0,
  }
}

export function constrainOverlayPosition(
  effectId: EffectId,
  config: MotionConfig,
  position: EffectPosition,
): EffectPosition {
  const normalized = {
    x: finite(position.x),
    y: finite(position.y),
  }
  if (!config.showSafeArea) return normalized

  const side = overlayHorizontalSide(effectId, config)
  const outwardLimit = safeOutwardLimit(effectId)
  if (side === 'left') {
    return {
      x: clamp(normalized.x, -outwardLimit, -SUBJECT_SAFE_GAP),
      y: normalized.y,
    }
  }
  if (side === 'right') {
    return {
      x: clamp(normalized.x, SUBJECT_SAFE_GAP, outwardLimit),
      y: normalized.y,
    }
  }
  return { x: 0, y: normalized.y }
}

function constrainComparePositions(positions: ComparePartPositions): ComparePartPositions {
  const outwardLimit = safeOutwardLimit('compare-split')
  return {
    left: {
      x: clamp(finite(positions.left.x), -outwardLimit, -SUBJECT_SAFE_GAP),
      y: finite(positions.left.y),
    },
    right: {
      x: clamp(finite(positions.right.x), SUBJECT_SAFE_GAP, outwardLimit),
      y: finite(positions.right.y),
    },
    title: {
      x: clamp(finite(positions.title.x), -(outwardLimit - SUBJECT_SAFE_GAP), 0),
      y: finite(positions.title.y),
    },
    axis: {
      x: 0,
      y: finite(positions.axis.y),
    },
  }
}

export function constrainMotionConfig(effectId: EffectId, config: MotionConfig): MotionConfig {
  const maximumScale = config.showSafeArea ? SUBJECT_SAFE_MAX_SCALE : 2.2
  const cardScale = clamp(finite(config.cardScale, 1), 0.45, maximumScale)
  if (effectId !== 'compare-split' || !config.showSafeArea) {
    return cardScale === config.cardScale ? config : { ...config, cardScale }
  }

  return {
    ...config,
    cardScale,
    comparePositions: constrainComparePositions(config.comparePositions),
  }
}

export function constrainOverlayClip(clip: OverlayClip): OverlayClip {
  const config = constrainMotionConfig(clip.effectId, clip.config)
  const position = constrainOverlayPosition(clip.effectId, config, clip.position)
  if (config === clip.config && position.x === clip.position.x && position.y === clip.position.y) {
    return clip
  }
  return { ...clip, config, position }
}
