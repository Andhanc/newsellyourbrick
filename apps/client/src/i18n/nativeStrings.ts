/**
 * Lightweight strings for Expo native screens (no full i18next bootstrap).
 * Keep keys aligned with mainPage locale JSON where possible.
 */

export type NativeLocale = 'ru' | 'en' | 'de' | 'es' | 'fr' | 'pl' | 'sv'

const STRINGS: Record<NativeLocale, Record<string, string>> = {
  ru: {
    favoritesNativeTitle: 'Избранное',
    favoritesNativeEmptyLoggedIn: 'Пока пусто. Сохраняйте объекты с карточек каталога.',
    favoritesNativeEmptyGuest: 'Войдите, чтобы синхронизировать избранное.',
    menu: 'Меню',
    home: 'Главная',
    openSearch: 'Открыть поиск',
    profile: 'Профиль',
    moreDetailsShort: 'Подробнее',
    saveFavoriteAria: 'Сохранить',
    removeFavoriteAria: 'Убрать из избранного',
    catalogLoadError: 'Не удалось загрузить каталог',
    catalogEmpty: 'Объектов пока нет',
    retryAction: 'Повторить',
    ownerPropertyFallback: 'Объект',
    discoverQuick_news: 'Новости',
    discoverQuick_map: 'Карта',
    discoverQuick_cabinet: 'Кабинет',
  },
  en: {
    favoritesNativeTitle: 'Favorites',
    favoritesNativeEmptyLoggedIn: 'Nothing here yet. Save properties from catalog cards.',
    favoritesNativeEmptyGuest: 'Sign in to sync your favorites.',
    menu: 'Menu',
    home: 'Home',
    openSearch: 'Open search',
    profile: 'Profile',
    moreDetailsShort: 'Details',
    saveFavoriteAria: 'Save',
    removeFavoriteAria: 'Remove from favorites',
    catalogLoadError: 'Failed to load catalog',
    catalogEmpty: 'No properties yet',
    retryAction: 'Retry',
    ownerPropertyFallback: 'Property',
    discoverQuick_news: 'News',
    discoverQuick_map: 'Map',
    discoverQuick_cabinet: 'Cabinet',
  },
  de: {
    favoritesNativeTitle: 'Favoriten',
    favoritesNativeEmptyLoggedIn: 'Noch leer. Speichern Sie Objekte aus den Katalogkarten.',
    favoritesNativeEmptyGuest: 'Melden Sie sich an, um Favoriten zu synchronisieren.',
    menu: 'Menü',
    home: 'Start',
    openSearch: 'Suche öffnen',
    profile: 'Profil',
    moreDetailsShort: 'Mehr',
    saveFavoriteAria: 'Speichern',
    removeFavoriteAria: 'Aus Favoriten entfernen',
    catalogLoadError: 'Katalog konnte nicht geladen werden',
    catalogEmpty: 'Noch keine Objekte',
    retryAction: 'Erneut versuchen',
    ownerPropertyFallback: 'Objekt',
    discoverQuick_news: 'News',
    discoverQuick_map: 'Karte',
    discoverQuick_cabinet: 'Konto',
  },
  es: {
    favoritesNativeTitle: 'Favoritos',
    favoritesNativeEmptyLoggedIn: 'Aún vacío. Guarda propiedades desde las tarjetas del catálogo.',
    favoritesNativeEmptyGuest: 'Inicia sesión para sincronizar favoritos.',
    menu: 'Menú',
    home: 'Inicio',
    openSearch: 'Abrir búsqueda',
    profile: 'Perfil',
    moreDetailsShort: 'Detalles',
    saveFavoriteAria: 'Guardar',
    removeFavoriteAria: 'Quitar de favoritos',
    catalogLoadError: 'No se pudo cargar el catálogo',
    catalogEmpty: 'Aún no hay propiedades',
    retryAction: 'Reintentar',
    ownerPropertyFallback: 'Propiedad',
    discoverQuick_news: 'Noticias',
    discoverQuick_map: 'Mapa',
    discoverQuick_cabinet: 'Cuenta',
  },
  fr: {
    favoritesNativeTitle: 'Favoris',
    favoritesNativeEmptyLoggedIn: 'Encore vide. Enregistrez des biens depuis les cartes du catalogue.',
    favoritesNativeEmptyGuest: 'Connectez-vous pour synchroniser les favoris.',
    menu: 'Menu',
    home: 'Accueil',
    openSearch: 'Ouvrir la recherche',
    profile: 'Profil',
    moreDetailsShort: 'Détails',
    saveFavoriteAria: 'Enregistrer',
    removeFavoriteAria: 'Retirer des favoris',
    catalogLoadError: 'Impossible de charger le catalogue',
    catalogEmpty: 'Aucun bien pour le moment',
    retryAction: 'Réessayer',
    ownerPropertyFallback: 'Bien',
    discoverQuick_news: 'Actualités',
    discoverQuick_map: 'Carte',
    discoverQuick_cabinet: 'Espace',
  },
  pl: {
    favoritesNativeTitle: 'Ulubione',
    favoritesNativeEmptyLoggedIn: 'Na razie pusto. Zapisuj obiekty z kart katalogu.',
    favoritesNativeEmptyGuest: 'Zaloguj się, aby zsynchronizować ulubione.',
    menu: 'Menu',
    home: 'Główna',
    openSearch: 'Otwórz wyszukiwanie',
    profile: 'Profil',
    moreDetailsShort: 'Szczegóły',
    saveFavoriteAria: 'Zapisz',
    removeFavoriteAria: 'Usuń z ulubionych',
    catalogLoadError: 'Nie udało się wczytać katalogu',
    catalogEmpty: 'Brak obiektów',
    retryAction: 'Ponów',
    ownerPropertyFallback: 'Obiekt',
    discoverQuick_news: 'Aktualności',
    discoverQuick_map: 'Mapa',
    discoverQuick_cabinet: 'Gabinet',
  },
  sv: {
    favoritesNativeTitle: 'Favoriter',
    favoritesNativeEmptyLoggedIn: 'Tomt än så länge. Spara objekt från katalogkort.',
    favoritesNativeEmptyGuest: 'Logga in för att synka favoriter.',
    menu: 'Meny',
    home: 'Hem',
    openSearch: 'Öppna sök',
    profile: 'Profil',
    moreDetailsShort: 'Detaljer',
    saveFavoriteAria: 'Spara',
    removeFavoriteAria: 'Ta bort från favoriter',
    catalogLoadError: 'Kunde inte ladda katalogen',
    catalogEmpty: 'Inga objekt ännu',
    retryAction: 'Försök igen',
    ownerPropertyFallback: 'Objekt',
    discoverQuick_news: 'Nyheter',
    discoverQuick_map: 'Karta',
    discoverQuick_cabinet: 'Konto',
  },
}

export function resolveNativeLocale(raw?: string | null): NativeLocale {
  const base = String(raw || 'en')
    .split(/[-_]/)[0]
    .toLowerCase()
  return (['ru', 'en', 'de', 'es', 'fr', 'pl', 'sv'] as NativeLocale[]).includes(
    base as NativeLocale,
  )
    ? (base as NativeLocale)
    : 'en'
}

export function nativeT(key: string, locale?: string | null): string {
  const loc = resolveNativeLocale(locale)
  return STRINGS[loc][key] || STRINGS.en[key] || key
}
