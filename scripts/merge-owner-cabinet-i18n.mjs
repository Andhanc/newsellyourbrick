import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { PACK } from './owner-cabinet-i18n-pack.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localesDir = path.join(__dirname, '../src/i18n/locales/mainPage')

const NAV_OVERRIDES = {
  de: {
    ownerTest_navAnalytics: 'Analytik',
    ownerTest_navMyProperties: 'Meine Objekte',
    ownerTest_navSales: 'Verkäufe',
    ownerTest_navTestDrive: 'Probefahrt',
    ownerTest_navWallet: 'Wallet',
    ownerTest_navSubscriptions: 'Abos',
    ownerTest_navMessages: 'Nachrichten',
    ownerTest_navSettings: 'Einstellungen',
  },
  es: {
    ownerTest_navAnalytics: 'Analítica',
    ownerTest_navMyProperties: 'Mis inmuebles',
    ownerTest_navSales: 'Ventas',
    ownerTest_navTestDrive: 'Prueba',
    ownerTest_navWallet: 'Cartera',
    ownerTest_navSubscriptions: 'Suscripciones',
    ownerTest_navMessages: 'Mensajes',
    ownerTest_navSettings: 'Ajustes',
  },
  fr: {
    ownerTest_navAnalytics: 'Analytique',
    ownerTest_navMyProperties: 'Mes biens',
    ownerTest_navSales: 'Ventes',
    ownerTest_navTestDrive: 'Essai',
    ownerTest_navWallet: 'Portefeuille',
    ownerTest_navSubscriptions: 'Abonnements',
    ownerTest_navMessages: 'Messages',
    ownerTest_navSettings: 'Paramètres',
  },
  sv: {
    ownerTest_navAnalytics: 'Analys',
    ownerTest_navMyProperties: 'Mina objekt',
    ownerTest_navSales: 'Försäljning',
    ownerTest_navTestDrive: 'Testkörning',
    ownerTest_navWallet: 'Plånbok',
    ownerTest_navSubscriptions: 'Prenumerationer',
    ownerTest_navMessages: 'Meddelanden',
    ownerTest_navSettings: 'Inställningar',
  },
}

const LANGS = ['ru', 'en', 'de', 'es', 'fr', 'sv']

for (const lang of LANGS) {
  const filePath = path.join(localesDir, `${lang}.json`)
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const source = lang === 'ru' ? PACK.ru : lang === 'en' ? PACK.en : PACK.en
  const extra = lang === 'ru' || lang === 'en' ? source : { ...source, ...NAV_OVERRIDES[lang] }

  let merged = 0
  for (const [k, v] of Object.entries(extra)) {
    if (data[k] !== v) {
      data[k] = v
      merged += 1
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log('merged', lang, merged, 'keys updated,', Object.keys(extra).length, 'in pack')
}
