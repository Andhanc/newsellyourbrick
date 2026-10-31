import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, parseExpression } from '@babel/parser'

export const LANGUAGES = ['ru', 'en', 'de', 'es', 'fr', 'pl', 'sv']
const LOCALES = 'src/i18n/locales/mainPage'
const MIRROR = 'apps/client/src/legacy/i18n/locales/mainPage'
const ROOT = fileURLToPath(new URL('../', import.meta.url))
// These optional fragments surround the highlighted onboarding title.
const OPTIONAL_EMPTY = new Set([
  'ownerWelcome_onboardingStep1TitleBefore', 'ownerWelcome_onboardingStep1TitleAfter',
  'ownerWelcome_onboardingStep2TitleAfter', 'ownerWelcome_onboardingStep3TitleAfter',
  'ownerTest_onboardingStep1TitleAfter', 'ownerTest_onboardingStep2TitleAfter',
  'ownerTest_onboardingStep3TitleAfter', 'ownerTest_onboardingStep4TitleAfter',
  'buyerWelcome_onboardingStep1TitleBefore', 'buyerWelcome_onboardingStep1TitleAfter',
  'buyerWelcome_onboardingStep2TitleAfter', 'buyerWelcome_onboardingStep3TitleAfter',
  'buyerTest_onboardingStep1TitleAfter', 'buyerTest_onboardingStep2TitleAfter',
  'buyerTest_onboardingStep3TitleAfter', 'buyerTest_onboardingStep4TitleAfter',
])
const UI_FIELDS = /^(title|subtitle|heading|label|description|text|message|body|caption|tooltip|placeholder|helperText|buttonText|aria-label|aria-description|accessibilityLabel|accessibilityHint|alt|closeLabel|confirmLabel|cancelLabel)$/
const KEY_FIELDS = /^(i18nKey|translationKey|labelKey|titleKey|descriptionKey|textKey|tooltipKey|placeholderKey|messageKey|bodyKey|noteKey|subtitleKey|headingKey)$/

function walk(node, visit) {
  if (!node || typeof node !== 'object') return
  if (typeof node.type === 'string') visit(node)
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'comments', 'tokens', 'errors'].includes(key)) continue
    if (Array.isArray(value)) value.forEach(child => walk(child, visit))
    else if (value && typeof value === 'object') walk(value, visit)
  }
}

export function flatten(value, prefix = '', result = {}) {
  if (value && typeof value === 'object' && Object.keys(value).length) {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, result)
    }
  } else result[prefix] = value
  return result
}

export function placeholders(value) {
  return [...new Set([...String(value).matchAll(/\{\{\s*-?\s*([^},]+?)(?:\s*,[^}]+)?\s*\}\}/g)]
    .map(match => match[1].trim()))].sort()
}

export function validateCatalogs(catalogs, prefix = LOCALES, optionalEmpty = OPTIONAL_EMPTY) {
  const errors = []
  const flat = Object.fromEntries(LANGUAGES.map(lang => [lang, flatten(catalogs[lang])]))
  const keys = new Set(Object.values(flat).flatMap(value => Object.keys(value)))
  for (const lang of LANGUAGES) {
    for (const key of keys) {
      const value = flat[lang][key]
      const file = `${prefix}/${lang}.json`
      if (!Object.hasOwn(flat[lang], key)) errors.push({ file, message: `Missing translation: ${key}` })
      else if (typeof value !== 'string') errors.push({ file, message: `Translation must be a string: ${key}` })
      else if (!value.trim() && !optionalEmpty.has(key)) errors.push({ file, message: `Empty translation: ${key}` })
      else if (typeof flat.en[key] === 'string' && JSON.stringify(placeholders(value)) !== JSON.stringify(placeholders(flat.en[key]))) {
        errors.push({ file, message: `Interpolation mismatch: ${key}; expected ${placeholders(flat.en[key]).join(', ') || 'none'}` })
      }
    }
  }
  return errors
}

export function duplicateJsonKeys(source) {
  const duplicates = []
  walk(parseExpression(`(${source})`), node => {
    if (node.type !== 'ObjectExpression') return
    const seen = new Set()
    for (const property of node.properties) {
      const key = property.key?.value
      if (seen.has(key)) duplicates.push(key)
      seen.add(key)
    }
  })
  return duplicates
}

function name(node) {
  return node?.name ?? node?.value
}

function isTranslationCall(node) {
  return ['CallExpression', 'OptionalCallExpression'].includes(node?.type) && (
    ['t', 'nativeT'].includes(name(node.callee)) ||
    ['MemberExpression', 'OptionalMemberExpression'].includes(node.callee?.type) && name(node.callee.property) === 't'
  )
}

// Only literal parts of rendered expressions: conditions, function arguments and
// object identifiers are not assumed to be visible text.
function literalParts(node) {
  if (!node) return []
  if (node.type === 'StringLiteral' || node.type === 'JSXText') return [{ node, value: node.value }]
  if (node.type === 'TemplateLiteral') return node.quasis.map(part => ({ node: part, value: part.value.cooked || '' }))
  if (node.type === 'ConditionalExpression') return [...literalParts(node.consequent), ...literalParts(node.alternate)]
  if (node.type === 'LogicalExpression' || node.type === 'BinaryExpression' && node.operator === '+') {
    return [...literalParts(node.left), ...literalParts(node.right)]
  }
  if (node.type === 'JSXExpressionContainer') return literalParts(node.expression)
  return []
}

function staticKeys(node) {
  if (!node) return []
  if (node.type === 'StringLiteral') return [node.value]
  if (node.type === 'TemplateLiteral' && !node.expressions.length) return [node.quasis[0].value.cooked]
  if (node.type === 'ConditionalExpression') return [...staticKeys(node.consequent), ...staticKeys(node.alternate)]
  if (node.type === 'ArrayExpression') return node.elements.flatMap(staticKeys)
  return []
}

export function inspectSource(source, file, catalog, nativeCatalog = {}) {
  const errors = []
  let ast
  try {
    ast = parse(source, { sourceType: 'unambiguous', plugins: ['jsx', 'typescript'], allowAwaitOutsideFunction: true })
  } catch (error) {
    return [{ file, line: error.loc?.line || 1, kind: 'Source parse error', value: error.message, message: error.message }]
  }
  const add = (node, kind, value) => {
    const normalized = String(value).replace(/\s+/g, ' ').trim()
    if (normalized) errors.push({ file, line: node.loc.start.line, kind, value: normalized, message: `${kind}: ${normalized}` })
  }
  const checkKeys = (node, dict = catalog) => {
    for (const key of staticKeys(node)) {
      const exists = Object.hasOwn(dict, key) || Object.keys(dict).some(item => item.startsWith(`${key}.`))
      // i18next resolves the applicable CLDR plural form at runtime.
      const plural = ['zero', 'one', 'two', 'few', 'many', 'other'].some(suffix => Object.hasOwn(dict, `${key}_${suffix}`))
      if (!exists && !plural) add(node, 'Missing translation key', key)
    }
  }
  const checkText = node => {
    for (const part of literalParts(node)) {
      if (/\p{L}/u.test(part.value)) add(part.node, 'Untranslated UI text', part.value)
    }
  }
  walk(ast, node => {
    if (isTranslationCall(node)) {
      checkKeys(node.arguments[0], name(node.callee) === 'nativeT' ? nativeCatalog : catalog)
    }
    if (node.type === 'JSXText') checkText(node)
    if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
      for (const child of node.children) if (child.type === 'JSXExpressionContainer') checkText(child)
    }
    if (node.type === 'JSXAttribute') {
      if (UI_FIELDS.test(name(node.name))) checkText(node.value)
      if (KEY_FIELDS.test(name(node.name))) checkKeys(node.value?.expression || node.value)
    }
    if (node.type === 'ObjectProperty' && !node.computed) {
      if (UI_FIELDS.test(name(node.key))) checkText(node.value)
      if (KEY_FIELDS.test(name(node.key))) checkKeys(node.value)
    }
    if (node.type === 'CallExpression' && ['showNotification', 'alert', 'confirm', 'toast'].includes(name(node.callee))) {
      checkText(node.arguments[0])
    }
  })
  return errors
}

// A multiset also catches an additional copy of an existing untranslated label.
// Existing debt is compared with Git, never with an editable allowlist snapshot.
export function newIssues(current, previous) {
  const counts = new Map()
  const signature = issue => JSON.stringify([issue.file, issue.kind, issue.value])
  for (const issue of previous) counts.set(signature(issue), (counts.get(signature(issue)) || 0) + 1)
  return current.filter(issue => {
    const key = signature(issue)
    const count = counts.get(key) || 0
    if (!count) return true
    counts.set(key, count - 1)
    return false
  })
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

function gitRead(ref, file) {
  return git('show', `${ref}:${file}`)
}

function sourceFiles(directory) {
  if (!existsSync(path.join(ROOT, directory))) return []
  return readdirSync(path.join(ROOT, directory), { withFileTypes: true }).flatMap(entry => {
    const file = `${directory}/${entry.name}`
    if (entry.isDirectory()) return ['node_modules', 'locales', '__tests__', '.expo'].includes(entry.name) ? [] : sourceFiles(file)
    return /\.[cm]?[jt]sx?$/.test(file) && !/\.(test|spec|d)\.[jt]sx?$/.test(file) ? [file] : []
  })
}

export function readNativeCatalog(source) {
  let result
  walk(parse(source, { sourceType: 'module', plugins: ['typescript'] }), node => {
    if (node.type !== 'VariableDeclarator' || name(node.id) !== 'STRINGS') return
    const literal = value => {
      if (value.type === 'StringLiteral') return value.value
      if (value.type !== 'ObjectExpression') throw new Error('Native STRINGS must contain literal translations')
      return Object.fromEntries(value.properties.map(property => [name(property.key), literal(property.value)]))
    }
    result = literal(node.init)
  })
  if (!result || LANGUAGES.some(lang => !result[lang])) throw new Error('Native STRINGS must include all supported languages')
  return result
}

export function run({ baseRef = 'HEAD', strict = false } = {}) {
  const errors = []
  const read = file => readFileSync(path.join(ROOT, file), 'utf8')
  const catalogs = {}
  const oldCatalogs = {}
  for (const lang of LANGUAGES) {
    const file = `${LOCALES}/${lang}.json`
    const source = read(file)
    catalogs[lang] = JSON.parse(source)
    oldCatalogs[lang] = JSON.parse(gitRead(baseRef, file))
    for (const key of duplicateJsonKeys(source)) errors.push({ file, message: `Duplicate JSON key: ${key}` })
    if (source !== read(`${MIRROR}/${lang}.json`)) errors.push({ file, message: `Web/legacy locale mismatch: ${lang}` })
  }
  errors.push(...validateCatalogs(catalogs))
  const nativeFile = 'apps/client/src/i18n/nativeStrings.ts'
  const native = readNativeCatalog(read(nativeFile))
  const oldNative = readNativeCatalog(gitRead(baseRef, nativeFile))
  errors.push(...validateCatalogs(native, 'apps/client/src/i18n/nativeStrings.ts', new Set()))
  const catalog = flatten(catalogs.en)
  const oldCatalog = flatten(oldCatalogs.en)
  const filesAtBase = new Set(git('ls-tree', '-r', '--name-only', baseRef).trim().split('\n'))
  const files = [...new Set(['src', 'apps/client/src', 'apps/client/app'].flatMap(sourceFiles))]
    .filter(file => file !== nativeFile)
  let inherited = 0
  for (const file of files) {
    const source = read(file)
    const current = inspectSource(source, file, catalog, native.en)
    const previous = !strict && filesAtBase.has(file)
      ? inspectSource(gitRead(baseRef, file), file, oldCatalog, oldNative.en)
      : []
    const added = newIssues(current, previous)
    inherited += current.length - added.length
    errors.push(...added)
  }
  return { errors, inherited, files: files.length, keys: Object.keys(catalog).length }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2)
    const unknown = args.filter((arg, i) => !['--base', '--strict'].includes(arg) && args[i - 1] !== '--base')
    if (unknown.length || args.includes('--base') && !args[args.indexOf('--base') + 1]) throw new Error('Usage: node scripts/check-i18n.mjs [--base REF] [--strict]')
    const result = run({ baseRef: args.includes('--base') ? args[args.indexOf('--base') + 1] : 'HEAD', strict: args.includes('--strict') })
    for (const error of result.errors) {
      console.error(`${error.file}${error.line ? `:${error.line}` : ''}: ${error.message}`)
      if (process.env.GITHUB_ACTIONS === 'true') {
        const escape = value => String(value).replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A').replaceAll(',', '%2C').replaceAll(':', '%3A')
        console.error(`::error file=${escape(error.file)},line=${error.line || 1}::${escape(error.message)}`)
      }
    }
    console.log(`i18n: ${result.keys} keys, ${LANGUAGES.length} languages, ${result.files} source files; ${result.errors.length} errors; ${result.inherited} existing source issues (not increased).`)
    process.exitCode = result.errors.length ? 1 : 0
  } catch (error) {
    console.error(`i18n check failed: ${error.message}`)
    process.exitCode = 1
  }
}
