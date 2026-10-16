import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const page = readFileSync(new URL('./MobileDiscoverPage.jsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('./MobileDiscoverPage.css', import.meta.url), 'utf8')

test('launch uses a brand heading without header icons and keeps search and compass below', () => {
  assert.match(page, /md-site-nav\$\{isStageNavExpanded \? ' is-expanded' : ' is-hidden'\}[\s\S]*<Header \/>/)
  assert.match(page, /stage\.scrollTop > 0/)
  assert.match(page, /md-launch__brand[\s\S]*SellYouBrick/)
  assert.match(page, /md-launch__wave[\s\S]*md-stage__search[\s\S]*md-stage__compass/)
  assert.match(page, /className="md-welcome__copy"[\s\S]*discoverPage_welcomeTitle[\s\S]*className="md-welcome__media"/)
})

test('welcome photo matches the client mirror', () => {
  for (const extension of ['jsx', 'css']) {
    const name = `MobileDiscoverPage.${extension}`
    assert.equal(readFileSync(new URL(`./${name}`, import.meta.url), 'utf8'),
      readFileSync(new URL(`../../apps/client/src/legacy/pages/${name}`, import.meta.url), 'utf8'))
  }
})
