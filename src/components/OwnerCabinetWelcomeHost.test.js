import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const hostSource = await readFile(new URL('./OwnerCabinetWelcomeHost.jsx', import.meta.url), 'utf8')
const pageSource = await readFile(new URL('../pages/OwnerTestPage.jsx', import.meta.url), 'utf8')
const profileSource = await readFile(
  new URL('../pages/OwnerProfileTestPage.jsx', import.meta.url),
  'utf8',
)
const chromeSource = await readFile(new URL('./OwnerTestCabinetChrome.jsx', import.meta.url), 'utf8')

test('owner welcome host wires drawer, profile navigation and spotlight', () => {
  assert.match(hostSource, /OWNER_CABINET_WELCOME_PRESET/)
  assert.match(hostSource, /owner_welcome/)
  assert.match(hostSource, /goTo\(OWNER_VIEWS\.PROFILE/)
  assert.match(hostSource, /ProfileSpotlightOnboarding/)
  assert.match(hostSource, /ownerWelcome_spotlightFolderHint/)
  assert.match(hostSource, /ownerWelcome_spotlightFillHint/)
  assert.match(hostSource, /spotlightPhase === 'folder'/)
  assert.match(hostSource, /spotlightPhase === 'form'/)
  assert.match(hostSource, /gateLocked/)
  assert.match(hostSource, /__previewOwnerCabinetWelcome/)
  assert.match(hostSource, /__resetOwnerCabinetWelcome/)
})

test('owner test page mounts welcome host around cabinet chrome', () => {
  assert.match(pageSource, /OwnerCabinetWelcomeHost/)
})

test('owner profile page attaches folder and form targets for welcome spotlight', () => {
  assert.match(profileSource, /useOwnerWelcomeUi/)
  assert.match(profileSource, /welcomeUi\.personalFolderRef/)
  assert.match(profileSource, /welcomeUi\.personalTabRef/)
  assert.match(profileSource, /welcomeUi\.personalDataSectionRef/)
  assert.match(profileSource, /welcomeUi\.gateLocked && tabId !== 'personal'/)
  assert.match(profileSource, /welcomeUi\.warnGateLocked/)
})

test('owner profile cabinet mirrors buyer folders and three directions', () => {
  assert.match(profileSource, /profile-folder-card/)
  assert.match(profileSource, /buyerCabinet_sectionsLabel/)
  assert.match(profileSource, /buyerCabinet_directionsTitle/)
  assert.match(profileSource, /opr-profile-directions-list/)
  assert.match(profileSource, /BuyerSheetShell/)
  assert.match(profileSource, /profile-cabinet-sheet--data/)
  assert.match(profileSource, /profile-data-hero/)
  assert.match(profileSource, /owner-profile\/hero-personal\.png/)
  assert.match(profileSource, /owner-profile\/hero-statistics\.png/)
  assert.match(profileSource, /owner-profile\/hero-settings\.png/)
  assert.match(profileSource, /mobileSheetId/)
  assert.match(profileSource, /preloadProfilePageCtaImages/)
  assert.match(profileSource, /opr-profile-directions-cta--mobile/)
  assert.match(profileSource, /opr-profile-directions-cta--desktop/)
  assert.equal((profileSource.match(/AuctionCategoryCtaCards variant="profilePage"/g) || []).length, 2)
  assert.equal((profileSource.match(/iconSrc:/g) || []).length, 3)
})

test('owner cabinet chrome blocks navigation while welcome gate is locked', () => {
  assert.match(chromeSource, /useOwnerWelcomeUi/)
  assert.match(chromeSource, /gateLocked/)
  assert.match(chromeSource, /warnGateLocked/)
  assert.match(chromeSource, /gateLocked && target !== OWNER_VIEWS\.PROFILE/)
})

test('owner welcome gate shows fill-to-continue toast on escape', () => {
  assert.match(hostSource, /warnGateLocked/)
  assert.match(hostSource, /ownerWelcome_gateFillToContinue/)
  assert.match(hostSource, /showNotification/)
})
