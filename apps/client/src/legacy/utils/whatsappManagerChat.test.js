import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const util = await readFile(new URL('./whatsappManagerChat.js', import.meta.url), 'utf8')
const page = await readFile(new URL('../pages/TestPage.jsx', import.meta.url), 'utf8')
const club = await readFile(new URL('../pages/PrivateClub.jsx', import.meta.url), 'utf8')
const modal = await readFile(new URL('../components/PrivateClubWhatsAppCommunityModal.jsx', import.meta.url), 'utf8')

test('VIP personal manager opens fixed WhatsApp number', () => {
  assert.match(util, /VIP_PERSONAL_MANAGER_WHATSAPP_DIGITS = '34631252060'/)
  assert.match(util, /https:\/\/wa\.me\/\$\{VIP_PERSONAL_MANAGER_WHATSAPP_DIGITS\}/)
  assert.match(util, /openVipPersonalManagerWhatsApp/)
  assert.match(page, /openVipPersonalManagerWhatsApp/)
  assert.match(page, /action: 'vipPersonalManager'/)
  assert.match(page, /action: 'platformChat'/)
  assert.match(page, /openPlatformManagerChat/)
  assert.doesNotMatch(page, /fetchWhatsAppManagerChatUrl/)
})

test('platform chat card does not reuse VIP WhatsApp action', () => {
  assert.match(page, /buyerCabinet_cardChatTitle[\s\S]{0,180}action: 'platformChat'/)
  assert.match(page, /action: 'vipPersonalManager'/)
})

test('VIP WhatsApp community modal uses shared community URL and opens after purchase', () => {
  assert.match(util, /VIP_CLUB_WHATSAPP_COMMUNITY_URL/)
  assert.match(util, /openVipClubWhatsAppCommunity/)
  assert.match(modal, /VIP_CLUB_WHATSAPP_COMMUNITY_URL/)
  assert.match(modal, /privateClubLanding_chatGo/)
  assert.match(club, /PrivateClubWhatsAppCommunityModal/)
  assert.match(club, /setWhatsappCommunityOpen\(true\)/)
  assert.match(club, /vip-club-chat-card__cta/)
  assert.match(page, /PrivateClubWhatsAppCommunityModal/)
  assert.match(page, /setWhatsappCommunityOpen\(true\)/)
})
