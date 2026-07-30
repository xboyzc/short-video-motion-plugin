import { useLayoutEffect, useRef } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import { EffectRenderer } from './effects'
import type { EffectMedia } from './effects'
import type { ComparePartId, EffectId, EffectPosition, MotionConfig } from './types'

interface OverlayLayerProps {
  effectId: EffectId
  config: MotionConfig
  position: EffectPosition
  media: EffectMedia
  animationKey?: number
  controlledTime?: number
  playing?: boolean
  clipId?: string
  dragging?: boolean
  selected?: boolean
  editable?: boolean
  onPointerDown?: (
    event: PointerEvent<HTMLDivElement>,
    effectId: EffectId,
    position: EffectPosition,
    clipId?: string,
    part?: ComparePartId,
    mode?: 'move' | 'resize',
    cardScale?: number,
  ) => void
  onPointerMove?: (event: PointerEvent<HTMLDivElement>) => void
  onPointerUp?: (event: PointerEvent<HTMLDivElement>) => void
  onDoubleClick?: () => void
}

export function OverlayLayer({
  effectId,
  config,
  position,
  media,
  animationKey = 0,
  controlledTime,
  playing = true,
  clipId,
  dragging = false,
  selected = false,
  editable = true,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDoubleClick,
}: OverlayLayerProps) {
  const layerRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    if (controlledTime === undefined) return
    const animations = layerRef.current?.getAnimations({ subtree: true }) ?? []
    animations.forEach((animation) => {
      animation.pause()
      animation.currentTime = Math.max(0, controlledTime * 1000)
    })
  }, [animationKey, controlledTime, effectId])

  return (
    <div
      ref={layerRef}
      className={`draggable-effect-layer ${controlledTime !== undefined || !playing ? 'is-paused' : ''} ${dragging ? 'is-dragging' : ''} ${selected ? 'is-selected' : ''}`}
      style={{ '--drag-x': `${position.x}%`, '--drag-y': `${position.y}%` } as CSSProperties}
      data-overlay-clip={clipId}
      onPointerDown={(event) => {
        const target = event.target as HTMLElement
        const resizeHandle = target.closest<HTMLElement>('[data-resize-handle]')
        const dragTarget = resizeHandle?.closest<HTMLElement>('[data-drag-target]')
          ?? target.closest<HTMLElement>('[data-drag-target]')
        const part = dragTarget?.dataset.dragPart as ComparePartId | undefined
        const partPosition = part ? config.comparePositions?.[part] ?? { x: 0, y: 0 } : position
        onPointerDown?.(
          event,
          effectId,
          partPosition,
          clipId,
          part,
          resizeHandle ? 'resize' : 'move',
          config.cardScale,
        )
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      title={effectId === 'compare-split' ? undefined : '拖动卡片调整位置；拖动右下角调整大小；双击恢复默认位置'}
    >
      <EffectRenderer id={effectId} config={config} media={media} editable={editable} />
    </div>
  )
}
