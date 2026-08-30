import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const component = await readFile(new URL('./RoleSwitchBottomCta.jsx', import.meta.url), 'utf8')
const styles = await readFile(new URL('./RoleSwitch.css', import.meta.url), 'utf8')
const ru = JSON.parse(await readFile(new URL('../i18n/locales/mainPage/ru.json', import.meta.url), 'utf8'))

test('seller pitch is a text-first explainer without the pitch image', () => {
  const sellerBranch = component.slice(
    component.indexOf("targetRole === 'seller' ? ("),
    component.indexOf(') : (', component.indexOf("targetRole === 'seller' ? (")),
  )

  assert.doesNotMatch(sellerBranch, /role-switch-pitch__media/)
  assert.doesNotMatch(component, /become-seller-pitch\.jpg/)
  assert.match(sellerBranch, /role-switch-pitch__steps/)
  assert.match(sellerBranch, /roleSwitch_pitchSellerNote/)
  assert.match(component, /maxHeightRatio=\{targetRole === 'seller' \? 0\.94 : 0\.72\}/)
})

test('seller pitch mirrors the numbered-step and note language of section explainers', () => {
  assert.match(styles, /\.role-switch-pitch__steps li\s*\{[\s\S]*?grid-template-columns:\s*34px minmax\(0, 1fr\) 19px/)
  assert.match(styles, /\.role-switch-pitch__note\s*\{[\s\S]*?rgba\(22, 167, 179, 0\.08\)/)
  assert.match(styles, /\.role-switch-pitch--seller \.role-switch-pitch__text\s*\{[\s\S]*?font-size:\s*1rem/)
  assert.match(styles, /\.role-switch-pitch--seller \.role-switch-btn--primary\s*\{[\s\S]*?min-height:\s*52px/)
})

test('seller pitch copy explains account creation, listing moderation, and reversibility', () => {
  assert.match(ru.roleSwitch_pitchSellerBody, /отдельный кабинет продавца/i)
  assert.match(ru.roleSwitch_pitchSellerBenefitTwo, /добавить объект.*документы.*формат продажи/i)
  assert.match(ru.roleSwitch_pitchSellerBenefitThree, /модерации.*объявление/i)
  assert.match(ru.roleSwitch_pitchSellerNote, /не публикует объект.*переключаться/i)
})
