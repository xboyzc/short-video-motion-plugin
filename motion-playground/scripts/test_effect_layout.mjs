import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
const effects = readFileSync(new URL('../src/effects.tsx', import.meta.url), 'utf8')
const textStyles = readFileSync(new URL('../src/textStyles.ts', import.meta.url), 'utf8')
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')

function rules(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return [...css.matchAll(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`, 'g'))]
    .map((match) => match[1])
}

function rule(selector) {
  const matches = rules(selector)
  assert.ok(matches.length, `missing CSS rule: ${selector}`)
  return matches[0]
}

function declarations(selector) {
  const matches = rules(selector)
  assert.ok(matches.length, `missing CSS rule: ${selector}`)
  return matches.join('\n')
}

function numberUnit(source, property, unit) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = source.match(new RegExp(`${escaped}:\\s*([\\d.]+)${unit}`))
  assert.ok(match, `missing ${property} in ${unit}: ${source}`)
  return Number(match[1])
}

function component(name, next) {
  const start = effects.indexOf(`export function ${name}`)
  const end = effects.indexOf(`export function ${next}`, start + 1)
  assert.notEqual(start, -1, `missing ${name}`)
  assert.notEqual(end, -1, `missing boundary ${next}`)
  return effects.slice(start, end)
}

function assertCanvasRelative(selector) {
  const source = declarations(selector)
  assert.match(source, /cq[wh]/, `${selector} must use video-canvas units`)
  assert.doesNotMatch(source, /\d(?:\.\d+)?vw\b/, `${selector} must not use browser viewport units`)
}

function assertAutoCard(selector, top, maxHeight) {
  const source = rule(selector)
  assert.match(source, /bottom:\s*auto/)
  assert.match(source, /height:\s*auto/)
  assert.match(source, /max-height:\s*var\(--fit-card-max-height\)/)
  assert.equal(numberUnit(source, 'top', 'cqh'), top)
  assert.ok(top + maxHeight <= 74, `${selector} crosses the subtitle-safe line`)
}

function assertDirectAutoCard(selector, top, maxHeight) {
  const source = rules(selector).find((candidate) => /max-height:\s*[\d.]+cqh/.test(candidate))
  assert.ok(source, `missing direct auto card rule: ${selector}`)
  assert.match(source, /bottom:\s*auto/)
  assert.match(source, /height:\s*auto/)
  assert.equal(numberUnit(source, 'top', 'cqh'), top)
  assert.equal(numberUnit(source, 'max-height', 'cqh'), maxHeight)
  assert.ok(top + maxHeight <= 74, `${selector} crosses the subtitle-safe line`)
}

function assertSharedLayout(componentBody, owner, rootClass, fields, densityKey) {
  const root = componentBody.match(/return\s*\(\s*(<div\b[\s\S]*?>)/)?.[1]
  assert.ok(root, `${owner} missing root element`)
  assert.match(root, new RegExp(`\\b${rootClass}\\b`))
  assert.match(root, /\$\{density\}/)
  assert.match(componentBody, /automaticGroupStyle/)
  assert.equal(componentBody.match(/\btextDensityClass\s*\(/g)?.length ?? 0, 1)
  assert.match(componentBody, new RegExp(`TEXT_DENSITY_THRESHOLDS\\.${densityKey}\\b`))
  for (const field of fields) assert.match(componentBody, new RegExp(`config\\.${field}\\b`))
  assert.doesNotMatch(componentBody, /\.slice\s*\(/, `${owner} must render every configured item`)
}

const renderer = rule('.effect-renderer')
assert.match(renderer, /container-type:\s*size/)
assert.match(renderer, /container-name:\s*motion-canvas/)
assert.match(renderer, /--subtitle-safe-bottom:\s*26%/)
assert.match(rule('.effect-fit-content'), /overflow:\s*hidden/)
assert.match(rule('.effect-fit-content'), /min-height:\s*0/)

const densityFunction = effects.slice(
  effects.indexOf('function textDensityClass'),
  effects.indexOf('function autoTextAppearanceStyle'),
)
assert.match(densityFunction, /Math\.max\(0,\s*\.\.\.lengths\)/)
assert.doesNotMatch(densityFunction, /\.reduce\s*\(/, 'layout must not classify four short items by total text length')
assert.doesNotMatch(effects, /compactTotal|balancedTotal/)
assert.match(effects, /signal:\s*\{\s*compactMax:\s*8,\s*balancedMax:\s*16\s*\}/)
assert.match(effects, /insight:\s*\{\s*compactMax:\s*5,\s*balancedMax:\s*10\s*\}/)
assert.match(effects, /step:\s*\{\s*compactMax:\s*7,\s*balancedMax:\s*14\s*\}/)

assert.match(textStyles, /includeScale\?:\s*boolean/)
assert.match(textStyles, /minScale\?:\s*number/)
assert.match(textStyles, /maxScale\?:\s*number/)
assert.match(effects, /--auto-text-scale/)
assert.match(effects, /Math\.max\(0\.9,\s*Math\.min\(1\.12/)

const signal = component('SignalCard', 'PictureInPicture')
const process = component('ProcessChain', 'InsightGrid')
const insight = component('InsightGrid', 'ChapterCallout')
const step = component('StepRail', 'CodeWindow')
const compare = component('CompareSplit', 'QuoteLockup')

assertSharedLayout(signal, 'SignalCard', 'signal-card-effect', [
  'signalLineOne',
  'signalLineTwo',
  'signalLineThree',
], 'signal')
assertSharedLayout(process, 'ProcessChain', 'process-chain-effect', [
  'processStepOne',
  'processStepTwo',
  'processStepThree',
  'processStepFour',
], 'process')
assertSharedLayout(insight, 'InsightGrid', 'insight-grid-effect', [
  'insightOne',
  'insightTwo',
  'insightThree',
  'insightFour',
], 'insight')
assertSharedLayout(step, 'StepRail', 'step-rail-effect', [
  'processStepOne',
  'processStepTwo',
  'processStepThree',
], 'step')
assertSharedLayout(compare, 'CompareSplit', 'compare-split', [
  'compareLeftLabel',
  'compareLeftValue',
  'compareRightLabel',
  'compareRightValue',
], 'compare')

for (const body of [signal, process, insight, step, compare]) {
  assert.match(body, /includeScale:\s*false/, 'repeated body text must use the shared group scale')
}
for (const wrapper of [
  'signal-card__content',
  'process-chain-card__content',
  'insight-grid-card__content',
  'step-rail-card__content',
]) {
  assert.match(effects, new RegExp(`effect-fit-content\\s+${wrapper}`))
  assert.match(declarations(`.${wrapper}`), /max-height:\s*calc\(/)
}

assertAutoCard('.signal-card', 8, 66)
assertAutoCard('.process-chain-card', 7, 67)
assertAutoCard('.insight-grid-card', 7, 67)
assertAutoCard('.step-rail-card', 7, 67)
for (const [selector, top, maxHeight] of [
  ['.metric-block', 28, 46],
  ['.quote-panel', 18, 56],
  ['.pip-window', 10, 64],
  ['.image-feature-card', 10, 64],
  ['.kinetic-copy', 12, 62],
  ['.proof-frame-card', 7, 67],
  ['.dual-proof-group', 6, 68],
  ['.chapter-callout-card', 15, 58],
  ['.icon-breath-card', 12, 62],
  ['.data-bars-card', 7, 67],
  ['.code-window-card', 5, 69],
  ['.module-grid-card', 6, 68],
]) {
  assertDirectAutoCard(selector, top, maxHeight)
}

const componentStyleStart = css.indexOf('.effect-kicker')
const componentStyleEnd = css.indexOf('.timeline {', componentStyleStart)
assert.ok(componentStyleStart >= 0 && componentStyleEnd > componentStyleStart)
assert.doesNotMatch(
  css.slice(componentStyleStart, componentStyleEnd),
  /\d(?:\.\d+)?vw\b/,
  'effect cards must size from the video canvas rather than the editor viewport',
)

for (const selector of [
  '.compare-heading',
  '.compare-heading h2',
  '.compare-card',
  '.compare-card__index',
  '.compare-card div',
  '.compare-card small',
  '.compare-card strong',
  '.signal-card',
  '.signal-card__header',
  '.signal-spark',
  '.signal-card__copy',
  '.signal-sentence',
  '.signal-sentence span',
  '.reference-heading',
  '.reference-heading > span',
  '.reference-heading > strong',
  '.process-chain-card',
  '.process-chain-steps',
  '.process-chain-steps > div',
  '.process-chain-steps strong',
  '.insight-grid-card',
  '.insight-grid-items',
  '.insight-grid-items > div',
  '.insight-grid-items strong',
  '.loop-reference-heading',
  '.loop-reference-heading > strong',
  '.step-rail-card',
  '.step-rail-list',
  '.step-rail-list li',
  '.step-rail-list strong',
]) {
  assertCanvasRelative(selector)
}

const compareLayout = rule('.compare-split')
const compareCardTop = numberUnit(compareLayout, '--compare-card-top', 'cqh')
const compareTitleGap = numberUnit(compareLayout, '--compare-title-gap', 'cqh')
assert.equal(compareCardTop, 31)
assert.ok(compareTitleGap >= 1 && compareTitleGap <= 3, 'compare title must sit close above the left card')
for (const [selector, cardHeight] of [
  ['.compare-split', 22],
  ['.compare-split.is-text-balanced', 29],
  ['.compare-split.is-text-dense', 37],
]) {
  assert.equal(numberUnit(rule(selector), '--compare-card-height', 'cqh'), cardHeight)
  assert.ok(compareCardTop + cardHeight <= 74, `${selector} crosses the subtitle-safe line`)
}
assert.match(rule('.compare-heading'), /left:\s*calc\(4\.5%\s*\+\s*var\(--compare-left-x[^)]*\)\s*\+\s*var\(--compare-title-x/)
assert.match(rule('.compare-card--left'), /left:\s*calc\(4\.5%\s*\+\s*var\(--compare-left-x/)
assert.match(rule('.compare-heading'), /top:\s*auto/)
assert.match(rule('.compare-heading'), /bottom:\s*calc\(100cqh\s*-\s*var\(--compare-card-top\)\s*-\s*var\(--compare-left-y/)
assert.match(rule('.compare-heading'), /var\(--compare-title-gap\)\s*-\s*var\(--compare-title-y/)
assert.match(rule('.compare-card'), /top:\s*calc\(var\(--compare-card-top\)/)
assert.match(rule('.compare-card'), /display:\s*grid/)
assert.match(rule('.compare-card'), /grid-template-rows:\s*auto\s+minmax\(0,\s*1fr\)\s+auto/)
assert.match(declarations('.compare-card'), /overflow:\s*hidden/)
assert.match(rule('.compare-card div'), /align-self:\s*start/)
assert.match(rule('.compare-card small'), /font-size:\s*calc\(1\.2cqw\s*\*\s*var\(--auto-text-scale/)
assert.match(rule('.compare-card strong'), /font:\s*680\s+calc\(2\.05cqw\s*\*\s*var\(--auto-text-scale/)
assert.match(rule('.compare-card--left'), /transform-origin:\s*right\s+bottom/)
assert.match(rule('.compare-card--right'), /transform-origin:\s*left\s+bottom/)
assert.equal(compare.match(/includeScale:\s*false/g)?.length ?? 0, 4)
assert.doesNotMatch(
  css,
  /\.(?:compare-card--left|compare-card--right)[^{]*(?:small|strong)[^{]*\{[^}]*(?:font(?:-size)?|zoom|--auto-text-scale)\s*:/s,
)

assert.match(rule('.signal-card__copy'), /display:\s*flex/)
assert.match(rule('.signal-sentence'), /padding:\s*\.72cqh\s+\.72cqw/)
assert.doesNotMatch(declarations('.signal-sentence'), /padding:\s*4\.2%/)
assert.match(rule('.signal-sentence span'), /-webkit-line-clamp:\s*1/)
assert.match(rule('.signal-card-effect.is-text-balanced .signal-sentence span'), /-webkit-line-clamp:\s*2/)
assert.match(rule('.signal-card-effect.is-text-dense .signal-sentence span'), /-webkit-line-clamp:\s*3/)
assert.match(rule('.signal-sentence span'), /font-size:\s*calc\(1\.08cqw\s*\*\s*var\(--auto-text-scale/)

assert.match(rule('.process-chain-steps'), /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/)
assert.match(rule('.process-chain-effect.is-text-dense .process-chain-steps'), /grid-template-columns:\s*1fr/)
assert.match(rule('.process-chain-effect.is-text-dense .process-chain-steps::before'), /display:\s*none/)
assert.match(rule('.process-chain-steps > div'), /min-height:\s*0/)

assert.match(rule('.insight-grid-items'), /grid-template-columns:\s*1fr\s+1fr/)
assert.match(rule('.insight-grid-effect.is-text-dense .insight-grid-items'), /grid-template-columns:\s*1fr/)
assert.match(rule('.insight-grid-items > div'), /grid-template-columns:\s*\.42cqw\s+minmax\(0,\s*1fr\)/)
assert.match(rule('.insight-grid-items > div'), /align-items:\s*center/)
assert.match(rule('.insight-grid-items i'), /align-self:\s*center/)
assert.doesNotMatch(rule('.insight-grid-items i'), /margin-top\s*:/)

const stepList = rule('.step-rail-list')
assert.match(stepList, /overflow:\s*visible/)
assert.match(stepList, /grid-auto-rows:\s*minmax\(var\(--item-min-height\),\s*auto\)/)
assert.doesNotMatch(stepList, /repeat\(3,\s*auto\)/)
assert.match(rule('.step-rail-list li'), /min-height:\s*0/)
assert.match(step, /className="step-rail-caption"/)
assert.match(rule('.step-rail-caption'), /font-size:\s*\.54cqw/)
assert.match(rule('.step-rail-caption'), /-webkit-line-clamp:\s*1/)

for (const selector of [
  '.compare-card strong',
  '.signal-sentence span',
  '.process-chain-steps strong',
  '.insight-grid-items strong',
  '.step-rail-list strong',
]) {
  assert.match(declarations(selector), /var\(--auto-text-scale/)
}
for (const variantFontRule of [
  /\.signal-sentence--\d+\s+span\s*\{[^}]*font-size\s*:/s,
  /\.process-chain-steps\s*>\s*div:nth-child\([^)]*\)[^{]*strong\s*\{[^}]*font-size\s*:/s,
  /\.insight-grid-items\s*>\s*div:nth-child\([^)]*\)[^{]*strong\s*\{[^}]*font-size\s*:/s,
  /\.step-rail-list\s+li:nth-child\([^)]*\)[^{]*strong\s*\{[^}]*font-size\s*:/s,
]) {
  assert.doesNotMatch(css, variantFontRule)
}
assert.doesNotMatch(
  css,
  /\.(?:signal-card-effect|process-chain-effect|insight-grid-effect|step-rail-effect)\.is-text-(?:balanced|dense)[^{]*\{[^}]*(?:transform:\s*scale|zoom\s*:)/s,
)

const safeArea = rule('.safe-area')
assert.equal(numberUnit(safeArea, 'left', '%'), 31.8)
assert.equal(numberUnit(safeArea, 'width', '%'), 36.4)
for (const [left, width] of [[4.6, 27.2], [3.8, 28], [4, 27.5], [4, 27]]) {
  assert.ok(left + width <= 31.8, `left card enters subject safe area: ${left + width}`)
}

for (const part of ['title', 'left', 'right']) {
  assert.match(compare, new RegExp(`data-drag-part="${part}"`))
}
assert.doesNotMatch(compare, />\s*VS\s*</)
assert.doesNotMatch(compare, /className="compare-axis"/)
assert.doesNotMatch(css, /\.compare-axis/)
assert.doesNotMatch(app, /左卡\s*·\s*右卡\s*·\s*主题\s*·\s*VS/)
assert.doesNotMatch(
  app,
  /setString\('processCaption',\s*merged\.caption\s*\?\?\s*merged\.detail\s*\?\?\s*text\)/,
)

for (const token of [
  '\\bAutoFitText\\b',
  '\\bResizeObserver\\b',
  '\\bscrollWidth\\b',
  '\\bclientWidth\\b',
  'dataset\\.autoFit',
]) {
  assert.doesNotMatch(effects, new RegExp(token), `forbidden per-item auto-fit token: ${token}`)
}
assert.ok(effects.match(/data-resize-handle/g)?.length >= 2, 'manual resize handles must remain available')
assert.match(app, /max="220"/, 'card size control must always allow 220%')
assert.doesNotMatch(app, /max=\{config\.showSafeArea\s*\?\s*100\s*:\s*220\}/)
assert.doesNotMatch(app, /protectedOverlayJSON/)
assert.doesNotMatch(app, /protectSubject/)
assert.match(app, /一键避让人物/)
assert.match(app, /人物安全区只作为构图参考，不限制拖动或缩放/)
const freeDragSection = app.slice(
  app.indexOf('const beginEffectDrag'),
  app.indexOf('const endEffectDrag'),
)
assert.doesNotMatch(freeDragSection, /constrain(?:MotionConfig|OverlayClip|OverlayPosition)/)
assert.match(freeDragSection, /Math\.min\(2\.2,/)
assert.match(freeDragSection, /position:\s*nextPosition/)
assert.ok((app.match(/\n\s*overlayJSON,\n/g) ?? []).length >= 2, 'preview/export must keep raw overlay JSON')

console.log('Effect layout safety checks passed.')
