import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { FiArrowRight, FiPlay, FiX } from 'react-icons/fi'
import { publicAsset } from '../utils/publicAsset'
import './ProfileStrategyStories.css'

const STORY_DURATION_MS = 6500

const STORY_COPY = {
  ru: {
    triggerEyebrow: 'Персональный маршрут',
    triggerTitle: 'Подобрать стратегию',
    triggerText: '7 коротких историй о том, как можно купить недвижимость на SellYourBrick',
    triggerButton: 'Смотреть',
    close: 'Закрыть истории',
    previous: 'Предыдущая история',
    next: 'Следующая история',
    openSection: 'Перейти',
    start: 'Начать подбор',
    stories: [
      {
        eyebrow: 'SellYourBrick · 1 минута',
        title: 'Какая стратегия подходит вам?',
        text: 'У каждого формата своя задача: купить выгоднее, войти с меньшим бюджетом, быстро оформить сделку или сначала пожить в объекте. Покажем варианты без сложных терминов.',
        note: 'Касайтесь краёв экрана или просто смотрите — истории переключатся сами.',
      },
      {
        eyebrow: 'Стратегия 01',
        title: 'Аукцион',
        text: 'Аукцион подходит для тех, кто хочет купить объект по цене, которую определяет открытый спрос. Следите за ставками, заранее выберите свой предел и участвуйте в прозрачных торгах.',
        note: 'Вы видите конкуренцию и сами решаете, до какой суммы готовы идти.',
      },
      {
        eyebrow: 'Стратегия 02',
        title: 'Доли',
        text: 'Доли подходят для тех, кто хочет инвестировать в премиальную недвижимость с меньшим бюджетом и распределить капитал между несколькими объектами.',
        note: 'Вы покупаете часть объекта и инвестируете вместе с другими участниками.',
      },
      {
        eyebrow: 'Стратегия 03',
        title: 'Долги',
        text: 'Долговые объекты подходят для тех, кто ищет недвижимость со значительным дисконтом и готов внимательно оценивать юридические и финансовые риски.',
        note: 'Мы собираем ключевые данные, чтобы решение было осознанным.',
      },
      {
        eyebrow: 'Стратегия 04',
        title: 'Купить сейчас',
        text: 'Покупка по фиксированной цене подходит для тех, кто уже нашёл подходящий объект и хочет перейти к сделке без ставок и ожидания окончания торгов.',
        note: 'Понятная стоимость, известные условия и более короткий путь к покупке.',
      },
      {
        eyebrow: 'Стратегия 05',
        title: 'Тест-драйв',
        text: 'Тест-драйв подходит для тех, кто хочет пожить в объекте до покупки и проверить район, ежедневный ритм и детали, которых не видно на фотографиях.',
        note: 'Сначала примерьте недвижимость на себя — затем принимайте решение.',
      },
      {
        eyebrow: 'Ваш следующий шаг',
        title: 'Умный помощник',
        text: 'Умный помощник подходит для тех, кто пока не определился со стратегией. Расскажите о бюджете, цели и сроке — он соберёт персональный маршрут.',
        note: 'Ответьте на несколько вопросов и получите подходящие направления.',
      },
    ],
  },
  en: {
    triggerEyebrow: 'Your personal route',
    triggerTitle: 'Choose a strategy',
    triggerText: 'Seven quick stories about ways to buy property with SellYourBrick',
    triggerButton: 'Watch',
    close: 'Close stories',
    previous: 'Previous story',
    next: 'Next story',
    openSection: 'Explore',
    start: 'Start exploring',
    stories: [
      {
        eyebrow: 'SellYourBrick · 1 minute',
        title: 'Which strategy suits you?',
        text: 'Each format solves a different need: buy at a better price, enter with a smaller budget, move quickly or live in the property before deciding. We will explain every option clearly.',
        note: 'Tap the sides or keep watching — stories move on automatically.',
      },
      {
        eyebrow: 'Strategy 01',
        title: 'Auction',
        text: 'An auction suits buyers who want the price to be shaped by open demand. Follow the bids, set your limit in advance and take part on transparent terms.',
        note: 'You can see the competition and decide exactly how far you are prepared to go.',
      },
      {
        eyebrow: 'Strategy 02',
        title: 'Shares',
        text: 'Property shares suit investors who want access to premium real estate with a smaller budget and the freedom to spread capital across several properties.',
        note: 'You own part of a property and invest alongside other participants.',
      },
      {
        eyebrow: 'Strategy 03',
        title: 'Debts',
        text: 'Debt-related properties suit investors looking for a meaningful discount who are prepared to assess the legal and financial risks carefully.',
        note: 'We bring the key information together so you can make an informed decision.',
      },
      {
        eyebrow: 'Strategy 04',
        title: 'Buy now',
        text: 'Buying at a fixed price suits people who have found the right property and want to move forward without bidding or waiting for an auction to finish.',
        note: 'A known price, clear terms and a shorter path to purchase.',
      },
      {
        eyebrow: 'Strategy 05',
        title: 'Test drive',
        text: 'A test drive suits buyers who want to live in the property before purchasing and experience the neighbourhood, daily rhythm and details that photos cannot show.',
        note: 'Try the property in real life, then make your decision.',
      },
      {
        eyebrow: 'Your next step',
        title: 'Smart assistant',
        text: 'The smart assistant suits anyone who has not chosen a strategy yet. Share your budget, goal and timeline, and it will build a personal route.',
        note: 'Answer a few questions to see the directions that fit you.',
      },
    ],
  },
  es: {
    triggerEyebrow: 'Tu ruta personal',
    triggerTitle: 'Elegir una estrategia',
    triggerText: '7 historias cortas sobre cómo comprar inmuebles en SellYourBrick',
    triggerButton: 'Ver',
    close: 'Cerrar historias',
    previous: 'Historia anterior',
    next: 'Historia siguiente',
    openSection: 'Explorar',
    start: 'Empezar',
    stories: [
      {
        eyebrow: 'SellYourBrick · 1 minuto',
        title: '¿Qué estrategia te encaja?',
        text: 'Cada formato resuelve una necesidad distinta: comprar mejor, entrar con menos presupuesto, cerrar rápido o vivir primero en el inmueble. Te lo explicamos con claridad.',
        note: 'Toca los bordes o sigue mirando: las historias avanzan solas.',
      },
      {
        eyebrow: 'Estrategia 01',
        title: 'Subasta',
        text: 'La subasta encaja si quieres que el precio lo marque la demanda abierta. Sigue las pujas, define tu límite y participa con reglas transparentes.',
        note: 'Ves la competencia y decides hasta dónde estás dispuesto a llegar.',
      },
      {
        eyebrow: 'Estrategia 02',
        title: 'Participaciones',
        text: 'Las participaciones encajan si quieres invertir en inmuebles premium con menos capital y repartir el riesgo entre varios activos.',
        note: 'Compras una parte del inmueble e inviertes junto a otros participantes.',
      },
      {
        eyebrow: 'Estrategia 03',
        title: 'Deudas',
        text: 'Los inmuebles con deuda encajan si buscas un descuento relevante y estás listo para valorar con cuidado los riesgos legales y financieros.',
        note: 'Reunimos la información clave para que decidas con criterio.',
      },
      {
        eyebrow: 'Estrategia 04',
        title: 'Comprar ahora',
        text: 'Comprar a precio fijo encaja si ya encontraste el inmueble y quieres avanzar sin pujas ni esperar el fin de una subasta.',
        note: 'Precio claro, condiciones conocidas y un camino más corto hacia la compra.',
      },
      {
        eyebrow: 'Estrategia 05',
        title: 'Test drive',
        text: 'El test drive encaja si quieres vivir en el inmueble antes de comprar y comprobar barrio, ritmo diario y detalles que no se ven en las fotos.',
        note: 'Prueba el inmueble en la vida real y luego decide.',
      },
      {
        eyebrow: 'Tu siguiente paso',
        title: 'Asistente inteligente',
        text: 'El asistente inteligente encaja si aún no has elegido estrategia. Cuéntale presupuesto, objetivo y plazo: te arma una ruta personal.',
        note: 'Responde unas preguntas y verás las direcciones que te encajan.',
      },
    ],
  },
  de: {
    triggerEyebrow: 'Ihre persönliche Route',
    triggerTitle: 'Strategie wählen',
    triggerText: '7 kurze Geschichten über den Immobilienkauf bei SellYourBrick',
    triggerButton: 'Ansehen',
    close: 'Geschichten schließen',
    previous: 'Vorherige Geschichte',
    next: 'Nächste Geschichte',
    openSection: 'Entdecken',
    start: 'Starten',
    stories: [
      {
        eyebrow: 'SellYourBrick · 1 Minute',
        title: 'Welche Strategie passt zu Ihnen?',
        text: 'Jedes Format löst eine andere Aufgabe: günstiger kaufen, mit kleinerem Budget einsteigen, schnell abschließen oder zuerst im Objekt wohnen. Wir erklären die Optionen klar.',
        note: 'Tippen Sie an die Ränder oder schauen Sie weiter — die Geschichten wechseln automatisch.',
      },
      {
        eyebrow: 'Strategie 01',
        title: 'Auktion',
        text: 'Eine Auktion passt, wenn der Preis durch offene Nachfrage entsteht. Folgen Sie den Geboten, setzen Sie Ihr Limit und nehmen Sie transparent teil.',
        note: 'Sie sehen den Wettbewerb und entscheiden selbst, wie weit Sie gehen.',
      },
      {
        eyebrow: 'Strategie 02',
        title: 'Anteile',
        text: 'Anteile passen, wenn Sie in Premium-Immobilien mit kleinerem Budget investieren und Kapital auf mehrere Objekte verteilen möchten.',
        note: 'Sie kaufen einen Teil des Objekts und investieren mit anderen Teilnehmern.',
      },
      {
        eyebrow: 'Strategie 03',
        title: 'Schulden',
        text: 'Objekte mit Schulden passen, wenn Sie einen spürbaren Abschlag suchen und rechtliche sowie finanzielle Risiken sorgfältig prüfen wollen.',
        note: 'Wir bündeln die wichtigsten Daten für eine bewusste Entscheidung.',
      },
      {
        eyebrow: 'Strategie 04',
        title: 'Sofort kaufen',
        text: 'Der Festpreiskauf passt, wenn Sie das passende Objekt gefunden haben und ohne Gebote oder Auktionsende weitermachen wollen.',
        note: 'Klarer Preis, bekannte Konditionen und ein kürzerer Weg zum Kauf.',
      },
      {
        eyebrow: 'Strategie 05',
        title: 'Testfahrt',
        text: 'Eine Testfahrt passt, wenn Sie vor dem Kauf im Objekt wohnen und Viertel, Alltag und Details prüfen wollen, die Fotos nicht zeigen.',
        note: 'Probieren Sie die Immobilie im echten Leben — dann entscheiden Sie.',
      },
      {
        eyebrow: 'Ihr nächster Schritt',
        title: 'Smart Assistant',
        text: 'Der Smart Assistant passt, wenn Sie noch keine Strategie gewählt haben. Nennen Sie Budget, Ziel und Zeitraum — er baut Ihre persönliche Route.',
        note: 'Beantworten Sie ein paar Fragen und sehen Sie passende Richtungen.',
      },
    ],
  },
  fr: {
    triggerEyebrow: 'Votre parcours personnel',
    triggerTitle: 'Choisir une stratégie',
    triggerText: '7 courtes histoires sur l’achat immobilier avec SellYourBrick',
    triggerButton: 'Regarder',
    close: 'Fermer les histoires',
    previous: 'Histoire précédente',
    next: 'Histoire suivante',
    openSection: 'Explorer',
    start: 'Commencer',
    stories: [
      {
        eyebrow: 'SellYourBrick · 1 minute',
        title: 'Quelle stratégie vous convient ?',
        text: 'Chaque format répond à un besoin : acheter mieux, entrer avec un budget plus petit, conclure vite ou vivre d’abord dans le bien. Nous expliquons chaque option clairement.',
        note: 'Touchez les bords ou continuez à regarder — les histoires avancent toutes seules.',
      },
      {
        eyebrow: 'Stratégie 01',
        title: 'Enchère',
        text: 'L’enchère convient si vous voulez que le prix soit façonné par la demande ouverte. Suivez les offres, fixez votre limite et participez en toute transparence.',
        note: 'Vous voyez la concurrence et décidez jusqu’où aller.',
      },
      {
        eyebrow: 'Stratégie 02',
        title: 'Parts',
        text: 'Les parts conviennent si vous voulez investir dans l’immobilier premium avec un budget plus réduit et répartir le capital sur plusieurs biens.',
        note: 'Vous achetez une partie du bien et investissez avec d’autres participants.',
      },
      {
        eyebrow: 'Stratégie 03',
        title: 'Dettes',
        text: 'Les biens avec dettes conviennent si vous cherchez une décote significative et acceptez d’évaluer soigneusement les risques juridiques et financiers.',
        note: 'Nous réunissons les infos clés pour une décision éclairée.',
      },
      {
        eyebrow: 'Stratégie 04',
        title: 'Acheter maintenant',
        text: 'L’achat au prix fixe convient si vous avez trouvé le bon bien et voulez avancer sans enchères ni attendre la fin d’une vente.',
        note: 'Prix clair, conditions connues et chemin plus court vers l’achat.',
      },
      {
        eyebrow: 'Stratégie 05',
        title: 'Essai',
        text: 'L’essai convient si vous voulez vivre dans le bien avant d’acheter et vérifier le quartier, le rythme quotidien et les détails invisibles sur les photos.',
        note: 'Essayez le bien dans la vraie vie, puis décidez.',
      },
      {
        eyebrow: 'Votre prochaine étape',
        title: 'Assistant intelligent',
        text: 'L’assistant intelligent convient si vous n’avez pas encore choisi de stratégie. Indiquez budget, objectif et délai — il construit votre parcours.',
        note: 'Répondez à quelques questions et voyez les directions qui vous correspondent.',
      },
    ],
  },
  pl: {
    triggerEyebrow: 'Twój osobisty szlak',
    triggerTitle: 'Dobierz strategię',
    triggerText: '7 krótkich historii o kupnie nieruchomości na SellYourBrick',
    triggerButton: 'Obejrzyj',
    close: 'Zamknij historie',
    previous: 'Poprzednia historia',
    next: 'Następna historia',
    openSection: 'Zobacz',
    start: 'Zacznij',
    stories: [
      {
        eyebrow: 'SellYourBrick · 1 minuta',
        title: 'Która strategia do Ciebie pasuje?',
        text: 'Każdy format rozwiązuje inną potrzebę: kupić taniej, wejść z mniejszym budżetem, szybko domknąć transakcję albo najpierw zamieszkać w obiekcie. Wyjaśnimy opcje bez skomplikowanych terminów.',
        note: 'Dotknij krawędzi ekranu lub po prostu oglądaj — historie przełączą się same.',
      },
      {
        eyebrow: 'Strategia 01',
        title: 'Aukcja',
        text: 'Aukcja pasuje, gdy chcesz, by cenę kształtował otwarty popyt. Śledź oferty, ustal swój limit i bierz udział na przejrzystych zasadach.',
        note: 'Widzisz konkurencję i sam decydujesz, jak daleko możesz pójść.',
      },
      {
        eyebrow: 'Strategia 02',
        title: 'Udziały',
        text: 'Udziały pasują, gdy chcesz inwestować w premium z mniejszym budżetem i rozłożyć kapitał na kilka obiektów.',
        note: 'Kupujesz część obiektu i inwestujesz razem z innymi uczestnikami.',
      },
      {
        eyebrow: 'Strategia 03',
        title: 'Długi',
        text: 'Obiekty z długami pasują, gdy szukasz wyraźnego dyskonta i jesteś gotów uważnie ocenić ryzyka prawne oraz finansowe.',
        note: 'Zbieramy kluczowe dane, by decyzja była świadoma.',
      },
      {
        eyebrow: 'Strategia 04',
        title: 'Kup teraz',
        text: 'Zakup w cenie stałej pasuje, gdy znalazłeś właściwy obiekt i chcesz iść dalej bez licytacji i czekania na koniec aukcji.',
        note: 'Jasna cena, znane warunki i krótsza droga do zakupu.',
      },
      {
        eyebrow: 'Strategia 05',
        title: 'Test-drive',
        text: 'Test-drive pasuje, gdy chcesz zamieszkać w obiekcie przed zakupem i sprawdzić okolicę, rytm dnia oraz detale, których nie widać na zdjęciach.',
        note: 'Wypróbuj nieruchomość w realnym życiu, a potem zdecyduj.',
      },
      {
        eyebrow: 'Twój kolejny krok',
        title: 'Inteligentny asystent',
        text: 'Inteligentny asystent pasuje, gdy jeszcze nie wybrałeś strategii. Podaj budżet, cel i termin — zbierze osobisty szlak.',
        note: 'Odpowiedz na kilka pytań i zobacz kierunki, które do Ciebie pasują.',
      },
    ],
  },
  sv: {
    triggerEyebrow: 'Din personliga väg',
    triggerTitle: 'Välj en strategi',
    triggerText: '7 korta berättelser om hur du köper fastighet med SellYourBrick',
    triggerButton: 'Titta',
    close: 'Stäng berättelser',
    previous: 'Föregående berättelse',
    next: 'Nästa berättelse',
    openSection: 'Utforska',
    start: 'Börja',
    stories: [
      {
        eyebrow: 'SellYourBrick · 1 minut',
        title: 'Vilken strategi passar dig?',
        text: 'Varje format löser ett annat behov: köpa bättre, gå in med mindre budget, avsluta snabbt eller bo i objektet först. Vi förklarar varje alternativ tydligt.',
        note: 'Tryck på kanterna eller fortsätt titta — berättelserna byts automatiskt.',
      },
      {
        eyebrow: 'Strategi 01',
        title: 'Auktion',
        text: 'Auktion passar dig som vill att priset formas av öppen efterfrågan. Följ buden, sätt din gräns i förväg och delta på transparenta villkor.',
        note: 'Du ser konkurrensen och bestämmer själv hur långt du vill gå.',
      },
      {
        eyebrow: 'Strategi 02',
        title: 'Andelar',
        text: 'Andelar passar dig som vill investera i premiumfastigheter med mindre budget och sprida kapital över flera objekt.',
        note: 'Du köper en del av objektet och investerar tillsammans med andra deltagare.',
      },
      {
        eyebrow: 'Strategi 03',
        title: 'Skulder',
        text: 'Objekt med skulder passar dig som söker en tydlig rabatt och är beredd att noga bedöma juridiska och finansiella risker.',
        note: 'Vi samlar nyckelinformationen så att beslutet blir genomtänkt.',
      },
      {
        eyebrow: 'Strategi 04',
        title: 'Köp nu',
        text: 'Köp till fast pris passar dig som redan hittat rätt objekt och vill gå vidare utan budgivning eller väntan på auktionens slut.',
        note: 'Tydligt pris, kända villkor och en kortare väg till köp.',
      },
      {
        eyebrow: 'Strategi 05',
        title: 'Testdrive',
        text: 'Testdrive passar dig som vill bo i objektet före köp och uppleva område, vardagsrytm och detaljer som foton inte visar.',
        note: 'Prova fastigheten i verkligheten — sedan bestämmer du.',
      },
      {
        eyebrow: 'Ditt nästa steg',
        title: 'Smart assistent',
        text: 'Den smarta assistenten passar dig som ännu inte valt strategi. Berätta budget, mål och tidplan — den bygger din personliga väg.',
        note: 'Svara på några frågor och se riktningarna som passar dig.',
      },
    ],
  },
}

const STORY_BLUEPRINTS = [
  {
    id: 'intro',
    tone: 'intro',
    image: publicAsset('images/mobile-discover/welcome-summer.png'),
  },
  {
    id: 'auction',
    tone: 'auction',
    image: publicAsset('images/home-sale-formats/summer-2026/sale-format-auction-summer.webp'),
    to: '/auction?filter=auction',
  },
  {
    id: 'shares',
    tone: 'shares',
    image: publicAsset('images/home-sale-formats/summer-2026/sale-format-shares-summer.webp'),
    to: '/co-investment',
  },
  {
    id: 'debts',
    tone: 'debts',
    image: publicAsset('images/home-sale-formats/summer-2026/sale-format-debts-summer.webp'),
    to: '/debts',
  },
  {
    id: 'buy-now',
    tone: 'buy-now',
    image: publicAsset('images/home-sale-formats/summer-2026/sale-format-buy-now-summer.webp'),
    to: '/auction/buy-now',
  },
  {
    id: 'test-drive',
    tone: 'test-drive',
    image: publicAsset('images/test-drive/hero-resort-mobile.png'),
    to: '/test-drive',
  },
  {
    id: 'assistant',
    tone: 'assistant',
    image: publicAsset('images/mobile-discover/ai-trade-bg.png'),
    to: '/chat?assistant=1',
  },
]

function ProfileStrategyStories({ language = 'ru', showTrigger = true, openSignal = 0 }) {
  const { t } = useTranslation()
  const prefersReducedMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [runId, setRunId] = useState(0)
  const triggerRef = useRef(null)
  const closeRef = useRef(null)
  const localeCode = String(language || 'ru').toLowerCase().slice(0, 2)
  const locale = STORY_COPY[localeCode] ? localeCode : 'en'
  const copy = STORY_COPY[locale]
  const stories = useMemo(
    () => {
      const items = STORY_BLUEPRINTS.map((story, index) => ({ ...story, ...copy.stories[index] }))
      items.splice(items.length - 1, 0, {
        id: 'development', tone: 'shares', to: '/development',
        image: publicAsset('images/development/costa-adeje-cover.png'),
        eyebrow: 'DEVELOP', title: t('develop.heading'), text: t('develop.intro'), note: t('develop.forecastNote'),
      })
      return items
    },
    [copy, t],
  )
  const activeStory = stories[activeIndex]

  const closeStories = useCallback(() => {
    setOpen(false)
    window.setTimeout(() => triggerRef.current?.focus(), 0)
  }, [])

  const restartTimer = useCallback(() => setRunId((value) => value + 1), [])

  const goNext = useCallback(() => {
    setActiveIndex((index) => {
      if (index >= stories.length - 1) {
        window.setTimeout(closeStories, 0)
        return index
      }
      return index + 1
    })
    restartTimer()
  }, [closeStories, restartTimer, stories.length])

  const goPrevious = useCallback(() => {
    setActiveIndex((index) => Math.max(0, index - 1))
    restartTimer()
  }, [restartTimer])

  const openStories = useCallback(() => {
    setActiveIndex(0)
    restartTimer()
    setOpen(true)
  }, [restartTimer])

  useEffect(() => {
    if (openSignal > 0) openStories()
  }, [openSignal, openStories])

  useEffect(() => {
    if (!open) return undefined
    const timeout = window.setTimeout(goNext, STORY_DURATION_MS)
    return () => window.clearTimeout(timeout)
  }, [activeIndex, goNext, open, runId])

  useEffect(() => {
    if (!open) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.setTimeout(() => closeRef.current?.focus(), 0)
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeStories()
      if (event.key === 'ArrowLeft') goPrevious()
      if (event.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeStories, goNext, goPrevious, open])

  const handleStoryTap = (event) => {
    if (event.target.closest('button, a')) return
    const bounds = event.currentTarget.getBoundingClientRect()
    if (event.clientX - bounds.left < bounds.width / 2) goPrevious()
    else goNext()
  }

  return (
    <>
      {showTrigger ? (
        <button
          ref={triggerRef}
          type="button"
          className="profile-strategy-card"
          onClick={openStories}
          aria-haspopup="dialog"
        >
          <span className="profile-strategy-card__media" aria-hidden>
            <img
              src={publicAsset('images/mobile-discover/ai-trade-bg.png')}
              alt=""
              loading="lazy"
              decoding="async"
            />
          </span>
          <span className="profile-strategy-card__wash" aria-hidden />
          <span className="profile-strategy-card__copy">
            <span className="profile-strategy-card__eyebrow">{copy.triggerEyebrow}</span>
            <strong>{copy.triggerTitle}</strong>
            <span className="profile-strategy-card__text">{t('develop.storiesIntro')}</span>
          </span>
          <span className="profile-strategy-card__action">
            <FiPlay size={14} fill="currentColor" aria-hidden />
            {copy.triggerButton}
          </span>
        </button>
      ) : null}

      {typeof document !== 'undefined'
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  className="profile-strategy-stories"
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                  role="dialog"
                  aria-modal="true"
                  aria-label={copy.triggerTitle}
                >
                  <motion.div
                    className="profile-strategy-story"
                    data-tone={activeStory.tone}
                    onClick={handleStoryTap}
                    initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.97, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.98 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.img
                        key={activeStory.id}
                        className="profile-strategy-story__image"
                        src={activeStory.image}
                        alt=""
                        initial={prefersReducedMotion ? false : { opacity: 0, scale: 1.04 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.45 }}
                      />
                    </AnimatePresence>
                    <span className="profile-strategy-story__overlay" aria-hidden />

                    <div
                      className="profile-strategy-story__progress"
                      style={{ '--story-count': stories.length }}
                      aria-label={`${activeIndex + 1} / ${stories.length}`}
                    >
                      {stories.map((story, index) => (
                        <span key={story.id} className="profile-strategy-story__progress-track">
                          <span
                            key={`${story.id}-${index === activeIndex ? runId : 'static'}`}
                            className={`profile-strategy-story__progress-fill${
                              index < activeIndex
                                ? ' profile-strategy-story__progress-fill--done'
                                : index === activeIndex
                                  ? ' profile-strategy-story__progress-fill--active'
                                  : ''
                            }`}
                            style={
                              index === activeIndex
                                ? { animationDuration: `${STORY_DURATION_MS}ms` }
                                : undefined
                            }
                          />
                        </span>
                      ))}
                    </div>

                    <div className="profile-strategy-story__topline">
                      <span className="profile-strategy-story__brand">
                        <span aria-hidden>SYB</span>
                        SellYourBrick
                      </span>
                      <button
                        ref={closeRef}
                        type="button"
                        className="profile-strategy-story__close"
                        onClick={closeStories}
                        aria-label={copy.close}
                      >
                        <FiX size={22} aria-hidden />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="profile-strategy-story__tap profile-strategy-story__tap--previous"
                      onClick={goPrevious}
                      aria-label={copy.previous}
                    />
                    <button
                      type="button"
                      className="profile-strategy-story__tap profile-strategy-story__tap--next"
                      onClick={goNext}
                      aria-label={copy.next}
                    />

                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={activeStory.id}
                        className="profile-strategy-story__content"
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 22 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={prefersReducedMotion ? undefined : { opacity: 0, y: -10 }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.34, delay: 0.05 }}
                      >
                        <span className="profile-strategy-story__eyebrow">{activeStory.eyebrow}</span>
                        <h2>{activeStory.title}</h2>
                        <p>{activeStory.text}</p>
                        <span className="profile-strategy-story__note">{activeStory.note}</span>

                        {activeStory.to ? (
                          <Link
                            to={activeStory.to}
                            className="profile-strategy-story__cta"
                            onClick={closeStories}
                          >
                            <span>{activeStory.id === 'assistant' ? copy.start : copy.openSection}</span>
                            <FiArrowRight size={19} aria-hidden />
                          </Link>
                        ) : (
                          <button type="button" className="profile-strategy-story__cta" onClick={goNext}>
                            <span>{copy.start}</span>
                            <FiArrowRight size={19} aria-hidden />
                          </button>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  )
}

export default ProfileStrategyStories
