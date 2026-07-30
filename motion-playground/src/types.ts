export type EffectId =
  | 'metric-focus'
  | 'compare-split'
  | 'quote-lockup'
  | 'signal-card'
  | 'picture-in-picture'
  | 'image-feature'
  | 'kinetic-text'
  | 'proof-frame'
  | 'dual-proof'
  | 'process-chain'
  | 'insight-grid'
  | 'chapter-callout'
  | 'icon-breath'
  | 'data-bars'
  | 'step-rail'
  | 'code-window'
  | 'module-grid'

export interface EffectPosition {
  x: number
  y: number
}

export interface ComparePartPositions {
  left: EffectPosition
  right: EffectPosition
  title: EffectPosition
  axis: EffectPosition
}

export type ComparePartId = keyof ComparePartPositions

export type ModuleIconName =
  | 'ai'
  | 'database'
  | 'users'
  | 'branch'
  | 'document'
  | 'bulb'
  | 'book'
  | 'target'
  | 'outline'
  | 'writing'
  | 'spark'
  | 'code'
  | 'chart'
  | 'play'
  | 'image'
  | 'link'
  | 'layers'
  | 'check'

export type ModuleIconShape = 'rounded' | 'ellipse' | 'circle' | 'diamond'

export interface ModuleIconConfig {
  icon: ModuleIconName
  shape: ModuleIconShape
  color: string
}

export type TextStyleId =
  | 'metricLabel'
  | 'metricValue'
  | 'metricSuffix'
  | 'metricDetail'
  | 'compareTitle'
  | 'compareLeftLabel'
  | 'compareLeftValue'
  | 'compareRightLabel'
  | 'compareRightValue'
  | 'quoteKicker'
  | 'quote'
  | 'quoteSource'
  | 'signalKicker'
  | 'signalLineOne'
  | 'signalLineTwo'
  | 'signalLineThree'
  | 'signalFooter'
  | 'pipLabel'
  | 'pipTitle'
  | 'pipCaption'
  | 'imageLabel'
  | 'imageTitle'
  | 'imageCaption'
  | 'kineticKicker'
  | 'kineticLineOne'
  | 'kineticLineTwo'
  | 'kineticLineThree'
  | 'proofKicker'
  | 'proofTitle'
  | 'proofValue'
  | 'proofUnit'
  | 'proofCaption'
  | 'dualKicker'
  | 'dualTitle'
  | 'dualLeftValue'
  | 'dualRightValue'
  | 'dualCaption'
  | 'processKicker'
  | 'processTitle'
  | 'processStepOne'
  | 'processStepTwo'
  | 'processStepThree'
  | 'processStepFour'
  | 'processCaption'
  | 'insightKicker'
  | 'insightTitle'
  | 'insightOne'
  | 'insightTwo'
  | 'insightThree'
  | 'insightFour'
  | 'insightCaption'
  | 'chapterKicker'
  | 'chapterIndex'
  | 'chapterTitle'
  | 'chapterDetail'

export interface TextAppearance {
  color: string
  size: number
  opacity: number
}

export type TextStyleMap = Record<TextStyleId, TextAppearance>

export interface MotionConfig {
  metricLabel: string
  metricValue: number
  metricSuffix: string
  metricDetail: string
  compareTitle: string
  compareLeftLabel: string
  compareLeftValue: string
  compareRightLabel: string
  compareRightValue: string
  comparePositions: ComparePartPositions
  quote: string
  quoteSource: string
  quoteKicker: string
  signalKicker: string
  signalLineOne: string
  signalLineTwo: string
  signalLineThree: string
  signalFooter: string
  signalSide: 'left' | 'right'
  signalStagger: number
  pipLabel: string
  pipTitle: string
  pipCaption: string
  pipSide: 'left' | 'right'
  imageLabel: string
  imageTitle: string
  imageCaption: string
  imageSide: 'left' | 'right'
  imageFit: 'cover' | 'contain'
  imageScale: number
  imagePositionX: number
  imagePositionY: number
  kineticKicker: string
  kineticLineOne: string
  kineticLineTwo: string
  kineticLineThree: string
  kineticSide: 'left' | 'right'
  kineticStagger: number
  proofKicker: string
  proofTitle: string
  proofValue: string
  proofUnit: string
  proofCaption: string
  dualKicker: string
  dualTitle: string
  dualLeftValue: string
  dualRightValue: string
  dualCaption: string
  processKicker: string
  processTitle: string
  processStepOne: string
  processStepTwo: string
  processStepThree: string
  processStepFour: string
  processCaption: string
  insightKicker: string
  insightTitle: string
  insightOne: string
  insightTwo: string
  insightThree: string
  insightFour: string
  insightCaption: string
  chapterKicker: string
  chapterIndex: string
  chapterTitle: string
  chapterDetail: string
  moduleIcons: ModuleIconConfig[]
  textStyles: TextStyleMap
  duration: number
  accent: string
  cardScale: number
  edgeColor: string
  edgeGlow: number
  showSafeArea: boolean
  showGrid: boolean
}

export interface EffectDefinition {
  id: EffectId
  index: string
  name: string
  cnName: string
  description: string
}

export interface OverlayClip {
  id: string
  effectId: EffectId
  name: string
  startTime: number
  duration: number
  config: MotionConfig
  position: EffectPosition
}
