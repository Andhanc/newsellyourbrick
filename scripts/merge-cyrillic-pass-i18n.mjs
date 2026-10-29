import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const primaryLocalesDir = path.join(__dirname, '../src/i18n/locales/mainPage')
const legacyLocalesDir = path.join(__dirname, '../apps/client/src/legacy/i18n/locales/mainPage')

const storyFlat = JSON.parse(fs.readFileSync('/tmp/story_flat.json', 'utf8'))

const aboutScrollStory = {
  ru: {
    aboutScrollStory_badge: 'Платформа недвижимости',
    aboutScrollStory_subBefore: 'Погрузитесь в экосистему, где',
    aboutScrollStory_subStrong: 'поиск, карта, аукционы',
    aboutScrollStory_subAfter:
      'и забота о сделке живут в одном потоке — без лишних шагов и «кроличьих нор» из бесконечных таблиц и переписок.',
    aboutScrollStory_chapter1Eyebrow: 'Путеводитель • глава 1',
    aboutScrollStory_chapter1Title: 'Точка входа',
    aboutScrollStory_chapter1P1:
      'SellYourBrick — это место, где продавцы и покупатели встречаются на понятных правилах: прозрачные лоты на аукционе, быстрый «купить сейчас», карта объектов и подбор по тем параметрам, которые действительно важны — не только цена и площадь, но и контекст района, логистика просмотров и сопровождение.',
    aboutScrollStory_chapter1P2:
      'Мы строим сервис так, чтобы вы не теряли время на бесконечные уточнения: избранное и сравнение, напоминания, поддержка и подсказки на каждом шаге — всё рядом, в одном интерфейсе. Для инвесторов и дольщиков это ровно тот «центр управления», где данные о долях, бонусах и подписках не размазаны по десяти сервисам.',
    aboutScrollStory_chapter1P3:
      'Безопасность и доверие для нас не лозунг, а инфраструктура: верификации, аккуратная работа с персональными данными, поддержка и ясные сценарии — от первого клика до финала сделки. Дальше скролл превращается в спектакль: мы буквально «раскрываем сцену» и переносим вас внутрь истории платформы.',
    aboutScrollStory_revealWord: 'ПРОЗРАЧНОСТЬ',
    aboutScrollStory_revealP1:
      'Когда экран темнеет и сетка на фоне выглядит как ночной город, мы оказываемся в том самом потоке, где недвижимость перестаёт быть абстрактной строчкой в таблице. Вы буквально «падаете» через слои продукта: от карты районов и фильтров — к конкретным лотам, ставкам, истории активности и сигналам о том, когда пора действовать.',
    aboutScrollStory_revealP2:
      'На SellYourBrick аукцион — не хаос чисел, а ритм: видны шаги, тайминг, правила, прозрачная динамика цены. «Купить сейчас» остаётся для тех, кто ценит скорость и готов зафиксировать условия без ожидания финала торгов. Избранное, напоминания и сравнение объектов превращают хаос рынка в управляемую траекторию — как дорожная развязка, где каждый съезд понятно подписан.',
    aboutScrollStory_revealP3:
      'Документы, чек-листы, переписки с менеджером и уведомления не разбегаются по мессенджерам и почте без связи между собой. Мы хотим, чтобы вы чувствовали опору: всё, что относится к сделке, можно собрать в одном контуре — от первого интереса до спокойного «готово», без ощущения свободного падения в бюрократии.',
    aboutScrollStory_revealP4:
      'Для владельцев долей и инвесторов платформа открывает отдельный горизонт: аналитика, бонусы, подписки — не как галочки в презентации, а как рабочие инструменты. И да, технологии у нас вплетены в сервис ненавязчиво: TON-поддержка там, где это уместно, понятная оплата и вывод, понятная коммуникация с поддержкой.',
    aboutScrollStory_revealP5:
      'В какой‑то момент скорость становится почти музыкальной: карта машет контекстом, ставки напоминают про шанс дотянуться до цели, а чат поддерживает, когда нужен живой человеческий ответ. Мы хотим, чтобы вы вынырнули уверенно — как закончился свободный полёт и под ногами снова твёрдая земля: ясные условия, ясный следующий шаг, ясная цель.',
    aboutScrollStory_afterEyebrow: 'Навигация • финал блока',
    aboutScrollStory_afterTitle: 'Продолжение пути',
    aboutScrollStory_afterP1:
      'Впереди — команда и дорожная карта: мы каждый день улучшаем поиск, стабильность и опыт на мобильных устройствах, добавляем сценарии для продавцов и покупателей и укрепляем связку «данные ↔ интерфейс ↔ люди». Если вам откликается такой способ делать недвижимость понятнее — вы уже здесь.',
    aboutScrollStory_afterP2:
      'Спуститесь ниже по странице: познакомьтесь с таймлайном, командой и шагами, с которых удобнее всего начать — от карты объектов до подписки и инвестиционного калькулятора.',
  },
  en: {
    aboutScrollStory_badge: 'Real estate platform',
    aboutScrollStory_subBefore: 'Step into an ecosystem where',
    aboutScrollStory_subStrong: 'search, maps, and auctions',
    aboutScrollStory_subAfter:
      'and deal care live in one flow — without extra steps or rabbit holes of endless spreadsheets and chats.',
    aboutScrollStory_chapter1Eyebrow: 'Guide • chapter 1',
    aboutScrollStory_chapter1Title: 'Entry point',
    aboutScrollStory_chapter1P1:
      'SellYourBrick is where sellers and buyers meet on clear terms: transparent auction lots, fast buy-now deals, a property map, and matching by the parameters that truly matter — not only price and size, but neighbourhood context, viewing logistics, and support.',
    aboutScrollStory_chapter1P2:
      'We build the product so you do not lose time on endless clarifications: favourites and comparison, reminders, support and tips at every step — everything nearby, in one interface. For investors and co-owners it is the control centre where share data, bonuses and subscriptions are not scattered across ten services.',
    aboutScrollStory_chapter1P3:
      'Security and trust are infrastructure for us, not a slogan: verification, careful personal-data handling, support and clear scenarios — from the first click to the end of the deal. Next, the scroll becomes a stage: we literally open the scene and take you inside the platform story.',
    aboutScrollStory_revealWord: 'TRANSPARENCY',
    aboutScrollStory_revealP1:
      'When the screen darkens and the background grid looks like a night city, we enter the flow where property stops being an abstract spreadsheet row. You literally fall through product layers: from district maps and filters — to concrete lots, bids, activity history and signals for when to act.',
    aboutScrollStory_revealP2:
      'On SellYourBrick an auction is not number chaos but rhythm: steps, timing, rules and transparent price dynamics are visible. Buy now stays for those who value speed and want to lock terms without waiting for the auction finale. Favourites, reminders and comparison turn market chaos into a managed route — like a road junction where every exit is clearly signed.',
    aboutScrollStory_revealP3:
      'Documents, checklists, manager chats and notifications do not scatter across messengers and email without connection. We want you to feel grounded: everything related to the deal can live in one contour — from first interest to a calm “done”, without free-falling into bureaucracy.',
    aboutScrollStory_revealP4:
      'For share holders and investors the platform opens another horizon: analytics, bonuses, subscriptions — not presentation checkboxes, but working tools. And yes, technology is woven in gently: TON support where it fits, clear payments and withdrawals, clear communication with support.',
    aboutScrollStory_revealP5:
      'At some point speed becomes almost musical: the map waves context, bids remind you of a chance to reach the goal, and chat supports you when you need a human answer. We want you to surface confidently — as if free flight ended and solid ground is under your feet again: clear terms, a clear next step, a clear goal.',
    aboutScrollStory_afterEyebrow: 'Navigation • end of block',
    aboutScrollStory_afterTitle: 'Continue the path',
    aboutScrollStory_afterP1:
      'Ahead are the team and roadmap: every day we improve search, stability and mobile experience, add seller and buyer scenarios and strengthen the link “data ↔ interface ↔ people”. If this way of making property clearer resonates — you are already here.',
    aboutScrollStory_afterP2:
      'Scroll further down the page: meet the timeline, the team and the steps that are easiest to start with — from the property map to subscription and the investment calculator.',
  },
  de: {
    aboutScrollStory_badge: 'Immobilienplattform',
    aboutScrollStory_subBefore: 'Tauchen Sie ein in ein Ökosystem, in dem',
    aboutScrollStory_subStrong: 'Suche, Karte und Auktionen',
    aboutScrollStory_subAfter:
      'sowie Begleitung der Transaktion in einem Fluss leben — ohne Umwege und Kaninchenbaue aus endlosen Tabellen und Chats.',
    aboutScrollStory_chapter1Eyebrow: 'Reiseführer • Kapitel 1',
    aboutScrollStory_chapter1Title: 'Einstiegspunkt',
    aboutScrollStory_chapter1P1:
      'SellYourBrick ist der Ort, an dem Verkäufer und Käufer auf klaren Regeln zusammentreffen: transparente Auktionslose, schnelles „Jetzt kaufen“, Objektkarte und Auswahl nach Parametern, die wirklich zählen — nicht nur Preis und Fläche, sondern Kontext des Viertels, Besichtigungslogistik und Begleitung.',
    aboutScrollStory_chapter1P2:
      'Wir bauen den Service so, dass Sie keine Zeit mit endlosen Rückfragen verlieren: Favoriten und Vergleich, Erinnerungen, Support und Tipps in jedem Schritt — alles nah beieinander in einer Oberfläche. Für Investoren und Anteilseigner ist das genau das Kontrollzentrum, in dem Daten zu Anteilen, Boni und Abos nicht über zehn Dienste verteilt sind.',
    aboutScrollStory_chapter1P3:
      'Sicherheit und Vertrauen sind für uns Infrastruktur, kein Slogan: Verifizierung, sorgsamer Umgang mit Personendaten, Support und klare Szenarien — vom ersten Klick bis zum Abschluss. Danach wird der Scroll zur Bühne: Wir öffnen wörtlich die Szene und nehmen Sie mit in die Plattformgeschichte.',
    aboutScrollStory_revealWord: 'TRANSPARENZ',
    aboutScrollStory_revealP1:
      'Wenn der Bildschirm dunkel wird und das Raster wie eine Nachtstadt wirkt, sind wir in dem Fluss, in dem Immobilien keine abstrakte Tabellenzeile mehr sind. Sie fallen regelrecht durch Produktschichten: von Gebietskarten und Filtern — zu konkreten Losen, Geboten, Aktivitätsverlauf und Signalen, wann gehandelt werden sollte.',
    aboutScrollStory_revealP2:
      'Bei SellYourBrick ist die Auktion kein Zahlenchaos, sondern Rhythmus: Schritte, Timing, Regeln und transparente Preisdynamik sind sichtbar. „Jetzt kaufen“ bleibt für alle, die Tempo schätzen und Konditionen ohne Auktionsfinale fixieren wollen. Favoriten, Erinnerungen und Vergleich machen Markttumult zur steuerbaren Route.',
    aboutScrollStory_revealP3:
      'Dokumente, Checklisten, Manager-Chats und Benachrichtigungen zerstreuen sich nicht ohne Zusammenhang über Messenger und E-Mail. Wir wollen, dass Sie Halt spüren: alles zur Transaktion kann in einem Kontur leben — vom ersten Interesse bis zum ruhigen „fertig“.',
    aboutScrollStory_revealP4:
      'Für Anteilseigner und Investoren öffnet die Plattform einen eigenen Horizont: Analytics, Boni, Abos — keine Präsentationshäkchen, sondern Werkzeuge. Und ja, Technologie ist dezent verwoben: TON-Support, wo es passt, klare Zahlungen und Auszahlungen, klare Kommunikation mit dem Support.',
    aboutScrollStory_revealP5:
      'Irgendwann wird Tempo fast musikalisch: die Karte winkt mit Kontext, Gebote erinnern an die Chance zum Ziel, und der Chat hilft, wenn eine menschliche Antwort nötig ist. Wir wollen, dass Sie sicher auftauchen — klare Bedingungen, klarer nächster Schritt, klares Ziel.',
    aboutScrollStory_afterEyebrow: 'Navigation • Ende des Blocks',
    aboutScrollStory_afterTitle: 'Weiter auf dem Weg',
    aboutScrollStory_afterP1:
      'Voraus liegen Team und Roadmap: täglich verbessern wir Suche, Stabilität und Mobile-Erfahrung, ergänzen Szenarien für Verkäufer und Käufer und stärken die Verbindung „Daten ↔ Interface ↔ Menschen“. Wenn Ihnen dieser Weg gefällt — Sie sind schon hier.',
    aboutScrollStory_afterP2:
      'Scrollen Sie weiter: Timeline, Team und die Schritte, mit denen Sie am einfachsten starten — von der Objektkarte bis zum Abo und Investmentrechner.',
  },
  es: {
    aboutScrollStory_badge: 'Plataforma inmobiliaria',
    aboutScrollStory_subBefore: 'Sumérgete en un ecosistema donde',
    aboutScrollStory_subStrong: 'búsqueda, mapa y subastas',
    aboutScrollStory_subAfter:
      'y el cuidado de la operación viven en un solo flujo — sin pasos de más ni madrigueras de hojas de cálculo y chats interminables.',
    aboutScrollStory_chapter1Eyebrow: 'Guía • capítulo 1',
    aboutScrollStory_chapter1Title: 'Punto de entrada',
    aboutScrollStory_chapter1P1:
      'SellYourBrick es el lugar donde vendedores y compradores se encuentran con reglas claras: lotes transparentes en subasta, compra rápida «comprar ahora», mapa de inmuebles y selección por los parámetros que de verdad importan — no solo precio y superficie, sino contexto del barrio, logística de visitas y acompañamiento.',
    aboutScrollStory_chapter1P2:
      'Construimos el servicio para que no pierdas tiempo en aclaraciones infinitas: favoritos y comparación, recordatorios, soporte y consejos en cada paso — todo cerca, en una sola interfaz. Para inversores y copropietarios es el centro de control donde datos de participaciones, bonos y suscripciones no se dispersan en diez servicios.',
    aboutScrollStory_chapter1P3:
      'La seguridad y la confianza son infraestructura, no un eslogan: verificaciones, cuidado de datos personales, soporte y escenarios claros — del primer clic al cierre. Luego el scroll se convierte en escenario: abrimos la escena y te llevamos dentro de la historia de la plataforma.',
    aboutScrollStory_revealWord: 'TRANSPARENCIA',
    aboutScrollStory_revealP1:
      'Cuando la pantalla se oscurece y la cuadrícula parece una ciudad nocturna, entramos en el flujo donde el inmueble deja de ser una fila abstracta. Literalmente «caes» por capas del producto: del mapa de barrios y filtros — a lotes concretos, pujas, historial y señales de cuándo actuar.',
    aboutScrollStory_revealP2:
      'En SellYourBrick la subasta no es caos de números, sino ritmo: se ven pasos, timing, reglas y dinámica transparente del precio. «Comprar ahora» queda para quien valora la velocidad. Favoritos, recordatorios y comparación convierten el caos del mercado en una trayectoria gestionable.',
    aboutScrollStory_revealP3:
      'Documentos, checklists, chats con el manager y notificaciones no se dispersan sin vínculo. Queremos que sientas apoyo: todo lo de la operación puede vivir en un mismo contorno — del primer interés a un «listo» tranquilo.',
    aboutScrollStory_revealP4:
      'Para titulares de participaciones e inversores la plataforma abre otro horizonte: analítica, bonos, suscripciones — herramientas reales. Y sí, la tecnología está integrada con suavidad: soporte TON donde encaja, pagos y retiros claros, comunicación clara con soporte.',
    aboutScrollStory_revealP5:
      'En algún momento la velocidad se vuelve casi musical: el mapa da contexto, las pujas recuerdan la oportunidad y el chat ayuda cuando hace falta una respuesta humana. Queremos que resurjas con confianza: condiciones claras, siguiente paso claro, objetivo claro.',
    aboutScrollStory_afterEyebrow: 'Navegación • final del bloque',
    aboutScrollStory_afterTitle: 'Continúa el camino',
    aboutScrollStory_afterP1:
      'Delante están el equipo y la hoja de ruta: cada día mejoramos búsqueda, estabilidad y experiencia móvil, añadimos escenarios para vendedores y compradores y reforzamos el vínculo «datos ↔ interfaz ↔ personas». Si este modo de hacer la inmobiliaria más clara te resuena — ya estás aquí.',
    aboutScrollStory_afterP2:
      'Baja por la página: conoce la línea de tiempo, el equipo y los pasos más cómodos para empezar — del mapa de inmuebles a la suscripción y la calculadora de inversión.',
  },
  fr: {
    aboutScrollStory_badge: 'Plateforme immobilière',
    aboutScrollStory_subBefore: 'Plongez dans un écosystème où',
    aboutScrollStory_subStrong: 'recherche, carte et enchères',
    aboutScrollStory_subAfter:
      'et l’accompagnement de la transaction vivent dans un seul flux — sans détours ni terriers de tableaux et de chats sans fin.',
    aboutScrollStory_chapter1Eyebrow: 'Guide • chapitre 1',
    aboutScrollStory_chapter1Title: 'Point d’entrée',
    aboutScrollStory_chapter1P1:
      'SellYourBrick est le lieu où vendeurs et acheteurs se rencontrent selon des règles claires : lots d’enchères transparents, achat rapide « acheter maintenant », carte des biens et sélection selon les paramètres qui comptent vraiment — pas seulement le prix et la surface, mais le contexte du quartier, la logistique des visites et l’accompagnement.',
    aboutScrollStory_chapter1P2:
      'Nous construisons le service pour que vous ne perdiez pas de temps en clarifications sans fin : favoris et comparaison, rappels, support et conseils à chaque étape — tout à proximité, dans une seule interface. Pour les investisseurs et co-propriétaires, c’est le centre de contrôle où les données sur les parts, bonus et abonnements ne sont pas éparpillées.',
    aboutScrollStory_chapter1P3:
      'Sécurité et confiance sont pour nous une infrastructure, pas un slogan : vérifications, traitement soigneux des données, support et scénarios clairs — du premier clic à la fin de la transaction. Ensuite le scroll devient une scène : nous ouvrons littéralement le rideau.',
    aboutScrollStory_revealWord: 'TRANSPARENCE',
    aboutScrollStory_revealP1:
      'Quand l’écran s’assombrit et que la grille évoque une ville de nuit, nous entrons dans le flux où l’immobilier cesse d’être une ligne abstraite. Vous « tombeez » littéralement à travers les couches du produit : des cartes de quartiers et filtres — aux lots concrets, enchères, historique et signaux d’action.',
    aboutScrollStory_revealP2:
      'Sur SellYourBrick, l’enchère n’est pas un chaos de chiffres mais un rythme : étapes, timing, règles et dynamique de prix transparente. « Acheter maintenant » reste pour ceux qui veulent la vitesse. Favoris, rappels et comparaison transforment le chaos du marché en trajectoire maîtrisée.',
    aboutScrollStory_revealP3:
      'Documents, checklists, échanges avec le manager et notifications ne se dispersent pas sans lien. Nous voulons que vous sentiez un appui : tout ce qui concerne la transaction peut vivre dans un même contour — du premier intérêt à un « terminé » serein.',
    aboutScrollStory_revealP4:
      'Pour les détenteurs de parts et les investisseurs, la plateforme ouvre un autre horizon : analytics, bonus, abonnements — des outils de travail. Et oui, la technologie est intégrée en douceur : support TON là où c’est pertinent, paiements et retraits clairs.',
    aboutScrollStory_revealP5:
      'À un moment, la vitesse devient presque musicale : la carte apporte du contexte, les enchères rappellent la chance d’atteindre l’objectif, et le chat aide quand une réponse humaine est nécessaire. Nous voulons que vous ressortiez confiant : conditions claires, prochaine étape claire, objectif clair.',
    aboutScrollStory_afterEyebrow: 'Navigation • fin du bloc',
    aboutScrollStory_afterTitle: 'Poursuivre le chemin',
    aboutScrollStory_afterP1:
      'Devant : l’équipe et la feuille de route. Chaque jour nous améliorons la recherche, la stabilité et l’expérience mobile, ajoutons des scénarios vendeurs et acheteurs et renforçons le lien « données ↔ interface ↔ personnes ». Si cette façon de rendre l’immobilier plus clair vous parle — vous êtes déjà ici.',
    aboutScrollStory_afterP2:
      'Descendez sur la page : timeline, équipe et étapes les plus simples pour commencer — de la carte des biens à l’abonnement et au calculateur d’investissement.',
  },
  pl: {
    aboutScrollStory_badge: 'Platforma nieruchomości',
    aboutScrollStory_subBefore: 'Wejdź w ekosystem, w którym',
    aboutScrollStory_subStrong: 'wyszukiwanie, mapa i aukcje',
    aboutScrollStory_subAfter:
      'oraz opieka nad transakcją żyją w jednym przepływie — bez zbędnych kroków i króliczych nor z nieskończonych tabel i czatów.',
    aboutScrollStory_chapter1Eyebrow: 'Przewodnik • rozdział 1',
    aboutScrollStory_chapter1Title: 'Punkt wejścia',
    aboutScrollStory_chapter1P1:
      'SellYourBrick to miejsce, gdzie sprzedający i kupujący spotykają się na jasnych zasadach: przejrzyste loty aukcyjne, szybkie „kup teraz”, mapa obiektów i dobór według parametrów, które naprawdę mają znaczenie — nie tylko cena i metraż, lecz kontekst dzielnicy, logistyka oględzin i wsparcie.',
    aboutScrollStory_chapter1P2:
      'Budujemy serwis tak, byście nie tracili czasu na niekończące się doprecyzowania: ulubione i porównanie, przypomnienia, wsparcie i podpowiedzi na każdym kroku — wszystko blisko, w jednym interfejsie. Dla inwestorów i współwłaścicieli to centrum zarządzania, gdzie dane o udziałach, bonusach i subskrypcjach nie są rozsiane po dziesięciu usługach.',
    aboutScrollStory_chapter1P3:
      'Bezpieczeństwo i zaufanie to dla nas infrastruktura, nie slogan: weryfikacje, ostrożna praca z danymi, wsparcie i jasne scenariusze — od pierwszego kliknięcia do finału transakcji. Dalej scroll staje się sceną: dosłownie otwieramy kurtynę.',
    aboutScrollStory_revealWord: 'PRZEJRZYSTOŚĆ',
    aboutScrollStory_revealP1:
      'Gdy ekran ciemnieje, a siatka wygląda jak nocne miasto, jesteśmy w strumieniu, w którym nieruchomość przestaje być abstrakcyjnym wierszem tabeli. Dosłownie „spadacie” przez warstwy produktu: od map dzielnic i filtrów — do konkretnych lotów, stawek, historii aktywności i sygnałów, kiedy działać.',
    aboutScrollStory_revealP2:
      'Na SellYourBrick aukcja to nie chaos liczb, lecz rytm: widać kroki, timing, zasady i przejrzystą dynamikę ceny. „Kup teraz” zostaje dla tych, którzy cenią szybkość. Ulubione, przypomnienia i porównanie zamieniają chaos rynku w zarządzaną trajektorię.',
    aboutScrollStory_revealP3:
      'Dokumenty, checklisty, rozmowy z menedżerem i powiadomienia nie rozpraszają się bez związku. Chcemy, byście czuli oparcie: wszystko związane z transakcją może żyć w jednym konturze — od pierwszego zainteresowania do spokojnego „gotowe”.',
    aboutScrollStory_revealP4:
      'Dla właścicieli udziałów i inwestorów platforma otwiera osobny horyzont: analityka, bonusy, subskrypcje — narzędzia pracy. I tak, technologia jest wpleciona nienachalnie: wsparcie TON tam, gdzie pasuje, jasne płatności i wypłaty.',
    aboutScrollStory_revealP5:
      'W pewnym momencie prędkość staje się niemal muzyczna: mapa daje kontekst, stawki przypominają o szansie, a czat pomaga, gdy potrzebna jest ludzka odpowiedź. Chcemy, byście wynurzyli się pewnie: jasne warunki, jasny następny krok, jasny cel.',
    aboutScrollStory_afterEyebrow: 'Nawigacja • finał bloku',
    aboutScrollStory_afterTitle: 'Dalsza droga',
    aboutScrollStory_afterP1:
      'Przed nami zespół i roadmapa: codziennie poprawiamy wyszukiwanie, stabilność i doświadczenie mobilne, dodajemy scenariusze dla sprzedających i kupujących oraz wzmacniamy więź „dane ↔ interfejs ↔ ludzie”. Jeśli taki sposób czynienia nieruchomości bardziej zrozumiałymi do Was przemawia — jesteście już tu.',
    aboutScrollStory_afterP2:
      'Zjedźcie niżej na stronie: poznajcie timeline, zespół i kroki, od których najłatwiej zacząć — od mapy obiektów po subskrypcję i kalkulator inwestycyjny.',
  },
  sv: {
    aboutScrollStory_badge: 'Fastighetsplattform',
    aboutScrollStory_subBefore: 'Kliv in i ett ekosystem där',
    aboutScrollStory_subStrong: 'sökning, karta och auktioner',
    aboutScrollStory_subAfter:
      'och omsorg om affären lever i ett flöde — utan onödiga steg och kaninhål av oändliga tabeller och chattar.',
    aboutScrollStory_chapter1Eyebrow: 'Guide • kapitel 1',
    aboutScrollStory_chapter1Title: 'Ingångspunkt',
    aboutScrollStory_chapter1P1:
      'SellYourBrick är platsen där säljare och köpare möts på tydliga villkor: transparenta auktionslotter, snabb köp-nu, objektkarta och urval utifrån parametrar som verkligen spelar roll — inte bara pris och yta, utan områdeskontext, visningslogistik och stöd.',
    aboutScrollStory_chapter1P2:
      'Vi bygger tjänsten så att ni inte förlorar tid på oändliga förtydliganden: favoriter och jämförelse, påminnelser, support och tips i varje steg — allt nära, i ett gränssnitt. För investerare och andelsägare är det kontrollcentret där data om andelar, bonusar och prenumerationer inte är utspridda.',
    aboutScrollStory_chapter1P3:
      'Säkerhet och förtroende är infrastruktur för oss, inte ett slogan: verifieringar, omsorgsfull hantering av personuppgifter, support och tydliga scenarier — från första klick till affärens slut. Sedan blir scrollen en scen: vi öppnar bokstavligen ridån.',
    aboutScrollStory_revealWord: 'TRANSPARENS',
    aboutScrollStory_revealP1:
      'När skärmen mörknar och rutnätet liknar en nattstad är vi i flödet där fastigheter slutar vara en abstrakt tabellrad. Ni «faller» bokstavligen genom produktlager: från områdeskartor och filter — till konkreta lotter, bud, aktivitetshistorik och signaler om när det är dags att agera.',
    aboutScrollStory_revealP2:
      'På SellYourBrick är auktionen inte sifferkaos utan rytm: steg, timing, regler och transparent prisdynamik syns. Köp nu finns kvar för den som värdesätter hastighet. Favoriter, påminnelser och jämförelse förvandlar marknadskaos till en hanterbar bana.',
    aboutScrollStory_revealP3:
      'Dokument, checklistor, managerchattar och aviseringar sprids inte utan samband. Vi vill att ni ska känna stöd: allt som hör till affären kan samlas i en kontur — från första intresse till ett lugnt «klart».',
    aboutScrollStory_revealP4:
      'För andelsägare och investerare öppnar plattformen en egen horisont: analytics, bonusar, prenumerationer — arbetsverktyg. Och ja, tekniken är försiktigt invävd: TON-stöd där det passar, tydliga betalningar och uttag.',
    aboutScrollStory_revealP5:
      'Vid någon punkt blir hastigheten nästan musikalisk: kartan ger kontext, bud påminner om chansen att nå målet, och chatten stöttar när ni behöver ett mänskligt svar. Vi vill att ni ska dyka upp tryggt: tydliga villkor, tydligt nästa steg, tydligt mål.',
    aboutScrollStory_afterEyebrow: 'Navigation • blockets slut',
    aboutScrollStory_afterTitle: 'Fortsätt vägen',
    aboutScrollStory_afterP1:
      'Framför er finns teamet och roadmappen: varje dag förbättrar vi sökning, stabilitet och mobilupplevelse, lägger till scenarier för säljare och köpare och stärker länken «data ↔ gränssnitt ↔ människor». Om detta sätt att göra fastigheter tydligare resonerar — är ni redan här.',
    aboutScrollStory_afterP2:
      'Scrolla längre ner: lär känna tidslinjen, teamet och stegen som är enklast att börja med — från objektkartan till prenumeration och investeringskalkylatorn.',
  },
}

const cabinetHistory = {
  ru: {
    cabinetHistory_auctionWinFallback: 'Выигрыш аукциона',
    cabinetHistory_auctionWinSubtitle: 'Победа в аукционе',
    cabinetHistory_reserveTitle: 'Резерв · {{title}}',
    cabinetHistory_reserveInitials: 'РЗ',
    cabinetHistory_buyNowSubtitle: 'Купить сейчас',
    cabinetHistory_sharePurchaseFallback: 'Покупка доли',
    cabinetHistory_sharesPcs: '{{count}} шт.',
    cabinetHistory_sharesTitle: 'Доли · {{title}}',
    cabinetHistory_sharesInitials: 'ДЛ',
    cabinetHistory_sharesBought: 'Куплено долей: {{count}}',
    cabinetHistory_sharesPurchase: 'Покупка долей',
    cabinetHistory_propertyFallback: 'Объект #{{id}}',
    cabinetHistory_bidTitle: 'Ставка · {{title}}',
    cabinetHistory_bidInitials: 'СТ',
    cabinetHistory_bidSubtitle: 'Ставка в аукционе',
    cabinetHistory_sectionAuction: 'Аукцион',
    cabinetHistory_sectionReserves: 'Резервы',
    cabinetHistory_sectionShares: 'Доли',
    cabinetHistory_sectionBids: 'Ставки',
  },
  en: {
    cabinetHistory_auctionWinFallback: 'Auction win',
    cabinetHistory_auctionWinSubtitle: 'Auction victory',
    cabinetHistory_reserveTitle: 'Reserve · {{title}}',
    cabinetHistory_reserveInitials: 'RS',
    cabinetHistory_buyNowSubtitle: 'Buy now',
    cabinetHistory_sharePurchaseFallback: 'Share purchase',
    cabinetHistory_sharesPcs: '{{count}} pcs',
    cabinetHistory_sharesTitle: 'Shares · {{title}}',
    cabinetHistory_sharesInitials: 'SH',
    cabinetHistory_sharesBought: 'Shares bought: {{count}}',
    cabinetHistory_sharesPurchase: 'Share purchase',
    cabinetHistory_propertyFallback: 'Property #{{id}}',
    cabinetHistory_bidTitle: 'Bid · {{title}}',
    cabinetHistory_bidInitials: 'BD',
    cabinetHistory_bidSubtitle: 'Auction bid',
    cabinetHistory_sectionAuction: 'Auction',
    cabinetHistory_sectionReserves: 'Reserves',
    cabinetHistory_sectionShares: 'Shares',
    cabinetHistory_sectionBids: 'Bids',
  },
  de: {
    cabinetHistory_auctionWinFallback: 'Auktionsgewinn',
    cabinetHistory_auctionWinSubtitle: 'Sieg in der Auktion',
    cabinetHistory_reserveTitle: 'Reserve · {{title}}',
    cabinetHistory_reserveInitials: 'RS',
    cabinetHistory_buyNowSubtitle: 'Jetzt kaufen',
    cabinetHistory_sharePurchaseFallback: 'Anteilskauf',
    cabinetHistory_sharesPcs: '{{count}} Stk.',
    cabinetHistory_sharesTitle: 'Anteile · {{title}}',
    cabinetHistory_sharesInitials: 'AN',
    cabinetHistory_sharesBought: 'Gekaufte Anteile: {{count}}',
    cabinetHistory_sharesPurchase: 'Anteilskauf',
    cabinetHistory_propertyFallback: 'Objekt #{{id}}',
    cabinetHistory_bidTitle: 'Gebot · {{title}}',
    cabinetHistory_bidInitials: 'GB',
    cabinetHistory_bidSubtitle: 'Auktionsgebot',
    cabinetHistory_sectionAuction: 'Auktion',
    cabinetHistory_sectionReserves: 'Reserven',
    cabinetHistory_sectionShares: 'Anteile',
    cabinetHistory_sectionBids: 'Gebote',
  },
  es: {
    cabinetHistory_auctionWinFallback: 'Ganancia de subasta',
    cabinetHistory_auctionWinSubtitle: 'Victoria en subasta',
    cabinetHistory_reserveTitle: 'Reserva · {{title}}',
    cabinetHistory_reserveInitials: 'RS',
    cabinetHistory_buyNowSubtitle: 'Comprar ahora',
    cabinetHistory_sharePurchaseFallback: 'Compra de participación',
    cabinetHistory_sharesPcs: '{{count}} uds.',
    cabinetHistory_sharesTitle: 'Participaciones · {{title}}',
    cabinetHistory_sharesInitials: 'PR',
    cabinetHistory_sharesBought: 'Participaciones compradas: {{count}}',
    cabinetHistory_sharesPurchase: 'Compra de participaciones',
    cabinetHistory_propertyFallback: 'Inmueble #{{id}}',
    cabinetHistory_bidTitle: 'Puja · {{title}}',
    cabinetHistory_bidInitials: 'PJ',
    cabinetHistory_bidSubtitle: 'Puja en subasta',
    cabinetHistory_sectionAuction: 'Subasta',
    cabinetHistory_sectionReserves: 'Reservas',
    cabinetHistory_sectionShares: 'Participaciones',
    cabinetHistory_sectionBids: 'Pujas',
  },
  fr: {
    cabinetHistory_auctionWinFallback: 'Gain d’enchère',
    cabinetHistory_auctionWinSubtitle: 'Victoire aux enchères',
    cabinetHistory_reserveTitle: 'Réserve · {{title}}',
    cabinetHistory_reserveInitials: 'RS',
    cabinetHistory_buyNowSubtitle: 'Acheter maintenant',
    cabinetHistory_sharePurchaseFallback: 'Achat de part',
    cabinetHistory_sharesPcs: '{{count}} pcs',
    cabinetHistory_sharesTitle: 'Parts · {{title}}',
    cabinetHistory_sharesInitials: 'PT',
    cabinetHistory_sharesBought: 'Parts achetées : {{count}}',
    cabinetHistory_sharesPurchase: 'Achat de parts',
    cabinetHistory_propertyFallback: 'Bien #{{id}}',
    cabinetHistory_bidTitle: 'Enchère · {{title}}',
    cabinetHistory_bidInitials: 'EN',
    cabinetHistory_bidSubtitle: 'Enchère',
    cabinetHistory_sectionAuction: 'Enchères',
    cabinetHistory_sectionReserves: 'Réserves',
    cabinetHistory_sectionShares: 'Parts',
    cabinetHistory_sectionBids: 'Offres',
  },
  pl: {
    cabinetHistory_auctionWinFallback: 'Wygrana aukcji',
    cabinetHistory_auctionWinSubtitle: 'Zwycięstwo w aukcji',
    cabinetHistory_reserveTitle: 'Rezerwa · {{title}}',
    cabinetHistory_reserveInitials: 'RZ',
    cabinetHistory_buyNowSubtitle: 'Kup teraz',
    cabinetHistory_sharePurchaseFallback: 'Zakup udziału',
    cabinetHistory_sharesPcs: '{{count}} szt.',
    cabinetHistory_sharesTitle: 'Udziały · {{title}}',
    cabinetHistory_sharesInitials: 'UD',
    cabinetHistory_sharesBought: 'Kupione udziały: {{count}}',
    cabinetHistory_sharesPurchase: 'Zakup udziałów',
    cabinetHistory_propertyFallback: 'Obiekt #{{id}}',
    cabinetHistory_bidTitle: 'Oferta · {{title}}',
    cabinetHistory_bidInitials: 'OF',
    cabinetHistory_bidSubtitle: 'Oferta w aukcji',
    cabinetHistory_sectionAuction: 'Aukcja',
    cabinetHistory_sectionReserves: 'Rezerwy',
    cabinetHistory_sectionShares: 'Udziały',
    cabinetHistory_sectionBids: 'Oferty',
  },
  sv: {
    cabinetHistory_auctionWinFallback: 'Auktionsvinst',
    cabinetHistory_auctionWinSubtitle: 'Seger i auktion',
    cabinetHistory_reserveTitle: 'Reserv · {{title}}',
    cabinetHistory_reserveInitials: 'RV',
    cabinetHistory_buyNowSubtitle: 'Köp nu',
    cabinetHistory_sharePurchaseFallback: 'Andelsköp',
    cabinetHistory_sharesPcs: '{{count}} st',
    cabinetHistory_sharesTitle: 'Andelar · {{title}}',
    cabinetHistory_sharesInitials: 'AN',
    cabinetHistory_sharesBought: 'Köpta andelar: {{count}}',
    cabinetHistory_sharesPurchase: 'Andelsköp',
    cabinetHistory_propertyFallback: 'Objekt #{{id}}',
    cabinetHistory_bidTitle: 'Bud · {{title}}',
    cabinetHistory_bidInitials: 'BD',
    cabinetHistory_bidSubtitle: 'Auktionsbud',
    cabinetHistory_sectionAuction: 'Auktion',
    cabinetHistory_sectionReserves: 'Reserver',
    cabinetHistory_sectionShares: 'Andelar',
    cabinetHistory_sectionBids: 'Bud',
  },
}

const marketerPanel = {
  ru: {
    marketerPanel_loginTitle: 'Панель маркетолога',
    marketerPanel_loginHint: 'Вход для публикации новостей и рекламы на сайте',
    marketerPanel_loginError: 'Ошибка входа',
    marketerPanel_loginLabel: 'Логин',
    marketerPanel_passwordLabel: 'Пароль',
    marketerPanel_loginSubmit: 'Войти',
    marketerPanel_loginSubmitting: 'Вход…',
    marketerPanel_backToNews: '← К новостям',
    marketerPanel_loadError: 'Ошибка загрузки',
    marketerPanel_deleteError: 'Не удалось удалить',
    marketerPanel_deleteNewsConfirm: 'Удалить эту новость с сайта?',
    marketerPanel_deleteAdConfirm: 'Удалить эту рекламу с сайта?',
    marketerPanel_title: 'Панель маркетолога',
    marketerPanel_subtitleNews: 'Генерация и публикация новостей',
    marketerPanel_subtitleAds: 'Управление рекламой на сайте',
    marketerPanel_generateNews: 'Сгенерировать новость',
    marketerPanel_createAd: 'Создать рекламу',
    marketerPanel_logout: 'Выйти',
    marketerPanel_tabsAria: 'Разделы панели',
    marketerPanel_tabNews: 'Новости',
    marketerPanel_tabAds: 'Реклама',
    marketerPanel_publishedTitle: 'Опубликованные материалы',
    marketerPanel_loading: 'Загрузка…',
    marketerPanel_emptyNews: 'Пока нет опубликованных новостей. Создайте первую через кнопку выше.',
    marketerPanel_statusPublished: 'опубликовано',
    marketerPanel_openOnSite: 'Открыть на сайте',
    marketerPanel_delete: 'Удалить',
    marketerPanel_goToNewsPage: 'Перейти на страницу новостей →',
    marketerPanel_activeAdsTitle: 'Активная реклама',
    marketerPanel_emptyAds: 'Рекламы пока нет. Создайте модальное окно или блок через кнопку выше.',
    marketerPanel_iconMegaphone: 'Мегафон',
    marketerPanel_buttonMeta: ' · Кнопка: {{url}}',
  },
  en: {
    marketerPanel_loginTitle: 'Marketer panel',
    marketerPanel_loginHint: 'Sign in to publish news and site ads',
    marketerPanel_loginError: 'Sign-in error',
    marketerPanel_loginLabel: 'Login',
    marketerPanel_passwordLabel: 'Password',
    marketerPanel_loginSubmit: 'Sign in',
    marketerPanel_loginSubmitting: 'Signing in…',
    marketerPanel_backToNews: '← Back to news',
    marketerPanel_loadError: 'Load error',
    marketerPanel_deleteError: 'Could not delete',
    marketerPanel_deleteNewsConfirm: 'Delete this news item from the site?',
    marketerPanel_deleteAdConfirm: 'Delete this ad from the site?',
    marketerPanel_title: 'Marketer panel',
    marketerPanel_subtitleNews: 'Generate and publish news',
    marketerPanel_subtitleAds: 'Manage site advertising',
    marketerPanel_generateNews: 'Generate news',
    marketerPanel_createAd: 'Create ad',
    marketerPanel_logout: 'Log out',
    marketerPanel_tabsAria: 'Panel sections',
    marketerPanel_tabNews: 'News',
    marketerPanel_tabAds: 'Ads',
    marketerPanel_publishedTitle: 'Published materials',
    marketerPanel_loading: 'Loading…',
    marketerPanel_emptyNews: 'No published news yet. Create the first one with the button above.',
    marketerPanel_statusPublished: 'published',
    marketerPanel_openOnSite: 'Open on site',
    marketerPanel_delete: 'Delete',
    marketerPanel_goToNewsPage: 'Go to news page →',
    marketerPanel_activeAdsTitle: 'Active ads',
    marketerPanel_emptyAds: 'No ads yet. Create a modal or block with the button above.',
    marketerPanel_iconMegaphone: 'Megaphone',
    marketerPanel_buttonMeta: ' · Button: {{url}}',
  },
  de: {
    marketerPanel_loginTitle: 'Marketer-Panel',
    marketerPanel_loginHint: 'Anmeldung zur Veröffentlichung von News und Werbung',
    marketerPanel_loginError: 'Anmeldefehler',
    marketerPanel_loginLabel: 'Login',
    marketerPanel_passwordLabel: 'Passwort',
    marketerPanel_loginSubmit: 'Anmelden',
    marketerPanel_loginSubmitting: 'Anmeldung…',
    marketerPanel_backToNews: '← Zu den News',
    marketerPanel_loadError: 'Ladefehler',
    marketerPanel_deleteError: 'Löschen fehlgeschlagen',
    marketerPanel_deleteNewsConfirm: 'Diesen Newsbeitrag von der Website löschen?',
    marketerPanel_deleteAdConfirm: 'Diese Werbung von der Website löschen?',
    marketerPanel_title: 'Marketer-Panel',
    marketerPanel_subtitleNews: 'News generieren und veröffentlichen',
    marketerPanel_subtitleAds: 'Website-Werbung verwalten',
    marketerPanel_generateNews: 'News generieren',
    marketerPanel_createAd: 'Werbung erstellen',
    marketerPanel_logout: 'Abmelden',
    marketerPanel_tabsAria: 'Panelbereiche',
    marketerPanel_tabNews: 'News',
    marketerPanel_tabAds: 'Werbung',
    marketerPanel_publishedTitle: 'Veröffentlichte Materialien',
    marketerPanel_loading: 'Laden…',
    marketerPanel_emptyNews: 'Noch keine veröffentlichten News. Erstellen Sie die erste über den Button oben.',
    marketerPanel_statusPublished: 'veröffentlicht',
    marketerPanel_openOnSite: 'Auf der Website öffnen',
    marketerPanel_delete: 'Löschen',
    marketerPanel_goToNewsPage: 'Zur News-Seite →',
    marketerPanel_activeAdsTitle: 'Aktive Werbung',
    marketerPanel_emptyAds: 'Noch keine Werbung. Erstellen Sie ein Modal oder einen Block über den Button oben.',
    marketerPanel_iconMegaphone: 'Megafon',
    marketerPanel_buttonMeta: ' · Button: {{url}}',
  },
  es: {
    marketerPanel_loginTitle: 'Panel de marketing',
    marketerPanel_loginHint: 'Acceso para publicar noticias y anuncios en el sitio',
    marketerPanel_loginError: 'Error de acceso',
    marketerPanel_loginLabel: 'Usuario',
    marketerPanel_passwordLabel: 'Contraseña',
    marketerPanel_loginSubmit: 'Entrar',
    marketerPanel_loginSubmitting: 'Entrando…',
    marketerPanel_backToNews: '← A noticias',
    marketerPanel_loadError: 'Error de carga',
    marketerPanel_deleteError: 'No se pudo eliminar',
    marketerPanel_deleteNewsConfirm: '¿Eliminar esta noticia del sitio?',
    marketerPanel_deleteAdConfirm: '¿Eliminar este anuncio del sitio?',
    marketerPanel_title: 'Panel de marketing',
    marketerPanel_subtitleNews: 'Generar y publicar noticias',
    marketerPanel_subtitleAds: 'Gestionar publicidad del sitio',
    marketerPanel_generateNews: 'Generar noticia',
    marketerPanel_createAd: 'Crear anuncio',
    marketerPanel_logout: 'Salir',
    marketerPanel_tabsAria: 'Secciones del panel',
    marketerPanel_tabNews: 'Noticias',
    marketerPanel_tabAds: 'Anuncios',
    marketerPanel_publishedTitle: 'Materiales publicados',
    marketerPanel_loading: 'Cargando…',
    marketerPanel_emptyNews: 'Aún no hay noticias publicadas. Cree la primera con el botón de arriba.',
    marketerPanel_statusPublished: 'publicado',
    marketerPanel_openOnSite: 'Abrir en el sitio',
    marketerPanel_delete: 'Eliminar',
    marketerPanel_goToNewsPage: 'Ir a la página de noticias →',
    marketerPanel_activeAdsTitle: 'Anuncios activos',
    marketerPanel_emptyAds: 'Aún no hay anuncios. Cree un modal o bloque con el botón de arriba.',
    marketerPanel_iconMegaphone: 'Megáfono',
    marketerPanel_buttonMeta: ' · Botón: {{url}}',
  },
  fr: {
    marketerPanel_loginTitle: 'Panel marketeur',
    marketerPanel_loginHint: 'Connexion pour publier des actualités et des publicités',
    marketerPanel_loginError: 'Erreur de connexion',
    marketerPanel_loginLabel: 'Identifiant',
    marketerPanel_passwordLabel: 'Mot de passe',
    marketerPanel_loginSubmit: 'Se connecter',
    marketerPanel_loginSubmitting: 'Connexion…',
    marketerPanel_backToNews: '← Vers les actualités',
    marketerPanel_loadError: 'Erreur de chargement',
    marketerPanel_deleteError: 'Impossible de supprimer',
    marketerPanel_deleteNewsConfirm: 'Supprimer cette actualité du site ?',
    marketerPanel_deleteAdConfirm: 'Supprimer cette publicité du site ?',
    marketerPanel_title: 'Panel marketeur',
    marketerPanel_subtitleNews: 'Générer et publier des actualités',
    marketerPanel_subtitleAds: 'Gérer la publicité du site',
    marketerPanel_generateNews: 'Générer une actualité',
    marketerPanel_createAd: 'Créer une publicité',
    marketerPanel_logout: 'Se déconnecter',
    marketerPanel_tabsAria: 'Sections du panel',
    marketerPanel_tabNews: 'Actualités',
    marketerPanel_tabAds: 'Publicité',
    marketerPanel_publishedTitle: 'Matériels publiés',
    marketerPanel_loading: 'Chargement…',
    marketerPanel_emptyNews: 'Pas encore d’actualités publiées. Créez la première via le bouton ci-dessus.',
    marketerPanel_statusPublished: 'publié',
    marketerPanel_openOnSite: 'Ouvrir sur le site',
    marketerPanel_delete: 'Supprimer',
    marketerPanel_goToNewsPage: 'Aller à la page actualités →',
    marketerPanel_activeAdsTitle: 'Publicités actives',
    marketerPanel_emptyAds: 'Pas encore de publicité. Créez une modale ou un bloc via le bouton ci-dessus.',
    marketerPanel_iconMegaphone: 'Mégaphone',
    marketerPanel_buttonMeta: ' · Bouton : {{url}}',
  },
  pl: {
    marketerPanel_loginTitle: 'Panel marketera',
    marketerPanel_loginHint: 'Logowanie do publikacji newsów i reklam na stronie',
    marketerPanel_loginError: 'Błąd logowania',
    marketerPanel_loginLabel: 'Login',
    marketerPanel_passwordLabel: 'Hasło',
    marketerPanel_loginSubmit: 'Zaloguj',
    marketerPanel_loginSubmitting: 'Logowanie…',
    marketerPanel_backToNews: '← Do newsów',
    marketerPanel_loadError: 'Błąd ładowania',
    marketerPanel_deleteError: 'Nie udało się usunąć',
    marketerPanel_deleteNewsConfirm: 'Usunąć ten news ze strony?',
    marketerPanel_deleteAdConfirm: 'Usunąć tę reklamę ze strony?',
    marketerPanel_title: 'Panel marketera',
    marketerPanel_subtitleNews: 'Generowanie i publikacja newsów',
    marketerPanel_subtitleAds: 'Zarządzanie reklamą na stronie',
    marketerPanel_generateNews: 'Wygeneruj news',
    marketerPanel_createAd: 'Utwórz reklamę',
    marketerPanel_logout: 'Wyloguj',
    marketerPanel_tabsAria: 'Sekcje panelu',
    marketerPanel_tabNews: 'Newsy',
    marketerPanel_tabAds: 'Reklamy',
    marketerPanel_publishedTitle: 'Opublikowane materiały',
    marketerPanel_loading: 'Ładowanie…',
    marketerPanel_emptyNews: 'Brak opublikowanych newsów. Utwórz pierwszy przyciskiem powyżej.',
    marketerPanel_statusPublished: 'opublikowano',
    marketerPanel_openOnSite: 'Otwórz na stronie',
    marketerPanel_delete: 'Usuń',
    marketerPanel_goToNewsPage: 'Przejdź do strony newsów →',
    marketerPanel_activeAdsTitle: 'Aktywne reklamy',
    marketerPanel_emptyAds: 'Brak reklam. Utwórz modal lub blok przyciskiem powyżej.',
    marketerPanel_iconMegaphone: 'Megafon',
    marketerPanel_buttonMeta: ' · Przycisk: {{url}}',
  },
  sv: {
    marketerPanel_loginTitle: 'Marknadsförarpanel',
    marketerPanel_loginHint: 'Inloggning för att publicera nyheter och annonser',
    marketerPanel_loginError: 'Inloggningsfel',
    marketerPanel_loginLabel: 'Användarnamn',
    marketerPanel_passwordLabel: 'Lösenord',
    marketerPanel_loginSubmit: 'Logga in',
    marketerPanel_loginSubmitting: 'Loggar in…',
    marketerPanel_backToNews: '← Till nyheter',
    marketerPanel_loadError: 'Laddningsfel',
    marketerPanel_deleteError: 'Kunde inte radera',
    marketerPanel_deleteNewsConfirm: 'Radera denna nyhet från webbplatsen?',
    marketerPanel_deleteAdConfirm: 'Radera denna annons från webbplatsen?',
    marketerPanel_title: 'Marknadsförarpanel',
    marketerPanel_subtitleNews: 'Generera och publicera nyheter',
    marketerPanel_subtitleAds: 'Hantera webbplatsannonsering',
    marketerPanel_generateNews: 'Generera nyhet',
    marketerPanel_createAd: 'Skapa annons',
    marketerPanel_logout: 'Logga ut',
    marketerPanel_tabsAria: 'Panelsektioner',
    marketerPanel_tabNews: 'Nyheter',
    marketerPanel_tabAds: 'Annonser',
    marketerPanel_publishedTitle: 'Publicerat material',
    marketerPanel_loading: 'Laddar…',
    marketerPanel_emptyNews: 'Inga publicerade nyheter ännu. Skapa den första via knappen ovan.',
    marketerPanel_statusPublished: 'publicerad',
    marketerPanel_openOnSite: 'Öppna på webbplatsen',
    marketerPanel_delete: 'Radera',
    marketerPanel_goToNewsPage: 'Gå till nyhetssidan →',
    marketerPanel_activeAdsTitle: 'Aktiva annonser',
    marketerPanel_emptyAds: 'Inga annonser ännu. Skapa en modal eller ett block via knappen ovan.',
    marketerPanel_iconMegaphone: 'Megafon',
    marketerPanel_buttonMeta: ' · Knapp: {{url}}',
  },
}

const cardTopUp = {
  ru: {
    cardTopUp_visaMastercardOnly: 'Используйте Visa или Mastercard',
    cardTopUp_saveCardError: 'Ошибка сохранения карты',
    cardTopUp_successNotification: 'Депозит пополнен на 3000 €. Баланс: €{{balance}}',
    cardTopUp_topUpError: 'Ошибка пополнения',
    cardTopUp_networkError: 'Ошибка сети',
    cardTopUp_closeAria: 'Закрыть',
    cardTopUp_title: 'Пополнение картой',
    cardTopUp_subtitle: 'Введите данные карты.',
    cardTopUp_submit: 'Пополнить 3000 €',
    cardTopUp_submitting: 'Пополняем…',
  },
  en: {
    cardTopUp_visaMastercardOnly: 'Use Visa or Mastercard',
    cardTopUp_saveCardError: 'Could not save the card',
    cardTopUp_successNotification: 'Deposit topped up by €3000. Balance: €{{balance}}',
    cardTopUp_topUpError: 'Top-up error',
    cardTopUp_networkError: 'Network error',
    cardTopUp_closeAria: 'Close',
    cardTopUp_title: 'Card top-up',
    cardTopUp_subtitle: 'Enter your card details.',
    cardTopUp_submit: 'Top up €3000',
    cardTopUp_submitting: 'Topping up…',
  },
  de: {
    cardTopUp_visaMastercardOnly: 'Verwenden Sie Visa oder Mastercard',
    cardTopUp_saveCardError: 'Karte konnte nicht gespeichert werden',
    cardTopUp_successNotification: 'Einzahlung um 3000 € aufgefüllt. Saldo: €{{balance}}',
    cardTopUp_topUpError: 'Auffüllfehler',
    cardTopUp_networkError: 'Netzwerkfehler',
    cardTopUp_closeAria: 'Schließen',
    cardTopUp_title: 'Aufladen per Karte',
    cardTopUp_subtitle: 'Geben Sie Ihre Kartendaten ein.',
    cardTopUp_submit: '3000 € aufladen',
    cardTopUp_submitting: 'Wird aufgefüllt…',
  },
  es: {
    cardTopUp_visaMastercardOnly: 'Use Visa o Mastercard',
    cardTopUp_saveCardError: 'No se pudo guardar la tarjeta',
    cardTopUp_successNotification: 'Depósito recargado en 3000 €. Saldo: €{{balance}}',
    cardTopUp_topUpError: 'Error de recarga',
    cardTopUp_networkError: 'Error de red',
    cardTopUp_closeAria: 'Cerrar',
    cardTopUp_title: 'Recarga con tarjeta',
    cardTopUp_subtitle: 'Introduzca los datos de la tarjeta.',
    cardTopUp_submit: 'Recargar 3000 €',
    cardTopUp_submitting: 'Recargando…',
  },
  fr: {
    cardTopUp_visaMastercardOnly: 'Utilisez Visa ou Mastercard',
    cardTopUp_saveCardError: 'Impossible d’enregistrer la carte',
    cardTopUp_successNotification: 'Dépôt rechargé de 3000 €. Solde : €{{balance}}',
    cardTopUp_topUpError: 'Erreur de recharge',
    cardTopUp_networkError: 'Erreur réseau',
    cardTopUp_closeAria: 'Fermer',
    cardTopUp_title: 'Recharge par carte',
    cardTopUp_subtitle: 'Saisissez les données de la carte.',
    cardTopUp_submit: 'Recharger 3000 €',
    cardTopUp_submitting: 'Recharge…',
  },
  pl: {
    cardTopUp_visaMastercardOnly: 'Użyj Visa lub Mastercard',
    cardTopUp_saveCardError: 'Nie udało się zapisać karty',
    cardTopUp_successNotification: 'Depozyt doładowany o 3000 €. Saldo: €{{balance}}',
    cardTopUp_topUpError: 'Błąd doładowania',
    cardTopUp_networkError: 'Błąd sieci',
    cardTopUp_closeAria: 'Zamknij',
    cardTopUp_title: 'Doładowanie kartą',
    cardTopUp_subtitle: 'Wprowadź dane karty.',
    cardTopUp_submit: 'Doładuj 3000 €',
    cardTopUp_submitting: 'Doładowujemy…',
  },
  sv: {
    cardTopUp_visaMastercardOnly: 'Använd Visa eller Mastercard',
    cardTopUp_saveCardError: 'Kunde inte spara kortet',
    cardTopUp_successNotification: 'Depositionen fylldes på med 3000 €. Saldo: €{{balance}}',
    cardTopUp_topUpError: 'Påfyllningsfel',
    cardTopUp_networkError: 'Nätverksfel',
    cardTopUp_closeAria: 'Stäng',
    cardTopUp_title: 'Påfyllning med kort',
    cardTopUp_subtitle: 'Ange kortuppgifter.',
    cardTopUp_submit: 'Fyll på 3000 €',
    cardTopUp_submitting: 'Fyller på…',
  },
}

const LOCALES = ['ru', 'en', 'de', 'es', 'fr', 'pl', 'sv']

function mergePack(localeObj, packByLang, lang) {
  Object.assign(localeObj, packByLang[lang] || packByLang.en)
}

function mergeIntoDir(dir) {
  for (const lang of LOCALES) {
    const file = path.join(dir, `${lang}.json`)
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    mergePack(data, storyFlat, lang)
    mergePack(data, aboutScrollStory, lang)
    mergePack(data, cabinetHistory, lang)
    mergePack(data, marketerPanel, lang)
    mergePack(data, cardTopUp, lang)
    fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
    console.log('merged', file)
  }
}

mergeIntoDir(primaryLocalesDir)
mergeIntoDir(legacyLocalesDir)
console.log('done')
