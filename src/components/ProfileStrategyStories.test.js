import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const WEB_COMPONENT = new URL('./ProfileStrategyStories.jsx', import.meta.url)
const WEB_STYLES = new URL('./ProfileStrategyStories.css', import.meta.url)
const WEB_PROFILE = new URL('../pages/TestPage.jsx', import.meta.url)
const APP_COMPONENT = new URL('../../apps/client/src/legacy/components/ProfileStrategyStories.jsx', import.meta.url)
const APP_STYLES = new URL('../../apps/client/src/legacy/components/ProfileStrategyStories.css', import.meta.url)
const APP_PROFILE = new URL('../../apps/client/src/legacy/pages/TestPage.jsx', import.meta.url)

test('profile strategy stories expose all seven steps and destination routes', () => {
  const source = fs.readFileSync(WEB_COMPONENT, 'utf8')
  const storyIds = [...source.matchAll(/id: '(intro|auction|shares|debts|buy-now|test-drive|assistant)'/g)]

  assert.equal(storyIds.length, 7)
  assert.match(source, /STORY_DURATION_MS = 6500/)
  assert.match(source, /\/auction\?filter=auction/)
  assert.match(source, /\/auction\?filter=buy_now/)
  assert.match(source, /\/co-investment/)
  assert.match(source, /\/debts/)
  assert.match(source, /\/test-drive/)
  assert.match(source, /\/chat\?assistant=1/)
  assert.match(source, /event\.clientX - bounds\.left < bounds\.width \/ 2/)
  assert.match(source, /Аукцион подходит для тех, кто/)
  assert.match(source, /Доли подходят для тех, кто/)
  assert.match(source, /Долговые объекты подходят для тех, кто/)
  assert.doesNotMatch(source, /profile-strategy-story__icon/)
})

test('strategy stories are wired into web and bundled app profiles', () => {
  for (const file of [WEB_PROFILE, APP_PROFILE]) {
    const source = fs.readFileSync(file, 'utf8')
    assert.match(source, /import ProfileStrategyStories/)
    assert.match(source, /<ProfileStrategyStories language=\{i18n\.language\} \/>/)
    assert.ok(
      source.indexOf('<AuctionCategoryCtaCards variant="profilePage" />') <
        source.indexOf('<ProfileStrategyStories language={i18n.language} />'),
      'strategy stories should appear below the profile direction cards',
    )
  }

  assert.equal(fs.readFileSync(WEB_COMPONENT, 'utf8'), fs.readFileSync(APP_COMPONENT, 'utf8'))
  assert.equal(fs.readFileSync(WEB_STYLES, 'utf8'), fs.readFileSync(APP_STYLES, 'utf8'))
})
