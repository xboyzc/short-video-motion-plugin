import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

function readFirst(paths) {
  let lastError
  for (const path of paths) {
    try {
      return read(path)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

function quotedKinds(source) {
  return new Set([...source.matchAll(/'([a-z0-9]+(?:-[a-z0-9]+)+)'/g)].map((match) => match[1]))
}

function assertSameKinds(label, actual, expected) {
  assert.equal(actual.size, expected.size, `${label} kind count mismatch`)
  assert.deepEqual([...actual].sort(), [...expected].sort(), `${label} kind set mismatch`)
}

const projectCatalog = JSON.parse(read('../skills/effect-generation/references/effect-catalog.json'))
const packagedCatalog = JSON.parse(readFirst([
  '../../effect-generation/references/effect-catalog.json',
  '../../overlay-studio-effect-generation-skill/effect-generation/references/effect-catalog.json',
]))
const expected = new Set(Object.keys(projectCatalog.effects))

assert.equal(expected.size, 17, 'the current editor must expose all 17 existing effect kinds')
assertSameKinds('packaged skill catalog', new Set(Object.keys(packagedCatalog.effects)), expected)

const types = read('../src/types.ts')
const effectIdUnion = types.slice(
  types.indexOf('export type EffectId'),
  types.indexOf('export interface EffectPosition'),
)
assertSameKinds('EffectId union', quotedKinds(effectIdUnion), expected)

const app = read('../src/App.tsx')
const effectDefinitions = app.slice(
  app.indexOf('const effects: EffectDefinition[]'),
  app.indexOf('const initialComparePositions'),
)
assertSameKinds('editor card library', quotedKinds(effectDefinitions), expected)
const explicitStepClassifier = app.slice(
  app.indexOf('const explicitSteps ='),
  app.indexOf('const moduleHits ='),
)
assert.match(
  explicitStepClassifier,
  /merged\[`step\$\{index \+ 1\}`\]/,
  'new-effect auto matching must read explicit step fields',
)
assert.doesNotMatch(
  explicitStepClassifier,
  /merged\[`line\$\{index \+ 1\}`\]/,
  'generic line fields must not be counted as explicit workflow steps',
)

const renderer = read('../src/effects.tsx').slice(
  read('../src/effects.tsx').indexOf('export function EffectRenderer'),
)
const renderedKinds = new Set(
  [...renderer.matchAll(/id === '([a-z0-9-]+)'/g)].map((match) => match[1]),
)
assertSameKinds('EffectRenderer branches', renderedKinds, expected)

const textStyles = read('../src/textStyles.ts')
const styleCatalog = textStyles.slice(
  textStyles.indexOf('export const TEXT_STYLE_FIELDS'),
  textStyles.indexOf('export const TEXT_STYLE_DEFAULTS'),
)
assertSameKinds('text style editor', quotedKinds(styleCatalog), expected)

const overlayImport = read('../src/overlayImport.ts')
const importCatalog = overlayImport.slice(
  overlayImport.indexOf('export const OVERLAY_EFFECT_IDS'),
  overlayImport.indexOf('function normalizeEffectToken'),
)
assertSameKinds('JSON import catalog', quotedKinds(importCatalog), expected)

const projectLibrary = read('../skills/effect-generation/references/card-library.md')
const documentedKinds = new Set(
  [...projectLibrary.matchAll(/^###\s+(?:\S+)\s+`([a-z0-9-]+)`/gm)].map((match) => match[1]),
)
assertSameKinds('skill card-library reference', documentedKinds, expected)

console.log('Effect catalog parity passed: editor, renderer, JSON import, text controls, and both Skill copies expose the same 17 kinds.')
