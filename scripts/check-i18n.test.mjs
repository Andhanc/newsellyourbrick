import test from 'node:test'
import assert from 'node:assert/strict'
import { LANGUAGES, validateCatalogs, inspectSource, newIssues, duplicateJsonKeys, placeholders } from './check-i18n.mjs'

const catalogs = value => Object.fromEntries(LANGUAGES.map(lang => [lang, structuredClone(value)]))

test('requires all seven languages, nested keys and every array item', () => {
  const data = catalogs({ title: 'Title', steps: ['One', 'Two'], nested: { label: 'Label' } })
  assert.deepEqual(validateCatalogs(data), [])
  delete data.fr.nested.label
  data.sv.steps.pop()
  data.de.onlyGerman = 'Extra'
  const errors = validateCatalogs(data)
  assert.ok(errors.some(error => error.file.endsWith('fr.json') && error.message.includes('nested.label')))
  assert.ok(errors.some(error => error.file.endsWith('sv.json') && error.message.includes('steps.1')))
  assert.equal(errors.filter(error => error.message.includes('onlyGerman')).length, 6)
})

test('rejects empty, null and numeric translations; permits only explicit optional fragments', () => {
  const data = catalogs({ title: 'Title' })
  data.fr.title = '  '
  data.sv.title = null
  data.de.title = 1
  assert.equal(validateCatalogs(data).length, 3)
  assert.equal(validateCatalogs(catalogs({ optional: '' }), 'test', new Set(['optional'])).length, 0)
})

test('checks interpolation variable names, including formatted and unescaped values', () => {
  const data = catalogs({ title: '{{count}} shares for {{price, currency}}' })
  data.de.title = '{{- price, currency}} / {{count}} / {{count}}'
  assert.deepEqual(validateCatalogs(data), [])
  data.fr.title = '{{wrong}} parts'
  assert.equal(validateCatalogs(data).length, 1)
  assert.deepEqual(placeholders('{{ price, currency }} {{- count}}'), ['count', 'price'])
})

test('detects duplicate keys, including escaped names and nested objects', () => {
  assert.deepEqual(duplicateJsonKeys('{"a":"one","a":"two","nested":{"x":"one","\\u0078":"two"}}'), ['a', 'x'])
  assert.deepEqual(duplicateJsonKeys('{"a":{"title":"one"},"b":{"title":"two"}}'), [])
})

test('a defaultValue or fallback text cannot hide a missing translation key', () => {
  const source = `const View = () => <><h1>{t('missing', { defaultValue: 'Fallback' })}</h1><Trans i18nKey="missing2" /></>`
  assert.deepEqual(inspectSource(source, 'View.jsx', {}).map(error => error.value), ['missing', 'missing2'])
})

test('recognizes i18next calls, literal templates, conditional keys, key maps and native translations', () => {
  const source = "const x = { titleKey: 'missing' }; i18n.t(`missing2`); t(ok ? 'known' : 'missing3'); nativeT('native', lang)"
  assert.deepEqual(inspectSource(source, 'View.tsx', { known: 'Known' }, { native: 'Native' }).map(error => error.value), ['missing', 'missing2', 'missing3'])
})

test('allows translated JSX, plural base keys, nested resources and dynamic keys', () => {
  const source = "const View = () => <><h1>{t('known')}</h1><input placeholder={t('known')} />{t('items', {count: 2})}{t('nested', {returnObjects: true})}{t(`${prefix}Title`)}</>"
  assert.deepEqual(inspectSource(source, 'View.jsx', { known: 'Known', items_one: 'One', items_other: 'Other', 'nested.title': 'Title' }), [])
})

test('catches hardcoded JSX, accessible labels, tooltip props, config labels and toasts', () => {
  const source = `const View = () => <><h1>New block</h1><input placeholder="Your name" aria-label={'Name'} /><Help tooltip="New tip" />{ok ? 'Ready' : 'Wait'}</>; const options = [{ label: 'Buy' }]; showNotification('Saved');`
  assert.deepEqual(inspectSource(source, 'View.jsx', {}).map(error => error.value).sort(), ['Buy', 'Name', 'New block', 'New tip', 'Ready', 'Saved', 'Wait', 'Your name'].sort())
})

test('ignores comments, CSS classes, routes, imports, technical identifiers and punctuation', () => {
  const source = `import Help from './Help'; // Hello
    const View = () => <div className="new-block" data-testid="new-block"><a href="/profile">{t('known')}</a><img alt="" />{flag === 'technical' && t('known')}123 € / →</div>`
  assert.deepEqual(inspectSource(source, 'View.jsx', { known: 'Known' }), [])
})

test('rejects newly introduced syntax errors', () => {
  assert.equal(inspectSource('const x = <', 'View.jsx', {})[0].kind, 'Source parse error')
})

test('Git comparison ignores old issues but rejects new text, missing keys, extra occurrences and moved debt', () => {
  const old = inspectSource('const View = () => <h1>Old label</h1>', 'View.jsx', {})
  const movedLine = inspectSource('\n\nconst View = () => <h1>Old label</h1>', 'View.jsx', {})
  assert.deepEqual(newIssues(movedLine, old), [])
  const updated = inspectSource('const View = () => <><h1>Old label</h1><p>Old label</p>{t("missing")}</>', 'View.jsx', {})
  assert.equal(newIssues(updated, old).length, 2)
  assert.equal(newIssues(inspectSource('const View = () => <h1>New label</h1>', 'View.jsx', {}), old).length, 1)
  assert.equal(newIssues(inspectSource('const View = () => <h1>Old label</h1>', 'Other.jsx', {}), old).length, 1)
})

test('deleting a key used by unchanged code introduces an error', () => {
  const source = 't("known")'
  assert.equal(newIssues(inspectSource(source, 'View.jsx', {}), inspectSource(source, 'View.jsx', { known: 'Known' })).length, 1)
})
