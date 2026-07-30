import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { getTextAppearance, textAppearanceStyle } from './textStyles'
import type { EffectId, ModuleIconName, MotionConfig, TextStyleId } from './types'

interface EffectProps {
  config: MotionConfig
}

export interface EffectMedia {
  videoUrl?: string
  videoTime?: number
  videoPlaying?: boolean
  imageUrl?: string
}

function rgbaFromHex(hex: string, opacity: number) {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  const red = match ? Number.parseInt(match[1], 16) : 88
  const green = match ? Number.parseInt(match[2], 16) : 184
  const blue = match ? Number.parseInt(match[3], 16) : 255
  const alpha = Math.max(0, Math.min(1, opacity))
  return `rgba(${red}, ${green}, ${blue}, ${alpha.toFixed(3)})`
}

function visualTextLength(value: string) {
  return Array.from(value.trim()).reduce((length, character) => {
    if (/\s/.test(character)) return length
    return length + (/[A-Za-z0-9]/.test(character) ? 0.58 : 1)
  }, 0)
}

interface TextDensityThresholds {
  compactMax: number
  balancedMax: number
}

const TEXT_DENSITY_THRESHOLDS = {
  metric: { compactMax: 12, balancedMax: 24 },
  compare: { compactMax: 6, balancedMax: 10 },
  quote: { compactMax: 18, balancedMax: 36 },
  signal: { compactMax: 8, balancedMax: 16 },
  media: { compactMax: 12, balancedMax: 24 },
  kinetic: { compactMax: 8, balancedMax: 16 },
  proof: { compactMax: 12, balancedMax: 24 },
  dual: { compactMax: 8, balancedMax: 16 },
  process: { compactMax: 6, balancedMax: 12 },
  insight: { compactMax: 5, balancedMax: 10 },
  chapter: { compactMax: 10, balancedMax: 20 },
  data: { compactMax: 10, balancedMax: 20 },
  step: { compactMax: 7, balancedMax: 14 },
  code: { compactMax: 8, balancedMax: 16 },
  module: { compactMax: 6, balancedMax: 12 },
} satisfies Record<string, TextDensityThresholds>

function textDensityClass(
  values: string[],
  thresholds: TextDensityThresholds,
) {
  const lengths = values.filter(Boolean).map(visualTextLength)
  const longest = Math.max(0, ...lengths)
  if (longest <= thresholds.compactMax) {
    return 'is-text-compact'
  }
  if (longest <= thresholds.balancedMax) {
    return 'is-text-balanced'
  }
  return 'is-text-dense'
}

function autoTextAppearanceStyle(config: MotionConfig, id: TextStyleId) {
  return textAppearanceStyle(config, id, { minScale: 0.9, maxScale: 1.12 })
}

function automaticGroupStyle(config: MotionConfig, ids: TextStyleId[]) {
  const scales = ids
    .map((id) => getTextAppearance(config, id).size / 100)
    .sort((left, right) => left - right)
  const middle = Math.floor(scales.length / 2)
  const median = scales.length % 2 === 0
    ? (scales[middle - 1] + scales[middle]) / 2
    : scales[middle]
  return {
    '--auto-text-scale': Math.max(0.9, Math.min(1.12, median || 1)),
  } as CSSProperties
}

export function MetricFocus({ config }: EffectProps) {
  const formatted = new Intl.NumberFormat('zh-CN').format(config.metricValue)
  const density = textDensityClass([
    config.metricLabel,
    config.metricDetail,
    formatted,
  ], TEXT_DENSITY_THRESHOLDS.metric)

  return (
    <div className={`effect metric-focus ${density}`} aria-label="核心数字动效预览">
      <section className="metric-block" data-drag-target>
        <span className="effect-glow-frame" aria-hidden="true" />
        <div className="effect-kicker">
          <span style={autoTextAppearanceStyle(config, 'metricLabel')}>{config.metricLabel}</span>
        </div>
        <div className="metric-number-row">
          <strong style={autoTextAppearanceStyle(config, 'metricValue')}>{formatted}</strong>
          <em style={autoTextAppearanceStyle(config, 'metricSuffix')}>{config.metricSuffix}</em>
        </div>
        <p style={autoTextAppearanceStyle(config, 'metricDetail')}>{config.metricDetail}</p>
        <span className="effect-resize-handle" data-resize-handle title="拖动调整卡片大小" aria-label="拖动调整卡片大小" />
      </section>
    </div>
  )
}

export function CompareSplit({ config }: EffectProps) {
  const positions = config.comparePositions ?? {
    left: { x: 0, y: 0 },
    right: { x: 0, y: 0 },
    title: { x: 0, y: 0 },
    axis: { x: 0, y: 0 },
  }
  const positionStyle = {
    '--compare-left-x': `${positions.left.x}%`,
    '--compare-left-y': `${positions.left.y}%`,
    '--compare-right-x': `${positions.right.x}%`,
    '--compare-right-y': `${positions.right.y}%`,
    '--compare-title-x': `${positions.title.x}%`,
    '--compare-title-y': `${positions.title.y}%`,
    ...automaticGroupStyle(config, [
      'compareLeftLabel',
      'compareLeftValue',
      'compareRightLabel',
      'compareRightValue',
    ]),
  } as CSSProperties
  const density = textDensityClass([
    config.compareLeftLabel,
    config.compareLeftValue,
    config.compareRightLabel,
    config.compareRightValue,
  ], TEXT_DENSITY_THRESHOLDS.compare)

  return (
    <div className={`effect compare-split ${density}`} style={positionStyle} aria-label="左右对比卡动效预览">
      <header className="compare-heading" data-drag-target data-drag-part="title" title="拖动调整主题位置">
        <h2 style={autoTextAppearanceStyle(config, 'compareTitle')}>{config.compareTitle}</h2>
      </header>
      <div className="compare-card compare-card--left" data-drag-target data-drag-part="left" title="拖动调整左侧卡片位置">
        <span className="effect-glow-frame" aria-hidden="true" />
        <span className="compare-card__index">A / 01</span>
        <div>
          <small style={textAppearanceStyle(config, 'compareLeftLabel', { includeScale: false })}>{config.compareLeftLabel}</small>
          <strong style={textAppearanceStyle(config, 'compareLeftValue', { includeScale: false })}>{config.compareLeftValue}</strong>
        </div>
        <i className="compare-card__line" />
        <span className="effect-resize-handle" data-resize-handle title="拖动调整对比卡大小" aria-label="拖动调整对比卡大小" />
      </div>
      <div className="compare-card compare-card--right" data-drag-target data-drag-part="right" title="拖动调整右侧卡片位置">
        <span className="effect-glow-frame" aria-hidden="true" />
        <span className="compare-card__index">B / 02</span>
        <div>
          <small style={textAppearanceStyle(config, 'compareRightLabel', { includeScale: false })}>{config.compareRightLabel}</small>
          <strong style={textAppearanceStyle(config, 'compareRightValue', { includeScale: false })}>{config.compareRightValue}</strong>
        </div>
        <i className="compare-card__line" />
        <span className="effect-resize-handle" data-resize-handle title="拖动调整对比卡大小" aria-label="拖动调整对比卡大小" />
      </div>
    </div>
  )
}

export function QuoteLockup({ config }: EffectProps) {
  const density = textDensityClass([
    config.quote,
    config.quoteSource,
  ], TEXT_DENSITY_THRESHOLDS.quote)

  return (
    <div className={`effect quote-lockup ${density}`} aria-label="金句定格卡动效预览">
      <div className="quote-marker" aria-hidden="true">“</div>
      <section className="quote-panel" data-drag-target>
        <span className="effect-glow-frame" aria-hidden="true" />
        <div className="effect-kicker">
          <i />
          <span style={autoTextAppearanceStyle(config, 'quoteKicker')}>{config.quoteKicker}</span>
        </div>
        <blockquote style={autoTextAppearanceStyle(config, 'quote')}>{config.quote}</blockquote>
        <footer>
          <span />
          <cite style={autoTextAppearanceStyle(config, 'quoteSource')}>{config.quoteSource}</cite>
        </footer>
        <span className="effect-resize-handle" data-resize-handle title="拖动调整卡片大小" aria-label="拖动调整卡片大小" />
      </section>
      <div className="quote-rail" aria-hidden="true">
        <span>KEY FRAME</span>
        <span>03 — 24</span>
      </div>
    </div>
  )
}

export function SignalCard({ config }: EffectProps) {
  const lines = [
    { text: config.signalLineOne, styleId: 'signalLineOne' as const },
    { text: config.signalLineTwo, styleId: 'signalLineTwo' as const },
    { text: config.signalLineThree, styleId: 'signalLineThree' as const },
  ].filter((line) => Boolean(line.text))
  const density = textDensityClass([
    ...lines.map((line) => line.text),
  ], TEXT_DENSITY_THRESHOLDS.signal)

  return (
    <div
      className={`effect signal-card-effect is-${config.signalSide} ${density}`}
      style={automaticGroupStyle(config, ['signalLineOne', 'signalLineTwo', 'signalLineThree'])}
      aria-label="高级动态信息卡预览"
    >
      <section className="signal-card" data-drag-target>
        <span className="effect-glow-frame" aria-hidden="true" />
        <div className="effect-fit-content signal-card__content">
          <div className="signal-card__beam" aria-hidden="true" />
          <header className="signal-card__header">
            <span className="signal-spark" aria-hidden="true">
              <i /><i /><i />
            </span>
            <span className="signal-kicker-text" style={autoTextAppearanceStyle(config, 'signalKicker')}>
              {config.signalKicker}
            </span>
            <b>04</b>
          </header>

          <div className="signal-card__copy">
            {lines.map((line, index) => (
              <div
                key={`${line.text}-${index}`}
                className={`signal-sentence signal-sentence--${index + 1}`}
                style={{ animationDelay: `${0.28 + index * config.signalStagger}s` }}
              >
                <span style={textAppearanceStyle(config, line.styleId, { includeScale: false })}>{line.text}</span>
              </div>
            ))}
          </div>

          {config.signalFooter ? (
            <footer style={{ animationDelay: `${0.48 + lines.length * config.signalStagger}s` }}>
              <span />
              <p style={autoTextAppearanceStyle(config, 'signalFooter')}>{config.signalFooter}</p>
            </footer>
          ) : null}
        </div>
        <span className="effect-resize-handle" data-resize-handle title="拖动调整卡片大小" aria-label="拖动调整卡片大小" />
      </section>

      <div className="signal-coordinate" aria-hidden="true">
        <span>INFO LAYER</span>
        <i />
        <b>04 / SIGNAL</b>
      </div>
    </div>
  )
}

function SyncedPipVideo({ media }: { media: EffectMedia }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !media.videoUrl) return
    const targetTime = media.videoTime ?? 0
    const syncTolerance = media.videoPlaying ? 0.18 : 0.035
    if (Math.abs(video.currentTime - targetTime) > syncTolerance) video.currentTime = targetTime
    if (media.videoPlaying) {
      if (video.paused) void video.play().catch(() => undefined)
    } else if (!video.paused) {
      video.pause()
    }
  }, [media.videoPlaying, media.videoTime, media.videoUrl])

  return <video ref={videoRef} src={media.videoUrl} muted playsInline preload="metadata" />
}

export function PictureInPicture({ config, media }: EffectProps & { media: EffectMedia }) {
  const density = textDensityClass([
    config.pipTitle,
    config.pipCaption,
  ], TEXT_DENSITY_THRESHOLDS.media)

  return (
    <div className={`effect pip-effect is-${config.pipSide} ${density}`} aria-label="画中画动效预览">
      <section className="pip-window" data-drag-target>
        <span className="effect-glow-frame" aria-hidden="true" />
        <div className="pip-window__media">
          {media.videoUrl ? (
            <SyncedPipVideo media={media} />
          ) : (
            <div className="pip-placeholder" aria-hidden="true">
              <span /><i /><b />
              <small>IMPORT VIDEO</small>
            </div>
          )}
          <div className="pip-scanline" aria-hidden="true" />
          <header><span>● LIVE</span><b>05 / PIP</b></header>
        </div>
        <footer>
          <span style={autoTextAppearanceStyle(config, 'pipLabel')}>{config.pipLabel}</span>
          <strong style={autoTextAppearanceStyle(config, 'pipTitle')}>{config.pipTitle}</strong>
          <p style={autoTextAppearanceStyle(config, 'pipCaption')}>{config.pipCaption}</p>
        </footer>
        <span className="effect-resize-handle" data-resize-handle title="拖动调整卡片大小" aria-label="拖动调整卡片大小" />
      </section>
      <div className="pip-tick" aria-hidden="true"><i /><span>PICTURE IN PICTURE</span></div>
    </div>
  )
}

export function ImageFeature({ config, media }: EffectProps & { media: EffectMedia }) {
  const density = textDensityClass([
    config.imageTitle,
    config.imageCaption,
  ], TEXT_DENSITY_THRESHOLDS.media)

  return (
    <div className={`effect image-feature-effect is-${config.imageSide} ${density}`} aria-label="图片卡片动效预览">
      <section className="image-feature-card" data-drag-target>
        <span className="effect-glow-frame" aria-hidden="true" />
        <div className="image-feature-card__visual">
          {media.imageUrl ? (
            <div className="image-feature-card__photo">
              <img
                src={media.imageUrl}
                alt="图片卡片素材"
                style={{
                  objectFit: config.imageFit,
                  objectPosition: `${config.imagePositionX}% ${config.imagePositionY}%`,
                  transform: `scale(${config.imageScale / 100})`,
                  transformOrigin: `${config.imagePositionX}% ${config.imagePositionY}%`,
                }}
              />
            </div>
          ) : (
            <div className="image-placeholder" aria-hidden="true">
              <span><i /><i /></span>
              <small>ADD IMAGE</small>
            </div>
          )}
          <div className="image-feature-card__index">06</div>
        </div>
        <div className="image-feature-card__copy">
          <span style={autoTextAppearanceStyle(config, 'imageLabel')}>{config.imageLabel}</span>
          <strong style={autoTextAppearanceStyle(config, 'imageTitle')}>{config.imageTitle}</strong>
          <p style={autoTextAppearanceStyle(config, 'imageCaption')}>{config.imageCaption}</p>
          <i />
        </div>
        <span className="effect-resize-handle" data-resize-handle title="拖动调整卡片大小" aria-label="拖动调整卡片大小" />
      </section>
      <div className="image-feature-caption" aria-hidden="true">VISUAL REFERENCE / 06</div>
    </div>
  )
}

export function KineticText({ config }: EffectProps) {
  const lines = [
    { text: config.kineticLineOne, styleId: 'kineticLineOne' as const },
    { text: config.kineticLineTwo, styleId: 'kineticLineTwo' as const },
    { text: config.kineticLineThree, styleId: 'kineticLineThree' as const },
  ].filter((line) => Boolean(line.text))
  const density = textDensityClass(
    lines.map((line) => line.text),
    TEXT_DENSITY_THRESHOLDS.kinetic,
  )

  return (
    <div
      className={`effect kinetic-text-effect is-${config.kineticSide} ${density}`}
      style={automaticGroupStyle(config, ['kineticLineOne', 'kineticLineTwo', 'kineticLineThree'])}
      aria-label="大字文字卡动效预览"
    >
      <section className="kinetic-copy" data-drag-target>
        <span className="effect-glow-frame" aria-hidden="true" />
        <header><i /><span style={autoTextAppearanceStyle(config, 'kineticKicker')}>{config.kineticKicker}</span></header>
        <div className="kinetic-lines">
          {lines.map((line, index) => (
            <div key={`${line.text}-${index}`} style={{ animationDelay: `${0.16 + index * config.kineticStagger}s` }}>
              <span style={textAppearanceStyle(config, line.styleId, { includeScale: false })}>{line.text}</span>
            </div>
          ))}
        </div>
        <footer><span>KEY MESSAGE</span><i /></footer>
        <span className="effect-resize-handle" data-resize-handle title="拖动调整卡片大小" aria-label="拖动调整卡片大小" />
      </section>
    </div>
  )
}

function ReferenceImage({ config, media, className = '' }: EffectProps & { media: EffectMedia; className?: string }) {
  if (!media.imageUrl) {
    return (
      <div className={`reference-image-placeholder ${className}`} aria-hidden="true">
        <i /><i /><i /><i /><i />
        <span>ADD PROOF IMAGE</span>
      </div>
    )
  }

  return (
    <img
      className={className}
      src={media.imageUrl}
      alt="证据截图素材"
      style={{
        objectFit: config.imageFit,
        objectPosition: `${config.imagePositionX}% ${config.imagePositionY}%`,
        transform: `scale(${config.imageScale / 100})`,
        transformOrigin: `${config.imagePositionX}% ${config.imagePositionY}%`,
      }}
    />
  )
}

export function ProofFrame({ config, media }: EffectProps & { media: EffectMedia }) {
  const density = textDensityClass([
    config.proofTitle,
    config.proofCaption,
  ], TEXT_DENSITY_THRESHOLDS.proof)

  return (
    <div className={`effect proof-frame-effect ${density}`} aria-label="单图证据卡动效预览">
      <section className="proof-frame-card" data-drag-target>
        <span className="effect-glow-frame" aria-hidden="true" />
        <div className="reference-heading">
          <span style={autoTextAppearanceStyle(config, 'proofKicker')}>{config.proofKicker}</span>
          <strong style={autoTextAppearanceStyle(config, 'proofTitle')}>{config.proofTitle}</strong>
        </div>
        <div className="proof-frame-card__media">
          <span className="effect-glow-frame" aria-hidden="true" />
          <ReferenceImage config={config} media={media} />
          <i className="proof-corner" aria-hidden="true" />
        </div>
        <div className="proof-frame-card__metric">
          <strong style={autoTextAppearanceStyle(config, 'proofValue')}>{config.proofValue}</strong>
          <span style={autoTextAppearanceStyle(config, 'proofUnit')}>{config.proofUnit}</span>
          <em style={autoTextAppearanceStyle(config, 'proofCaption')}>{config.proofCaption}</em>
        </div>
        <span className="effect-resize-handle" data-resize-handle title="拖动调整卡片大小" aria-label="拖动调整卡片大小" />
      </section>
    </div>
  )
}

export function DualProof({ config, media }: EffectProps & { media: EffectMedia }) {
  const density = textDensityClass([
    config.dualLeftValue,
    config.dualRightValue,
    config.dualCaption,
  ], TEXT_DENSITY_THRESHOLDS.dual)

  return (
    <div
      className={`effect dual-proof-effect ${density}`}
      style={automaticGroupStyle(config, ['dualLeftValue', 'dualRightValue'])}
      aria-label="双图数据卡动效预览"
    >
      <section className="dual-proof-group" data-drag-target>
        <span className="effect-glow-frame" aria-hidden="true" />
        <div className="reference-heading">
          <span style={autoTextAppearanceStyle(config, 'dualKicker')}>{config.dualKicker}</span>
          <strong style={autoTextAppearanceStyle(config, 'dualTitle')}>{config.dualTitle}</strong>
        </div>
        <div className="dual-proof-panels">
          <div className="dual-proof-panel">
            <span className="effect-glow-frame" aria-hidden="true" />
            <ReferenceImage config={config} media={media} className="dual-proof-panel__image" />
            <b style={textAppearanceStyle(config, 'dualLeftValue', { includeScale: false })}>{config.dualLeftValue}</b>
          </div>
          <div className="dual-proof-panel">
            <span className="effect-glow-frame" aria-hidden="true" />
            <ReferenceImage config={config} media={media} className="dual-proof-panel__image" />
            <b style={textAppearanceStyle(config, 'dualRightValue', { includeScale: false })}>{config.dualRightValue}</b>
          </div>
        </div>
        <p style={autoTextAppearanceStyle(config, 'dualCaption')}>{config.dualCaption}</p>
        <span className="effect-resize-handle" data-resize-handle title="拖动调整卡片大小" aria-label="拖动调整卡片大小" />
      </section>
    </div>
  )
}

export function ProcessChain({ config }: EffectProps) {
  const steps = [
    { text: config.processStepOne, styleId: 'processStepOne' as const },
    { text: config.processStepTwo, styleId: 'processStepTwo' as const },
    { text: config.processStepThree, styleId: 'processStepThree' as const },
    { text: config.processStepFour, styleId: 'processStepFour' as const },
  ]
  const density = textDensityClass([
    ...steps.map((step) => step.text),
  ], TEXT_DENSITY_THRESHOLDS.process)

  return (
    <div
      className={`effect process-chain-effect ${density}`}
      style={automaticGroupStyle(config, ['processStepOne', 'processStepTwo', 'processStepThree', 'processStepFour'])}
      aria-label="四步流程链动效预览"
    >
      <section className="process-chain-card" data-drag-target>
        <span className="effect-glow-frame" aria-hidden="true" />
        <div className="effect-fit-content process-chain-card__content">
          <div className="reference-heading">
            <span style={autoTextAppearanceStyle(config, 'processKicker')}>{config.processKicker}</span>
            <strong style={autoTextAppearanceStyle(config, 'processTitle')}>{config.processTitle}</strong>
          </div>
          <div className="process-chain-steps">
            {steps.map((step, index) => (
              <div key={step.styleId} style={{ animationDelay: `${0.14 + index * 0.12}s` }}>
                <span className="effect-glow-frame" aria-hidden="true" />
                <small>{String(index + 1).padStart(2, '0')}</small>
                <strong style={textAppearanceStyle(config, step.styleId, { includeScale: false })}>{step.text}</strong>
              </div>
            ))}
          </div>
          <p style={autoTextAppearanceStyle(config, 'processCaption')}>{config.processCaption}</p>
        </div>
        <span className="effect-resize-handle" data-resize-handle title="拖动调整卡片大小" aria-label="拖动调整卡片大小" />
      </section>
    </div>
  )
}

export function InsightGrid({ config }: EffectProps) {
  const insights = [
    { text: config.insightOne, styleId: 'insightOne' as const },
    { text: config.insightTwo, styleId: 'insightTwo' as const },
    { text: config.insightThree, styleId: 'insightThree' as const },
    { text: config.insightFour, styleId: 'insightFour' as const },
  ]
  const density = textDensityClass([
    ...insights.map((insight) => insight.text),
  ], TEXT_DENSITY_THRESHOLDS.insight)

  return (
    <div
      className={`effect insight-grid-effect ${density}`}
      style={automaticGroupStyle(config, ['insightOne', 'insightTwo', 'insightThree', 'insightFour'])}
      aria-label="四点洞察卡动效预览"
    >
      <section className="insight-grid-card" data-drag-target>
        <span className="effect-glow-frame" aria-hidden="true" />
        <div className="effect-fit-content insight-grid-card__content">
          <div className="reference-heading">
            <span style={autoTextAppearanceStyle(config, 'insightKicker')}>{config.insightKicker}</span>
            <strong style={autoTextAppearanceStyle(config, 'insightTitle')}>{config.insightTitle}</strong>
          </div>
          <div className="insight-grid-items">
            {insights.map((insight, index) => (
              <div key={insight.styleId} style={{ animationDelay: `${0.12 + index * 0.1}s` }}>
                <span className="effect-glow-frame" aria-hidden="true" />
                <i aria-hidden="true" />
                <strong style={textAppearanceStyle(config, insight.styleId, { includeScale: false })}>{insight.text}</strong>
              </div>
            ))}
          </div>
          <p style={autoTextAppearanceStyle(config, 'insightCaption')}>{config.insightCaption}</p>
        </div>
        <span className="effect-resize-handle" data-resize-handle title="拖动调整卡片大小" aria-label="拖动调整卡片大小" />
      </section>
    </div>
  )
}

export function ChapterCallout({ config }: EffectProps) {
  const density = textDensityClass([
    config.chapterTitle,
    config.chapterDetail,
  ], TEXT_DENSITY_THRESHOLDS.chapter)

  return (
    <div className={`effect chapter-callout-effect ${density}`} aria-label="章节重点卡动效预览">
      <section className="chapter-callout-card" data-drag-target>
        <span className="effect-glow-frame" aria-hidden="true" />
        <div className="reference-heading">
          <span style={autoTextAppearanceStyle(config, 'chapterKicker')}>{config.chapterKicker}</span>
        </div>
        <div className="chapter-callout-card__title">
          <b style={autoTextAppearanceStyle(config, 'chapterIndex')}>{config.chapterIndex}</b>
          <strong style={autoTextAppearanceStyle(config, 'chapterTitle')}>{config.chapterTitle}</strong>
        </div>
        <p style={autoTextAppearanceStyle(config, 'chapterDetail')}>{config.chapterDetail}</p>
        <span className="effect-resize-handle" data-resize-handle title="拖动调整卡片大小" aria-label="拖动调整卡片大小" />
      </section>
    </div>
  )
}

function parseBarValue(value: string, fallback: number) {
  const numeric = Number.parseFloat(value.replace(/[^\d.]/g, ''))
  return Number.isFinite(numeric) ? Math.max(4, Math.min(100, numeric)) : fallback
}

export function IconBreath({ config }: EffectProps) {
  const density = textDensityClass([
    config.chapterTitle,
    config.chapterDetail,
  ], TEXT_DENSITY_THRESHOLDS.chapter)

  return (
    <div className={`effect icon-breath-effect is-${config.kineticSide} ${density}`} aria-label="图标聚焦循环动效预览">
      <section className="icon-breath-card" data-drag-target>
        <span className="effect-glow-frame" aria-hidden="true" />
        <div className="loop-reference-heading">
          <span style={autoTextAppearanceStyle(config, 'chapterKicker')}>{config.chapterKicker}</span>
          <strong style={autoTextAppearanceStyle(config, 'chapterTitle')}>{config.chapterTitle}</strong>
        </div>
        <div className="icon-breath-tile" aria-hidden="true">
          <i><span /><span /><span /></i>
        </div>
        <p style={autoTextAppearanceStyle(config, 'chapterDetail')}>{config.chapterDetail}</p>
        <span className="effect-resize-handle" data-resize-handle title="拖动调整卡片大小" aria-label="拖动调整卡片大小" />
      </section>
    </div>
  )
}

export function DataBars({ config }: EffectProps) {
  const bars = [
    { label: config.insightOne, value: config.dualLeftValue, fallback: 28, styleId: 'insightOne' as const },
    { label: config.insightTwo, value: config.dualRightValue, fallback: 46, styleId: 'insightTwo' as const },
    { label: config.insightThree, value: config.proofValue, fallback: 71, styleId: 'insightThree' as const },
    { label: config.insightFour, value: config.proofUnit, fallback: 92, styleId: 'insightFour' as const },
  ]
  const density = textDensityClass(
    bars.map((bar) => bar.label),
    TEXT_DENSITY_THRESHOLDS.data,
  )

  return (
    <div
      className={`effect data-bars-effect is-${config.kineticSide} ${density}`}
      style={automaticGroupStyle(config, ['insightOne', 'insightTwo', 'insightThree', 'insightFour'])}
      aria-label="数据条循环动效预览"
    >
      <section className="data-bars-card" data-drag-target>
        <span className="effect-glow-frame" aria-hidden="true" />
        <div className="loop-reference-heading">
          <span style={autoTextAppearanceStyle(config, 'insightKicker')}>{config.insightKicker}</span>
          <strong style={autoTextAppearanceStyle(config, 'insightTitle')}>{config.insightTitle}</strong>
        </div>
        <div className="data-bars-list">
          {bars.map((bar, index) => (
            <div
              className="data-bar-row"
              key={`${bar.styleId}-${index}`}
              style={{
                '--bar-value': `${parseBarValue(bar.value, bar.fallback)}%`,
                '--bar-delay': `${index * 0.22}s`,
              } as CSSProperties}
            >
              <div>
                <span style={textAppearanceStyle(config, bar.styleId, { includeScale: false })}>{bar.label}</span>
                <em>{bar.value}</em>
              </div>
              <i><b /></i>
            </div>
          ))}
        </div>
        <span className="effect-resize-handle" data-resize-handle title="拖动调整卡片大小" aria-label="拖动调整卡片大小" />
      </section>
    </div>
  )
}

export function StepRail({ config }: EffectProps) {
  const steps = [
    { text: config.processStepOne, styleId: 'processStepOne' as const },
    { text: config.processStepTwo, styleId: 'processStepTwo' as const },
    { text: config.processStepThree, styleId: 'processStepThree' as const },
  ]
  const density = textDensityClass([
    ...steps.map((step) => step.text),
  ], TEXT_DENSITY_THRESHOLDS.step)

  return (
    <div
      className={`effect step-rail-effect is-${config.kineticSide} ${density}`}
      style={automaticGroupStyle(config, ['processStepOne', 'processStepTwo', 'processStepThree'])}
      aria-label="三级步骤轨循环动效预览"
    >
      <section className="step-rail-card" data-drag-target>
        <span className="effect-glow-frame" aria-hidden="true" />
        <div className="effect-fit-content step-rail-card__content">
          <div className="loop-reference-heading">
            <span style={autoTextAppearanceStyle(config, 'processKicker')}>{config.processKicker}</span>
            <strong style={autoTextAppearanceStyle(config, 'processTitle')}>{config.processTitle}</strong>
          </div>
          <ol className="step-rail-list">
            {steps.map((step, index) => (
              <li key={step.styleId} style={{ '--step-delay': `${index * 1.2}s` } as CSSProperties}>
                <i>{index + 1}</i>
                <div>
                  <strong style={textAppearanceStyle(config, step.styleId, { includeScale: false })}>{step.text}</strong>
                  <span>{index === 0 ? 'INPUT' : index === 1 ? 'PROCESS' : 'OUTPUT'}</span>
                </div>
              </li>
            ))}
          </ol>
          {config.processCaption ? (
            <p className="step-rail-caption" style={autoTextAppearanceStyle(config, 'processCaption')}>
              {config.processCaption}
            </p>
          ) : null}
        </div>
        <span className="effect-resize-handle" data-resize-handle title="拖动调整卡片大小" aria-label="拖动调整卡片大小" />
      </section>
    </div>
  )
}

export function CodeWindow({ config, media }: EffectProps & { media: EffectMedia }) {
  const steps = [
    { text: config.processStepOne, styleId: 'processStepOne' as const },
    { text: config.processStepTwo, styleId: 'processStepTwo' as const },
    { text: config.processStepThree, styleId: 'processStepThree' as const },
    { text: config.processStepFour, styleId: 'processStepFour' as const },
  ].filter((step) => Boolean(step.text))
  const density = textDensityClass(
    steps.map((step) => step.text),
    TEXT_DENSITY_THRESHOLDS.code,
  )

  return (
    <div
      className={`effect code-window-effect is-${config.kineticSide} ${density}`}
      style={automaticGroupStyle(config, ['processStepOne', 'processStepTwo', 'processStepThree', 'processStepFour'])}
      aria-label="代码窗口浮动循环动效预览"
    >
      <section className="code-window-card" data-drag-target>
        <span className="effect-glow-frame" aria-hidden="true" />
        <div className="loop-reference-heading">
          <span style={autoTextAppearanceStyle(config, 'proofKicker')}>{config.proofKicker}</span>
          <strong style={autoTextAppearanceStyle(config, 'proofTitle')}>{config.proofTitle}</strong>
        </div>
        <div className="code-window-frame">
          <header><i /><i /><i /><span>REFERENCE / LIVE</span></header>
          <div className="code-window-media">
            {media.imageUrl ? (
              <ReferenceImage config={config} media={media} />
            ) : (
              <div className="code-window-placeholder" aria-hidden="true">
                <b /><b /><b /><b /><b /><b /><b />
              </div>
            )}
            <span className="code-window-scan" aria-hidden="true" />
          </div>
        </div>
        <ul>
          {steps.map((step, index) => (
            <li key={step.styleId} style={{ '--code-delay': `${index * 0.16}s` } as CSSProperties}>
              <i />
              <span style={textAppearanceStyle(config, step.styleId, { includeScale: false })}>{step.text}</span>
            </li>
          ))}
        </ul>
        <p style={autoTextAppearanceStyle(config, 'proofCaption')}>{config.proofCaption}</p>
        <span className="effect-resize-handle" data-resize-handle title="拖动调整卡片大小" aria-label="拖动调整卡片大小" />
      </section>
    </div>
  )
}

function ModuleGlyph({ name }: { name: ModuleIconName }) {
  if (name === 'ai') {
    return <svg viewBox="0 0 24 24"><rect x="5" y="7" width="14" height="11" rx="3" /><path d="M9 7V5h6v2M9 12h.01M15 12h.01M9 15h6M3 11h2M19 11h2" /></svg>
  }
  if (name === 'database') {
    return <svg viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></svg>
  }
  if (name === 'users') {
    return <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.3" /><path d="M3.5 19c.3-3.4 2.2-5.3 5.5-5.3s5.2 1.9 5.5 5.3M14 14.4c.7-.5 1.6-.7 2.7-.7 2.5 0 3.9 1.6 4.1 4.3" /></svg>
  }
  if (name === 'branch') {
    return <svg viewBox="0 0 24 24"><circle cx="7" cy="5" r="2" /><circle cx="17" cy="7" r="2" /><circle cx="17" cy="18" r="2" /><path d="M7 7v6a5 5 0 0 0 5 5h3M9 9h3a5 5 0 0 0 5-5" /></svg>
  }
  if (name === 'document') {
    return <svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6V3Z" /><path d="M14 3v5h5M9 12h6M9 16h6" /></svg>
  }
  if (name === 'bulb') {
    return <svg viewBox="0 0 24 24"><path d="M8.5 15.5A7 7 0 1 1 15.5 15.5c-1 1-1.2 1.7-1.2 2.5H9.7c0-.8-.2-1.5-1.2-2.5ZM9.5 21h5M10 18h4" /></svg>
  }
  if (name === 'book') {
    return <svg viewBox="0 0 24 24"><path d="M4 5.5c3.2-.9 5.8-.3 8 1.7v13c-2.2-2-4.8-2.6-8-1.7v-13ZM20 5.5c-3.2-.9-5.8-.3-8 1.7v13c2.2-2 4.8-2.6 8-1.7v-13Z" /></svg>
  }
  if (name === 'target') {
    return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="3" /><path d="m14.5 9.5 5-5M16.5 4.5h3v3" /></svg>
  }
  if (name === 'outline') {
    return <svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M9 8h6M9 12h6M9 16h4M7.5 8h.01M7.5 12h.01M7.5 16h.01" /></svg>
  }
  if (name === 'writing') {
    return <svg viewBox="0 0 24 24"><path d="M5 19h4l10-10-4-4L5 15v4ZM13 7l4 4M4 21h16" /><path d="m17 3 4 4" /></svg>
  }
  if (name === 'spark') {
    return <svg viewBox="0 0 24 24"><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z" /><path d="M18.5 15.5l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" /></svg>
  }
  if (name === 'code') {
    return <svg viewBox="0 0 24 24"><path d="m9 7-5 5 5 5M15 7l5 5-5 5M13 5l-2 14" /></svg>
  }
  if (name === 'chart') {
    return <svg viewBox="0 0 24 24"><path d="M5 18V11M12 18V6M19 18V9" /><path d="M3 19.5h18" /></svg>
  }
  if (name === 'play') {
    return <svg viewBox="0 0 24 24"><path d="m9 7 8 5-8 5V7Z" /></svg>
  }
  if (name === 'image') {
    return <svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m6 17 4-4 3 3 2-2 3 3" /></svg>
  }
  if (name === 'link') {
    return <svg viewBox="0 0 24 24"><path d="M10 14 8.5 15.5a3.2 3.2 0 0 1-4.5-4.5l3-3a3.2 3.2 0 0 1 4.5 0M14 10l1.5-1.5A3.2 3.2 0 0 1 20 13l-3 3a3.2 3.2 0 0 1-4.5 0M8.5 15.5l7-7" /></svg>
  }
  if (name === 'layers') {
    return <svg viewBox="0 0 24 24"><path d="m12 4 8 4-8 4-8-4 8-4Z" /><path d="m4 12 8 4 8-4M4 16l8 4 8-4" /></svg>
  }
  return <svg viewBox="0 0 24 24"><path d="m5 12 4.5 4.5L19 7" /></svg>
}

export function ModuleGrid({ config }: EffectProps) {
  const modules = [
    { text: config.insightOne, styleId: 'insightOne' as const },
    { text: config.insightTwo, styleId: 'insightTwo' as const },
    { text: config.insightThree, styleId: 'insightThree' as const },
    { text: config.insightFour, styleId: 'insightFour' as const },
    { text: config.processStepOne, styleId: 'processStepOne' as const },
    { text: config.processStepTwo, styleId: 'processStepTwo' as const },
    { text: config.processStepThree, styleId: 'processStepThree' as const },
    { text: config.processStepFour, styleId: 'processStepFour' as const },
  ].map((module, index) => ({
    ...module,
    visual: config.moduleIcons[index],
  }))
  const density = textDensityClass(
    modules.map((module) => module.text),
    TEXT_DENSITY_THRESHOLDS.module,
  )

  return (
    <div
      className={`effect module-grid-effect is-${config.kineticSide} ${density}`}
      style={automaticGroupStyle(config, [
        'insightOne',
        'insightTwo',
        'insightThree',
        'insightFour',
        'processStepOne',
        'processStepTwo',
        'processStepThree',
        'processStepFour',
      ])}
      aria-label="模块矩阵与输入光标循环动效预览"
    >
      <section className="module-grid-card" data-drag-target>
        <span className="effect-glow-frame" aria-hidden="true" />
        <div className="loop-reference-heading">
          <span style={autoTextAppearanceStyle(config, 'insightKicker')}>{config.insightKicker}</span>
          <strong style={autoTextAppearanceStyle(config, 'insightTitle')}>{config.insightTitle}</strong>
        </div>
        <div className="module-grid-list">
          {modules.map((module, index) => (
            <div
              key={`${module.styleId}-${index}`}
              style={{ '--module-delay': `${index * 0.45}s` } as CSSProperties}
            >
              <i
                className={`module-icon is-${module.visual.shape}`}
                style={{ '--module-color': module.visual.color } as CSSProperties}
                aria-hidden="true"
              >
                <ModuleGlyph name={module.visual.icon} />
              </i>
              <span style={textAppearanceStyle(config, module.styleId, { includeScale: false })}>{module.text}</span>
            </div>
          ))}
        </div>
        <p className="module-grid-lockup" style={autoTextAppearanceStyle(config, 'chapterDetail')}>
          {config.chapterDetail}<i aria-hidden="true" />
        </p>
        <span className="effect-resize-handle" data-resize-handle title="拖动调整卡片大小" aria-label="拖动调整卡片大小" />
      </section>
    </div>
  )
}

export function EffectRenderer({
  id,
  config,
  media = {},
  editable = true,
}: {
  id: EffectId
  config: MotionConfig
  media?: EffectMedia
  editable?: boolean
}) {
  const edgeGlow = Math.max(0, Math.min(1, config.edgeGlow))
  const style = {
    '--motion-duration': `${config.duration}s`,
    '--accent': config.accent,
    '--card-scale': config.cardScale,
    '--edge-color': config.edgeColor,
    '--edge-outline': rgbaFromHex(config.edgeColor, 0.34 + edgeGlow * 0.42),
    '--edge-hot': rgbaFromHex(config.edgeColor, edgeGlow * 0.24),
    '--edge-near': rgbaFromHex(config.edgeColor, edgeGlow * 0.14),
    '--edge-far': rgbaFromHex(config.edgeColor, edgeGlow * 0.055),
    '--edge-panel-border': rgbaFromHex(config.edgeColor, 0.18 + edgeGlow * 0.18),
    '--edge-active-border': rgbaFromHex(config.edgeColor, 0.42 + edgeGlow * 0.3),
    '--edge-active-glow': rgbaFromHex(config.edgeColor, edgeGlow * 0.12),
    '--edge-glow-opacity': 1,
    '--edge-glow-tight': '4px',
    '--edge-glow-size': '9px',
    '--edge-inner-glow': '0px',
    '--edge-glow-mix': `${Math.round(18 + edgeGlow * 20)}%`,
    '--edge-glow-soft-mix': `${Math.round(5 + edgeGlow * 7)}%`,
  } as CSSProperties

  return (
    <div className={`effect-renderer ${editable ? 'is-editable' : ''}`} style={style}>
      {id === 'metric-focus' && <MetricFocus config={config} />}
      {id === 'compare-split' && <CompareSplit config={config} />}
      {id === 'quote-lockup' && <QuoteLockup config={config} />}
      {id === 'signal-card' && <SignalCard config={config} />}
      {id === 'picture-in-picture' && <PictureInPicture config={config} media={media} />}
      {id === 'image-feature' && <ImageFeature config={config} media={media} />}
      {id === 'kinetic-text' && <KineticText config={config} />}
      {id === 'proof-frame' && <ProofFrame config={config} media={media} />}
      {id === 'dual-proof' && <DualProof config={config} media={media} />}
      {id === 'process-chain' && <ProcessChain config={config} />}
      {id === 'insight-grid' && <InsightGrid config={config} />}
      {id === 'chapter-callout' && <ChapterCallout config={config} />}
      {id === 'icon-breath' && <IconBreath config={config} />}
      {id === 'data-bars' && <DataBars config={config} />}
      {id === 'step-rail' && <StepRail config={config} />}
      {id === 'code-window' && <CodeWindow config={config} media={media} />}
      {id === 'module-grid' && <ModuleGrid config={config} />}
    </div>
  )
}
