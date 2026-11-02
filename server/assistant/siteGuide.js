/**
 * Вопросы о разделах сайта: что это, где открыть, что понадобится.
 * Подбор объекта сюда не попадает — его ведёт воронка каталога.
 */

const PROPERTY_HUNT_RE =
  /подбер|подборк|покаж\p{L}{0,6}\s+(?:мне\s+)?(?:объект|вариант|лот|квартир|вилл)|найд\p{L}{0,6}\s+(?:мне\s+)?(?:объект|квартир|вилл|дом\b)|список\s+(?:объект|квартир|вилл|лот)|looking\s+for|find\s+(?:me\s+)?(?:a\s+)?(?:property|apartment|villa|home)|buy\s+(?:an?\s+)?(?:apartment|villa|property|home)|квартир|вилл|апартамент|\bapartment\b|\bvilla\b|\bhouse\b/iu

const TOOL_FOCUS_RE =
  /где|куда|как\s+(?:откры|найт|попад|зайти|работ|польз)|хочу\s+(?:найти|открыть|посмотреть)|что\s+такое|расскаж|объясн|where\b|how\s+(?:do|to|does)|what\s+is|find\s+the|smart\s+panel|умн\p{L}{0,8}\s+панел/iu

const SECTIONS = [
  {
    id: 'calculator',
    path: '/calculator',
    label: 'Smart investor panel',
    yieldsToSearch: false,
    test: /калькулятор|панел\p{L}{0,4}\s+инвест|умн\p{L}{0,8}\s+панел|smart\s+(?:investor\s+)?panel|investor\s+panel|\bcalculator\b|\bcalculadora\b/iu,
    text: {
      ru: 'Умная панель инвестора считает сценарий сделки: цена покупки, ремонт, срок владения, рост стоимости, аренда, расходы, ипотека, денежный поток, прибыль, ROI и окупаемость. Можно взять объект из избранного или ввести цифры самим. Нужен вход; часть сценариев может требовать Pro. Кнопка ниже открывает панель.',
      en: 'The smart investor panel models a deal: purchase price, renovation, holding period, value growth, rent, costs, mortgage, cash flow, profit, ROI and payback. Start from a saved property or enter the numbers yourself. Sign-in is required; some scenarios may need Pro. The button below opens the panel.',
      es: 'El panel inteligente del inversor calcula el escenario: precio, reforma, plazo, revalorización, alquiler, gastos, hipoteca, flujo de caja, beneficio, ROI y retorno. Puede partir de un favorito o introducir las cifras. Hace falta iniciar sesión; algunos escenarios pueden requerir Pro. El botón abre el panel.',
      de: 'Das Smart-Investor-Panel rechnet ein Szenario durch: Kaufpreis, Renovierung, Haltedauer, Wertsteigerung, Miete, Kosten, Hypothek, Cashflow, Gewinn, ROI und Amortisation. Sie können ein Favoritenobjekt nehmen oder die Zahlen selbst eingeben. Anmeldung nötig; manche Szenarien können Pro erfordern. Die Schaltfläche öffnet das Panel.',
      fr: 'Le panneau investisseur modélise le scénario : prix, travaux, durée, valorisation, loyer, charges, crédit, cash-flow, profit, ROI et retour. Vous pouvez partir d’un favori ou saisir les chiffres. Connexion requise ; certains scénarios peuvent exiger Pro. Le bouton ouvre le panneau.',
      pl: 'Inteligentny panel inwestora liczy scenariusz: cena, remont, okres, wzrost wartości, najem, koszty, kredyt, przepływ pieniężny, zysk, ROI i zwrot. Można wziąć obiekt z ulubionych albo wpisać liczby samemu. Potrzebne logowanie; część scenariuszy może wymagać Pro. Przycisk otwiera panel.',
      sv: 'Den smarta investerarpanelen räknar scenariot: pris, renovering, innehavstid, värdetillväxt, hyra, kostnader, bolån, kassaflöde, vinst, ROI och återbetalning. Utgå från en favorit eller fyll i siffrorna själv. Inloggning krävs; vissa scenarier kan kräva Pro. Knappen öppnar panelen.',
    },
  },
  {
    id: 'subscriptions',
    path: '/subscriptions',
    label: 'Subscriptions',
    yieldsToSearch: false,
    test: /подписк|тариф|subscription|pricing|abonnement|suscripci|abbonemang|subskrypc/i,
    text: {
      ru: 'Подписки — это тарифы Starter, Pro и VIP на странице тарифов. Pro открывает закрытые документы и расширенную аналитику, VIP — Private Club и закрытые лоты. Цену я не называю по памяти: на экране видны актуальные периоды и ваш статус. Войдите, сравните карточки и оформите оплату там. Кнопка ниже открывает подписки.',
      en: 'Subscriptions are the Starter, Pro and VIP plans. Pro opens closed documents and deeper analytics; VIP opens Private Club and closed lots. I will not quote a price from memory — the page shows the current periods and your status. Sign in, compare the cards and pay there. The button below opens subscriptions.',
      es: 'Las suscripciones son los planes Starter, Pro y VIP. Pro abre documentos cerrados y analítica ampliada; VIP abre Private Club y lotes cerrados. No indico un precio de memoria: la página muestra los periodos actuales y su estado. Entre, compare las tarjetas y pague allí. El botón abre las suscripciones.',
      de: 'Abonnements sind die Tarife Starter, Pro und VIP. Pro öffnet geschlossene Dokumente und erweiterte Analysen; VIP öffnet den Private Club und geschlossene Lose. Einen Preis aus dem Gedächtnis nenne ich nicht — die Seite zeigt aktuelle Zeiträume und Ihren Status. Die Schaltfläche öffnet die Abos.',
      fr: 'Les abonnements sont les formules Starter, Pro et VIP. Pro ouvre les documents fermés et l’analytique étendue ; VIP ouvre le Private Club et les lots fermés. Je ne cite pas de prix de mémoire : la page affiche les périodes actuelles et votre statut. Le bouton ouvre les abonnements.',
      pl: 'Subskrypcje to plany Starter, Pro i VIP. Pro otwiera zamknięte dokumenty i szerszą analitykę, VIP — Private Club i zamknięte oferty. Ceny nie podaję z pamięci: na stronie widać aktualne okresy i status. Przycisk otwiera subskrypcje.',
      sv: 'Prenumerationer är planerna Starter, Pro och VIP. Pro öppnar stängda dokument och djupare analys; VIP öppnar Private Club och stängda objekt. Jag anger inget pris ur minnet — sidan visar aktuella perioder och din status. Knappen öppnar prenumerationer.',
    },
  },
  {
    id: 'deposit',
    path: '/deposit',
    label: 'Top up deposit',
    yieldsToSearch: false,
    test: /пополн|top\s*up|deposit|депозит/i,
    text: {
      ru: 'Депозит нужен для ставок на аукционе и остаётся на вашем балансе — его можно вывести. Войдите, откройте кошелёк и нажмите «Пополнить»: выберите способ, проверьте сумму и подтвердите. Точная сумма зависит от действия и объекта. Кнопка ниже ведёт к пополнению.',
      en: 'The deposit is used for auction bids and stays on your balance — you can withdraw it. Sign in, open the wallet and choose top up: pick a method, check the amount and confirm. The required amount depends on the action and the listing. The button below starts a top-up.',
      es: 'El depósito sirve para pujar y permanece en su saldo: se puede retirar. Entre, abra la cartera y pulse recargar: elija el método, revise el importe y confirme. La cantidad depende de la acción y del inmueble. El botón inicia la recarga.',
      de: 'Die Anzahlung dient für Gebote und bleibt auf Ihrem Guthaben — eine Auszahlung ist möglich. Melden Sie sich an, öffnen Sie die Wallet und wählen Sie Aufladen. Die Schaltfläche startet die Aufladung.',
      fr: 'Le dépôt sert aux enchères et reste sur votre solde — vous pouvez le retirer. Connectez-vous, ouvrez le portefeuille et choisissez recharger. Le bouton lance le rechargement.',
      pl: 'Depozyt jest potrzebny do licytacji i zostaje na saldzie — można go wypłacić. Zaloguj się, otwórz portfel i wybierz doładowanie. Przycisk prowadzi do wpłaty.',
      sv: 'Depositionen används för bud och ligger kvar på saldot — du kan ta ut den. Logga in, öppna plånboken och välj påfyllning. Knappen startar påfyllningen.',
    },
  },
  {
    id: 'wallet',
    path: '/wallet',
    label: 'Wallet and deposit',
    yieldsToSearch: false,
    test: /кошел|wallet|баланс|вывест|вывод|withdraw/i,
    text: {
      ru: 'Кошелёк показывает баланс депозита, пополнения, выводы, транзакции и активные ставки. Из записи ставки можно открыть объект. Нужен вход. Кнопка ниже открывает кошелёк.',
      en: 'The wallet shows your deposit balance, top-ups, withdrawals, transactions and active bids. From a bid you can open the listing. Sign-in is required. The button below opens the wallet.',
      es: 'La cartera muestra el saldo del depósito, recargas, retiradas, transacciones y pujas activas. Desde una puja se abre el inmueble. Hace falta iniciar sesión. El botón abre la cartera.',
      de: 'Die Wallet zeigt Anzahlung, Aufladungen, Auszahlungen, Transaktionen und aktive Gebote. Anmeldung nötig. Die Schaltfläche öffnet die Wallet.',
      fr: 'Le portefeuille montre le dépôt, les recharges, les retraits, les transactions et les enchères actives. Connexion requise. Le bouton ouvre le portefeuille.',
      pl: 'Portfel pokazuje saldo depozytu, wpłaty, wypłaty, transakcje i aktywne oferty. Potrzebne logowanie. Przycisk otwiera portfel.',
      sv: 'Plånboken visar deposition, påfyllningar, uttag, transaktioner och aktiva bud. Inloggning krävs. Knappen öppnar plånboken.',
    },
  },
  {
    id: 'bonuses',
    path: '/bonuses',
    label: 'Bonuses',
    yieldsToSearch: false,
    test: /бонус|промокод|реферал|bonus|promo\s*code|referral/i,
    text: {
      ru: 'Бонусы — это задания покупателя и продавца: публикация, видео, ссылка в профиле или приглашение друга. После проверки появляется промокод. Одобрение заранее не обещаю. Нужен вход. Кнопка ниже открывает задания.',
      en: 'Bonuses are buyer and seller tasks: a post, a video, a profile link or inviting a friend. A promo code appears after review. I will not promise approval in advance. Sign-in is required. The button below opens the tasks.',
      es: 'Los bonos son tareas de comprador y vendedor: publicación, vídeo, enlace en el perfil o invitar a un amigo. El código promocional aparece tras la revisión. Hay que iniciar sesión. El botón abre las tareas.',
      de: 'Boni sind Aufgaben für Käufer und Verkäufer: Beitrag, Video, Profil-Link oder Freund einladen. Der Promo-Code erscheint nach der Prüfung. Anmeldung nötig. Die Schaltfläche öffnet die Aufgaben.',
      fr: 'Les bonus sont des missions acheteur et vendeur : publication, vidéo, lien de profil ou invitation d’un ami. Le code promo apparaît après vérification. Connexion requise. Le bouton ouvre les missions.',
      pl: 'Bonusy to zadania kupującego i sprzedającego: post, wideo, link w profilu albo zaproszenie znajomego. Kod promocyjny pojawia się po weryfikacji. Potrzebne logowanie. Przycisk otwiera zadania.',
      sv: 'Bonusar är uppgifter för köpare och säljare: inlägg, video, profillänk eller att bjuda in en vän. En kampanjkod visas efter granskning. Inloggning krävs. Knappen öppnar uppgifterna.',
    },
  },
  {
    id: 'compare',
    path: '/compare',
    label: 'Compare',
    yieldsToSearch: false,
    test: /сравн|\bcompare\b|\bcomparar\b|\bcompara\b|\bcomparison\b/i,
    text: {
      ru: 'Сравнение ставит рядом два объекта: параметры, окружение и переход к расчёту каждого. Сначала сохраните минимум два объекта сердцем в избранное, затем откройте сравнение. Нужен вход. Кнопка ниже открывает сравнение.',
      en: 'Compare places two properties side by side: specs, surroundings and a path into each calculation. Save at least two listings with the heart, then open compare. Sign-in is required. The button below opens it.',
      es: 'La comparación pone dos inmuebles juntos: características, entorno y el cálculo de cada uno. Guarde al menos dos con el corazón y abra comparar. Hay que iniciar sesión. El botón abre la comparación.',
      de: 'Der Vergleich stellt zwei Objekte nebeneinander: Daten, Umfeld und die Berechnung jedes Objekts. Speichern Sie mindestens zwei mit dem Herz. Anmeldung nötig. Die Schaltfläche öffnet den Vergleich.',
      fr: 'La comparaison met deux biens côte à côte : caractéristiques, environnement et calcul de chacun. Enregistrez-en au moins deux avec le cœur. Connexion requise. Le bouton ouvre la comparaison.',
      pl: 'Porównanie zestawia dwa obiekty: parametry, otoczenie i wyliczenie każdego. Zapisz co najmniej dwa sercem. Potrzebne logowanie. Przycisk otwiera porównanie.',
      sv: 'Jämförelsen ställer två objekt bredvid varandra: data, omgivning och beräkning av vart och ett. Spara minst två med hjärtat. Inloggning krävs. Knappen öppnar jämförelsen.',
    },
  },
  {
    id: 'favorites',
    path: '/favorites',
    label: 'Favorites',
    yieldsToSearch: false,
    test: /избран|favorite|favourite/i,
    text: {
      ru: 'Избранное хранит объекты, которые вы отметили сердцем. Повторное нажатие убирает объект, цены и статусы подтягиваются из каталога. Нужен вход. Кнопка ниже открывает избранное.',
      en: 'Favorites keeps the listings you marked with the heart. Tap again to remove one; prices and statuses stay in sync with the catalog. Sign-in is required. The button below opens favorites.',
      es: 'Favoritos guarda los inmuebles marcados con el corazón. Un segundo toque los quita; precios y estados salen del catálogo. Hay que iniciar sesión. El botón abre favoritos.',
      de: 'Favoriten speichert die Objekte mit Herz. Ein erneuter Klick entfernt sie; Preise kommen aus dem Katalog. Anmeldung nötig. Die Schaltfläche öffnet die Favoriten.',
      fr: 'Les favoris gardent les biens marqués d’un cœur. Un second clic retire le bien ; les prix viennent du catalogue. Connexion requise. Le bouton ouvre les favoris.',
      pl: 'Ulubione trzymają obiekty oznaczone sercem. Drugie kliknięcie usuwa obiekt; ceny pochodzą z katalogu. Potrzebne logowanie. Przycisk otwiera ulubione.',
      sv: 'Favoriter sparar objekten du markerat med hjärtat. Ett nytt tryck tar bort objektet; priser hämtas från katalogen. Inloggning krävs. Knappen öppnar favoriter.',
    },
  },
  {
    id: 'map',
    path: '/map',
    label: 'Property map',
    yieldsToSearch: true,
    test: /карта|на карте|\bmap\b|mapa/i,
    text: {
      ru: 'Карта показывает объекты по географии. Нужен вход. Если вы хотите именно подобрать объект, напишите цель, страну и город — я пройду подбор по каталогу. Кнопка ниже открывает карту.',
      en: 'The map shows listings by location. Sign-in is required. If you want a matched shortlist, tell me the goal, country and city and I will use the catalog search. The button below opens the map.',
      es: 'El mapa muestra inmuebles por ubicación. Hay que iniciar sesión. Si quiere una selección, indique objetivo, país y ciudad. El botón abre el mapa.',
      de: 'Die Karte zeigt Objekte nach Lage. Anmeldung nötig. Für eine Auswahl nennen Sie Ziel, Land und Stadt. Die Schaltfläche öffnet die Karte.',
      fr: 'La carte montre les biens par lieu. Connexion requise. Pour une sélection, indiquez l’objectif, le pays et la ville. Le bouton ouvre la carte.',
      pl: 'Mapa pokazuje obiekty według lokalizacji. Potrzebne logowanie. Do doboru podaj cel, kraj i miasto. Przycisk otwiera mapę.',
      sv: 'Kartan visar objekt efter läge. Inloggning krävs. För ett urval, ange mål, land och stad. Knappen öppnar kartan.',
    },
  },
  {
    id: 'test-drive',
    path: '/test-drive',
    label: 'Test-drive',
    yieldsToSearch: false,
    test: /тест.?драйв|test.?drive/i,
    text: {
      ru: 'Test-drive — это осмотр или короткое проживание в объекте до сделки. Откройте раздел или карточку, выберите даты и отправьте бронь. Свои записи смотрите в профиле, во вкладке бронирований. Кнопка ниже открывает test-drive.',
      en: 'Test-drive is a viewing or a short stay before you commit. Open the section or a listing, pick dates and send the booking. Your bookings live in the profile. The button below opens test-drive.',
      es: 'El test-drive es una visita o una estancia corta antes de decidir. Abra la sección o la ficha, elija fechas y envíe la reserva. Las reservas están en el perfil. El botón abre el test-drive.',
      de: 'Test-Drive ist eine Besichtigung oder ein kurzer Aufenthalt vor der Entscheidung. Öffnen Sie den Bereich oder die Karte, wählen Sie Daten und senden Sie die Buchung. Die Schaltfläche öffnet Test-Drive.',
      fr: 'Le test-drive est une visite ou un court séjour avant de décider. Ouvrez la section ou la fiche, choisissez les dates et envoyez la réservation. Le bouton ouvre le test-drive.',
      pl: 'Test-drive to obejrzenie albo krótki pobyt przed decyzją. Otwórz dział lub kartę, wybierz daty i wyślij rezerwację. Przycisk otwiera test-drive.',
      sv: 'Test-drive är en visning eller en kort vistelse innan du bestämmer dig. Öppna avsnittet eller objektet, välj datum och skicka bokningen. Knappen öppnar test-drive.',
    },
  },
  {
    id: 'private-club',
    path: '/private-club',
    label: 'Private Club',
    yieldsToSearch: false,
    test: /private\s*club|приватн\p{L}*\s+клуб|закрыт\p{L}*\s+(?:клуб|лот)/iu,
    text: {
      ru: 'Private Club — закрытый раздел: ранний доступ, закрытые лоты, персональный менеджер и сообщество. Нужен VIP: его оформляют в подписках или промокодом, статус виден в профиле. Кнопка ниже открывает клуб.',
      en: 'Private Club is the closed area: early access, closed lots, a personal manager and the community. It needs VIP, from a subscription or a promo code; the status is in your profile. The button below opens the club.',
      es: 'Private Club es la zona cerrada: acceso anticipado, lotes cerrados, gestor personal y comunidad. Hace falta VIP, por suscripción o código promocional. El botón abre el club.',
      de: 'Der Private Club ist der geschlossene Bereich: früher Zugang, geschlossene Lose, persönlicher Manager und Community. Dafür brauchen Sie VIP. Die Schaltfläche öffnet den Club.',
      fr: 'Le Private Club est l’espace fermé : accès anticipé, lots fermés, conseiller personnel et communauté. Il faut le VIP. Le bouton ouvre le club.',
      pl: 'Private Club to strefa zamknięta: wcześniejszy dostęp, zamknięte oferty, osobisty doradca i społeczność. Potrzebny jest VIP. Przycisk otwiera klub.',
      sv: 'Private Club är den stängda delen: tidig åtkomst, stängda objekt, personlig rådgivare och community. VIP krävs. Knappen öppnar klubben.',
    },
  },
  {
    id: 'profile',
    path: '/profile',
    label: 'Personal cabinet',
    yieldsToSearch: false,
    test: /личн\p{L}*\s+кабинет|мой\s+профил|профил|\bprofile\b|\bmy account\b|personal\s+cabinet/iu,
    text: {
      ru: 'Личный кабинет собирает профиль, документы, историю ставок и покупок, бронирования, избранное, кошелёк и статус подписки. Стать продавцом можно отсюда — кабинет покупателя при этом остаётся. Нужен вход. Кнопка ниже открывает профиль.',
      en: 'The cabinet brings together your profile, documents, bid and purchase history, bookings, favorites, wallet and subscription status. You can become a seller from here; the buyer cabinet stays. Sign-in is required. The button below opens the profile.',
      es: 'El área personal reúne perfil, documentos, historial, reservas, favoritos, cartera y suscripción. Puede hacerse vendedor sin perder el área de comprador. Hay que iniciar sesión. El botón abre el perfil.',
      de: 'Das Konto bündelt Profil, Dokumente, Historie, Buchungen, Favoriten, Wallet und Abo-Status. Verkäufer werden ist von hier möglich. Anmeldung nötig. Die Schaltfläche öffnet das Profil.',
      fr: 'L’espace personnel réunit profil, documents, historique, réservations, favoris, portefeuille et abonnement. Devenir vendeur se fait ici. Connexion requise. Le bouton ouvre le profil.',
      pl: 'Konto zbiera profil, dokumenty, historię, rezerwacje, ulubione, portfel i subskrypcję. Stąd można zostać sprzedawcą. Potrzebne logowanie. Przycisk otwiera profil.',
      sv: 'Kontot samlar profil, dokument, historik, bokningar, favoriter, plånbok och prenumeration. Härifrån kan du bli säljare. Inloggning krävs. Knappen öppnar profilen.',
    },
  },
  {
    id: 'seller',
    path: '/seller',
    label: 'For sellers',
    yieldsToSearch: false,
    test: /продавц|размест\p{L}*\s+объект|кабинет\s+продав|seller|list\s+a\s+property/iu,
    text: {
      ru: 'Раздел для продавцов объясняет, как разместить объект: тип, локация, стратегия продажи, цена, фото, описание и документы. Кабинет продавца открывается из профиля, кабинет покупателя при этом не пропадает. Кнопка ниже открывает страницу для продавцов.',
      en: 'The seller section explains how to list a property: type, location, sale strategy, price, photos, description and documents. The seller cabinet opens from the profile, and the buyer cabinet stays. The button below opens the seller page.',
      es: 'La sección de vendedores explica cómo publicar un inmueble: tipo, ubicación, estrategia, precio, fotos, descripción y documentos. El área de vendedor se abre desde el perfil. El botón abre la página de vendedores.',
      de: 'Der Verkäuferbereich erklärt, wie Sie ein Objekt einstellen: Typ, Lage, Strategie, Preis, Fotos, Text und Dokumente. Das Verkäuferkonto öffnet sich aus dem Profil. Die Schaltfläche öffnet die Seite.',
      fr: 'La page vendeurs explique comment publier un bien : type, lieu, stratégie, prix, photos, texte et documents. L’espace vendeur s’ouvre depuis le profil. Le bouton ouvre la page.',
      pl: 'Dział sprzedawcy wyjaśnia, jak dodać obiekt: typ, lokalizacja, strategia, cena, zdjęcia, opis i dokumenty. Konto sprzedawcy otwiera się z profilu. Przycisk otwiera stronę.',
      sv: 'Säljarsidan förklarar hur du lägger upp ett objekt: typ, läge, strategi, pris, bilder, text och dokument. Säljarkontot öppnas från profilen. Knappen öppnar sidan.',
    },
  },
  {
    id: 'sections',
    path: '/sections',
    label: 'All services',
    yieldsToSearch: false,
    test: /все\s+сервис|карта\s+сервис|раздел\p{L}{0,3}\s+сайт|all\s+services|sections/iu,
    text: {
      ru: 'Полная карта сервисов — это одна страница со всеми разделами: торги, доли, долги, Development, test-drive, панель инвестора, сравнение, кошелёк, подписки и кабинеты. Кнопка ниже открывает эту карту.',
      en: 'The services map is one page with every section: auctions, shares, debts, Development, test-drive, the investor panel, compare, wallet, subscriptions and cabinets. The button below opens that map.',
      es: 'El mapa de servicios es una página con todas las secciones: subastas, participaciones, deudas, Development, test-drive, panel, comparación, cartera y suscripciones. El botón abre ese mapa.',
      de: 'Die Servicekarte ist eine Seite mit allen Bereichen: Auktionen, Anteile, Schulden, Development, Test-Drive, Panel, Vergleich, Wallet und Abos. Die Schaltfläche öffnet die Karte.',
      fr: 'La carte des services est une page avec toutes les sections : enchères, parts, dettes, Development, test-drive, panneau, comparaison, portefeuille et abonnements. Le bouton ouvre cette carte.',
      pl: 'Mapa usług to jedna strona ze wszystkimi działami: aukcje, udziały, długi, Development, test-drive, panel, porównanie, portfel i subskrypcje. Przycisk otwiera mapę.',
      sv: 'Tjänstekartan är en sida med alla avsnitt: auktioner, andelar, skulder, Development, test-drive, panel, jämförelse, plånbok och prenumerationer. Knappen öppnar kartan.',
    },
  },
  {
    id: 'about',
    path: '/about',
    label: 'About the platform',
    yieldsToSearch: false,
    test: /о\s+платформ|о\s+вас|что\s+такое\s+sellyourbrick|about\s+(?:the\s+)?(?:platform|company)/i,
    text: {
      ru: 'SellYourBrick соединяет аукционы, покупку сейчас, доли, долги, Development и test-drive. Подбор идёт только по текущему каталогу. На странице о платформе — подход и возможности, без выдуманных объектов. Кнопка ниже открывает эту страницу.',
      en: 'SellYourBrick brings together auctions, buy now, shares, debts, Development and test-drive. Matching uses only the live catalog. The about page explains the approach, without invented listings. The button below opens it.',
      es: 'SellYourBrick reúne subastas, compra inmediata, participaciones, deudas, Development y test-drive. La selección usa solo el catálogo actual. El botón abre la página sobre la plataforma.',
      de: 'SellYourBrick vereint Auktionen, Sofortkauf, Anteile, Schulden, Development und Test-Drive. Die Auswahl nutzt nur den aktuellen Katalog. Die Schaltfläche öffnet die Über-uns-Seite.',
      fr: 'SellYourBrick réunit enchères, achat immédiat, parts, dettes, Development et test-drive. La sélection n’utilise que le catalogue actuel. Le bouton ouvre la page à propos.',
      pl: 'SellYourBrick łączy aukcje, zakup od ręki, udziały, długi, Development i test-drive. Dobór korzysta tylko z aktualnego katalogu. Przycisk otwiera stronę o platformie.',
      sv: 'SellYourBrick samlar auktioner, direktköp, andelar, skulder, Development och test-drive. Urvalet använder bara den aktuella katalogen. Knappen öppnar sidan om plattformen.',
    },
  },
]

function isPropertyHunt(text) {
  return PROPERTY_HUNT_RE.test(String(text || ''))
}

export function matchSiteGuides(text) {
  const value = String(text || '')
  if (!value.trim()) return []
  const hunting = isPropertyHunt(value)
  const askingAboutTool = TOOL_FOCUS_RE.test(value)
  if (hunting && !askingAboutTool) return []
  return SECTIONS.filter((item) => item.test.test(value) && !(item.yieldsToSearch && hunting))
}

export function matchSiteGuide(text) {
  return matchSiteGuides(text)[0] || null
}

export function guideReplyText(section, lang) {
  if (!section?.text) return ''
  const code = String(lang || 'en').toLowerCase().slice(0, 2)
  return section.text[code] || section.text.en || section.text.ru || ''
}
