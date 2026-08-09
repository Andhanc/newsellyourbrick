/**
 * Merge auction/home leftover UI i18n keys into mainPage locale JSON files.
 * Covers: PropertyList empty state, MobileDiscoverFaq, BuyerEmptyState default.
 *
 * Usage: node scripts/merge-auction-home-i18n.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const primaryLocalesDir = path.join(__dirname, '../src/i18n/locales/mainPage')
const legacyLocalesDir = path.join(__dirname, '../apps/client/src/legacy/i18n/locales/mainPage')

/** @type {Record<string, Record<string, string>>} */
const PACK = {}

PACK.ru = {
  auctionPage_emptyTitle: 'Объектов пока нет',
  auctionPage_emptyDesc:
    'Новые предложения появятся здесь. А пока посмотрите другие направления.',
  auctionPage_emptyPrimary: 'Смотреть другие объекты',
  buyerEmpty_continueSearch: 'Продолжим поиск',
  auctionPage_faqTitlePrefix: 'Частые',
  auctionPage_faqTitleAccent: 'вопросы',
  auctionPage_faqSubtitle:
    'Коротко о форматах продажи, рисках и том, как начать на платформе',
  auctionPage_faqAuctionQuestion: 'Как участвовать в аукционе?',
  auctionPage_faqAuctionAnswer:
    'Выберите объект, внесите обеспечительный платёж и делайте ставки до окончания таймера. Побеждает участник с лучшей ценой — дальше сделка проходит через платформу.',
  auctionPage_faqBuyNowQuestion: 'Чем «Купить сейчас» отличается от аукциона?',
  auctionPage_faqBuyNowAnswer:
    'В формате «Купить сейчас» цена фиксирована: без торгов и ожидания. Подходит, если хотите быстро закрыть сделку по понятной стоимости.',
  auctionPage_faqSharesQuestion: 'Что такое доли и с какой суммы можно войти?',
  auctionPage_faqSharesAnswer:
    'Доли позволяют инвестировать в крупные объекты частями. Стартовый порог зависит от лота — часто это заметно ниже стоимости целого объекта.',
  auctionPage_faqDebtsQuestion: 'Как работают инвестиции в долги?',
  auctionPage_faqDebtsAnswer:
    'Вы вкладываетесь в долговые инструменты под залог недвижимости и получаете доход по условиям конкретного предложения. Риски и ставка указаны в карточке.',
  auctionPage_faqSafeQuestion: 'Насколько безопасно покупать через SellYourBrick?',
  auctionPage_faqSafeAnswer:
    'Сделки и платежи проходят в контуре платформы, а по объектам доступны ключевые данные и сопровождение. Перед покупкой всегда изучайте карточку и условия формата.',
}

PACK.en = {
  auctionPage_emptyTitle: 'No properties yet',
  auctionPage_emptyDesc:
    'New listings will appear here. Meanwhile, browse other sections.',
  auctionPage_emptyPrimary: 'See other properties',
  buyerEmpty_continueSearch: "Let's keep looking",
  auctionPage_faqTitlePrefix: 'Frequently asked',
  auctionPage_faqTitleAccent: 'questions',
  auctionPage_faqSubtitle:
    'A short guide to sale formats, risks, and how to get started on the platform',
  auctionPage_faqAuctionQuestion: 'How do I take part in an auction?',
  auctionPage_faqAuctionAnswer:
    'Pick a listing, place the required deposit, and bid until the timer ends. The highest bid wins — then the deal continues through the platform.',
  auctionPage_faqBuyNowQuestion: 'How is Buy now different from an auction?',
  auctionPage_faqBuyNowAnswer:
    'Buy now listings have a fixed price: no bidding and no waiting. Ideal if you want to close quickly at a clear cost.',
  auctionPage_faqSharesQuestion: 'What are shares, and what’s the entry amount?',
  auctionPage_faqSharesAnswer:
    'Shares let you invest in larger properties in parts. The entry threshold depends on the lot — often much lower than the full property price.',
  auctionPage_faqDebtsQuestion: 'How do debt investments work?',
  auctionPage_faqDebtsAnswer:
    'You invest in debt instruments secured by real estate and earn returns per the specific offer. Risks and the rate are shown on the card.',
  auctionPage_faqSafeQuestion: 'How safe is buying through SellYourBrick?',
  auctionPage_faqSafeAnswer:
    'Deals and payments stay within the platform, with key property data and support available. Always review the listing and format terms before buying.',
}

PACK.de = {
  auctionPage_emptyTitle: 'Noch keine Objekte',
  auctionPage_emptyDesc:
    'Neue Angebote erscheinen hier. Sehen Sie sich bis dahin andere Bereiche an.',
  auctionPage_emptyPrimary: 'Andere Objekte ansehen',
  buyerEmpty_continueSearch: 'Suche fortsetzen',
  auctionPage_faqTitlePrefix: 'Häufig gestellte',
  auctionPage_faqTitleAccent: 'Fragen',
  auctionPage_faqSubtitle:
    'Kurz zu Verkaufsformaten, Risiken und dem Einstieg auf der Plattform',
  auctionPage_faqAuctionQuestion: 'Wie nehme ich an einer Auktion teil?',
  auctionPage_faqAuctionAnswer:
    'Wählen Sie ein Objekt, hinterlegen Sie die Sicherheit und bieten Sie bis zum Timer-Ende. Den Zuschlag erhält das höchste Gebot — danach läuft der Deal über die Plattform.',
  auctionPage_faqBuyNowQuestion: 'Worin unterscheidet sich „Jetzt kaufen“ von einer Auktion?',
  auctionPage_faqBuyNowAnswer:
    'Bei „Jetzt kaufen“ ist der Preis fest: ohne Bieterkampf und ohne Warten. Ideal, wenn Sie schnell zu einem klaren Preis abschließen möchten.',
  auctionPage_faqSharesQuestion: 'Was sind Anteile, und ab welchem Betrag kann man einsteigen?',
  auctionPage_faqSharesAnswer:
    'Anteile ermöglichen Investitionen in größere Objekte in Teilen. Die Einstiegsschwelle hängt vom Los ab — oft deutlich unter dem Vollpreis.',
  auctionPage_faqDebtsQuestion: 'Wie funktionieren Investitionen in Schulden?',
  auctionPage_faqDebtsAnswer:
    'Sie investieren in schuldenbesicherte Instrumente und erhalten Ertrag laut Angebot. Risiken und Zinssatz stehen auf der Karte.',
  auctionPage_faqSafeQuestion: 'Wie sicher ist der Kauf über SellYourBrick?',
  auctionPage_faqSafeAnswer:
    'Geschäfte und Zahlungen laufen im Plattform-Umfeld; zu Objekten gibt es Kerndaten und Begleitung. Prüfen Sie vor dem Kauf stets Karte und Formatbedingungen.',
}

PACK.es = {
  auctionPage_emptyTitle: 'Aún no hay inmuebles',
  auctionPage_emptyDesc:
    'Aquí aparecerán nuevas ofertas. Mientras tanto, explore otras secciones.',
  auctionPage_emptyPrimary: 'Ver otros inmuebles',
  buyerEmpty_continueSearch: 'Sigamos buscando',
  auctionPage_faqTitlePrefix: 'Preguntas',
  auctionPage_faqTitleAccent: 'frecuentes',
  auctionPage_faqSubtitle:
    'Un resumen de formatos de venta, riesgos y cómo empezar en la plataforma',
  auctionPage_faqAuctionQuestion: '¿Cómo participo en una subasta?',
  auctionPage_faqAuctionAnswer:
    'Elija un inmueble, deposite la garantía y puje hasta que termine el temporizador. Gana la mejor oferta; después la operación continúa en la plataforma.',
  auctionPage_faqBuyNowQuestion: '¿En qué se diferencia «Comprar ahora» de una subasta?',
  auctionPage_faqBuyNowAnswer:
    'En «Comprar ahora» el precio es fijo: sin pujas ni esperas. Ideal si quiere cerrar rápido a un coste claro.',
  auctionPage_faqSharesQuestion: '¿Qué son las participaciones y desde qué importe se puede entrar?',
  auctionPage_faqSharesAnswer:
    'Las participaciones permiten invertir en inmuebles grandes por partes. El umbral depende del lote — a menudo mucho menor que el precio completo.',
  auctionPage_faqDebtsQuestion: '¿Cómo funcionan las inversiones en deudas?',
  auctionPage_faqDebtsAnswer:
    'Invierte en instrumentos de deuda con garantía inmobiliaria y obtiene rentabilidad según la oferta. Riesgos y tipo aparecen en la ficha.',
  auctionPage_faqSafeQuestion: '¿Qué tan seguro es comprar a través de SellYourBrick?',
  auctionPage_faqSafeAnswer:
    'Las operaciones y pagos se realizan en el entorno de la plataforma, con datos clave y acompañamiento. Revise siempre la ficha y las condiciones antes de comprar.',
}

PACK.fr = {
  auctionPage_emptyTitle: 'Aucun bien pour le moment',
  auctionPage_emptyDesc:
    'De nouvelles offres apparaîtront ici. En attendant, explorez d’autres sections.',
  auctionPage_emptyPrimary: 'Voir d’autres biens',
  buyerEmpty_continueSearch: 'Continuons la recherche',
  auctionPage_faqTitlePrefix: 'Questions',
  auctionPage_faqTitleAccent: 'fréquentes',
  auctionPage_faqSubtitle:
    'Un aperçu des formats de vente, des risques et du démarrage sur la plateforme',
  auctionPage_faqAuctionQuestion: 'Comment participer à une enchère ?',
  auctionPage_faqAuctionAnswer:
    'Choisissez un bien, versez le dépôt de garantie et enchérissez jusqu’à la fin du minuteur. La meilleure offre l’emporte — la transaction se poursuit ensuite via la plateforme.',
  auctionPage_faqBuyNowQuestion: 'En quoi « Acheter maintenant » diffère-t-il d’une enchère ?',
  auctionPage_faqBuyNowAnswer:
    'Avec « Acheter maintenant », le prix est fixe : sans enchères ni attente. Idéal pour conclure rapidement à un coût clair.',
  auctionPage_faqSharesQuestion: 'Que sont les parts, et à partir de quel montant peut-on entrer ?',
  auctionPage_faqSharesAnswer:
    'Les parts permettent d’investir dans de grands biens par fractions. Le seuil dépend du lot — souvent bien inférieur au prix total.',
  auctionPage_faqDebtsQuestion: 'Comment fonctionnent les investissements en dettes ?',
  auctionPage_faqDebtsAnswer:
    'Vous investissez dans des instruments de dette garantis par de l’immobilier et percevez un rendement selon l’offre. Risques et taux figurent sur la fiche.',
  auctionPage_faqSafeQuestion: 'Acheter via SellYourBrick est-il sûr ?',
  auctionPage_faqSafeAnswer:
    'Les transactions et paiements restent dans le périmètre de la plateforme, avec données clés et accompagnement. Examinez toujours la fiche et les conditions avant d’acheter.',
}

PACK.sv = {
  auctionPage_emptyTitle: 'Inga objekt ännu',
  auctionPage_emptyDesc:
    'Nya erbjudanden visas här. Under tiden kan du titta på andra sektioner.',
  auctionPage_emptyPrimary: 'Se andra objekt',
  buyerEmpty_continueSearch: 'Låt oss fortsätta söka',
  auctionPage_faqTitlePrefix: 'Vanliga',
  auctionPage_faqTitleAccent: 'frågor',
  auctionPage_faqSubtitle:
    'Kort om försäljningsformat, risker och hur du kommer igång på plattformen',
  auctionPage_faqAuctionQuestion: 'Hur deltar jag i en auktion?',
  auctionPage_faqAuctionAnswer:
    'Välj ett objekt, lägg säkerhetsdepositionen och buda tills timern går ut. Högsta bud vinner — därefter fortsätter affären via plattformen.',
  auctionPage_faqBuyNowQuestion: 'Hur skiljer sig «Köp nu» från en auktion?',
  auctionPage_faqBuyNowAnswer:
    'I «Köp nu» är priset fast: utan budgivning och utan väntan. Perfekt om du vill stänga snabbt till ett tydligt pris.',
  auctionPage_faqSharesQuestion: 'Vad är andelar, och från vilket belopp kan man gå in?',
  auctionPage_faqSharesAnswer:
    'Andelar låter dig investera i större objekt i delar. Tröskeln beror på lotten — ofta betydligt lägre än hela objektspriset.',
  auctionPage_faqDebtsQuestion: 'Hur fungerar investeringar i skulder?',
  auctionPage_faqDebtsAnswer:
    'Du investerar i skuldinstrument med fastighet som säkerhet och får avkastning enligt erbjudandet. Risker och ränta syns på kortet.',
  auctionPage_faqSafeQuestion: 'Hur säkert är det att köpa via SellYourBrick?',
  auctionPage_faqSafeAnswer:
    'Affärer och betalningar sker inom plattformen, med nyckeldata och stöd. Granska alltid kortet och formatvillkoren innan köp.',
}

// Polish mirrors English per project convention
PACK.pl = { ...PACK.en }

function mergeIntoDir(dir) {
  if (!fs.existsSync(dir)) {
    console.warn('skip missing dir', dir)
    return
  }
  for (const [lang, keys] of Object.entries(PACK)) {
    const filePath = path.join(dir, `${lang}.json`)
    if (!fs.existsSync(filePath)) {
      console.warn('skip missing', filePath)
      continue
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    let added = 0
    for (const [k, v] of Object.entries(keys)) {
      if (data[k] !== v) {
        data[k] = v
        added += 1
      }
    }
    fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`)
    console.log(`${path.relative(process.cwd(), filePath)}: upserted ${added} keys`)
  }
}

mergeIntoDir(primaryLocalesDir)
mergeIntoDir(legacyLocalesDir)
console.log('done')
