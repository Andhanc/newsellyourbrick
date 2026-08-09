/**
 * Fill cabinet / profile i18n gaps in mainPage locale JSON files.
 *
 * A) purchasedGuide_* — de, es, fr, sv, pl (proper translations)
 * B) ownerTest_* — 43 missing keys for de, es, fr, sv, pl
 * C) buyerHistory_bidCard_* — de, es, fr, sv, pl
 * D) NEW keys for all langs: profileHistory_*, profileBookings_*,
 *    buyerBookings_* extras, bonuses_* extras
 *
 * Usage: node scripts/merge-cabinet-locale-gaps.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const LOCALE_DIRS = [
  path.join(ROOT, 'src/i18n/locales/mainPage'),
  path.join(ROOT, 'apps/client/src/legacy/i18n/locales/mainPage'),
]

const LANGS = ['ru', 'en', 'de', 'es', 'fr', 'sv', 'pl']
const GAP_LANGS = ['de', 'es', 'fr', 'sv', 'pl']

/** @type {Record<string, Record<string, string>>} */
const PACK = Object.fromEntries(LANGS.map((l) => [l, {}]))

// ─── A) purchasedGuide_* ─────────────────────────────────────────────────────

const PURCHASED_GUIDE = {
  de: {
    purchasedGuide_loading: 'Immobilie wird geladen…',
    purchasedGuide_loadError: 'Immobilie konnte nicht geladen werden',
    purchasedGuide_backProfile: 'Zurück zum Profil',
    purchasedGuide_eyebrow: 'Ihre Immobilie',
    purchasedGuide_title: 'Was als Nächstes zu tun ist',
    purchasedGuide_lead:
      'Die Immobilie ist für Sie reserviert. Hier finden Sie einen kurzen Aktionsplan und einen schnellen Weg, sie im Verkäuferkabinett einzustellen.',
    purchasedGuide_defaultTitle: 'Gekaufte Immobilie',
    purchasedGuide_viewProperty: 'Immobilienseite öffnen',
    purchasedGuide_stepsTitle: 'Schritt-für-Schritt-Plan',
    purchasedGuide_step_owned_title: 'Eigentum an der Immobilie',
    purchasedGuide_step_owned_text:
      'Warten Sie auf die endgültige Bestätigung des Geschäfts und bewahren Sie Ihre Kaufunterlagen auf.',
    purchasedGuide_step_docs_title: 'Dokumente vorbereiten',
    purchasedGuide_step_docs_text:
      'Für die Veröffentlichung benötigen Sie Eigentums- und schuldenfreie Unterlagen.',
    purchasedGuide_step_sell_title: 'Verkaufsart wählen',
    purchasedGuide_step_sell_text:
      'Wählen Sie ein Angebotsformat: Auktion, Sofortkauf, Anteile oder einen anderen Modus.',
    purchasedGuide_step_publish_title: 'Preis und Daten festlegen',
    purchasedGuide_step_publish_text:
      'Legen Sie Preise und Auktionsdaten fest und laden Sie Dokumente hoch — die Kerndaten der Immobilie haben wir bereits übernommen.',
    purchasedGuide_sellTitle: 'Möchten Sie diese Immobilie verkaufen?',
    purchasedGuide_sellText:
      'Wir erstellen einen Angebotsentwurf im Verkäuferkabinett mit vorausgefüllter Adresse, Fotos und Beschreibung. Sie müssen nur Format, Preis, Daten und Dokumente ergänzen.',
    purchasedGuide_sellCta: 'Immobilie verkaufen',
    purchasedGuide_sellerPromptTitle: 'Als Verkäufer registrieren',
    purchasedGuide_sellerPromptText:
      'Zuerst erstellen wir Ihr Verkäuferkabinett — bei Google-Anmeldung müssen Sie ein Passwort festlegen. Dann wird die Immobilie automatisch in einen Entwurf übernommen; ergänzen Sie Format, Preis, Daten und Dokumente.',
    purchasedGuide_sellerPromptCancel: 'Abbrechen',
    purchasedGuide_sellerPromptConfirm: 'Weiter',
    purchasedGuide_switchPromptTitle: 'Zum Verkäuferkabinett wechseln',
    purchasedGuide_switchPromptText:
      'Geben Sie das Passwort Ihres Verkäuferkabinetts ein — die Immobilie wird automatisch in einen Entwurf übernommen. Ergänzen Sie Format, Preis, Daten und Dokumente.',
  },
  es: {
    purchasedGuide_loading: 'Cargando la propiedad…',
    purchasedGuide_loadError: 'No se pudo cargar la propiedad',
    purchasedGuide_backProfile: 'Volver al perfil',
    purchasedGuide_eyebrow: 'Su propiedad',
    purchasedGuide_title: 'Qué hacer a continuación',
    purchasedGuide_lead:
      'La propiedad está reservada para usted. Aquí tiene un plan de acción breve y un acceso rápido para publicarla en el panel del vendedor.',
    purchasedGuide_defaultTitle: 'Propiedad comprada',
    purchasedGuide_viewProperty: 'Abrir página de la propiedad',
    purchasedGuide_stepsTitle: 'Plan paso a paso',
    purchasedGuide_step_owned_title: 'Propiedad a su nombre',
    purchasedGuide_step_owned_text:
      'Espere la confirmación final de la operación y conserve los documentos de compra.',
    purchasedGuide_step_docs_title: 'Prepare los documentos',
    purchasedGuide_step_docs_text:
      'Para publicar necesitará documentos de propiedad y de ausencia de deudas.',
    purchasedGuide_step_sell_title: 'Elija cómo vender',
    purchasedGuide_step_sell_text:
      'Elija el formato del anuncio: subasta, compra inmediata, participaciones u otro modo.',
    purchasedGuide_step_publish_title: 'Indique precio y fechas',
    purchasedGuide_step_publish_text:
      'Defina el precio, las fechas de la subasta y suba los documentos: ya hemos copiado los datos principales de la propiedad.',
    purchasedGuide_sellTitle: '¿Quiere vender esta propiedad?',
    purchasedGuide_sellText:
      'Crearemos un borrador en el panel del vendedor con dirección, fotos y descripción rellenados. Solo tendrá que indicar formato, precio, fechas y documentos.',
    purchasedGuide_sellCta: 'Vender propiedad',
    purchasedGuide_sellerPromptTitle: 'Regístrese como vendedor',
    purchasedGuide_sellerPromptText:
      'Primero crearemos su panel de vendedor: si inicia sesión con Google, deberá establecer una contraseña. Luego la propiedad pasará automáticamente a borrador; complete formato, precio, fechas y documentos.',
    purchasedGuide_sellerPromptCancel: 'Cancelar',
    purchasedGuide_sellerPromptConfirm: 'Continuar',
    purchasedGuide_switchPromptTitle: 'Cambiar al panel del vendedor',
    purchasedGuide_switchPromptText:
      'Introduzca la contraseña del panel del vendedor: la propiedad pasará automáticamente a borrador. Complete formato, precio, fechas y documentos.',
  },
  fr: {
    purchasedGuide_loading: 'Chargement du bien…',
    purchasedGuide_loadError: 'Impossible de charger le bien',
    purchasedGuide_backProfile: 'Retour au profil',
    purchasedGuide_eyebrow: 'Votre bien',
    purchasedGuide_title: 'Que faire ensuite',
    purchasedGuide_lead:
      'Le bien est réservé pour vous. Voici un plan d’action court et un accès rapide pour le publier dans l’espace vendeur.',
    purchasedGuide_defaultTitle: 'Bien acheté',
    purchasedGuide_viewProperty: 'Ouvrir la page du bien',
    purchasedGuide_stepsTitle: 'Plan étape par étape',
    purchasedGuide_step_owned_title: 'Propriété du bien',
    purchasedGuide_step_owned_text:
      'Attendez la confirmation finale de la transaction et conservez vos documents d’achat.',
    purchasedGuide_step_docs_title: 'Préparez les documents',
    purchasedGuide_step_docs_text:
      'Pour publier, vous aurez besoin des documents de propriété et d’absence de dettes.',
    purchasedGuide_step_sell_title: 'Choisissez comment vendre',
    purchasedGuide_step_sell_text:
      'Choisissez un format d’annonce : enchères, achat immédiat, parts ou un autre mode.',
    purchasedGuide_step_publish_title: 'Indiquez le prix et les dates',
    purchasedGuide_step_publish_text:
      'Définissez le prix, les dates d’enchères et téléversez les documents — nous avons déjà repris les données principales du bien.',
    purchasedGuide_sellTitle: 'Vous souhaitez vendre ce bien ?',
    purchasedGuide_sellText:
      'Nous créerons un brouillon dans l’espace vendeur avec adresse, photos et description préremplies. Il ne restera que le format, le prix, les dates et les documents.',
    purchasedGuide_sellCta: 'Vendre le bien',
    purchasedGuide_sellerPromptTitle: 'Inscrivez-vous comme vendeur',
    purchasedGuide_sellerPromptText:
      'Nous créerons d’abord votre espace vendeur — avec Google, vous devrez définir un mot de passe. Puis le bien passera automatiquement en brouillon ; terminez format, prix, dates et documents.',
    purchasedGuide_sellerPromptCancel: 'Annuler',
    purchasedGuide_sellerPromptConfirm: 'Continuer',
    purchasedGuide_switchPromptTitle: 'Passer à l’espace vendeur',
    purchasedGuide_switchPromptText:
      'Saisissez le mot de passe de l’espace vendeur — le bien passera automatiquement en brouillon. Terminez format, prix, dates et documents.',
  },
  sv: {
    purchasedGuide_loading: 'Laddar objekt…',
    purchasedGuide_loadError: 'Kunde inte ladda objektet',
    purchasedGuide_backProfile: 'Tillbaka till profilen',
    purchasedGuide_eyebrow: 'Ditt objekt',
    purchasedGuide_title: 'Vad du gör härnäst',
    purchasedGuide_lead:
      'Objektet är reserverat för dig. Här är en kort handlingsplan och en snabb väg till att lägga upp det i säljarkabinettet.',
    purchasedGuide_defaultTitle: 'Köpt objekt',
    purchasedGuide_viewProperty: 'Öppna objektsidan',
    purchasedGuide_stepsTitle: 'Steg-för-steg-plan',
    purchasedGuide_step_owned_title: 'Ägande av objektet',
    purchasedGuide_step_owned_text:
      'Vänta på slutlig bekräftelse av affären och spara dina köpehandlingar.',
    purchasedGuide_step_docs_title: 'Förbered dokument',
    purchasedGuide_step_docs_text:
      'För publicering behöver du ägar- och skuldfrihetsdokument.',
    purchasedGuide_step_sell_title: 'Välj hur du säljer',
    purchasedGuide_step_sell_text:
      'Välj annonsformat: auktion, köp nu, andelar eller ett annat läge.',
    purchasedGuide_step_publish_title: 'Ange pris och datum',
    purchasedGuide_step_publish_text:
      'Sätt pris, auktionsdatum och ladda upp dokument — vi har redan kopierat objektets grunddata.',
    purchasedGuide_sellTitle: 'Vill du sälja det här objektet?',
    purchasedGuide_sellText:
      'Vi skapar ett utkast i säljarkabinettet med adress, foton och beskrivning ifyllda. Du behöver bara format, pris, datum och dokument.',
    purchasedGuide_sellCta: 'Sälj objekt',
    purchasedGuide_sellerPromptTitle: 'Registrera dig som säljare',
    purchasedGuide_sellerPromptText:
      'Först skapar vi ditt säljarkabinett — vid Google-inloggning behöver du ange ett lösenord. Sedan flyttas objektet automatiskt till utkast; fyll i format, pris, datum och dokument.',
    purchasedGuide_sellerPromptCancel: 'Avbryt',
    purchasedGuide_sellerPromptConfirm: 'Fortsätt',
    purchasedGuide_switchPromptTitle: 'Byt till säljarkabinettet',
    purchasedGuide_switchPromptText:
      'Ange lösenordet till säljarkabinettet — objektet flyttas automatiskt till utkast. Fyll i format, pris, datum och dokument.',
  },
  pl: {
    purchasedGuide_loading: 'Ładowanie nieruchomości…',
    purchasedGuide_loadError: 'Nie udało się wczytać nieruchomości',
    purchasedGuide_backProfile: 'Wróć do profilu',
    purchasedGuide_eyebrow: 'Twoja nieruchomość',
    purchasedGuide_title: 'Co dalej',
    purchasedGuide_lead:
      'Nieruchomość jest zarezerwowana dla Ciebie. Poniżej krótki plan działań i szybka ścieżka do wystawienia jej w panelu sprzedawcy.',
    purchasedGuide_defaultTitle: 'Kupiona nieruchomość',
    purchasedGuide_viewProperty: 'Otwórz stronę nieruchomości',
    purchasedGuide_stepsTitle: 'Plan krok po kroku',
    purchasedGuide_step_owned_title: 'Własność nieruchomości',
    purchasedGuide_step_owned_text:
      'Poczekaj na ostateczne potwierdzenie transakcji i zachowaj dokumenty zakupu.',
    purchasedGuide_step_docs_title: 'Przygotuj dokumenty',
    purchasedGuide_step_docs_text:
      'Do publikacji potrzebne będą dokumenty własności i braku zadłużeń.',
    purchasedGuide_step_sell_title: 'Wybierz sposób sprzedaży',
    purchasedGuide_step_sell_text:
      'Wybierz format ogłoszenia: aukcja, kup teraz, udziały lub inny tryb.',
    purchasedGuide_step_publish_title: 'Uzupełnij cenę i daty',
    purchasedGuide_step_publish_text:
      'Ustaw cenę, daty aukcji i prześlij dokumenty — podstawowe dane nieruchomości już skopiowaliśmy.',
    purchasedGuide_sellTitle: 'Chcesz sprzedać tę nieruchomość?',
    purchasedGuide_sellText:
      'Utworzymy szkic ogłoszenia w panelu sprzedawcy z uzupełnionym adresem, zdjęciami i opisem. Zostanie format, cena, daty i dokumenty.',
    purchasedGuide_sellCta: 'Sprzedaj nieruchomość',
    purchasedGuide_sellerPromptTitle: 'Zarejestruj się jako sprzedawca',
    purchasedGuide_sellerPromptText:
      'Najpierw utworzymy panel sprzedawcy — przy logowaniu Google trzeba ustawić hasło. Potem nieruchomość automatycznie trafi do szkicu; dokończ format, cenę, daty i dokumenty.',
    purchasedGuide_sellerPromptCancel: 'Anuluj',
    purchasedGuide_sellerPromptConfirm: 'Kontynuuj',
    purchasedGuide_switchPromptTitle: 'Przełącz na panel sprzedawcy',
    purchasedGuide_switchPromptText:
      'Wprowadź hasło panelu sprzedawcy — nieruchomość automatycznie trafi do szkicu. Dokończ format, cenę, daty i dokumenty.',
  },
}

// ─── B) ownerTest_* (43 keys) ────────────────────────────────────────────────

const OWNER_TEST_GAPS = {
  de: {
    ownerTest_analyticsAuctionBidHint: 'Führendes Gebot in der Auktion',
    ownerTest_analyticsDownloadExcel: 'Excel-Bericht herunterladen',
    ownerTest_analyticsSharesHighlight: 'Anteilsverkäufe',
    ownerTest_analyticsSharesSoldOnly: 'Gekaufte Anteile: {{sold}}',
    ownerTest_endingSoonGo: 'Ansehen',
    ownerTest_endingSoonMoreObjects: 'weitere Immobilien',
    ownerTest_endingSoonSeeMore: 'Mehr anzeigen',
    ownerTest_endingSoonTitle: 'Endet bald',
    ownerTest_endingSoonUntilEnd: 'bis zum Ende',
    ownerTest_onboardingNext: 'Weiter',
    ownerTest_onboardingStart: 'Loslegen',
    ownerTest_onboardingStep1Text:
      'Füllen Sie Kontakt- und Zahlungsdaten einmal aus — so bestätigen wir Ihre Identität und halten jede Transaktion ohne Verzögerung im Fluss.',
    ownerTest_onboardingStep1TitleAfter: '',
    ownerTest_onboardingStep1TitleBefore: 'Bereiten Sie Ihr',
    ownerTest_onboardingStep1TitleHighlight: 'Profil',
    ownerTest_onboardingStep1TitleLine2: 'für den Verkauf vor',
    ownerTest_onboardingStep2Text:
      'Erstellen Sie die Immobilienkarte unter Angebote. Die rückerstattbare Kaution öffnet den Auktionszugang und bestätigt Ihre Verkaufsabsicht.',
    ownerTest_onboardingStep2TitleAfter: '',
    ownerTest_onboardingStep2TitleBefore: 'Fügen Sie Ihre',
    ownerTest_onboardingStep2TitleHighlight: 'Immobilie',
    ownerTest_onboardingStep2TitleLine2: 'hinzu und hinterlegen Sie die Kaution',
    ownerTest_onboardingStep3Text:
      'Verfolgen Sie Gebote und Käuferinteresse in Echtzeit. Jedes Update, jede Benachrichtigung und jedes Ergebnis bleibt in Ihrem Kabinett zusammen.',
    ownerTest_onboardingStep3TitleAfter: '',
    ownerTest_onboardingStep3TitleBefore: 'Behalten Sie',
    ownerTest_onboardingStep3TitleHighlight: 'die Gebote',
    ownerTest_onboardingStep4Text:
      'Ihr Weg zum ersten Deal ist klar: Profil vervollständigen, Immobilie hinzufügen und in die Auktion gehen. Wir begleiten Sie bei jedem Schritt.',
    ownerTest_onboardingStep4TitleAfter: '',
    ownerTest_onboardingStep4TitleBefore: 'Alles ist',
    ownerTest_onboardingStep4TitleHighlight: 'bereit',
    ownerTest_onboardingStep4TitleLine2: 'für Ihren ersten Schritt',
    ownerTest_onboardingStepCounter: 'Schritt {{current}} von {{total}}',
    ownerTest_onboardingStepDot: 'Schritt {{step}} von {{total}}',
    ownerTest_onboardingStepsAria: 'Einführungsschritte im Kabinett',
    ownerTest_planTaglineBasic: 'Schneller Start ohne Kosten',
    ownerTest_profileMemberSince: 'Mitglied seit {{date}}',
    ownerTest_subscriptionDrawerAppName: 'SellYourBrick',
    ownerTest_subscriptionDrawerFooter: 'Sichere Zahlung über Stripe. Jederzeit kündbar.',
    ownerTest_subscriptionDrawerSaveBadge: '−20%',
    ownerTest_subscriptionDrawerSubscribe: 'Jetzt abonnieren',
    ownerTest_subscriptionsHeroAfter: 'Tarif',
    ownerTest_subscriptionsHeroBefore: 'Wählen Sie',
    ownerTest_subscriptionsHeroHighlight: 'Ihren',
    ownerTest_subscriptionsYearlySaveBadge: '−20%',
  },
  es: {
    ownerTest_analyticsAuctionBidHint: 'Puja líder en la subasta',
    ownerTest_analyticsDownloadExcel: 'Descargar informe Excel',
    ownerTest_analyticsSharesHighlight: 'Venta de participaciones',
    ownerTest_analyticsSharesSoldOnly: 'Participaciones compradas: {{sold}}',
    ownerTest_endingSoonGo: 'Ver',
    ownerTest_endingSoonMoreObjects: 'más propiedades',
    ownerTest_endingSoonSeeMore: 'Ver más',
    ownerTest_endingSoonTitle: 'Terminan pronto',
    ownerTest_endingSoonUntilEnd: 'hasta el final',
    ownerTest_onboardingNext: 'Siguiente',
    ownerTest_onboardingStart: 'Empezar',
    ownerTest_onboardingStep1Text:
      'Complete una vez sus datos de contacto y pago para verificar su identidad y mantener cada operación en marcha sin retrasos.',
    ownerTest_onboardingStep1TitleAfter: '',
    ownerTest_onboardingStep1TitleBefore: 'Prepare su',
    ownerTest_onboardingStep1TitleHighlight: 'perfil',
    ownerTest_onboardingStep1TitleLine2: 'para vender',
    ownerTest_onboardingStep2Text:
      'Cree la ficha de la propiedad en Anuncios. El depósito reembolsable abre el acceso a la subasta y confirma su intención de vender.',
    ownerTest_onboardingStep2TitleAfter: '',
    ownerTest_onboardingStep2TitleBefore: 'Añada su',
    ownerTest_onboardingStep2TitleHighlight: 'propiedad',
    ownerTest_onboardingStep2TitleLine2: 'y deposite la fianza',
    ownerTest_onboardingStep3Text:
      'Siga las pujas y el interés de los compradores en tiempo real. Cada actualización, notificación y resultado permanece reunido en su panel.',
    ownerTest_onboardingStep3TitleAfter: '',
    ownerTest_onboardingStep3TitleBefore: 'Controle',
    ownerTest_onboardingStep3TitleHighlight: 'las pujas',
    ownerTest_onboardingStep4Text:
      'Su camino hacia la primera operación está claro: complete el perfil, añada una propiedad y entre en la subasta. Estaremos en cada paso.',
    ownerTest_onboardingStep4TitleAfter: '',
    ownerTest_onboardingStep4TitleBefore: 'Todo está',
    ownerTest_onboardingStep4TitleHighlight: 'listo',
    ownerTest_onboardingStep4TitleLine2: 'para su primer paso',
    ownerTest_onboardingStepCounter: 'Paso {{current}} de {{total}}',
    ownerTest_onboardingStepDot: 'Paso {{step}} de {{total}}',
    ownerTest_onboardingStepsAria: 'Pasos de introducción al panel',
    ownerTest_planTaglineBasic: 'Inicio rápido sin coste',
    ownerTest_profileMemberSince: 'Miembro desde {{date}}',
    ownerTest_subscriptionDrawerAppName: 'SellYourBrick',
    ownerTest_subscriptionDrawerFooter: 'Pago seguro con Stripe. Cancele cuando quiera.',
    ownerTest_subscriptionDrawerSaveBadge: '−20%',
    ownerTest_subscriptionDrawerSubscribe: 'Suscribirse ahora',
    ownerTest_subscriptionsHeroAfter: 'plan',
    ownerTest_subscriptionsHeroBefore: 'Elija',
    ownerTest_subscriptionsHeroHighlight: 'su',
    ownerTest_subscriptionsYearlySaveBadge: '−20%',
  },
  fr: {
    ownerTest_analyticsAuctionBidHint: 'Enchère dominante dans la vente',
    ownerTest_analyticsDownloadExcel: 'Télécharger le rapport Excel',
    ownerTest_analyticsSharesHighlight: 'Ventes de parts',
    ownerTest_analyticsSharesSoldOnly: 'Parts achetées : {{sold}}',
    ownerTest_endingSoonGo: 'Voir',
    ownerTest_endingSoonMoreObjects: 'autres biens',
    ownerTest_endingSoonSeeMore: 'Voir plus',
    ownerTest_endingSoonTitle: 'Se terminent bientôt',
    ownerTest_endingSoonUntilEnd: 'jusqu’à la fin',
    ownerTest_onboardingNext: 'Suivant',
    ownerTest_onboardingStart: 'Commencer',
    ownerTest_onboardingStep1Text:
      'Renseignez une fois vos coordonnées et vos informations de paiement pour vérifier votre identité et faire avancer chaque transaction sans délai.',
    ownerTest_onboardingStep1TitleAfter: '',
    ownerTest_onboardingStep1TitleBefore: 'Préparez votre',
    ownerTest_onboardingStep1TitleHighlight: 'profil',
    ownerTest_onboardingStep1TitleLine2: 'pour vendre',
    ownerTest_onboardingStep2Text:
      'Créez la fiche du bien dans Annonces. Le dépôt remboursable ouvre l’accès aux enchères et confirme votre intention de vendre.',
    ownerTest_onboardingStep2TitleAfter: '',
    ownerTest_onboardingStep2TitleBefore: 'Ajoutez votre',
    ownerTest_onboardingStep2TitleHighlight: 'bien',
    ownerTest_onboardingStep2TitleLine2: 'et versez le dépôt',
    ownerTest_onboardingStep3Text:
      'Suivez les enchères et l’intérêt des acheteurs en temps réel. Chaque mise à jour, notification et résultat reste regroupé dans votre espace.',
    ownerTest_onboardingStep3TitleAfter: '',
    ownerTest_onboardingStep3TitleBefore: 'Maîtrisez',
    ownerTest_onboardingStep3TitleHighlight: 'les enchères',
    ownerTest_onboardingStep4Text:
      'Votre chemin vers la première transaction est clair : complétez le profil, ajoutez un bien et entrez aux enchères. Nous serons là à chaque étape.',
    ownerTest_onboardingStep4TitleAfter: '',
    ownerTest_onboardingStep4TitleBefore: 'Tout est',
    ownerTest_onboardingStep4TitleHighlight: 'prêt',
    ownerTest_onboardingStep4TitleLine2: 'pour votre premier pas',
    ownerTest_onboardingStepCounter: 'Étape {{current}} sur {{total}}',
    ownerTest_onboardingStepDot: 'Étape {{step}} sur {{total}}',
    ownerTest_onboardingStepsAria: 'Étapes d’introduction à l’espace',
    ownerTest_planTaglineBasic: 'Démarrage rapide sans frais',
    ownerTest_profileMemberSince: 'Membre depuis {{date}}',
    ownerTest_subscriptionDrawerAppName: 'SellYourBrick',
    ownerTest_subscriptionDrawerFooter: 'Paiement sécurisé via Stripe. Résiliez à tout moment.',
    ownerTest_subscriptionDrawerSaveBadge: '−20%',
    ownerTest_subscriptionDrawerSubscribe: 'S’abonner maintenant',
    ownerTest_subscriptionsHeroAfter: 'forfait',
    ownerTest_subscriptionsHeroBefore: 'Choisissez',
    ownerTest_subscriptionsHeroHighlight: 'votre',
    ownerTest_subscriptionsYearlySaveBadge: '−20%',
  },
  sv: {
    ownerTest_analyticsAuctionBidHint: 'Ledande bud i auktionen',
    ownerTest_analyticsDownloadExcel: 'Ladda ner Excel-rapport',
    ownerTest_analyticsSharesHighlight: 'Andelsförsäljning',
    ownerTest_analyticsSharesSoldOnly: 'Köpta andelar: {{sold}}',
    ownerTest_endingSoonGo: 'Visa',
    ownerTest_endingSoonMoreObjects: 'fler objekt',
    ownerTest_endingSoonSeeMore: 'Se mer',
    ownerTest_endingSoonTitle: 'Avslutas snart',
    ownerTest_endingSoonUntilEnd: 'till slut',
    ownerTest_onboardingNext: 'Nästa',
    ownerTest_onboardingStart: 'Kom igång',
    ownerTest_onboardingStep1Text:
      'Fyll i kontakt- och betalningsuppgifter en gång så att vi kan verifiera din identitet och hålla varje affär igång utan dröjsmål.',
    ownerTest_onboardingStep1TitleAfter: '',
    ownerTest_onboardingStep1TitleBefore: 'Förbered din',
    ownerTest_onboardingStep1TitleHighlight: 'profil',
    ownerTest_onboardingStep1TitleLine2: 'för försäljning',
    ownerTest_onboardingStep2Text:
      'Skapa objektkortet under Annonser. Den återbetalningsbara depositionen öppnar auktionsåtkomst och bekräftar din säljintention.',
    ownerTest_onboardingStep2TitleAfter: '',
    ownerTest_onboardingStep2TitleBefore: 'Lägg till ditt',
    ownerTest_onboardingStep2TitleHighlight: 'objekt',
    ownerTest_onboardingStep2TitleLine2: 'och sätt in depositionen',
    ownerTest_onboardingStep3Text:
      'Följ bud och köparintresse i realtid. Varje uppdatering, avisering och resultat samlas i ditt kabinett.',
    ownerTest_onboardingStep3TitleAfter: '',
    ownerTest_onboardingStep3TitleBefore: 'Ha kontroll över',
    ownerTest_onboardingStep3TitleHighlight: 'budgivningen',
    ownerTest_onboardingStep4Text:
      'Vägen till din första affär är tydlig: fyll i profilen, lägg till ett objekt och gå in i auktionen. Vi finns med i varje steg.',
    ownerTest_onboardingStep4TitleAfter: '',
    ownerTest_onboardingStep4TitleBefore: 'Allt är',
    ownerTest_onboardingStep4TitleHighlight: 'klart',
    ownerTest_onboardingStep4TitleLine2: 'för ditt första steg',
    ownerTest_onboardingStepCounter: 'Steg {{current}} av {{total}}',
    ownerTest_onboardingStepDot: 'Steg {{step}} av {{total}}',
    ownerTest_onboardingStepsAria: 'Introduktionssteg i kabinettet',
    ownerTest_planTaglineBasic: 'Snabb start utan kostnad',
    ownerTest_profileMemberSince: 'Medlem sedan {{date}}',
    ownerTest_subscriptionDrawerAppName: 'SellYourBrick',
    ownerTest_subscriptionDrawerFooter: 'Säker betalning via Stripe. Avsluta när som helst.',
    ownerTest_subscriptionDrawerSaveBadge: '−20%',
    ownerTest_subscriptionDrawerSubscribe: 'Prenumerera nu',
    ownerTest_subscriptionsHeroAfter: 'plan',
    ownerTest_subscriptionsHeroBefore: 'Välj',
    ownerTest_subscriptionsHeroHighlight: 'din',
    ownerTest_subscriptionsYearlySaveBadge: '−20%',
  },
  pl: {
    ownerTest_analyticsAuctionBidHint: 'Wiodąca oferta na aukcji',
    ownerTest_analyticsDownloadExcel: 'Pobierz raport Excel',
    ownerTest_analyticsSharesHighlight: 'Sprzedaż udziałów',
    ownerTest_analyticsSharesSoldOnly: 'Kupione udziały: {{sold}}',
    ownerTest_endingSoonGo: 'Zobacz',
    ownerTest_endingSoonMoreObjects: 'więcej nieruchomości',
    ownerTest_endingSoonSeeMore: 'Zobacz więcej',
    ownerTest_endingSoonTitle: 'Wkrótce się kończy',
    ownerTest_endingSoonUntilEnd: 'do końca',
    ownerTest_onboardingNext: 'Dalej',
    ownerTest_onboardingStart: 'Zacznij',
    ownerTest_onboardingStep1Text:
      'Uzupełnij dane kontaktowe i płatnicze raz — tak potwierdzimy tożsamość i utrzymamy każdą transakcję bez opóźnień.',
    ownerTest_onboardingStep1TitleAfter: '',
    ownerTest_onboardingStep1TitleBefore: 'Przygotuj',
    ownerTest_onboardingStep1TitleHighlight: 'profil',
    ownerTest_onboardingStep1TitleLine2: 'do sprzedaży',
    ownerTest_onboardingStep2Text:
      'Utwórz kartę nieruchomości w Ogłoszeniach. Zwrotny depozyt otwiera dostęp do aukcji i potwierdza zamiar sprzedaży.',
    ownerTest_onboardingStep2TitleAfter: '',
    ownerTest_onboardingStep2TitleBefore: 'Dodaj',
    ownerTest_onboardingStep2TitleHighlight: 'nieruchomość',
    ownerTest_onboardingStep2TitleLine2: 'i wpłać depozyt',
    ownerTest_onboardingStep3Text:
      'Śledź oferty i zainteresowanie kupujących w czasie rzeczywistym. Każda aktualizacja, powiadomienie i wynik zostają w Twoim panelu.',
    ownerTest_onboardingStep3TitleAfter: '',
    ownerTest_onboardingStep3TitleBefore: 'Kontroluj',
    ownerTest_onboardingStep3TitleHighlight: 'licytację',
    ownerTest_onboardingStep4Text:
      'Droga do pierwszej transakcji jest jasna: uzupełnij profil, dodaj nieruchomość i wejdź na aukcję. Będziemy przy każdym kroku.',
    ownerTest_onboardingStep4TitleAfter: '',
    ownerTest_onboardingStep4TitleBefore: 'Wszystko jest',
    ownerTest_onboardingStep4TitleHighlight: 'gotowe',
    ownerTest_onboardingStep4TitleLine2: 'do Twojego startu',
    ownerTest_onboardingStepCounter: 'Krok {{current}} z {{total}}',
    ownerTest_onboardingStepDot: 'Krok {{step}} z {{total}}',
    ownerTest_onboardingStepsAria: 'Kroki wprowadzenia do panelu',
    ownerTest_planTaglineBasic: 'Szybki start bez opłat',
    ownerTest_profileMemberSince: 'Członek od {{date}}',
    ownerTest_subscriptionDrawerAppName: 'SellYourBrick',
    ownerTest_subscriptionDrawerFooter: 'Bezpieczna płatność przez Stripe. Anuluj w dowolnym momencie.',
    ownerTest_subscriptionDrawerSaveBadge: '−20%',
    ownerTest_subscriptionDrawerSubscribe: 'Subskrybuj teraz',
    ownerTest_subscriptionsHeroAfter: 'plan',
    ownerTest_subscriptionsHeroBefore: 'Wybierz',
    ownerTest_subscriptionsHeroHighlight: 'swój',
    ownerTest_subscriptionsYearlySaveBadge: '−20%',
  },
}

// ─── C) buyerHistory_bidCard_* ───────────────────────────────────────────────

const BID_CARD = {
  de: {
    buyerHistory_bidCard_hostType: 'Immobilie',
    buyerHistory_bidCard_priceSuffix: '· aktuelles Gebot',
    buyerHistory_bidCard_tagAuction: 'Auktion',
    buyerHistory_bidCard_tagListing: 'Angebot',
    buyerHistory_bidCard_topRated: 'Top',
  },
  es: {
    buyerHistory_bidCard_hostType: 'Inmueble',
    buyerHistory_bidCard_priceSuffix: '· puja actual',
    buyerHistory_bidCard_tagAuction: 'Subasta',
    buyerHistory_bidCard_tagListing: 'Anuncio',
    buyerHistory_bidCard_topRated: 'Top',
  },
  fr: {
    buyerHistory_bidCard_hostType: 'Immobilier',
    buyerHistory_bidCard_priceSuffix: '· enchère actuelle',
    buyerHistory_bidCard_tagAuction: 'Enchères',
    buyerHistory_bidCard_tagListing: 'Annonce',
    buyerHistory_bidCard_topRated: 'Top',
  },
  sv: {
    buyerHistory_bidCard_hostType: 'Fastighet',
    buyerHistory_bidCard_priceSuffix: '· aktuellt bud',
    buyerHistory_bidCard_tagAuction: 'Auktion',
    buyerHistory_bidCard_tagListing: 'Objekt',
    buyerHistory_bidCard_topRated: 'Topp',
  },
  pl: {
    buyerHistory_bidCard_hostType: 'Nieruchomość',
    buyerHistory_bidCard_priceSuffix: '· aktualna oferta',
    buyerHistory_bidCard_tagAuction: 'Aukcja',
    buyerHistory_bidCard_tagListing: 'Ogłoszenie',
    buyerHistory_bidCard_topRated: 'Top',
  },
}

// ─── D) NEW keys — all langs ─────────────────────────────────────────────────

const PROFILE_HISTORY = {
  ru: {
    profileHistory_catBids: 'СТАВКА',
    profileHistory_catProperties: 'ОБЪЕКТ',
    profileHistory_catShares: 'ДОЛЯ',
    profileHistory_catDebts: 'ДОЛГ',
    profileHistory_catFallback: 'ИСТОРИЯ',
    profileHistory_metaBid: 'Ставка',
    profileHistory_metaAmount: 'Сумма',
    profileHistory_title: 'История операций',
    profileHistory_lead:
      'Покупки, доли и ставки — в одном списке. Откройте карточку, чтобы продолжить.',
    profileHistory_loading: 'Загружаем историю…',
    profileHistory_empty:
      'Пока нет операций. Начните с торгов — подходящие объекты появятся в истории.',
    profileHistory_goAuction: 'Перейти к торгам',
    profileHistory_categoriesAria: 'Категории истории',
    profileHistory_allAria: 'Все, {{count}}',
    profileHistory_all: 'Все',
    profileHistory_searchPlaceholder: 'Найти объект или операцию',
    profileHistory_listAria: 'Список истории',
    profileHistory_noMatches: 'Совпадений не найдено',
    profileHistory_categoryEmpty: 'В этой категории пока пусто',
  },
  en: {
    profileHistory_catBids: 'BID',
    profileHistory_catProperties: 'PROPERTY',
    profileHistory_catShares: 'SHARE',
    profileHistory_catDebts: 'DEBT',
    profileHistory_catFallback: 'HISTORY',
    profileHistory_metaBid: 'Bid',
    profileHistory_metaAmount: 'Amount',
    profileHistory_title: 'Transaction history',
    profileHistory_lead:
      'Purchases, shares, and bids — in one list. Open a card to continue.',
    profileHistory_loading: 'Loading history…',
    profileHistory_empty:
      'No transactions yet. Start with auctions — matching properties will appear in your history.',
    profileHistory_goAuction: 'Go to auctions',
    profileHistory_categoriesAria: 'History categories',
    profileHistory_allAria: 'All, {{count}}',
    profileHistory_all: 'All',
    profileHistory_searchPlaceholder: 'Search property or transaction',
    profileHistory_listAria: 'History list',
    profileHistory_noMatches: 'No matches found',
    profileHistory_categoryEmpty: 'Nothing in this category yet',
  },
  de: {
    profileHistory_catBids: 'GEBOT',
    profileHistory_catProperties: 'OBJEKT',
    profileHistory_catShares: 'ANTEIL',
    profileHistory_catDebts: 'SCHULD',
    profileHistory_catFallback: 'VERLAUF',
    profileHistory_metaBid: 'Gebot',
    profileHistory_metaAmount: 'Betrag',
    profileHistory_title: 'Transaktionsverlauf',
    profileHistory_lead:
      'Käufe, Anteile und Gebote — in einer Liste. Öffnen Sie eine Karte, um fortzufahren.',
    profileHistory_loading: 'Verlauf wird geladen…',
    profileHistory_empty:
      'Noch keine Vorgänge. Starten Sie mit Auktionen — passende Immobilien erscheinen im Verlauf.',
    profileHistory_goAuction: 'Zu den Auktionen',
    profileHistory_categoriesAria: 'Verlaufskategorien',
    profileHistory_allAria: 'Alle, {{count}}',
    profileHistory_all: 'Alle',
    profileHistory_searchPlaceholder: 'Immobilie oder Vorgang suchen',
    profileHistory_listAria: 'Verlaufsliste',
    profileHistory_noMatches: 'Keine Treffer',
    profileHistory_categoryEmpty: 'In dieser Kategorie ist noch nichts',
  },
  es: {
    profileHistory_catBids: 'PUJA',
    profileHistory_catProperties: 'OBJETO',
    profileHistory_catShares: 'PARTICIPACIÓN',
    profileHistory_catDebts: 'DEUDA',
    profileHistory_catFallback: 'HISTORIAL',
    profileHistory_metaBid: 'Puja',
    profileHistory_metaAmount: 'Importe',
    profileHistory_title: 'Historial de operaciones',
    profileHistory_lead:
      'Compras, participaciones y pujas — en una sola lista. Abra una tarjeta para continuar.',
    profileHistory_loading: 'Cargando historial…',
    profileHistory_empty:
      'Aún no hay operaciones. Empiece por las subastas: las propiedades adecuadas aparecerán en el historial.',
    profileHistory_goAuction: 'Ir a subastas',
    profileHistory_categoriesAria: 'Categorías del historial',
    profileHistory_allAria: 'Todas, {{count}}',
    profileHistory_all: 'Todas',
    profileHistory_searchPlaceholder: 'Buscar propiedad u operación',
    profileHistory_listAria: 'Lista del historial',
    profileHistory_noMatches: 'Sin coincidencias',
    profileHistory_categoryEmpty: 'Esta categoría está vacía por ahora',
  },
  fr: {
    profileHistory_catBids: 'ENCHÈRE',
    profileHistory_catProperties: 'BIEN',
    profileHistory_catShares: 'PART',
    profileHistory_catDebts: 'DETTE',
    profileHistory_catFallback: 'HISTORIQUE',
    profileHistory_metaBid: 'Enchère',
    profileHistory_metaAmount: 'Montant',
    profileHistory_title: 'Historique des opérations',
    profileHistory_lead:
      'Achats, parts et enchères — dans une seule liste. Ouvrez une carte pour continuer.',
    profileHistory_loading: 'Chargement de l’historique…',
    profileHistory_empty:
      'Pas encore d’opérations. Commencez par les enchères — les biens adaptés apparaîtront dans l’historique.',
    profileHistory_goAuction: 'Aller aux enchères',
    profileHistory_categoriesAria: 'Catégories de l’historique',
    profileHistory_allAria: 'Toutes, {{count}}',
    profileHistory_all: 'Toutes',
    profileHistory_searchPlaceholder: 'Rechercher un bien ou une opération',
    profileHistory_listAria: 'Liste de l’historique',
    profileHistory_noMatches: 'Aucun résultat',
    profileHistory_categoryEmpty: 'Cette catégorie est encore vide',
  },
  sv: {
    profileHistory_catBids: 'BUD',
    profileHistory_catProperties: 'OBJEKT',
    profileHistory_catShares: 'ANDEL',
    profileHistory_catDebts: 'SKULD',
    profileHistory_catFallback: 'HISTORIK',
    profileHistory_metaBid: 'Bud',
    profileHistory_metaAmount: 'Belopp',
    profileHistory_title: 'Transaktionshistorik',
    profileHistory_lead:
      'Köp, andelar och bud — i en lista. Öppna ett kort för att fortsätta.',
    profileHistory_loading: 'Laddar historik…',
    profileHistory_empty:
      'Inga transaktioner ännu. Börja med auktioner — matchande objekt visas i historiken.',
    profileHistory_goAuction: 'Gå till auktioner',
    profileHistory_categoriesAria: 'Historikkategorier',
    profileHistory_allAria: 'Alla, {{count}}',
    profileHistory_all: 'Alla',
    profileHistory_searchPlaceholder: 'Sök objekt eller transaktion',
    profileHistory_listAria: 'Historiklista',
    profileHistory_noMatches: 'Inga träffar',
    profileHistory_categoryEmpty: 'Inget i den här kategorin ännu',
  },
  pl: {
    profileHistory_catBids: 'OFERTA',
    profileHistory_catProperties: 'OBIEKT',
    profileHistory_catShares: 'UDZIAŁ',
    profileHistory_catDebts: 'DŁUG',
    profileHistory_catFallback: 'HISTORIA',
    profileHistory_metaBid: 'Oferta',
    profileHistory_metaAmount: 'Kwota',
    profileHistory_title: 'Historia operacji',
    profileHistory_lead:
      'Zakupy, udziały i oferty — na jednej liście. Otwórz kartę, aby kontynuować.',
    profileHistory_loading: 'Ładowanie historii…',
    profileHistory_empty:
      'Brak operacji. Zacznij od aukcji — pasujące nieruchomości pojawią się w historii.',
    profileHistory_goAuction: 'Przejdź do aukcji',
    profileHistory_categoriesAria: 'Kategorie historii',
    profileHistory_allAria: 'Wszystkie, {{count}}',
    profileHistory_all: 'Wszystkie',
    profileHistory_searchPlaceholder: 'Szukaj nieruchomości lub operacji',
    profileHistory_listAria: 'Lista historii',
    profileHistory_noMatches: 'Brak wyników',
    profileHistory_categoryEmpty: 'W tej kategorii jest na razie pusto',
  },
}

const PROFILE_BOOKINGS = {
  ru: {
    profileBookings_status_pending: 'Ожидает подтверждения',
    profileBookings_status_approved: 'Подтверждена',
    profileBookings_status_paid: 'Оплачена',
    profileBookings_status_rejected: 'Отклонена',
    profileBookings_status_cancelled: 'Отменена',
    profileBookings_status_fallback: 'На рассмотрении',
    profileBookings_paymentNotRecorded: 'Оплата не зафиксирована',
    profileBookings_insuranceNotRequired: 'Не требуется',
    profileBookings_close: 'Закрыть',
    profileBookings_bookingNumber: 'Бронь #{{id}}',
    profileBookings_tripDetails: 'Подробности поездки',
    profileBookings_period: 'Период',
    profileBookings_duration: 'Продолжительность',
    profileBookings_day: 'день',
    profileBookings_days: 'дней',
    profileBookings_daysCount: '{{count}} дней',
    profileBookings_paid: 'Оплачено',
    profileBookings_insuranceDeposit: 'Страховой депозит',
    profileBookings_ownerComment: 'Комментарий владельца',
    profileBookings_openProperty: 'Открыть объект',
    profileBookings_checkIn: 'Заселиться',
    profileBookings_cancelBooking: 'Отменить бронь',
    profileBookings_homeCode: 'HOME',
    profileBookings_homeLabel: 'Ваш город',
    profileBookings_stayCode: 'STAY',
    profileBookings_stayLabel: 'Отдых',
    profileBookings_checkInLabel: 'Заезд',
    profileBookings_year: 'Год',
    profileBookings_periodShort: 'Период',
    profileBookings_status: 'Статус',
    profileBookings_learnMore: 'Подробнее',
    profileBookings_title: 'Бронирования',
    profileBookings_lead: 'Билеты на отдых и будущие поездки — в одном месте.',
    profileBookings_back: 'Назад',
    profileBookings_totalBookings: 'Всего броней',
    profileBookings_confirmed: 'Подтверждено',
    profileBookings_loading: 'Загружаем билеты…',
    profileBookings_empty:
      'Пока нет бронирований. Выберите объект для отдыха — билет появится здесь.',
    profileBookings_browseProperties: 'Смотреть объекты',
  },
  en: {
    profileBookings_status_pending: 'Awaiting confirmation',
    profileBookings_status_approved: 'Confirmed',
    profileBookings_status_paid: 'Paid',
    profileBookings_status_rejected: 'Rejected',
    profileBookings_status_cancelled: 'Cancelled',
    profileBookings_status_fallback: 'Under review',
    profileBookings_paymentNotRecorded: 'Payment not recorded',
    profileBookings_insuranceNotRequired: 'Not required',
    profileBookings_close: 'Close',
    profileBookings_bookingNumber: 'Booking #{{id}}',
    profileBookings_tripDetails: 'Trip details',
    profileBookings_period: 'Period',
    profileBookings_duration: 'Duration',
    profileBookings_day: 'day',
    profileBookings_days: 'days',
    profileBookings_daysCount: '{{count}} days',
    profileBookings_paid: 'Paid',
    profileBookings_insuranceDeposit: 'Insurance deposit',
    profileBookings_ownerComment: 'Owner comment',
    profileBookings_openProperty: 'Open property',
    profileBookings_checkIn: 'Check in',
    profileBookings_cancelBooking: 'Cancel booking',
    profileBookings_homeCode: 'HOME',
    profileBookings_homeLabel: 'Your city',
    profileBookings_stayCode: 'STAY',
    profileBookings_stayLabel: 'Vacation',
    profileBookings_checkInLabel: 'Check-in',
    profileBookings_year: 'Year',
    profileBookings_periodShort: 'Period',
    profileBookings_status: 'Status',
    profileBookings_learnMore: 'Learn more',
    profileBookings_title: 'Bookings',
    profileBookings_lead: 'Vacation tickets and upcoming trips — in one place.',
    profileBookings_back: 'Back',
    profileBookings_totalBookings: 'Total bookings',
    profileBookings_confirmed: 'Confirmed',
    profileBookings_loading: 'Loading tickets…',
    profileBookings_empty:
      'No bookings yet. Pick a property for a stay — your ticket will appear here.',
    profileBookings_browseProperties: 'Browse properties',
  },
  de: {
    profileBookings_status_pending: 'Wartet auf Bestätigung',
    profileBookings_status_approved: 'Bestätigt',
    profileBookings_status_paid: 'Bezahlt',
    profileBookings_status_rejected: 'Abgelehnt',
    profileBookings_status_cancelled: 'Storniert',
    profileBookings_status_fallback: 'In Prüfung',
    profileBookings_paymentNotRecorded: 'Zahlung nicht erfasst',
    profileBookings_insuranceNotRequired: 'Nicht erforderlich',
    profileBookings_close: 'Schließen',
    profileBookings_bookingNumber: 'Buchung #{{id}}',
    profileBookings_tripDetails: 'Reisedetails',
    profileBookings_period: 'Zeitraum',
    profileBookings_duration: 'Dauer',
    profileBookings_day: 'Tag',
    profileBookings_days: 'Tage',
    profileBookings_daysCount: '{{count}} Tage',
    profileBookings_paid: 'Bezahlt',
    profileBookings_insuranceDeposit: 'Versicherungsdepot',
    profileBookings_ownerComment: 'Kommentar des Eigentümers',
    profileBookings_openProperty: 'Immobilie öffnen',
    profileBookings_checkIn: 'Einchecken',
    profileBookings_cancelBooking: 'Buchung stornieren',
    profileBookings_homeCode: 'HOME',
    profileBookings_homeLabel: 'Ihre Stadt',
    profileBookings_stayCode: 'STAY',
    profileBookings_stayLabel: 'Urlaub',
    profileBookings_checkInLabel: 'Anreise',
    profileBookings_year: 'Jahr',
    profileBookings_periodShort: 'Zeitraum',
    profileBookings_status: 'Status',
    profileBookings_learnMore: 'Mehr erfahren',
    profileBookings_title: 'Buchungen',
    profileBookings_lead: 'Urlaubstickets und künftige Reisen — an einem Ort.',
    profileBookings_back: 'Zurück',
    profileBookings_totalBookings: 'Buchungen gesamt',
    profileBookings_confirmed: 'Bestätigt',
    profileBookings_loading: 'Tickets werden geladen…',
    profileBookings_empty:
      'Noch keine Buchungen. Wählen Sie eine Immobilie für den Aufenthalt — das Ticket erscheint hier.',
    profileBookings_browseProperties: 'Immobilien ansehen',
  },
  es: {
    profileBookings_status_pending: 'Pendiente de confirmación',
    profileBookings_status_approved: 'Confirmada',
    profileBookings_status_paid: 'Pagada',
    profileBookings_status_rejected: 'Rechazada',
    profileBookings_status_cancelled: 'Cancelada',
    profileBookings_status_fallback: 'En revisión',
    profileBookings_paymentNotRecorded: 'Pago no registrado',
    profileBookings_insuranceNotRequired: 'No requerido',
    profileBookings_close: 'Cerrar',
    profileBookings_bookingNumber: 'Reserva #{{id}}',
    profileBookings_tripDetails: 'Detalles del viaje',
    profileBookings_period: 'Periodo',
    profileBookings_duration: 'Duración',
    profileBookings_day: 'día',
    profileBookings_days: 'días',
    profileBookings_daysCount: '{{count}} días',
    profileBookings_paid: 'Pagado',
    profileBookings_insuranceDeposit: 'Depósito de seguro',
    profileBookings_ownerComment: 'Comentario del propietario',
    profileBookings_openProperty: 'Abrir propiedad',
    profileBookings_checkIn: 'Registrarse',
    profileBookings_cancelBooking: 'Cancelar reserva',
    profileBookings_homeCode: 'HOME',
    profileBookings_homeLabel: 'Su ciudad',
    profileBookings_stayCode: 'STAY',
    profileBookings_stayLabel: 'Vacaciones',
    profileBookings_checkInLabel: 'Entrada',
    profileBookings_year: 'Año',
    profileBookings_periodShort: 'Periodo',
    profileBookings_status: 'Estado',
    profileBookings_learnMore: 'Más información',
    profileBookings_title: 'Reservas',
    profileBookings_lead: 'Entradas de vacaciones y próximos viajes — en un solo lugar.',
    profileBookings_back: 'Atrás',
    profileBookings_totalBookings: 'Reservas totales',
    profileBookings_confirmed: 'Confirmadas',
    profileBookings_loading: 'Cargando entradas…',
    profileBookings_empty:
      'Aún no hay reservas. Elija una propiedad para su estancia: la entrada aparecerá aquí.',
    profileBookings_browseProperties: 'Ver propiedades',
  },
  fr: {
    profileBookings_status_pending: 'En attente de confirmation',
    profileBookings_status_approved: 'Confirmée',
    profileBookings_status_paid: 'Payée',
    profileBookings_status_rejected: 'Refusée',
    profileBookings_status_cancelled: 'Annulée',
    profileBookings_status_fallback: 'En cours d’examen',
    profileBookings_paymentNotRecorded: 'Paiement non enregistré',
    profileBookings_insuranceNotRequired: 'Non requis',
    profileBookings_close: 'Fermer',
    profileBookings_bookingNumber: 'Réservation #{{id}}',
    profileBookings_tripDetails: 'Détails du séjour',
    profileBookings_period: 'Période',
    profileBookings_duration: 'Durée',
    profileBookings_day: 'jour',
    profileBookings_days: 'jours',
    profileBookings_daysCount: '{{count}} jours',
    profileBookings_paid: 'Payé',
    profileBookings_insuranceDeposit: 'Dépôt d’assurance',
    profileBookings_ownerComment: 'Commentaire du propriétaire',
    profileBookings_openProperty: 'Ouvrir le bien',
    profileBookings_checkIn: 'S’enregistrer',
    profileBookings_cancelBooking: 'Annuler la réservation',
    profileBookings_homeCode: 'HOME',
    profileBookings_homeLabel: 'Votre ville',
    profileBookings_stayCode: 'STAY',
    profileBookings_stayLabel: 'Séjour',
    profileBookings_checkInLabel: 'Arrivée',
    profileBookings_year: 'Année',
    profileBookings_periodShort: 'Période',
    profileBookings_status: 'Statut',
    profileBookings_learnMore: 'En savoir plus',
    profileBookings_title: 'Réservations',
    profileBookings_lead: 'Billets de séjour et voyages à venir — au même endroit.',
    profileBookings_back: 'Retour',
    profileBookings_totalBookings: 'Réservations au total',
    profileBookings_confirmed: 'Confirmées',
    profileBookings_loading: 'Chargement des billets…',
    profileBookings_empty:
      'Pas encore de réservations. Choisissez un bien pour votre séjour — le billet apparaîtra ici.',
    profileBookings_browseProperties: 'Voir les biens',
  },
  sv: {
    profileBookings_status_pending: 'Väntar på bekräftelse',
    profileBookings_status_approved: 'Bekräftad',
    profileBookings_status_paid: 'Betald',
    profileBookings_status_rejected: 'Avvisad',
    profileBookings_status_cancelled: 'Avbokad',
    profileBookings_status_fallback: 'Under granskning',
    profileBookings_paymentNotRecorded: 'Betalning inte registrerad',
    profileBookings_insuranceNotRequired: 'Krävs inte',
    profileBookings_close: 'Stäng',
    profileBookings_bookingNumber: 'Bokning #{{id}}',
    profileBookings_tripDetails: 'Resedetaljer',
    profileBookings_period: 'Period',
    profileBookings_duration: 'Längd',
    profileBookings_day: 'dag',
    profileBookings_days: 'dagar',
    profileBookings_daysCount: '{{count}} dagar',
    profileBookings_paid: 'Betalt',
    profileBookings_insuranceDeposit: 'Försäkringsdeposition',
    profileBookings_ownerComment: 'Ägarens kommentar',
    profileBookings_openProperty: 'Öppna objekt',
    profileBookings_checkIn: 'Checka in',
    profileBookings_cancelBooking: 'Avboka',
    profileBookings_homeCode: 'HOME',
    profileBookings_homeLabel: 'Din stad',
    profileBookings_stayCode: 'STAY',
    profileBookings_stayLabel: 'Semester',
    profileBookings_checkInLabel: 'Incheckning',
    profileBookings_year: 'År',
    profileBookings_periodShort: 'Period',
    profileBookings_status: 'Status',
    profileBookings_learnMore: 'Läs mer',
    profileBookings_title: 'Bokningar',
    profileBookings_lead: 'Semesterbiljetter och kommande resor — på ett ställe.',
    profileBookings_back: 'Tillbaka',
    profileBookings_totalBookings: 'Totalt bokningar',
    profileBookings_confirmed: 'Bekräftade',
    profileBookings_loading: 'Laddar biljetter…',
    profileBookings_empty:
      'Inga bokningar ännu. Välj ett objekt för vistelsen — biljetten visas här.',
    profileBookings_browseProperties: 'Se objekt',
  },
  pl: {
    profileBookings_status_pending: 'Oczekuje na potwierdzenie',
    profileBookings_status_approved: 'Potwierdzona',
    profileBookings_status_paid: 'Opłacona',
    profileBookings_status_rejected: 'Odrzucona',
    profileBookings_status_cancelled: 'Anulowana',
    profileBookings_status_fallback: 'W trakcie rozpatrywania',
    profileBookings_paymentNotRecorded: 'Płatność nieodnotowana',
    profileBookings_insuranceNotRequired: 'Nie wymagane',
    profileBookings_close: 'Zamknij',
    profileBookings_bookingNumber: 'Rezerwacja #{{id}}',
    profileBookings_tripDetails: 'Szczegóły pobytu',
    profileBookings_period: 'Okres',
    profileBookings_duration: 'Czas trwania',
    profileBookings_day: 'dzień',
    profileBookings_days: 'dni',
    profileBookings_daysCount: '{{count}} dni',
    profileBookings_paid: 'Opłacono',
    profileBookings_insuranceDeposit: 'Depozyt ubezpieczeniowy',
    profileBookings_ownerComment: 'Komentarz właściciela',
    profileBookings_openProperty: 'Otwórz nieruchomość',
    profileBookings_checkIn: 'Zameldować się',
    profileBookings_cancelBooking: 'Anuluj rezerwację',
    profileBookings_homeCode: 'HOME',
    profileBookings_homeLabel: 'Twoje miasto',
    profileBookings_stayCode: 'STAY',
    profileBookings_stayLabel: 'Wypoczynek',
    profileBookings_checkInLabel: 'Zameldowanie',
    profileBookings_year: 'Rok',
    profileBookings_periodShort: 'Okres',
    profileBookings_status: 'Status',
    profileBookings_learnMore: 'Więcej',
    profileBookings_title: 'Rezerwacje',
    profileBookings_lead: 'Bilety na wypoczynek i przyszłe podróże — w jednym miejscu.',
    profileBookings_back: 'Wstecz',
    profileBookings_totalBookings: 'Łącznie rezerwacji',
    profileBookings_confirmed: 'Potwierdzone',
    profileBookings_loading: 'Ładowanie biletów…',
    profileBookings_empty:
      'Brak rezerwacji. Wybierz nieruchomość na pobyt — bilet pojawi się tutaj.',
    profileBookings_browseProperties: 'Zobacz nieruchomości',
  },
}

const BUYER_BOOKINGS_EXTRAS = {
  ru: {
    buyerBookings_next_pending:
      'Заявка отправлена. Владелец проверит даты — ответ появится в уведомлениях.',
    buyerBookings_next_paid:
      'Оплата подтверждена. Дождитесь финального подтверждения владельца.',
    buyerBookings_next_approved:
      'Проверьте детали визита и заполните анкету до заселения, если она доступна.',
    buyerBookings_next_completed:
      'Визит завершён. Объект можно снова открыть и перейти к решению о покупке.',
    buyerBookings_next_rejected:
      'Эти даты недоступны. Вернитесь к объекту и выберите другой период.',
    buyerBookings_next_cancelled:
      'Бронь закрыта. Можно открыть объект и создать новую заявку.',
    buyerBookings_next_default:
      'Откройте детали брони — там собраны актуальный статус и следующий шаг.',
    buyerBookings_cancelledBySellerTitle: 'Бронь отменена продавцом',
    buyerBookings_openProperty: 'Открыть объект',
    buyerBookings_visitPlanEyebrow: 'План визита',
    buyerBookings_whatsNextTitle: 'Что делать дальше',
    buyerBookings_planBulletStatus: 'Мы сохраняем актуальный статус брони в этом разделе.',
    buyerBookings_planBulletAddress: 'Адрес и инструкции владельца появятся в деталях заявки.',
    buyerBookings_sellerReason: 'Причина от продавца:',
    buyerBookings_gotIt: 'Понятно',
    buyerBookings_cabinetEyebrow: 'Личный кабинет',
    buyerBookings_spotlightAria: 'Ближайший визит',
    buyerBookings_spotlightEyebrow: 'Ближайший шаг',
    buyerBookings_activeCount: '{{count}} активных',
    buyerBookings_viewPlan: 'Посмотреть план',
    buyerBookings_filterAria: 'Фильтр бронирований',
    buyerBookings_filterActive: 'Активные',
    buyerBookings_filterAll: 'Все',
    buyerBookings_filterClosed: 'Завершённые',
    buyerBookings_retry: 'Попробовать снова',
    buyerBookings_pickTestDrive: 'Выбрать объект для тест-драйва',
    buyerBookings_filterEmptyTitle: 'В этом разделе пока пусто',
    buyerBookings_filterEmptyText: 'Переключите фильтр, чтобы увидеть остальные бронирования.',
    buyerBookings_nextStepLabel: 'Следующий шаг',
    buyerBookings_ownerCommentLabel: 'Комментарий владельца:',
    buyerBookings_whatsNextCta: 'Что дальше',
  },
  en: {
    buyerBookings_next_pending:
      'Request sent. The owner will review the dates — the reply will appear in notifications.',
    buyerBookings_next_paid:
      'Payment confirmed. Wait for the owner’s final confirmation.',
    buyerBookings_next_approved:
      'Review the visit details and complete the check-in form if available.',
    buyerBookings_next_completed:
      'Visit completed. You can open the property again and move toward a purchase decision.',
    buyerBookings_next_rejected:
      'These dates are unavailable. Return to the property and choose another period.',
    buyerBookings_next_cancelled:
      'Booking closed. You can open the property and create a new request.',
    buyerBookings_next_default:
      'Open the booking details — current status and next step are there.',
    buyerBookings_cancelledBySellerTitle: 'Booking cancelled by seller',
    buyerBookings_openProperty: 'Open property',
    buyerBookings_visitPlanEyebrow: 'Visit plan',
    buyerBookings_whatsNextTitle: 'What to do next',
    buyerBookings_planBulletStatus: 'We keep the current booking status in this section.',
    buyerBookings_planBulletAddress: 'Address and owner instructions will appear in the request details.',
    buyerBookings_sellerReason: 'Reason from seller:',
    buyerBookings_gotIt: 'Got it',
    buyerBookings_cabinetEyebrow: 'Personal cabinet',
    buyerBookings_spotlightAria: 'Upcoming visit',
    buyerBookings_spotlightEyebrow: 'Next step',
    buyerBookings_activeCount: '{{count}} active',
    buyerBookings_viewPlan: 'View plan',
    buyerBookings_filterAria: 'Booking filter',
    buyerBookings_filterActive: 'Active',
    buyerBookings_filterAll: 'All',
    buyerBookings_filterClosed: 'Closed',
    buyerBookings_retry: 'Try again',
    buyerBookings_pickTestDrive: 'Pick a property for a test drive',
    buyerBookings_filterEmptyTitle: 'Nothing in this section yet',
    buyerBookings_filterEmptyText: 'Switch the filter to see other bookings.',
    buyerBookings_nextStepLabel: 'Next step',
    buyerBookings_ownerCommentLabel: 'Owner comment:',
    buyerBookings_whatsNextCta: "What's next",
  },
  de: {
    buyerBookings_next_pending:
      'Anfrage gesendet. Der Eigentümer prüft die Daten — die Antwort erscheint in den Benachrichtigungen.',
    buyerBookings_next_paid:
      'Zahlung bestätigt. Warten Sie auf die endgültige Bestätigung des Eigentümers.',
    buyerBookings_next_approved:
      'Prüfen Sie die Besuchdetails und füllen Sie vor dem Check-in das Formular aus, falls verfügbar.',
    buyerBookings_next_completed:
      'Besuch abgeschlossen. Sie können die Immobilie erneut öffnen und zur Kaufentscheidung übergehen.',
    buyerBookings_next_rejected:
      'Diese Daten sind nicht verfügbar. Kehren Sie zur Immobilie zurück und wählen Sie einen anderen Zeitraum.',
    buyerBookings_next_cancelled:
      'Buchung geschlossen. Sie können die Immobilie öffnen und eine neue Anfrage erstellen.',
    buyerBookings_next_default:
      'Öffnen Sie die Buchungsdetails — dort finden Sie Status und nächsten Schritt.',
    buyerBookings_cancelledBySellerTitle: 'Buchung vom Verkäufer storniert',
    buyerBookings_openProperty: 'Immobilie öffnen',
    buyerBookings_visitPlanEyebrow: 'Besuchsplan',
    buyerBookings_whatsNextTitle: 'Was als Nächstes zu tun ist',
    buyerBookings_planBulletStatus: 'Wir speichern den aktuellen Buchungsstatus in diesem Bereich.',
    buyerBookings_planBulletAddress:
      'Adresse und Anweisungen des Eigentümers erscheinen in den Anfragedetails.',
    buyerBookings_sellerReason: 'Grund vom Verkäufer:',
    buyerBookings_gotIt: 'Verstanden',
    buyerBookings_cabinetEyebrow: 'Persönliches Kabinett',
    buyerBookings_spotlightAria: 'Nächster Besuch',
    buyerBookings_spotlightEyebrow: 'Nächster Schritt',
    buyerBookings_activeCount: '{{count}} aktiv',
    buyerBookings_viewPlan: 'Plan ansehen',
    buyerBookings_filterAria: 'Buchungsfilter',
    buyerBookings_filterActive: 'Aktiv',
    buyerBookings_filterAll: 'Alle',
    buyerBookings_filterClosed: 'Abgeschlossen',
    buyerBookings_retry: 'Erneut versuchen',
    buyerBookings_pickTestDrive: 'Immobilie für Test Drive wählen',
    buyerBookings_filterEmptyTitle: 'In diesem Bereich ist noch nichts',
    buyerBookings_filterEmptyText: 'Wechseln Sie den Filter, um andere Buchungen zu sehen.',
    buyerBookings_nextStepLabel: 'Nächster Schritt',
    buyerBookings_ownerCommentLabel: 'Kommentar des Eigentümers:',
    buyerBookings_whatsNextCta: 'Was als Nächstes',
  },
  es: {
    buyerBookings_next_pending:
      'Solicitud enviada. El propietario revisará las fechas: la respuesta aparecerá en las notificaciones.',
    buyerBookings_next_paid:
      'Pago confirmado. Espere la confirmación final del propietario.',
    buyerBookings_next_approved:
      'Revise los detalles de la visita y complete el formulario antes del check-in, si está disponible.',
    buyerBookings_next_completed:
      'Visita finalizada. Puede abrir de nuevo la propiedad y avanzar hacia la decisión de compra.',
    buyerBookings_next_rejected:
      'Estas fechas no están disponibles. Vuelva a la propiedad y elija otro periodo.',
    buyerBookings_next_cancelled:
      'Reserva cerrada. Puede abrir la propiedad y crear una nueva solicitud.',
    buyerBookings_next_default:
      'Abra los detalles de la reserva: allí están el estado actual y el siguiente paso.',
    buyerBookings_cancelledBySellerTitle: 'Reserva cancelada por el vendedor',
    buyerBookings_openProperty: 'Abrir propiedad',
    buyerBookings_visitPlanEyebrow: 'Plan de visita',
    buyerBookings_whatsNextTitle: 'Qué hacer a continuación',
    buyerBookings_planBulletStatus: 'Mantenemos el estado actual de la reserva en esta sección.',
    buyerBookings_planBulletAddress:
      'La dirección y las instrucciones del propietario aparecerán en los detalles de la solicitud.',
    buyerBookings_sellerReason: 'Motivo del vendedor:',
    buyerBookings_gotIt: 'Entendido',
    buyerBookings_cabinetEyebrow: 'Área personal',
    buyerBookings_spotlightAria: 'Próxima visita',
    buyerBookings_spotlightEyebrow: 'Siguiente paso',
    buyerBookings_activeCount: '{{count}} activas',
    buyerBookings_viewPlan: 'Ver plan',
    buyerBookings_filterAria: 'Filtro de reservas',
    buyerBookings_filterActive: 'Activas',
    buyerBookings_filterAll: 'Todas',
    buyerBookings_filterClosed: 'Cerradas',
    buyerBookings_retry: 'Intentar de nuevo',
    buyerBookings_pickTestDrive: 'Elegir propiedad para test drive',
    buyerBookings_filterEmptyTitle: 'Esta sección está vacía por ahora',
    buyerBookings_filterEmptyText: 'Cambie el filtro para ver el resto de reservas.',
    buyerBookings_nextStepLabel: 'Siguiente paso',
    buyerBookings_ownerCommentLabel: 'Comentario del propietario:',
    buyerBookings_whatsNextCta: 'Qué sigue',
  },
  fr: {
    buyerBookings_next_pending:
      'Demande envoyée. Le propriétaire vérifiera les dates — la réponse apparaîtra dans les notifications.',
    buyerBookings_next_paid:
      'Paiement confirmé. Attendez la confirmation finale du propriétaire.',
    buyerBookings_next_approved:
      'Vérifiez les détails de la visite et remplissez le formulaire avant l’arrivée, s’il est disponible.',
    buyerBookings_next_completed:
      'Visite terminée. Vous pouvez rouvrir le bien et avancer vers une décision d’achat.',
    buyerBookings_next_rejected:
      'Ces dates ne sont pas disponibles. Revenez au bien et choisissez une autre période.',
    buyerBookings_next_cancelled:
      'Réservation clôturée. Vous pouvez ouvrir le bien et créer une nouvelle demande.',
    buyerBookings_next_default:
      'Ouvrez les détails de la réservation — le statut actuel et la prochaine étape s’y trouvent.',
    buyerBookings_cancelledBySellerTitle: 'Réservation annulée par le vendeur',
    buyerBookings_openProperty: 'Ouvrir le bien',
    buyerBookings_visitPlanEyebrow: 'Plan de visite',
    buyerBookings_whatsNextTitle: 'Que faire ensuite',
    buyerBookings_planBulletStatus: 'Nous conservons le statut actuel de la réservation dans cette section.',
    buyerBookings_planBulletAddress:
      'L’adresse et les instructions du propriétaire apparaîtront dans les détails de la demande.',
    buyerBookings_sellerReason: 'Motif du vendeur :',
    buyerBookings_gotIt: 'Compris',
    buyerBookings_cabinetEyebrow: 'Espace personnel',
    buyerBookings_spotlightAria: 'Prochaine visite',
    buyerBookings_spotlightEyebrow: 'Prochaine étape',
    buyerBookings_activeCount: '{{count}} actives',
    buyerBookings_viewPlan: 'Voir le plan',
    buyerBookings_filterAria: 'Filtre des réservations',
    buyerBookings_filterActive: 'Actives',
    buyerBookings_filterAll: 'Toutes',
    buyerBookings_filterClosed: 'Terminées',
    buyerBookings_retry: 'Réessayer',
    buyerBookings_pickTestDrive: 'Choisir un bien pour le test drive',
    buyerBookings_filterEmptyTitle: 'Cette section est encore vide',
    buyerBookings_filterEmptyText: 'Changez le filtre pour voir les autres réservations.',
    buyerBookings_nextStepLabel: 'Prochaine étape',
    buyerBookings_ownerCommentLabel: 'Commentaire du propriétaire :',
    buyerBookings_whatsNextCta: 'Et ensuite',
  },
  sv: {
    buyerBookings_next_pending:
      'Förfrågan skickad. Ägaren granskar datumen — svaret visas i aviseringarna.',
    buyerBookings_next_paid:
      'Betalning bekräftad. Vänta på ägarens slutliga bekräftelse.',
    buyerBookings_next_approved:
      'Kontrollera besöksdetaljerna och fyll i formuläret före incheckning om det finns.',
    buyerBookings_next_completed:
      'Besöket är avslutat. Du kan öppna objektet igen och gå vidare mot ett köpbeslut.',
    buyerBookings_next_rejected:
      'Dessa datum är inte tillgängliga. Gå tillbaka till objektet och välj en annan period.',
    buyerBookings_next_cancelled:
      'Bokningen är stängd. Du kan öppna objektet och skapa en ny förfrågan.',
    buyerBookings_next_default:
      'Öppna bokningsdetaljerna — där finns aktuell status och nästa steg.',
    buyerBookings_cancelledBySellerTitle: 'Bokning avbokad av säljaren',
    buyerBookings_openProperty: 'Öppna objekt',
    buyerBookings_visitPlanEyebrow: 'Besöksplan',
    buyerBookings_whatsNextTitle: 'Vad du gör härnäst',
    buyerBookings_planBulletStatus: 'Vi sparar aktuell bokningsstatus i det här avsnittet.',
    buyerBookings_planBulletAddress:
      'Adress och ägarens instruktioner visas i förfrågans detaljer.',
    buyerBookings_sellerReason: 'Orsak från säljaren:',
    buyerBookings_gotIt: 'Jag förstår',
    buyerBookings_cabinetEyebrow: 'Personligt kabinett',
    buyerBookings_spotlightAria: 'Kommande besök',
    buyerBookings_spotlightEyebrow: 'Nästa steg',
    buyerBookings_activeCount: '{{count}} aktiva',
    buyerBookings_viewPlan: 'Visa plan',
    buyerBookings_filterAria: 'Bokningsfilter',
    buyerBookings_filterActive: 'Aktiva',
    buyerBookings_filterAll: 'Alla',
    buyerBookings_filterClosed: 'Avslutade',
    buyerBookings_retry: 'Försök igen',
    buyerBookings_pickTestDrive: 'Välj objekt för test drive',
    buyerBookings_filterEmptyTitle: 'Inget i det här avsnittet ännu',
    buyerBookings_filterEmptyText: 'Byt filter för att se övriga bokningar.',
    buyerBookings_nextStepLabel: 'Nästa steg',
    buyerBookings_ownerCommentLabel: 'Ägarens kommentar:',
    buyerBookings_whatsNextCta: 'Vad händer sen',
  },
  pl: {
    buyerBookings_next_pending:
      'Wniosek wysłany. Właściciel sprawdzi daty — odpowiedź pojawi się w powiadomieniach.',
    buyerBookings_next_paid:
      'Płatność potwierdzona. Poczekaj na ostateczne potwierdzenie właściciela.',
    buyerBookings_next_approved:
      'Sprawdź szczegóły wizyty i wypełnij ankietę przed zameldowaniem, jeśli jest dostępna.',
    buyerBookings_next_completed:
      'Wizyta zakończona. Możesz ponownie otworzyć nieruchomość i przejść do decyzji o zakupie.',
    buyerBookings_next_rejected:
      'Te daty są niedostępne. Wróć do nieruchomości i wybierz inny okres.',
    buyerBookings_next_cancelled:
      'Rezerwacja zamknięta. Możesz otworzyć nieruchomość i utworzyć nowy wniosek.',
    buyerBookings_next_default:
      'Otwórz szczegóły rezerwacji — tam są aktualny status i kolejny krok.',
    buyerBookings_cancelledBySellerTitle: 'Rezerwacja anulowana przez sprzedawcę',
    buyerBookings_openProperty: 'Otwórz nieruchomość',
    buyerBookings_visitPlanEyebrow: 'Plan wizyty',
    buyerBookings_whatsNextTitle: 'Co dalej',
    buyerBookings_planBulletStatus: 'Aktualny status rezerwacji zapisujemy w tej sekcji.',
    buyerBookings_planBulletAddress:
      'Adres i instrukcje właściciela pojawią się w szczegółach wniosku.',
    buyerBookings_sellerReason: 'Powód od sprzedawcy:',
    buyerBookings_gotIt: 'Rozumiem',
    buyerBookings_cabinetEyebrow: 'Panel osobisty',
    buyerBookings_spotlightAria: 'Najbliższa wizyta',
    buyerBookings_spotlightEyebrow: 'Najbliższy krok',
    buyerBookings_activeCount: '{{count}} aktywnych',
    buyerBookings_viewPlan: 'Zobacz plan',
    buyerBookings_filterAria: 'Filtr rezerwacji',
    buyerBookings_filterActive: 'Aktywne',
    buyerBookings_filterAll: 'Wszystkie',
    buyerBookings_filterClosed: 'Zakończone',
    buyerBookings_retry: 'Spróbuj ponownie',
    buyerBookings_pickTestDrive: 'Wybierz nieruchomość na test drive',
    buyerBookings_filterEmptyTitle: 'W tej sekcji na razie pusto',
    buyerBookings_filterEmptyText: 'Zmień filtr, aby zobaczyć pozostałe rezerwacje.',
    buyerBookings_nextStepLabel: 'Następny krok',
    buyerBookings_ownerCommentLabel: 'Komentarz właściciela:',
    buyerBookings_whatsNextCta: 'Co dalej',
  },
}

const BONUSES_EXTRAS = {
  ru: {
    bonusesExploreTasksAria: 'Перейти к бонусным заданиям',
    bonusesDrawerEyebrow: 'Инструкция · № {{id}}',
  },
  en: {
    bonusesExploreTasksAria: 'Explore bonus tasks',
    bonusesDrawerEyebrow: 'Guide · No. {{id}}',
  },
  de: {
    bonusesExploreTasksAria: 'Zu den Bonusaufgaben',
    bonusesDrawerEyebrow: 'Anleitung · Nr. {{id}}',
  },
  es: {
    bonusesExploreTasksAria: 'Ir a las tareas de bonus',
    bonusesDrawerEyebrow: 'Guía · N.º {{id}}',
  },
  fr: {
    bonusesExploreTasksAria: 'Aller aux tâches bonus',
    bonusesDrawerEyebrow: 'Guide · N° {{id}}',
  },
  sv: {
    bonusesExploreTasksAria: 'Gå till bonusuppdrag',
    bonusesDrawerEyebrow: 'Guide · nr {{id}}',
  },
  pl: {
    bonusesExploreTasksAria: 'Przejdź do zadań bonusowych',
    bonusesDrawerEyebrow: 'Instrukcja · nr {{id}}',
  },
}

// Assemble packs
for (const lang of GAP_LANGS) {
  Object.assign(
    PACK[lang],
    PURCHASED_GUIDE[lang],
    OWNER_TEST_GAPS[lang],
    BID_CARD[lang],
  )
}

for (const lang of LANGS) {
  Object.assign(
    PACK[lang],
    PROFILE_HISTORY[lang],
    PROFILE_BOOKINGS[lang],
    BUYER_BOOKINGS_EXTRAS[lang],
    BONUSES_EXTRAS[lang],
  )
}

function mergeIntoFile(filePath, lang) {
  const extra = PACK[lang]
  if (!extra || Object.keys(extra).length === 0) {
    console.warn(`skip (no pack): ${lang}`)
    return null
  }
  if (!fs.existsSync(filePath)) {
    console.warn(`skip (missing): ${filePath}`)
    return null
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  let added = 0
  let updated = 0

  for (const [k, v] of Object.entries(extra)) {
    if (!(k in data)) added += 1
    else if (data[k] !== v) updated += 1
    data[k] = v
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
  return { added, updated, total: Object.keys(extra).length }
}

console.log('Merging cabinet locale gaps…\n')

for (const dir of LOCALE_DIRS) {
  if (!fs.existsSync(dir)) {
    console.log(`(dir missing) ${dir}`)
    continue
  }
  console.log(`→ ${path.relative(ROOT, dir)}`)
  for (const lang of LANGS) {
    const filePath = path.join(dir, `${lang}.json`)
    const result = mergeIntoFile(filePath, lang)
    if (!result) continue
    console.log(
      `  ${lang}.json: +${result.added} added, ~${result.updated} updated (${result.total} keys in pack)`,
    )
  }
  console.log('')
}

console.log('Done.')
