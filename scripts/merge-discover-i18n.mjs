/**
 * Merge Mobile Discover / home discover i18n keys into mainPage locale JSON files.
 * Covers: MobileDiscoverPage, MobileDiscoverCatalog (discoverPage_*).
 *
 * Usage: node scripts/merge-discover-i18n.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const primaryLocalesDir = path.join(__dirname, '../src/i18n/locales/mainPage')
const legacyLocalesDir = path.join(__dirname, '../apps/client/src/legacy/i18n/locales/mainPage')

/** @type {Record<string, Record<string, string>>} */
const PACK = {}

// ─────────────────────────────────────────────────────────────────────────────
// Russian (source)
// ─────────────────────────────────────────────────────────────────────────────
PACK.ru = {
  discoverPage_saleAuctionDesc:
    'Участвуйте в торгах и приобретайте объекты по лучшей цене',
  discoverPage_saleBuyNowDesc:
    'Покупайте недвижимость по фиксированной цене без ожидания',
  discoverPage_saleDebtsDesc:
    'Инвестируйте в объекты с задолженностью и получайте высокую доходность',
  discoverPage_saleSharesDesc:
    'Покупайте доли в премиальных объектах и инвестируйте с умом',
  discoverPage_welcomeAria: 'Добро пожаловать',
  discoverPage_heroTitleLine1: 'Найдите дом',
  discoverPage_heroTitleLine2: 'мечты легко',
  discoverPage_heroLead:
    'Теперь найти дом мечты можно быстро, просто и по выгодной цене',
  discoverPage_goToNextScreen: 'Перейти дальше',
  discoverPage_saleFormatsAria: 'Форматы продажи',
  discoverPage_stageTitlePrefix: 'Четыре',
  discoverPage_stageTitleAccent: 'стратегии',
  discoverPage_stageTitleSuffix: 'продажи',
  discoverPage_stageSubtitle: 'Найдите дом, который подходит именно вам',
  discoverPage_save: 'Сохранить',
  discoverPage_saleFormatsDotsAria: 'Форматы продажи',
  discoverPage_welcomeTitle: 'Покупать недвижимость — легко!',
  discoverPage_welcomeLeadLine1: 'Найдите своё пространство и почувствуйте дом.',
  discoverPage_welcomeLeadLine2: 'Где комфорт встречается с удобством.',
  discoverPage_searchPlaceholder: 'Город, вилла, квартира…',
  discoverPage_searchAria: 'Поиск объектов',
  discoverPage_viewAllProperties: 'Смотреть все объекты',
  discoverPage_fabMenuAria: 'Меню форматов продажи',
  discoverPage_openMenu: 'Открыть меню',
  discoverPage_showcaseAuctionSubtitle:
    'Находите скрытые возможности и приобретайте объекты по лучшей цене',
  discoverPage_showcaseBuyNowSubtitle:
    'Готовые объекты по фиксированной цене без торгов',
  discoverPage_showcaseSharesSubtitle:
    'Инвестируйте в доли крупных объектов от минимальных сумм',
  discoverPage_showcaseDebtsSubtitle:
    'Инвестируйте в долговые инструменты под залог недвижимости',
  discoverPage_appKicker: 'Мобильное приложение',
  discoverPage_appTitleRest: 'всегда с собой',
  discoverPage_appLead: 'Аукционы, покупки и инвестиции — всё в одном приложении',
  discoverPage_downloadOn: 'Загрузить в',
  discoverPage_availableOn: 'Доступно в',
  discoverPage_newsSubtitle:
    'Идеи для поездок, рынок и свежие материалы о недвижимости',
  discoverPage_authToOpenProperty:
    'Войдите в аккаунт, чтобы открыть карточку объекта.',
}

// ─────────────────────────────────────────────────────────────────────────────
// English
// ─────────────────────────────────────────────────────────────────────────────
PACK.en = {
  discoverPage_saleAuctionDesc:
    'Take part in bidding and buy properties at the best price',
  discoverPage_saleBuyNowDesc:
    'Buy real estate at a fixed price with no waiting',
  discoverPage_saleDebtsDesc:
    'Invest in debt-backed properties and unlock higher yields',
  discoverPage_saleSharesDesc:
    'Buy shares in premium properties and invest with confidence',
  discoverPage_welcomeAria: 'Welcome',
  discoverPage_heroTitleLine1: 'Find Your Dream',
  discoverPage_heroTitleLine2: 'Home Easily',
  discoverPage_heroLead:
    'Now you can find your dream house easily and quickly at a low price',
  discoverPage_goToNextScreen: 'Go to next screen',
  discoverPage_saleFormatsAria: 'Sale formats',
  discoverPage_stageTitlePrefix: 'Four',
  discoverPage_stageTitleAccent: 'Sales',
  discoverPage_stageTitleSuffix: 'Strategies',
  discoverPage_stageSubtitle: 'Discover the best home for you',
  discoverPage_save: 'Save',
  discoverPage_saleFormatsDotsAria: 'Sale formats',
  discoverPage_welcomeTitle: 'Buying Property Is Easy!',
  discoverPage_welcomeLeadLine1: 'Find your next space, feel at home.',
  discoverPage_welcomeLeadLine2: 'Where comfort meets convenience.',
  discoverPage_searchPlaceholder: 'Search city, villa, apartment…',
  discoverPage_searchAria: 'Search properties',
  discoverPage_viewAllProperties: 'View all properties',
  discoverPage_fabMenuAria: 'Sale formats menu',
  discoverPage_openMenu: 'Open menu',
  discoverPage_showcaseAuctionSubtitle:
    'Find hidden opportunities and buy properties at the best price',
  discoverPage_showcaseBuyNowSubtitle:
    'Ready listings at a fixed price — no bidding required',
  discoverPage_showcaseSharesSubtitle:
    'Invest in shares of large properties from low entry amounts',
  discoverPage_showcaseDebtsSubtitle:
    'Invest in debt instruments secured by real estate',
  discoverPage_appKicker: 'Mobile app',
  discoverPage_appTitleRest: 'always with you',
  discoverPage_appLead: 'Auctions, purchases, and investments — all in one app',
  discoverPage_downloadOn: 'Download on the',
  discoverPage_availableOn: 'Get it on',
  discoverPage_newsSubtitle:
    'Travel ideas, market insights, and fresh real estate stories',
  discoverPage_authToOpenProperty: 'Sign in to open the property card.',
}

// ─────────────────────────────────────────────────────────────────────────────
// German
// ─────────────────────────────────────────────────────────────────────────────
PACK.de = {
  discoverPage_saleAuctionDesc:
    'Nehmen Sie an Auktionen teil und kaufen Sie Objekte zum besten Preis',
  discoverPage_saleBuyNowDesc:
    'Kaufen Sie Immobilien zum Festpreis — ohne Wartezeit',
  discoverPage_saleDebtsDesc:
    'Investieren Sie in schuldengesicherte Objekte mit hoher Rendite',
  discoverPage_saleSharesDesc:
    'Kaufen Sie Anteile an Premium-Objekten und investieren Sie klug',
  discoverPage_welcomeAria: 'Willkommen',
  discoverPage_heroTitleLine1: 'Finden Sie Ihr',
  discoverPage_heroTitleLine2: 'Traumhaus leicht',
  discoverPage_heroLead:
    'Finden Sie Ihr Traumhaus jetzt einfach, schnell und zu einem günstigen Preis',
  discoverPage_goToNextScreen: 'Zum nächsten Bildschirm',
  discoverPage_saleFormatsAria: 'Verkaufsformate',
  discoverPage_stageTitlePrefix: 'Vier',
  discoverPage_stageTitleAccent: 'Verkaufs',
  discoverPage_stageTitleSuffix: 'strategien',
  discoverPage_stageSubtitle: 'Entdecken Sie das beste Zuhause für Sie',
  discoverPage_save: 'Speichern',
  discoverPage_saleFormatsDotsAria: 'Verkaufsformate',
  discoverPage_welcomeTitle: 'Immobilien kaufen ist einfach!',
  discoverPage_welcomeLeadLine1: 'Finden Sie Ihren nächsten Raum — und fühlen Sie sich zu Hause.',
  discoverPage_welcomeLeadLine2: 'Wo Komfort auf Bequemlichkeit trifft.',
  discoverPage_searchPlaceholder: 'Stadt, Villa, Wohnung suchen…',
  discoverPage_searchAria: 'Immobilien suchen',
  discoverPage_viewAllProperties: 'Alle Objekte ansehen',
  discoverPage_fabMenuAria: 'Menü der Verkaufsformate',
  discoverPage_openMenu: 'Menü öffnen',
  discoverPage_showcaseAuctionSubtitle:
    'Entdecken Sie verborgene Chancen und kaufen Sie zum besten Preis',
  discoverPage_showcaseBuyNowSubtitle:
    'Fertige Objekte zum Festpreis — ohne Gebote',
  discoverPage_showcaseSharesSubtitle:
    'Investieren Sie in Anteile großer Objekte ab kleinen Beträgen',
  discoverPage_showcaseDebtsSubtitle:
    'Investieren Sie in schuldengesicherte Instrumente mit Immobilienhinterlegung',
  discoverPage_appKicker: 'Mobile App',
  discoverPage_appTitleRest: 'immer dabei',
  discoverPage_appLead:
    'Auktionen, Käufe und Investitionen — alles in einer App',
  discoverPage_downloadOn: 'Laden im',
  discoverPage_availableOn: 'Erhältlich bei',
  discoverPage_newsSubtitle:
    'Reiseideen, Markt und frische Beiträge rund um Immobilien',
  discoverPage_authToOpenProperty:
    'Melden Sie sich an, um die Objektkarte zu öffnen.',
}

// ─────────────────────────────────────────────────────────────────────────────
// Spanish
// ─────────────────────────────────────────────────────────────────────────────
PACK.es = {
  discoverPage_saleAuctionDesc:
    'Participe en las pujas y compre inmuebles al mejor precio',
  discoverPage_saleBuyNowDesc:
    'Compre inmuebles a precio fijo sin esperas',
  discoverPage_saleDebtsDesc:
    'Invierte en inmuebles con deuda y obtén una alta rentabilidad',
  discoverPage_saleSharesDesc:
    'Compra participaciones en inmuebles premium e invierte con criterio',
  discoverPage_welcomeAria: 'Bienvenida',
  discoverPage_heroTitleLine1: 'Encuentra tu',
  discoverPage_heroTitleLine2: 'casa ideal',
  discoverPage_heroLead:
    'Ahora puedes encontrar tu casa soñada de forma fácil, rápida y a buen precio',
  discoverPage_goToNextScreen: 'Ir a la siguiente pantalla',
  discoverPage_saleFormatsAria: 'Formatos de venta',
  discoverPage_stageTitlePrefix: 'Cuatro',
  discoverPage_stageTitleAccent: 'estrategias',
  discoverPage_stageTitleSuffix: 'de venta',
  discoverPage_stageSubtitle: 'Descubre el hogar ideal para ti',
  discoverPage_save: 'Guardar',
  discoverPage_saleFormatsDotsAria: 'Formatos de venta',
  discoverPage_welcomeTitle: '¡Comprar inmuebles es fácil!',
  discoverPage_welcomeLeadLine1: 'Encuentra tu próximo espacio y siéntete en casa.',
  discoverPage_welcomeLeadLine2: 'Donde el confort se une a la comodidad.',
  discoverPage_searchPlaceholder: 'Buscar ciudad, villa, piso…',
  discoverPage_searchAria: 'Buscar inmuebles',
  discoverPage_viewAllProperties: 'Ver todos los inmuebles',
  discoverPage_fabMenuAria: 'Menú de formatos de venta',
  discoverPage_openMenu: 'Abrir menú',
  discoverPage_showcaseAuctionSubtitle:
    'Encuentra oportunidades ocultas y compra al mejor precio',
  discoverPage_showcaseBuyNowSubtitle:
    'Inmuebles listos a precio fijo, sin pujas',
  discoverPage_showcaseSharesSubtitle:
    'Invierte en participaciones de grandes inmuebles desde importes mínimos',
  discoverPage_showcaseDebtsSubtitle:
    'Invierte en instrumentos de deuda respaldados por inmuebles',
  discoverPage_appKicker: 'Aplicación móvil',
  discoverPage_appTitleRest: 'siempre contigo',
  discoverPage_appLead:
    'Subastas, compras e inversiones — todo en una app',
  discoverPage_downloadOn: 'Descargar en',
  discoverPage_availableOn: 'Disponible en',
  discoverPage_newsSubtitle:
    'Ideas de viaje, mercado y contenidos frescos sobre inmuebles',
  discoverPage_authToOpenProperty:
    'Inicia sesión para abrir la ficha del inmueble.',
}

// ─────────────────────────────────────────────────────────────────────────────
// French
// ─────────────────────────────────────────────────────────────────────────────
PACK.fr = {
  discoverPage_saleAuctionDesc:
    'Participez aux enchères et achetez des biens au meilleur prix',
  discoverPage_saleBuyNowDesc:
    'Achetez un bien à prix fixe, sans attendre',
  discoverPage_saleDebtsDesc:
    'Investissez dans des biens avec dette et visez un rendement élevé',
  discoverPage_saleSharesDesc:
    'Achetez des parts de biens premium et investissez avec discernement',
  discoverPage_welcomeAria: 'Bienvenue',
  discoverPage_heroTitleLine1: 'Trouvez votre',
  discoverPage_heroTitleLine2: 'maison de rêve',
  discoverPage_heroLead:
    'Trouvez dès maintenant votre maison de rêve facilement, rapidement et à bas prix',
  discoverPage_goToNextScreen: 'Écran suivant',
  discoverPage_saleFormatsAria: 'Formats de vente',
  discoverPage_stageTitlePrefix: 'Quatre',
  discoverPage_stageTitleAccent: 'stratégies',
  discoverPage_stageTitleSuffix: 'de vente',
  discoverPage_stageSubtitle: 'Découvrez le foyer idéal pour vous',
  discoverPage_save: 'Enregistrer',
  discoverPage_saleFormatsDotsAria: 'Formats de vente',
  discoverPage_welcomeTitle: 'Acheter un bien, c’est simple !',
  discoverPage_welcomeLeadLine1: 'Trouvez votre prochain espace, comme chez vous.',
  discoverPage_welcomeLeadLine2: 'Là où le confort rencontre la praticité.',
  discoverPage_searchPlaceholder: 'Rechercher ville, villa, appartement…',
  discoverPage_searchAria: 'Rechercher des biens',
  discoverPage_viewAllProperties: 'Voir tous les biens',
  discoverPage_fabMenuAria: 'Menu des formats de vente',
  discoverPage_openMenu: 'Ouvrir le menu',
  discoverPage_showcaseAuctionSubtitle:
    'Repérez les opportunités cachées et achetez au meilleur prix',
  discoverPage_showcaseBuyNowSubtitle:
    'Biens prêts à prix fixe — sans enchères',
  discoverPage_showcaseSharesSubtitle:
    'Investissez dans des parts de grands biens dès de petits montants',
  discoverPage_showcaseDebtsSubtitle:
    'Investissez dans des instruments de dette garantis par l’immobilier',
  discoverPage_appKicker: 'Application mobile',
  discoverPage_appTitleRest: 'toujours avec vous',
  discoverPage_appLead:
    'Enchères, achats et investissements — tout dans une seule app',
  discoverPage_downloadOn: 'Télécharger sur',
  discoverPage_availableOn: 'Disponible sur',
  discoverPage_newsSubtitle:
    'Idées de voyage, marché et articles immobiliers récents',
  discoverPage_authToOpenProperty:
    'Connectez-vous pour ouvrir la fiche du bien.',
}

// ─────────────────────────────────────────────────────────────────────────────
// Swedish
// ─────────────────────────────────────────────────────────────────────────────
PACK.sv = {
  discoverPage_saleAuctionDesc:
    'Delta i budgivningen och köp objekt till bästa pris',
  discoverPage_saleBuyNowDesc:
    'Köp fastigheter till fast pris utan väntan',
  discoverPage_saleDebtsDesc:
    'Investera i skuldsäkrade objekt och få hög avkastning',
  discoverPage_saleSharesDesc:
    'Köp andelar i premiumobjekt och investera smart',
  discoverPage_welcomeAria: 'Välkommen',
  discoverPage_heroTitleLine1: 'Hitta ditt',
  discoverPage_heroTitleLine2: 'drömhem enkelt',
  discoverPage_heroLead:
    'Nu kan du hitta ditt drömhus enkelt, snabbt och till ett lågt pris',
  discoverPage_goToNextScreen: 'Gå till nästa skärm',
  discoverPage_saleFormatsAria: 'Försäljningsformat',
  discoverPage_stageTitlePrefix: 'Fyra',
  discoverPage_stageTitleAccent: 'försäljnings',
  discoverPage_stageTitleSuffix: 'strategier',
  discoverPage_stageSubtitle: 'Upptäck det bästa hemmet för dig',
  discoverPage_save: 'Spara',
  discoverPage_saleFormatsDotsAria: 'Försäljningsformat',
  discoverPage_welcomeTitle: 'Att köpa bostad är enkelt!',
  discoverPage_welcomeLeadLine1: 'Hitta ditt nästa utrymme — känn dig hemma.',
  discoverPage_welcomeLeadLine2: 'Där komfort möter bekvämlighet.',
  discoverPage_searchPlaceholder: 'Sök stad, villa, lägenhet…',
  discoverPage_searchAria: 'Sök fastigheter',
  discoverPage_viewAllProperties: 'Visa alla objekt',
  discoverPage_fabMenuAria: 'Meny för försäljningsformat',
  discoverPage_openMenu: 'Öppna meny',
  discoverPage_showcaseAuctionSubtitle:
    'Hitta dolda möjligheter och köp till bästa pris',
  discoverPage_showcaseBuyNowSubtitle:
    'Klara objekt till fast pris — utan budgivning',
  discoverPage_showcaseSharesSubtitle:
    'Investera i andelar av stora objekt från låga belopp',
  discoverPage_showcaseDebtsSubtitle:
    'Investera i skuldinstrument med fastighet som säkerhet',
  discoverPage_appKicker: 'Mobilapp',
  discoverPage_appTitleRest: 'alltid med dig',
  discoverPage_appLead: 'Auktioner, köp och investeringar — allt i en app',
  discoverPage_downloadOn: 'Ladda ner på',
  discoverPage_availableOn: 'Tillgänglig på',
  discoverPage_newsSubtitle:
    'Residéer, marknad och nya artiklar om fastigheter',
  discoverPage_authToOpenProperty: 'Logga in för att öppna objektkortet.',
}

// Polish = English copies (consistency with other packs)
PACK.pl = { ...PACK.en }

function mergeIntoDir(localesDir, langs, label) {
  for (const lang of langs) {
    const filePath = path.join(localesDir, `${lang}.json`)
    if (!fs.existsSync(filePath)) {
      console.warn(`[${label}] skip missing`, lang)
      continue
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const extra = PACK[lang]
    if (!extra) {
      throw new Error(`Missing PACK for lang=${lang}`)
    }
    for (const [k, v] of Object.entries(extra)) {
      data[k] = v
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
    console.log(`[${label}] merged`, lang, Object.keys(extra).length, 'keys')
  }
}

const primaryLangs = ['ru', 'en', 'de', 'es', 'fr', 'sv', 'pl']
const legacyLangs = ['ru', 'en', 'de', 'es', 'fr', 'sv']

mergeIntoDir(primaryLocalesDir, primaryLangs, 'mainPage')
mergeIntoDir(legacyLocalesDir, legacyLangs, 'legacy')

const ruCount = Object.keys(PACK.ru).length
console.log('---')
console.log('discoverPage_ keys:', ruCount)
for (const lang of primaryLangs) {
  const n = Object.keys(PACK[lang]).length
  if (n !== ruCount) {
    console.warn(`key count mismatch: ${lang}=${n} vs ru=${ruCount}`)
  }
}
