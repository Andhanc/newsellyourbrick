import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Базовые переводы для статического контента
const resources = {
  ru: {
    translation: {
      // Навигация
      home: 'Главная',
      favorites: 'Понравились',
      auction: 'Аукцион',
      chat: 'Чат',
      profile: 'Профиль',
      map: 'Карта',
      
      // Категории
      house: 'Дом',
      apartment: 'Апартаменты',
      villa: 'Вилла',
      apartmentsSection: 'Аппартаменты',
      villasSection: 'Виллы',
      
      // Действия
      buy: 'Покупка',
      rent: 'Тест-Драйв',
      search: 'Поиск',
      location: 'Локация',
      
      // Общие
      recommended: 'Рекомендуемые',
      nearby: 'Поблизости',
      whatsapp: 'Перейти в WhatsApp',
      contactManager: 'Связаться с менеджером',
      aiAssistant: 'Умный помощник',
      downloadAndroid: 'Загрузите на',
      downloadIOS: 'Загрузите на',
      
      // Футер
      mapLink: 'Карта',
      tariffs: 'Тарифы и цены',
      auctionLink: 'Аукцион',
      aboutUs: 'О нас',
      legalDocs: 'Документы',
      advertising: 'Реклама на сайте',
      career: 'Карьера в Sellyourbrick',
      mapSearch: 'Поиск на карте',
      promotion: 'Продвижение',
      investors: 'Сайт для инвесторов',
      vacancies: 'Вакансии агентов',
      tvAdvertising: 'Реклама Sellyourbrick на ТВ',
      help: 'Помощь',
      superAgents: 'Программа «Суперагенты»',
      mortgage: 'Ипотечный калькулятор',
      mobileVersion: 'Мобильная версия сайта',
      aboutApp: 'О приложении',
      userAgreement: 'Пользовательским соглашением',
      privacyPolicy: 'Политикой конфиденциальности',
      licenseAgreement: 'Лицензионное соглашение',
      recommendationTech: 'Рекомендательные технологии',
      
      // Страница деталей
      beds: 'спален',
      baths: 'ванных',
      sqft: 'кв.м',
      bookNow: 'Купить',
      buyNow: 'Купить сейчас',
      testDrive: 'Тест-Драйв',
      share: 'Поделиться',
      callBroker: 'Позвонить брокеру',
      chatBroker: 'Написать брокеру',
      description: 'Описание',
      characteristics: 'Характеристики',
      location: 'Расположение',
      
      // Уведомления и действия
      foundProperty: 'Нашли для вас объявление!',
      goTo: 'Перейти',
      send: 'Отправить',
      sendMessage: 'Отправить сообщение',
      
      // Форма контакта
      fullName: 'ФИО',
      questionDescription: 'Описание вопроса',
      fullNamePlaceholder: 'Иванов Иван Иванович',
      questionPlaceholder: 'Опишите ваш вопрос подробно...',
      emailPlaceholder: 'your@email.com',
      thankYouMessage: 'Спасибо за обращение! Мы свяжемся с вами в ближайшее время.',
      
      // Чат
      aiGreeting: 'Здравствуйте! Я ваш AI-консультант. Чем могу помочь?',
      aiResponse: 'Спасибо за ваш вопрос! Я постараюсь помочь вам. Можете задать более подробный вопрос?',
      
      // Фильтры
      forAll: 'Для всех',
      
      // Футер
      footerDescription: 'Sellyourbrick – база проверенных объявлений о продаже и аренде жилой, загородной и коммерческой недвижимости. Онлайн‑сервис №1 в России в категории «Недвижимость», по данным Similarweb на сентябрь 2023 г. Используя сервис, вы соглашаетесь с',
      userAgreementLink: 'Пользовательским соглашением',
      and: 'и',
      privacyPolicyLink: 'Политикой конфиденциальности',
      payingForServices: 'Оплачивая услуги, вы принимаете',
      recommendationTechDescription: 'На информационном ресурсе применяются',
      downloadIn: 'Загрузите в',
      
      // Форма обратной связи
      haveQuestions: 'Остались вопросы?',
      writeToUs: 'Напишите нам',
      quickSelection: 'Быстрый подбор',
      bestOptions: 'Только лучшие варианты',
      fromYou: 'С вас - пожелания,',
      fromUs: 'с нас - подходящие варианты',
      learnMore: 'Подробнее',
      
      // Страница недвижимости
      back: 'Назад',
      searchResults: 'Результаты поиска',
      rooms: 'комн.',
      floor: 'этаж',
      squareMeters: 'м²',
      area: 'Площадь',
      roomsCount: 'Комнат',
      floorNumber: 'Этаж',
      seller: 'Продавец',
      previousImage: 'Предыдущее изображение',
      nextImage: 'Следующее изображение',
      addToFavorites: 'Добавить в избранное',
      buy: 'Купить',
      testDriveAvailable: 'Тест-драйв будет доступен в ближайшее время',
      locationTitle: 'Местоположение',
      downloadFrom: 'Скачать из',
      selectLanguage: 'Выбрать язык',
      defaultSeller: 'Александр Иванов',
    }
  },
  en: {
    translation: {
      home: 'Home',
      favorites: 'Favorites',
      auction: 'Auction',
      chat: 'Chat',
      profile: 'Profile',
      map: 'Map',
      house: 'House',
      apartment: 'Apartment',
      villa: 'Villa',
      apartmentsSection: 'Apartments',
      villasSection: 'Villas',
      buy: 'Buy',
      rent: 'Rent',
      search: 'Search',
      location: 'Location',
      recommended: 'Recommended',
      nearby: 'Nearby',
      whatsapp: 'Go to WhatsApp',
      contactManager: 'Contact Manager',
      aiAssistant: 'AI Assistant',
      downloadAndroid: 'Download on',
      downloadIOS: 'Download on',
      mapLink: 'Map',
      tariffs: 'Tariffs and prices',
      auctionLink: 'Auction',
      aboutUs: 'About us',
      legalDocs: 'Legal documents',
      advertising: 'Advertising on the site',
      career: 'Career at Sellyourbrick',
      mapSearch: 'Map search',
      promotion: 'Promotion',
      investors: 'Investor site',
      vacancies: 'Agent vacancies',
      tvAdvertising: 'Sellyourbrick TV advertising',
      help: 'Help',
      superAgents: 'Super Agents program',
      mortgage: 'Mortgage calculator',
      mobileVersion: 'Mobile version of the site',
      aboutApp: 'About the app',
      userAgreement: 'User agreement',
      privacyPolicy: 'Privacy policy',
      licenseAgreement: 'License agreement',
      recommendationTech: 'Recommendation technologies',
      beds: 'bedrooms',
      baths: 'bathrooms',
      sqft: 'sq.ft',
      bookNow: 'Book Now',
      buyNow: 'Buy Now',
      testDrive: 'Test Drive',
      share: 'Share',
      callBroker: 'Call Broker',
      chatBroker: 'Chat with Broker',
      description: 'Description',
      characteristics: 'Characteristics',
      foundProperty: 'Found a listing for you!',
      goTo: 'Go to',
      send: 'Send',
      sendMessage: 'Send message',
      fullName: 'Full Name',
      questionDescription: 'Question Description',
      fullNamePlaceholder: 'John Doe',
      questionPlaceholder: 'Describe your question in detail...',
      emailPlaceholder: 'your@email.com',
      thankYouMessage: 'Thank you for your inquiry! We will contact you soon.',
      aiGreeting: 'Hello! I am your AI consultant. How can I help you?',
      aiResponse: 'Thank you for your question! I will try to help you. Can you ask a more detailed question?',
      forAll: 'For All',
      footerDescription: 'Sellyourbrick is a database of verified listings for sale and rent of residential, country and commercial real estate. Online service #1 in Russia in the "Real Estate" category, according to Similarweb data for September 2023. By using the service, you agree to',
      userAgreementLink: 'User Agreement',
      and: 'and',
      privacyPolicyLink: 'Privacy Policy',
      payingForServices: 'By paying for services, you accept',
      recommendationTechDescription: 'The information resource uses',
      downloadIn: 'Download in',
      haveQuestions: 'Have questions?',
      writeToUs: 'Write to us',
      quickSelection: 'Quick selection',
      bestOptions: 'Only the best options',
      fromYou: 'From you - wishes,',
      fromUs: 'from us - suitable options',
      learnMore: 'Learn more',
      back: 'Back',
      searchResults: 'Search results',
      rooms: 'rooms',
      floor: 'floor',
      squareMeters: 'sq.m',
      area: 'Area',
      roomsCount: 'Rooms',
      floorNumber: 'Floor',
      seller: 'Seller',
      previousImage: 'Previous image',
      nextImage: 'Next image',
      addToFavorites: 'Add to favorites',
      buy: 'Buy',
      testDriveAvailable: 'Test drive will be available soon',
      locationTitle: 'Location',
      downloadFrom: 'Download from',
      selectLanguage: 'Select language',
      defaultSeller: 'John Doe',
    }
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ru',
    debug: false,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },
    react: {
      useSuspense: false
    }
  })

export default i18n


