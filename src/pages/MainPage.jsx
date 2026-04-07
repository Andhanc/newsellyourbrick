import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useLazyLoad } from '../hooks/useLazyLoad'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import './MainPage.css'
import mainFon from '../../main fon.png'
import {
  FiBell,
  FiSearch,
  FiSliders,
  FiHeart,
  FiChevronDown,
  FiArrowRight,
  FiShare2,
  FiX,
  FiSend,
  FiGlobe,
  FiPhone,
  FiMap,
  FiUser,
  FiCheck,
  FiStar,
  FiMail,
  FiShoppingCart,
  FiPieChart,
  FiMessageCircle,
} from 'react-icons/fi'
import { MenuToggleIcon } from '@/components/ui/menu-toggle-icon'
import {
  FaHome,
  FaHeart,
  FaHeart as FaHeartSolid,
  FaGavel,
  FaComment,
  FaUser,
  FaAndroid,
  FaApple,
  FaYoutube,
  FaCar,
  FaBolt,
  FaGem,
  FaWhatsapp,
} from 'react-icons/fa'
import { FaXTwitter, FaTelegram } from 'react-icons/fa6'
import { MdBed, MdOutlineBathtub, MdDirectionsCar } from 'react-icons/md'
import { BiArea } from 'react-icons/bi'
import {
  PiHouseLine,
  PiBuildings,
  PiBuildingApartment,
  PiBuilding,
  PiWarehouse,
} from 'react-icons/pi'
import PropertyTimer from '../components/PropertyTimer'
import PropertySearchBlock from '../components/PropertySearchBlock'
import AnimatedFolder from '../components/ui/3d-folder'
import { FrostedGlassCard } from '../components/ui/interactive-frosted-glass-card'
import { showToast } from '../components/ToastContainer'
import { showNotification } from '../utils/toastHelper'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import LoginModal from '../components/LoginModal'
import VerificationSuccessNotification from '../components/VerificationSuccessNotification'
import '../components/PropertyList.css'
import { askPropertyAssistant, detectManagerContactIntent, filterPropertiesByLocation } from '../services/aiService'
import { getUserData, clearUserData, isAuthenticated } from '../services/authService'
import { syncAssistantLead } from '../services/assistantLeadService'
import { getManagerContactButtons } from '../services/liveChatApi'

import { getApiBaseUrl, getApiBaseUrlSync } from '../utils/apiConfig'
import { navigateToWallet } from '../utils/walletNavigation'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import { useLayoutScrollRef } from '../context/LayoutScrollContext'
import { UI_LANGUAGES } from '../constants/uiLanguages'

// Используем синхронную версию для инициализации, затем обновим при загрузке
let API_BASE_URL = getApiBaseUrlSync()

// Базовые данные для 4 блоков 3D-папок (заголовки переводятся в компоненте через useMemo)
const landingFolderDataBase = [
  { titleKey: 'folderActiveBidding', gradient: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)', projects: [
    { id: 'ab1', image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800', title: 'Аукцион недвижимости' },
    { id: 'ab2', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800', title: 'Торги объектами' },
    { id: 'ab3', image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=80&w=800', title: 'Концентрация спроса' },
    { id: 'ab4', image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&q=80&w=800', title: 'Рыночные ставки' },
  ] },
  { titleKey: 'folderImmediatePurchase', gradient: 'linear-gradient(to right, #f59e0b 0%, #d97706 100%)', projects: [
    { id: 'ip1', image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=800', title: 'Сделка по цене' },
    { id: 'ip2', image: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&q=80&w=800', title: 'Ликвидность сейчас' },
    { id: 'ip3', image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800', title: 'Без ожидания' },
    { id: 'ip4', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800', title: 'Твёрдая цена' },
  ] },
  { titleKey: 'folderDistressedAssets', gradient: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', linkLabelKey: 'howWeVerify', linkHref: '/about', projects: [
    { id: 'da1', image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=800', title: 'Арбитраж активов' },
    { id: 'da2', image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=800', title: 'Специальные ситуации' },
    { id: 'da3', image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800', title: 'Верификация лотов' },
    { id: 'da4', image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&q=80&w=800', title: 'Due Diligence' },
  ] },
  { titleKey: 'folderDebtsStrategy', gradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', linkLabelKey: 'goTo', linkHref: '/debts', projects: [
    { id: 'db1', image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=800', title: 'Покупка долга' },
    { id: 'db2', image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800', title: 'Анализ рисков' },
    { id: 'db3', image: 'https://images.unsplash.com/photo-1554224154-22dec7ec8818?auto=format&fit=crop&q=80&w=800', title: 'Структура сделки' },
    { id: 'db4', image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=800', title: 'Доходность и сроки' },
  ] },
  { titleKey: 'folderFractional', gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', projects: [
    { id: 'fo1', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800', title: 'Долевое участие' },
    { id: 'fo2', image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=800', title: 'Премиальные активы' },
    { id: 'fo3', image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=800', title: 'Co-investment' },
    { id: 'fo4', image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800', title: 'Доли в объектах' },
  ] },
]

const recommendedProperties = [
  {
    id: 1,
    tag: 'House',
    name: 'Lakeshore Blvd West',
    location: '70 Washington Square South, New York, NY 10012, United States',
    price: 797500,
    coordinates: [28.2916, -16.6291], // Costa Adeje, Tenerife
    image:
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
    ],
    beds: 2,
    baths: 2,
    sqft: 2000,
    isAuction: true,
    currentBid: 750000,
    endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000 + 58 * 60 * 1000 + 53 * 1000).toISOString(),
    description:
      'Роскошная недвижимость в самом сердце Манхэттена. Современная квартира с панорамными видами на город. Рядом находятся лучшие рестораны, магазины и культурные достопримечательности. Идеальное расположение для тех, кто ценит комфорт и престиж.',
    owner: { firstName: 'Джон', lastName: 'Смит' },
    broker: {
      name: 'Muhammad Farhan',
      phone: '18392719103',
      avatar:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
    },
  },
  {
    id: 2,
    tag: 'House',
    name: 'Eleanor Pena Property',
    location: 'Costa Adeje, Tenerife, Spain',
    price: 1200,
    coordinates: [28.1000, -16.7200], // Playa de las Américas, Tenerife
    image:
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    ],
    beds: 2,
    baths: 1,
    sqft: 1500,
    isAuction: true,
    currentBid: 1100,
    endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000 + 58 * 60 * 1000 + 53 * 1000).toISOString(),
    description:
      'Прекрасная вилла в элитном районе Коста-Адехе. Современный дизайн, просторные террасы с видом на океан. Рядом находятся лучшие пляжи, гольф-клубы и рестораны. Идеальное место для отдыха и жизни на Тенерифе.',
    owner: { firstName: 'Карлос', lastName: 'Родригес' },
    broker: {
      name: 'Muhammad Farhan',
      phone: '18392719103',
      avatar:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
    },
  },
]

const nearbyProperties = [
  {
    id: 1,
    tag: 'House',
    name: 'Bessie Cooper Property',
    location: 'Los Cristianos, Tenerife, Spain',
    price: 1000,
    coordinates: [28.0500, -16.7167], // Los Cristianos, Tenerife
    image:
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    ],
    beds: 2,
    baths: 2,
    sqft: 1800,
    isAuction: true,
    currentBid: 950,
    endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000 + 58 * 60 * 1000 + 53 * 1000).toISOString(),
    description:
      'Уютный дом в Лос-Кристианос, одном из самых популярных курортов Тенерифе. Близость к пляжу, магазинам и ресторанам. Тихое место с прекрасным климатом круглый год. Отличный вариант для постоянного проживания или отдыха.',
    owner: { firstName: 'Мария', lastName: 'Гонсалес' },
    broker: {
      name: 'Muhammad Farhan',
      phone: '18392719103',
      avatar:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
    },
  },
  {
    id: 2,
    tag: 'Apartment',
    name: 'Darrell Steward Property',
    location: 'Puerto de la Cruz, Tenerife, Spain',
    price: 980,
    coordinates: [28.4167, -16.5500], // Puerto de la Cruz, Tenerife
    image:
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    ],
    beds: 1,
    baths: 1,
    sqft: 1200,
    isAuction: true,
    currentBid: 920,
    endTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000 + 58 * 60 * 1000 + 53 * 1000).toISOString(),
    description:
      'Светлая квартира в историческом Пуэрто-де-ла-Крус. Уникальное расположение на севере острова с мягким климатом. Рядом ботанический сад, пляжи с черным песком и множество достопримечательностей. Идеально для тех, кто любит спокойствие и природу.',
    owner: { firstName: 'Антонио', lastName: 'Мартинес' },
    broker: {
      name: 'Muhammad Farhan',
      phone: '18392719103',
      avatar:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
    },
  },
]

const apartmentsData = [
  {
    id: 1,
    name: 'Тропарево Парк',
    location: 'Costa Adeje, Tenerife',
    price: 8500372,
    coordinates: [28.2916, -16.6291],
    owner: { firstName: 'Хосе', lastName: 'Мендес' },
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
    ],
    hasSamolyot: false,
    isAuction: true,
    currentBid: 8000000,
    endTime: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000 + 58 * 60 * 1000 + 53 * 1000).toISOString(), // 100 дней (зеленый - от 3 месяцев)
    beds: 2,
    baths: 1,
    sqft: 850,
    description:
      'Современная квартира в престижном районе Коста-Адехе. Элитный комплекс с бассейном и инфраструктурой. Рядом лучшие пляжи острова, гольф-поля и рестораны высокой кухни. Идеальное место для инвестиций и отдыха.',
  },
]

const villasData = [
  {
    id: 1,
    name: 'Villa Paradise',
    location: 'Costa Adeje, Tenerife',
    price: 12000000,
    coordinates: [28.2916, -16.6291],
    owner: { firstName: 'Франсиско', lastName: 'Гарсия' },
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
    ],
    hasSamolyot: false,
    isAuction: true,
    currentBid: 11000000,
    endTime: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000 + 58 * 60 * 1000 + 53 * 1000).toISOString(), // 70 дней (оранжевый - от 2 до 3 месяцев)
    beds: 4,
    baths: 3,
    sqft: 2500,
    description:
      'Роскошная вилла в элитном районе Коста-Адехе с панорамным видом на океан. Частный бассейн, террасы, современная кухня. Рядом лучшие пляжи, гольф-клубы и рестораны. Идеальное место для роскошного отдыха и жизни.',
  },
]

const flatsData = [
  {
    id: 1,
    name: 'Современная квартира в центре',
    location: 'Москва, ул. Тверская, 15',
    price: 12500000,
    coordinates: [55.7558, 37.6173],
    owner: { firstName: 'Александр', lastName: 'Иванов' },
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    ],
    hasSamolyot: false,
    isAuction: true,
    currentBid: 11800000,
    endTime: new Date(Date.now() + 92 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000 + 58 * 60 * 1000 + 53 * 1000).toISOString(), // 92 дня (зеленый - от 3 месяцев)
    beds: 2,
    baths: 1,
    sqft: 65,
    description:
      'Просторная двухкомнатная квартира в самом центре Москвы. Евроремонт, панорамные окна, вид на парк. Большая гостиная, современная кухня. Вся мебель и техника в отличном состоянии. Парковка во дворе.',
  },
]

const townhousesData = [
  {
    id: 1,
    name: 'Таунхаус в элитном поселке',
    location: 'Московская область, Одинцово, ул. Садовая, 15',
    price: 24500000,
    coordinates: [55.6759, 37.2784],
    owner: { firstName: 'Владимир', lastName: 'Новиков' },
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
    ],
    hasSamolyot: false,
    isAuction: true,
    currentBid: 23500000,
    endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000 + 58 * 60 * 1000 + 53 * 1000).toISOString(),
    beds: 5,
    baths: 3,
    sqft: 180,
    description:
      'Современный таунхаус в элитном поселке. Два этажа, гараж, участок 6 соток. Камин, терраса, современная техника. Охраняемая территория, детская площадка.',
  },
]

function MainPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const { user, isLoaded: userLoaded } = useUser()
  const { isFavorite, toggleFavorite } = usePropertyFavorites()
  const [isLanguageOpen, setIsLanguageOpen] = useState(false)
  const [propertyMode, setPropertyMode] = useState('buy') // 'rent' для аренды, 'buy' для покупки
  const [activeNav, setActiveNav] = useState('home')
  const [contactForm, setContactForm] = useState({
    email: '',
    fullName: '',
    message: '',
  })
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [aiAssistantHiddenByFooter, setAiAssistantHiddenByFooter] = useState(false)
  const layoutScrollRef = useLayoutScrollRef()
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [isSlowAIResponse, setIsSlowAIResponse] = useState(false)
  const slowResponseTimerRef = useRef(null)
  const chatHistoryLoadedRef = useRef(false) // Флаг для отслеживания загрузки истории
  const [userPhoto, setUserPhoto] = useState(null) // Фотография пользователя
  const [isLoggedIn, setIsLoggedIn] = useState(false) // Статус авторизации
  const [hasIncompleteProfile, setHasIncompleteProfile] = useState(false) // Есть незаполненные поля профиля
  const [userPreferences, setUserPreferences] = useState({
    purpose: null, // 'для себя', 'под сдачу', 'инвестиции'
    budget: null,
    location: null, // 'Испания', 'Дубай'
    propertyType: null, // 'квартира', 'вилла', 'апартаменты', 'дом'
    rooms: null,
    area: null,
    other: null,
    managerContactRequested: false,
    managerContactPendingChoice: false,
    preferredContact: null // 'phone' | 'email' | 'whatsapp' | 'telegram' | 'live_chat'
  })
  
  // Объединяем все данные недвижимости
  const allProperties = useMemo(() => {
    const combined = [
      ...recommendedProperties.map(p => ({ ...p, source: 'recommended' })),
      ...nearbyProperties.map(p => ({ ...p, source: 'nearby' })),
      ...apartmentsData.map(p => ({ ...p, source: 'apartment' })),
      ...villasData.map(p => ({ ...p, source: 'villa' })),
      ...flatsData.map(p => ({ ...p, source: 'flat' })),
      ...townhousesData.map(p => ({ ...p, source: 'townhouse' }))
    ]
    // Фильтруем по Испании и Дубаю
    return filterPropertiesByLocation(combined)
  }, [])
  
  // Функция для получения уникального идентификатора пользователя/сессии
  const getChatUserId = useMemo(() => {
    // Если пользователь авторизован, используем его ID
    if (isLoggedIn) {
      const userData = getUserData()
      const userId = userData.id || localStorage.getItem('userId')
      if (userId) {
        return `user_${userId}`
      }
    }
    
    // Если пользователь не авторизован, создаем/используем уникальный ID сессии
    let sessionId = localStorage.getItem('chatSessionId')
    if (!sessionId) {
      // Генерируем уникальный ID сессии
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('chatSessionId', sessionId)
    }
    return sessionId
  }, [isLoggedIn, user, userLoaded])

  // Загружаем историю чата из localStorage при монтировании компонента или изменении пользователя
  const lastChatUserIdRef = useRef(null)
  useEffect(() => {
    const chatUserId = getChatUserId
    // Загружаем историю только если изменился идентификатор пользователя
    if (lastChatUserIdRef.current !== chatUserId) {
      try {
        const historyKey = `aiChatHistory_${chatUserId}`
        const preferencesKey = `aiChatPreferences_${chatUserId}`
        
        // Загружаем историю сообщений
        const savedChatHistory = localStorage.getItem(historyKey)
        if (savedChatHistory) {
          const parsed = JSON.parse(savedChatHistory)
          // Преобразуем timestamp из строк в Date объекты
          const messagesWithDates = parsed.map(msg => ({
            ...msg,
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
          }))
          setChatMessages(messagesWithDates)
        } else {
          // Если нет сохраненной истории, показываем приветственное сообщение
          setChatMessages([{
            id: 1,
            text: 'Здравствуйте! Я ваш AI-консультант по недвижимости. Помогу подобрать идеальный вариант в Испании или Дубае. Для начала, скажите, для какой цели вы ищете недвижимость?',
            sender: 'bot',
            timestamp: new Date(),
            buttons: ['Для себя', 'Под сдачу', 'Инвестиции'],
          }])
        }
        
        // Загружаем предпочтения пользователя
        const savedPreferences = localStorage.getItem(preferencesKey)
        if (savedPreferences) {
          const parsed = JSON.parse(savedPreferences)
          setUserPreferences(parsed)
        }
        
        lastChatUserIdRef.current = chatUserId
        chatHistoryLoadedRef.current = true
      } catch (error) {
        console.error('Ошибка при загрузке истории чата:', error)
        lastChatUserIdRef.current = chatUserId
        chatHistoryLoadedRef.current = true
      }
    }
  }, [getChatUserId]) // Загружаем при изменении идентификатора пользователя

  // Сохраняем историю чата в localStorage при каждом изменении и синхронизируем с сервером для раздела «Умный помощник»
  useEffect(() => {
    if (chatHistoryLoadedRef.current && chatMessages.length > 0) {
      try {
        const chatUserId = getChatUserId
        const historyKey = `aiChatHistory_${chatUserId}`
        // Сохраняем историю в localStorage с привязкой к пользователю
        localStorage.setItem(historyKey, JSON.stringify(chatMessages))
        // Синхронизация с сервером для админки «Умный помощник»
        const userData = getUserData()
        syncAssistantLead(chatUserId, chatMessages, userPreferences, userData?.isLoggedIn ? userData : null)
      } catch (error) {
        console.error('Ошибка при сохранении истории чата:', error)
      }
    }
  }, [chatMessages, userPreferences, getChatUserId])

  // Сохраняем предпочтения пользователя в localStorage
  useEffect(() => {
    if (chatHistoryLoadedRef.current) {
      try {
        const chatUserId = getChatUserId
        const preferencesKey = `aiChatPreferences_${chatUserId}`
        localStorage.setItem(preferencesKey, JSON.stringify(userPreferences))
      } catch (error) {
        console.error('Ошибка при сохранении предпочтений:', error)
      }
    }
  }, [userPreferences, getChatUserId])

  // История чата сохраняется в localStorage и не очищается при закрытии страницы
  // Каждый пользователь видит только свою переписку
  
  // Отладочная информация о состоянии i18n
  // Функция для проверки заполненности профиля
  const checkProfileCompleteness = (userData) => {
    if (!userData) return false
    
    // Проверяем важные поля
    const hasFirstName = userData.first_name && userData.first_name.trim() !== ''
    const hasLastName = userData.last_name && userData.last_name.trim() !== ''
    const hasEmail = userData.email && userData.email.trim() !== '' && userData.is_verified === 1
    const hasPhone = userData.phone_number && userData.phone_number.trim() !== ''
    const hasAddress = userData.address && userData.address.trim() !== ''
    const hasPassportSeries = userData.passport_series && userData.passport_series.trim() !== ''
    const hasPassportNumber = userData.passport_number && userData.passport_number.trim() !== ''
    
    // Профиль считается неполным, если:
    // 1. Нет имени (обязательное поле)
    // 2. Нет фамилии (важное поле)
    // 3. Нет подтвержденного email или телефона (хотя бы один контакт)
    // 4. Нет адреса (желательно, но не критично)
    // 5. Нет паспортных данных (серия или номер) (желательно, но не критично)
    
    // Базовые обязательные поля
    const missingBasicFields = !hasFirstName || !hasLastName || (!hasEmail && !hasPhone)
    
    // Дополнительные желательные поля (если хотя бы одно не заполнено, показываем индикатор)
    const missingOptionalFields = !hasAddress || (!hasPassportSeries && !hasPassportNumber)
    
    // Профиль неполный, если отсутствуют базовые поля ИЛИ дополнительные поля
    const isIncomplete = missingBasicFields || missingOptionalFields
    
    return isIncomplete
  }

  // Загружаем фотографию пользователя и проверяем заполненность профиля
  useEffect(() => {
    const loadUserPhotoAndCheckProfile = async () => {
      // Проверяем авторизацию через Clerk
      if (userLoaded && user) {
        // Пользователь авторизован через Clerk
        const clerkPhoto = user.imageUrl || user.profileImageUrl || null
        setUserPhoto(clerkPhoto)
        setIsLoggedIn(true)
        
        // Пытаемся загрузить данные из БД для полной проверки
        const userData = getUserData()
        let profileIncomplete = false
        
        // Используем числовой ID из БД (из localStorage), а не Clerk ID
        const dbUserId = localStorage.getItem('userId')
        if (userData && dbUserId && /^\d+$/.test(dbUserId)) {
          try {
            const response = await fetch(`${API_BASE_URL}/users/${dbUserId}`)
            if (response.ok) {
              const result = await response.json()
              if (result.success && result.data) {
                // Проверяем заполненность профиля из БД
                profileIncomplete = checkProfileCompleteness(result.data)
                setHasIncompleteProfile(profileIncomplete)
              } else {
                // Если данных в БД нет, проверяем базовые поля Clerk
                profileIncomplete = !user.firstName || !user.lastName || (!user.primaryEmailAddress?.emailAddress && !user.primaryPhoneNumber?.phoneNumber)
                setHasIncompleteProfile(profileIncomplete)
              }
            } else {
              // Если запрос не удался, проверяем базовые поля Clerk
              profileIncomplete = !user.firstName || !user.lastName || (!user.primaryEmailAddress?.emailAddress && !user.primaryPhoneNumber?.phoneNumber)
              setHasIncompleteProfile(profileIncomplete)
            }
          } catch (error) {
            console.warn('⚠️ Не удалось загрузить данные из БД для Clerk пользователя:', error)
            // Если ошибка, проверяем базовые поля Clerk
            profileIncomplete = !user.firstName || !user.lastName || (!user.primaryEmailAddress?.emailAddress && !user.primaryPhoneNumber?.phoneNumber)
            setHasIncompleteProfile(profileIncomplete)
          }
        } else {
          // Если нет ID в localStorage, проверяем базовые поля Clerk
          profileIncomplete = !user.firstName || !user.lastName || (!user.primaryEmailAddress?.emailAddress && !user.primaryPhoneNumber?.phoneNumber)
          setHasIncompleteProfile(profileIncomplete)
        }
      } else {
        // Проверяем старую систему авторизации
        const userData = getUserData()
        if (userData.isLoggedIn) {
          setIsLoggedIn(true)
          
          // Сначала пытаемся получить фотографию из localStorage
          let photo = userData.picture || null
          let profileIncomplete = false
          
          // Загружаем данные из БД для проверки заполненности
          // Используем числовой ID из БД (из localStorage), а не Clerk ID
          const dbUserId = localStorage.getItem('userId')
          if (dbUserId && /^\d+$/.test(dbUserId)) {
            try {
              const response = await fetch(`${API_BASE_URL}/users/${dbUserId}`)
              
              // Если пользователь не найден в БД (404) — сессия устарела, очищаем её
              if (response.status === 404) {
                console.warn('⚠️ Локальная сессия устарела: пользователь не найден в БД. Очищаем данные.')
                clearUserData()
                setIsLoggedIn(false)
                setUserPhoto(null)
                setHasIncompleteProfile(false)
                return
              }
              
              if (response.ok) {
                const result = await response.json()
                if (result.success && result.data) {
                  const dbUser = result.data
                  
                  // Проверяем заполненность профиля
                  profileIncomplete = checkProfileCompleteness(dbUser)
                  setHasIncompleteProfile(profileIncomplete)
                  
                  // Если user_photo есть, используем его
                  if (dbUser.user_photo && !photo) {
                    const photoPath = dbUser.user_photo
                    photo = photoPath.startsWith('http') 
                      ? photoPath 
                      : `${API_BASE_URL.replace('/api', '')}${photoPath}`
                    
                    // Обновляем localStorage с фотографией
                    const updatedUserData = {
                      ...userData,
                      picture: photo
                    }
                    localStorage.setItem('userData', JSON.stringify(updatedUserData))
                  }
                }
              }
            } catch (error) {
              console.warn('⚠️ Не удалось загрузить данные из БД:', error)
              // Если не удалось загрузить из БД, проверяем localStorage
              profileIncomplete = !userData.name || (!userData.email && !userData.phone)
              setHasIncompleteProfile(profileIncomplete)
            }
          } else {
            // Если нет ID, проверяем только localStorage
            profileIncomplete = !userData.name || (!userData.email && !userData.phone)
            setHasIncompleteProfile(profileIncomplete)
          }
          
          setUserPhoto(photo)
        } else {
          setIsLoggedIn(false)
          setUserPhoto(null)
          setHasIncompleteProfile(false)
        }
      }
    }
    
    loadUserPhotoAndCheckProfile()
    
    // Обновляем данные при фокусе окна (когда пользователь возвращается на страницу)
    const handleFocus = () => {
      loadUserPhotoAndCheckProfile()
    }
    
    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [user, userLoaded, location.pathname]) // Обновляем при изменении маршрута

  // Загрузка уведомлений
  useEffect(() => {
    const loadNotifications = async () => {
      const userData = getUserData()
      if (!userData) {
        console.log('📭 Нет данных пользователя для загрузки уведомлений');
        return
      }

      // Числовой id из БД (ставки, тест-драйв) хранится в userId; parsed.id может быть Clerk — не подставлять его в API уведомлений
      let dbUserId = null
      const storedDbId = localStorage.getItem('userId')
      if (storedDbId && /^\d+$/.test(String(storedDbId).trim())) {
        dbUserId = String(storedDbId).trim()
      } else {
        const rawId = userData.id
        if (rawId && /^\d+$/.test(String(rawId).trim())) {
          dbUserId = String(rawId).trim()
        }
      }

      // Если ID не найден, пробуем найти пользователя по email или phone
      if (!dbUserId && (userData.email || userData.phone)) {
        try {
          const searchUrl = userData.email 
            ? `${API_BASE_URL}/users/email/${encodeURIComponent(userData.email)}`
            : `${API_BASE_URL}/users/phone/${encodeURIComponent(userData.phone)}`;
          const userResponse = await fetch(searchUrl);
          if (userResponse.ok) {
            const userResult = await userResponse.json();
            if (userResult.success && userResult.data) {
              dbUserId = userResult.data.id;
              console.log('✅ Найден пользователь в БД по email/phone, ID:', dbUserId);
            }
          }
        } catch (error) {
          console.warn('⚠️ Не удалось найти пользователя в БД:', error);
        }
      }

      if (!dbUserId) {
        console.log('📭 Нет ID пользователя в БД для загрузки уведомлений');
        return
      }

      console.log('📥 Загрузка уведомлений для пользователя:', dbUserId);
      setNotificationsLoading(true)
      try {
        const response = await fetch(`${API_BASE_URL}/notifications/user/${dbUserId}`)
        console.log('📥 Ответ API уведомлений:', response.status, response.statusText);
        if (response.ok) {
          const data = await response.json()
          console.log('📦 Получены уведомления:', data);
          if (data.success) {
            console.log('✅ Найдено уведомлений:', data.data?.length || 0);
            const notificationsList = (data.data || []).map((n) => {
              if (n.data && typeof n.data === 'string') {
                try {
                  return { ...n, data: JSON.parse(n.data) }
                } catch {
                  return n
                }
              }
              return n
            })
            
            // Проверяем, есть ли уведомление о верификации, которое еще не показывали
            const verificationNotif = notificationsList.find(
              n => n.type === 'verification_success' && n.view_count === 0
            );
            
            if (verificationNotif && !showVerificationSuccess) {
              console.log('🎉 Найдено уведомление о верификации, показываем модальное окно');
              setVerificationNotification(verificationNotif);
              setShowVerificationSuccess(true);
            }
            
            // Проверяем новые уведомления о перебитой ставке и тест-драйве.
            // Первый успешный ответ после монтирования только заполняет previousNotificationIds — без toast,
            // иначе после F5 одни и те же непрочитанные снова показывались бы как «новые».
            const currentNotificationIds = new Set(notificationsList.map(n => n.id));
            if (!isFirstNotificationsLoadRef.current) {
              const newBidOutbidNotifications = notificationsList.filter(
                n => n.type === 'bid_outbid' && 
                     !previousNotificationIds.current.has(n.id) &&
                     n.view_count === 0
              );
              
              if (newBidOutbidNotifications.length > 0) {
                newBidOutbidNotifications.forEach(notif => {
                  const message = notif.message || notif.title || 'Вашу ставку перебили!';
                  showToast(message, 'warning', 5000);
                  console.log('🔔 Показано toast-уведомление о перебитой ставке:', notif.id);
                });
              }

              const newTestDriveResult = notificationsList.filter(
                (n) =>
                  n.type === 'test_drive_result' &&
                  !previousNotificationIds.current.has(n.id) &&
                  n.view_count === 0
              )
              if (newTestDriveResult.length > 0) {
                newTestDriveResult.forEach((notif) => {
                  const message =
                    notif.message || notif.title || 'Обновление по тест-драйву'
                  showToast(message, notif.title?.includes('отклон') ? 'warning' : 'success', 6000)
                  console.log('🔔 Toast тест-драйв:', notif.id)
                })
              }
            } else {
              isFirstNotificationsLoadRef.current = false
            }

            // Обновляем множество ID предыдущих уведомлений
            previousNotificationIds.current = currentNotificationIds;
            
            if (notificationsList && notificationsList.length > 0) {
              console.log('📄 Первое уведомление:', notificationsList[0]);
            }
            setNotifications(notificationsList)
          } else {
            console.warn('⚠️ API вернул success: false');
            setNotifications([])
          }
        } else {
          const errorText = await response.text()
          console.error('❌ Ошибка загрузки уведомлений:', response.status, errorText);
          setNotifications([])
        }
      } catch (error) {
        console.error('❌ Ошибка загрузки уведомлений:', error)
        setNotifications([])
      } finally {
        setNotificationsLoading(false)
      }
    }

    if (isLoggedIn) {
      loadNotifications()
      const handleFocus = () => loadNotifications()
      window.addEventListener('focus', handleFocus)
      const pollId = setInterval(loadNotifications, 45000)
      return () => {
        window.removeEventListener('focus', handleFocus)
        clearInterval(pollId)
      }
    }
  }, [user, userLoaded, isLoggedIn])

  const respondTestDriveRequest = async (notification, action) => {
    let payload = notification?.data
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload)
      } catch {
        payload = null
      }
    }
    if (!payload?.booking_id) {
      showToast('Не удалось прочитать заявку. Обновите страницу.', 'error')
      return
    }
    const storedDbId = localStorage.getItem('userId')
    const dbUserId =
      storedDbId && /^\d+$/.test(String(storedDbId).trim())
        ? String(storedDbId).trim()
        : null
    if (!dbUserId) {
      showToast('Не найден ID пользователя. Выйдите и войдите снова.', 'error')
      return
    }
    try {
      const res = await fetch(
        `${API_BASE_URL}/test-drive-bookings/${payload.booking_id}/respond`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: parseInt(dbUserId, 10),
            action,
          }),
        }
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        showToast(json.error || 'Не удалось выполнить действие', 'error')
        return
      }
      showToast(
        action === 'approve' ? 'Тест-драйв подтверждён' : 'Заявка отклонена',
        'success',
        4000
      )
      const r = await fetch(`${API_BASE_URL}/notifications/user/${dbUserId}`)
      if (r.ok) {
        const d = await r.json()
        if (d.success) setNotifications(d.data || [])
      }
    } catch (e) {
      console.error('test-drive respond', e)
      showToast('Ошибка сети', 'error')
    }
  }

  // Обработчик просмотра уведомления
  const handleNotificationView = async (notificationId) => {
    try {
      console.log('👁️ Просмотр уведомления:', notificationId);
      await fetch(`${API_BASE_URL}/notifications/${notificationId}/view`, {
        method: 'PUT'
      })
      // Обновляем список уведомлений
      // Используем числовой ID из БД (из localStorage), а не Clerk ID
      const dbUserId = localStorage.getItem('userId')
      if (dbUserId && /^\d+$/.test(dbUserId)) {
        const response = await fetch(`${API_BASE_URL}/notifications/user/${dbUserId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setNotifications(data.data || [])
          }
        }
      }
    } catch (error) {
      console.error('Ошибка при просмотре уведомления:', error)
    }
  }

  // Обработчик закрытия уведомления о верификации
  const handleVerificationClose = async () => {
    if (verificationNotification) {
      // Отмечаем уведомление как просмотренное (удаляется после первого просмотра)
      await handleNotificationView(verificationNotification.id);
      setShowVerificationSuccess(false);
      setVerificationNotification(null);
    }
  }
  
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [showMap, setShowMap] = useState(false)
  const [selectedChat, setSelectedChat] = useState(null)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [showVerificationSuccess, setShowVerificationSuccess] = useState(false)
  const [verificationNotification, setVerificationNotification] = useState(null)
  const previousNotificationIds = useRef(new Set())
  const isFirstNotificationsLoadRef = useRef(true)
  const [activeCategory, setActiveCategory] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [filteredProperties, setFilteredProperties] = useState(null)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)
  const [activeFilter, setActiveFilter] = useState(t('forAll'))
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMenuClosing, setIsMenuClosing] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [pageSearchResults, setPageSearchResults] = useState([])
  const languageDropdownDesktopRef = useRef(null)
  const languageDropdownMobileRef = useRef(null)
  const searchInputRef = useRef(null)
  const searchWrapperRef = useRef(null)
  const chatMessagesRef = useRef(null)
  const lastMessageRef = useRef(null)
  const notificationRef = useRef(null)
  const menuRef = useRef(null)
  const landingStatsRef = useRef(null)
  const [statsScrollProgress, setStatsScrollProgress] = useState(0)

  const heroImages = {
    rent: mainFon,
    buy: mainFon
  }
  
  const heroImage = heroImages[propertyMode]

  // Прогресс скролла для секции «Цифры»: 0 = секция внизу экрана, 1 = контент по центру (секция белая)
  useEffect(() => {
    const el = landingStatsRef.current
    if (!el) return
    const onScroll = () => {
      const rect = el.getBoundingClientRect()
      const viewportCenter = window.innerHeight / 2
      const sectionCenter = rect.top + rect.height / 2
      // progress 0: центр секции ниже центра экрана; 1: центр секции по центру экрана или выше
      const raw = (viewportCenter - rect.top) / (rect.height * 0.5)
      const progress = Math.min(1, Math.max(0, raw))
      setStatsScrollProgress(progress)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  // Функция фильтрации по поисковому запросу
  const filterBySearch = (properties) => {
    if (!searchQuery) return properties
    const query = searchQuery.toLowerCase()
    return properties.filter(property => 
      (property.name && property.name.toLowerCase().includes(query)) ||
      (property.location && property.location.toLowerCase().includes(query))
    )
  }

  // Определение страниц для поиска
  const searchablePages = [
    {
      path: '/',
      keywords: ['главная', 'home', 'начало', 'старт'],
      title: 'Главная',
      requiresAuth: false,
      allowedRoles: ['buyer', 'seller', 'owner', 'admin', 'client'] // Доступна всем
    },
    {
      path: '/auction',
      keywords: ['аукцион', 'auction', 'торги', 'продажа', 'недвижимость'],
      title: 'Аукцион',
      requiresAuth: false,
      allowedRoles: ['buyer', 'seller', 'owner', 'admin', 'client'] // Доступна всем
    },
    {
      path: '/map',
      keywords: ['карта', 'map', 'карты', 'локация', 'место'],
      title: 'Карта',
      requiresAuth: false,
      allowedRoles: ['buyer', 'seller', 'owner', 'admin', 'client'] // Доступна всем
    },
    {
      path: '/chat?manager=1',
      keywords: ['чат', 'chat', 'сообщения', 'messages', 'переписка'],
      title: 'Чат',
      requiresAuth: false,
      allowedRoles: ['buyer', 'seller', 'owner', 'admin', 'client'] // Доступна всем
    },
    {
      path: '/profile',
      keywords: ['профиль', 'profile', 'аккаунт', 'личный кабинет', 'личный', 'кабинет', 'настройки', 'settings'],
      title: 'Профиль',
      requiresAuth: true,
      allowedRoles: ['buyer', 'client', 'admin'] // Только для покупателей и админов
    },
    {
      path: '/favorites',
      keywords: ['избранное', 'favorites', 'избранные', 'закладки', 'bookmarks'],
      title: 'Избранное',
      requiresAuth: true,
      allowedRoles: ['buyer', 'client', 'admin'] // Только для покупателей и админов
    },
    {
      path: '/wallet',
      keywords: ['кошелек', 'wallet', 'баланс', 'balance', 'деньги', 'money', 'платежи', 'payments'],
      title: 'Кошелек',
      requiresAuth: true,
      allowedRoles: ['buyer', 'client', 'admin'] // Только для покупателей и админов
    },
    {
      path: '/data',
      keywords: ['данные', 'data', 'информация', 'information', 'персональные данные'],
      title: 'Данные',
      requiresAuth: true,
      allowedRoles: ['buyer', 'client', 'admin'] // Только для покупателей и админов
    },
    {
      path: '/subscriptions',
      keywords: ['подписки', 'subscriptions', 'подписка', 'subscription', 'тарифы', 'tariffs'],
      title: 'Подписки',
      requiresAuth: true,
      allowedRoles: ['buyer', 'client', 'admin'] // Только для покупателей и админов
    },
    {
      path: '/history',
      keywords: ['история', 'history', 'история покупок', 'покупки', 'purchases'],
      title: 'История',
      requiresAuth: true,
      allowedRoles: ['buyer', 'client', 'admin'] // Только для покупателей и админов
    },
    {
      path: '/owner',
      keywords: ['кабинет продавца', 'owner', 'продавец', 'seller', 'владелец', 'dashboard', 'дашборд', 'панель продавца'],
      title: 'Кабинет продавца',
      requiresAuth: true,
      requiresRole: ['seller', 'owner'],
      allowedRoles: ['seller', 'owner', 'admin'] // Только для продавцов и админов
    },
    {
      path: '/owner/property/new',
      keywords: ['добавить недвижимость', 'add property', 'новая недвижимость', 'создать объявление', 'разместить'],
      title: 'Добавить недвижимость',
      requiresAuth: true,
      requiresRole: ['seller', 'owner'],
      allowedRoles: ['seller', 'owner', 'admin'] // Только для продавцов и админов
    },
    {
      path: '/admin',
      keywords: ['админ', 'admin', 'администратор', 'administrator', 'панель администратора', 'админка'],
      title: 'Админ-панель',
      requiresAuth: true,
      requiresRole: ['admin'],
      allowedRoles: ['admin'] // Только для админов
    }
  ]

  // Получение текущей роли пользователя
  const getUserRole = () => {
    const userData = getUserData()
    const localRole = localStorage.getItem('userRole')
    const storedRole = userData.role || localRole || 'client'
    const isAdmin = localStorage.getItem('isAdminLoggedIn') === 'true' && storedRole === 'admin'
    const isOwner = storedRole === 'seller' || storedRole === 'owner' || localStorage.getItem('isOwnerLoggedIn') === 'true'
    
    // Админ имеет приоритет
    if (isAdmin) return 'admin'
    
    // Проверяем продавца/владельца
    if (isOwner) {
      return storedRole === 'seller' ? 'seller' : 'owner'
    }
    
    // Все остальные - покупатели (buyer или client)
    // Если роль явно указана как buyer, возвращаем buyer, иначе client
    return (storedRole === 'buyer' || storedRole === 'client') ? storedRole : 'client'
  }

  // Функция поиска страниц
  const searchPages = (query) => {
    if (!query.trim()) {
      setPageSearchResults([])
      return
    }

    const queryLower = query.toLowerCase().trim()
    const currentUserRole = getUserRole()
    
    const results = searchablePages
      .filter(page => {
        // Проверяем совпадение по ключевым словам
        const matchesKeywords = page.keywords.some(keyword => 
          keyword.toLowerCase().includes(queryLower) || queryLower.includes(keyword.toLowerCase())
        )
        
        // Проверяем совпадение по названию
        const matchesTitle = page.title.toLowerCase().includes(queryLower)
        
        if (!(matchesKeywords || matchesTitle)) {
          return false
        }
        
        // Фильтруем по роли пользователя
        // Если пользователь не авторизован, показываем только страницы без авторизации
        const userData = getUserData()
        const isUserLoggedIn = isLoggedIn || (userLoaded && user) || userData.isLoggedIn
        
        if (!isUserLoggedIn) {
          return !page.requiresAuth
        }
        
        // Если страница доступна всем ролям или не указаны ограничения
        if (!page.allowedRoles || page.allowedRoles.length === 0) {
          return true
        }
        
        // Строго проверяем, есть ли роль пользователя в списке разрешенных
        // Если роли нет в списке - страница НЕ показывается вообще
        return page.allowedRoles.includes(currentUserRole)
      })
      .map(page => ({
        ...page,
        // Проверяем авторизацию
        canAccess: checkPageAccess(page)
      }))

    setPageSearchResults(results)
  }

  // Проверка доступа к странице
  const checkPageAccess = (page) => {
    // Если страница не требует авторизации
    if (!page.requiresAuth) {
      return { allowed: true }
    }

    // Проверяем авторизацию
    const userData = getUserData()
    const isUserLoggedIn = isLoggedIn || (userLoaded && user) || userData.isLoggedIn

    if (!isUserLoggedIn) {
      return { 
        allowed: false, 
        reason: 'auth',
        message: 'Для доступа к этой странице необходимо войти в систему'
      }
    }

    // Проверяем роль, если требуется
    if (page.requiresRole) {
      const userRole = userData.role || localStorage.getItem('userRole') || 'client'
      const isAdmin = localStorage.getItem('isAdminLoggedIn') === 'true' && userRole === 'admin'
      const isOwner = userRole === 'seller' || userRole === 'owner' || localStorage.getItem('isOwnerLoggedIn') === 'true'

      if (page.requiresRole.includes('admin') && !isAdmin) {
        return { 
          allowed: false, 
          reason: 'role',
          message: 'Доступ только для администраторов'
        }
      }

      if (page.requiresRole.includes('seller') && !isOwner && !isAdmin) {
        return { 
          allowed: false, 
          reason: 'role',
          message: 'Доступ только для продавцов'
        }
      }
    }

    return { allowed: true }
  }

  // Обработка выбора результата поиска
  const handleSearchResultClick = (page) => {
    const access = checkPageAccess(page)
    
    if (!access.allowed) {
      if (access.reason === 'auth') {
        setIsSearchOpen(false)
        setSearchQuery('')
        setIsLoginModalOpen(true)
      } else {
        // Показываем сообщение об ошибке доступа
        alert(access.message)
      }
      return
    }

    // Переходим на страницу
    if (page.path === '/wallet') {
      navigateToWallet(navigate, location.pathname)
    } else {
      navigate(page.path)
    }
    setIsSearchOpen(false)
    setSearchQuery('')
    setPageSearchResults([])
  }

  // Обработка изменения поискового запроса
  useEffect(() => {
    if (isSearchOpen && searchQuery.trim()) {
      searchPages(searchQuery)
    } else if (!searchQuery.trim()) {
      setPageSearchResults([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, isSearchOpen])

  // Обработка клика вне области поиска
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target) && isSearchOpen) {
        // Не закрываем поиск при клике вне, только если это не клик на другие элементы хедера
        const headerElements = document.querySelectorAll('.new-header__search-btn, .new-header__user-btn, .new-header__notification-btn, .new-header__auction-btn')
        const clickedOnHeaderElement = Array.from(headerElements).some(el => el.contains(event.target))
        if (!clickedOnHeaderElement) {
          setPageSearchResults([])
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSearchOpen])

  // Фильтрованные данные
  // Состояние для одобренных объявлений из API
  // и общий список объектов для главной страницы
  const [homeProperties, setHomeProperties] = useState([])
  const [approvedProperties, setApprovedProperties] = useState({
    apartments: [],
    villas: [],
    flats: [],
    houses: []
  })

  // Загрузка одобренных объявлений — только когда секция попадает во вьюпорт (без polling)
  const loadApprovedProperties = useCallback(async () => {
    try {
      const types = [
        { apiType: 'commercial', stateKey: 'apartments' },
        { apiType: 'villa', stateKey: 'villas' },
        { apiType: 'apartment', stateKey: 'flats' },
        { apiType: 'house', stateKey: 'houses' }
      ]
      const loadedProperties = { apartments: [], villas: [], flats: [], houses: [] }
      const lang = (i18n.language || 'ru').split('-')[0]
      for (const { apiType, stateKey } of types) {
        try {
          const res = await fetch(`${API_BASE_URL}/properties/approved?type=${apiType}&lang=${lang}`)
          if (res.ok) {
            const data = await res.json()
            if (data.success && data.data) loadedProperties[stateKey] = data.data
          }
        } catch (_) {}
      }
      setApprovedProperties(loadedProperties)
    } catch (error) {
      console.error('❌ Ошибка загрузки одобренных объявлений:', error)
    }
  }, [i18n.language])

  // Объединяем статические данные с данными из API
  const combinedApartments = useMemo(() => {
    // Убираем дубликаты по ID, приоритет у данных из API
    const apiIds = new Set(approvedProperties.apartments.map(p => p.id))
    const uniqueStaticApartments = apartmentsData.filter(p => !apiIds.has(p.id))
    return [...uniqueStaticApartments, ...approvedProperties.apartments]
  }, [approvedProperties.apartments])

  const combinedVillas = useMemo(() => {
    // Убираем дубликаты по ID, приоритет у данных из API
    const apiIds = new Set(approvedProperties.villas.map(p => p.id))
    const uniqueStaticVillas = villasData.filter(p => !apiIds.has(p.id))
    return [...uniqueStaticVillas, ...approvedProperties.villas]
  }, [approvedProperties.villas])

  const combinedFlats = useMemo(() => {
    // Убираем дубликаты по ID, приоритет у данных из API
    const apiIds = new Set(approvedProperties.flats.map(p => p.id))
    const uniqueStaticFlats = flatsData.filter(p => !apiIds.has(p.id))
    return [...uniqueStaticFlats, ...approvedProperties.flats]
  }, [approvedProperties.flats])

  const combinedTownhouses = useMemo(() => {
    // Убираем дубликаты по ID, приоритет у данных из API
    const apiIds = new Set(approvedProperties.houses.map(p => p.id))
    const uniqueStaticHouses = townhousesData.filter(p => !apiIds.has(p.id))
    return [...uniqueStaticHouses, ...approvedProperties.houses]
  }, [approvedProperties.houses])

  const filteredApartments = useMemo(() => filterBySearch(combinedApartments), [searchQuery, combinedApartments])
  const filteredVillas = useMemo(() => filterBySearch(combinedVillas), [searchQuery, combinedVillas])
  const filteredFlats = useMemo(() => filterBySearch(combinedFlats), [searchQuery, combinedFlats])
  const filteredTownhouses = useMemo(() => filterBySearch(combinedTownhouses), [searchQuery, combinedTownhouses])
  const filteredRecommended = useMemo(() => filterBySearch(recommendedProperties), [searchQuery])
  const filteredNearby = useMemo(() => filterBySearch(nearbyProperties), [searchQuery])

  // Один раз 2 запроса (approved + auctions), заполняем homeProperties и approvedProperties
  const loadHomeProperties = useCallback(async () => {
    try {
      const apiBase = await getApiBaseUrl()
      const lang = (i18n.language || 'ru').split('-')[0]
      const [approvedRes, auctionsRes, debtsRes] = await Promise.all([
        fetch(`${apiBase}/properties/approved?lang=${lang}`),
        fetch(`${apiBase}/properties/auctions?lang=${lang}`),
        fetch(`${apiBase}/properties/debts`)
      ])
      let approved = []
      let auctions = []
      let debts = []
      if (approvedRes.ok) {
        const json = await approvedRes.json()
        if (json?.success && Array.isArray(json.data)) approved = json.data
      }
      if (auctionsRes.ok) {
        const json = await auctionsRes.json()
        if (json?.success && Array.isArray(json.data)) auctions = json.data
      }
      if (debtsRes.ok) {
        const json = await debtsRes.json()
        if (json?.success && Array.isArray(json.data)) debts = json.data
      }
      const normalizeProperty = (prop, options = {}) => {
        const { forceAuction = null } = options
        const isAuction = forceAuction !== null ? forceAuction : (prop.isAuction === true || prop.is_auction === 1 || prop.is_auction === true)
        const isShare = prop.is_share === 1 || prop.is_share === true || prop.is_shared_ownership === 1 || prop.is_shared_ownership === true
        const priceNumber = prop.price != null && prop.price !== '' ? Number(prop.price) : 0
        const auctionStartingPrice = prop.auction_starting_price != null && prop.auction_starting_price !== '' ? Number(prop.auction_starting_price) : (prop.auctionStartingPrice != null && prop.auctionStartingPrice !== '' ? Number(prop.auctionStartingPrice) : null)
        const debtAmount = prop.debt_amount != null && prop.debt_amount !== '' ? Number(prop.debt_amount) : null
        return {
          ...prop,
          isAuction,
          is_share: isShare ? 1 : 0,
          title: prop.title || prop.name || '',
          name: prop.name || prop.title || '',
          image: prop.image || (Array.isArray(prop.images) && prop.images[0] ? (typeof prop.images[0] === 'string' ? prop.images[0] : prop.images[0].url) : null),
          images: Array.isArray(prop.images) ? prop.images : (prop.image ? [prop.image] : []),
          price: priceNumber,
          auction_starting_price: auctionStartingPrice,
          currentBid: prop.currentBid || prop.auction_current_bid || prop.auctionCurrentBid || null,
          endTime:
            prop.endTime ||
            prop.auction_end_time ||
            prop.auctionEndTime ||
            prop.auction_end_date ||
            prop.auctionEndDate ||
            prop.test_timer_end_date ||
            null,
          debt_amount: debtAmount,
          sale_type: prop.sale_type || undefined,
          is_debt: prop.is_debt ?? undefined,
          has_debt: prop.has_debt ?? undefined,
          beds: prop.beds || prop.rooms || prop.bedrooms || 0,
          baths: prop.baths || prop.bathrooms || 0,
          sqft: prop.sqft || prop.area || 0,
          area: prop.area || prop.sqft || 0,
        }
      }
      const byId = new Map()
      approved.map((p) => normalizeProperty(p)).forEach((p) => { if (p && p.id != null) byId.set(p.id, p) })
      auctions.map((p) => normalizeProperty(p, { forceAuction: true })).forEach((p) => { if (p && p.id != null) byId.set(p.id, p) })
      debts.map((p) => normalizeProperty(p)).forEach((p) => { if (p && p.id != null) byId.set(p.id, p) })
      setHomeProperties(Array.from(byId.values()))
      const pt = (p) => (p && p.property_type) ? String(p.property_type).toLowerCase() : ''
      setApprovedProperties({
        apartments: approved.filter((p) => pt(p) === 'commercial'),
        villas: approved.filter((p) => pt(p) === 'villa'),
        flats: approved.filter((p) => pt(p) === 'apartment'),
        houses: approved.filter((p) => pt(p) === 'house')
      })
    } catch (error) {
      console.error('❌ Ошибка загрузки объектов для главной страницы:', error)
    }
  }, [i18n.language])

  const loadMainPageData = loadHomeProperties

  const [mainSectionRef, mainSectionState] = useLazyLoad(loadMainPageData, { rootMargin: '300px' })

  // При смене языка в футере перезагружаем объявления с переводами
  useEffect(() => {
    loadHomeProperties()
    loadApprovedProperties()
  }, [i18n.language, loadHomeProperties, loadApprovedProperties])

  // Разделы для главной страницы (по типу продажи)
  const auctionSection = useMemo(() => {
    // Аукционы без цены "Купить сейчас"; объекты с долями не показываем на аукционе
    const base = homeProperties.filter((p) => {
      if (!p || !p.isAuction) return false
      if (p.is_shared_ownership === 1 || p.is_shared_ownership === true) return false
      // На главной в "Аукционы" не показываем долги
      const isDebt =
        p.sale_type === 'debt' ||
        p.is_debt === 1 ||
        p.is_debt === true ||
        p.has_debt === 1 ||
        p.has_debt === true
      if (isDebt) return false

      const price = p.price || 0
      const start = p.auction_starting_price || 0

      // Если нет цены или она равна стартовой — считаем чистым аукционом
      if (!price) return true
      if (!start) return true
      return Number(price) <= Number(start)
    })

    return filterBySearch(base).slice(0, 8)
  }, [homeProperties, searchQuery])

  const buyNowSection = useMemo(() => {
    // Аукционы с опцией "Купить сейчас"; объекты с долями не показываем
    const base = homeProperties.filter((p) => {
      if (!p || !p.isAuction) return false
      if (p.is_shared_ownership === 1 || p.is_shared_ownership === true) return false
      // На главной в "Купить сейчас" не показываем долги
      const isDebt =
        p.sale_type === 'debt' ||
        p.is_debt === 1 ||
        p.is_debt === true ||
        p.has_debt === 1 ||
        p.has_debt === true
      if (isDebt) return false
      const price = p.price || 0
      const start = p.auction_starting_price || 0
      if (!price || !start) return false
      return Number(price) > Number(start)
    })

    return filterBySearch(base).slice(0, 8)
  }, [homeProperties, searchQuery])

  const debtsSection = useMemo(() => {
    // Объекты с долгами (ожидаем флаги от бэкенда)
    const base = homeProperties.filter((p) =>
      p &&
      (p.sale_type === 'debt' ||
       p.is_debt === 1 ||
       p.is_debt === true ||
       p.has_debt === 1 ||
       p.has_debt === true)
    )

    return filterBySearch(base).slice(0, 8)
  }, [homeProperties, searchQuery])

  const sharesSection = useMemo(() => {
    // Долевая собственность
    const base = homeProperties.filter((p) =>
      p &&
      (p.is_share === 1 ||
       p.is_share === true ||
       p.is_shared_ownership === 1 ||
       p.is_shared_ownership === true)
    )

    return filterBySearch(base).slice(0, 8)
  }, [homeProperties, searchQuery])

  // Чтение URL параметров и применение фильтров
  useEffect(() => {
    try {
      if (!location) {
        return
      }

      const searchParams = new URLSearchParams(location.search)
      const category = searchParams.get('category')
      const filter = searchParams.get('filter')

      if (category) {
        setIsLoading(true)
        setActiveCategory(category)

        const timeoutId = setTimeout(() => {
          try {
            let filteredRecommended = recommendedProperties
            let filteredNearby = nearbyProperties

            if (category === 'House') {
              filteredRecommended = recommendedProperties.filter((p) => 
                p && p.tag && p.tag.toLowerCase() === 'house'
              )
              filteredNearby = nearbyProperties.filter((p) => 
                p && p.tag && p.tag.toLowerCase() === 'house'
              )
            } else if (category === 'Apartment') {
              filteredRecommended = recommendedProperties.filter((p) => 
                p && p.tag && p.tag.toLowerCase() === 'apartment'
              )
              filteredNearby = nearbyProperties.filter((p) => 
                p && p.tag && p.tag.toLowerCase() === 'apartment'
              )
            } else if (category === 'Villa') {
              filteredRecommended = recommendedProperties.filter((p) => 
                p && p.tag && p.tag.toLowerCase() === 'villa'
              )
              filteredNearby = nearbyProperties.filter((p) => 
                p && p.tag && p.tag.toLowerCase() === 'villa'
              )
            }

            // Если есть фильтр аукциона, применяем его
            if (filter === 'auction') {
              filteredRecommended = filteredRecommended.filter((p) => p && p.isAuction === true)
              filteredNearby = filteredNearby.filter((p) => p && p.isAuction === true)
            }

            setFilteredProperties({
              recommended: filteredRecommended,
              nearby: filteredNearby,
            })
            setIsLoading(false)
          } catch (error) {
            console.error('Error filtering properties:', error)
            setIsLoading(false)
          }
        }, 500)

        return () => {
          clearTimeout(timeoutId)
        }
      } else {
        // Если нет параметров, сбрасываем фильтры
        setFilteredProperties(null)
        setActiveCategory(null)
      }
    } catch (error) {
      console.error('Error reading URL parameters:', error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search])

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isSearchOpen])

  useEffect(() => {
    function handleClickOutside(event) {
      const inLangDesktop = languageDropdownDesktopRef.current?.contains(event.target)
      const inLangMobile = languageDropdownMobileRef.current?.contains(event.target)
      if (!inLangDesktop && !inLangMobile) {
        setIsLanguageOpen(false)
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false)
      }
    }

    // Проверяем ширину экрана для десктопа
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }

    checkDesktop()
    window.addEventListener('resize', checkDesktop)

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('resize', checkDesktop)
    }
  }, [])

  // Закрытие меню обрабатывается через backdrop onClick

  // Изменяем overflow body когда меню открыто (но не фон, чтобы не было белого экрана)
  useEffect(() => {
    if (isMenuOpen) {
      const main = document.querySelector('.app-layout')
      const originalOverflow = main ? main.style.overflow : document.body.style.overflow
      if (main) main.style.overflow = 'hidden'
      else document.body.style.overflow = 'hidden'
      return () => {
        if (main) main.style.overflow = originalOverflow
        else document.body.style.overflow = originalOverflow
      }
    }
  }, [isMenuOpen])


  const headerLangCode = (i18n.language || 'ru').split('-')[0]
  const currentHeaderLanguage =
    UI_LANGUAGES.find((lang) => lang.code === headerLangCode) || UI_LANGUAGES[0]

  const handleHeaderLanguageSelect = async (langCode) => {
    try {
      await i18n.changeLanguage(langCode)
    } catch (e) {
      console.error('MainPage: language change failed', e)
    }
    setIsLanguageOpen(false)
  }

  const handleContactFormChange = (e) => {
    const { name, value } = e.target
    setContactForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleContactFormSubmit = (e) => {
    e.preventDefault()
    console.log('Form submitted:', contactForm)
    setContactForm({
      email: '',
      fullName: '',
      message: '',
    })
    showNotification(t('thankYouMessage'))
  }

  const toggleChat = () => {
    setIsChatOpen((prev) => !prev)
  }

  const handleChatInputChange = (e) => {
    setChatInput(e.target.value)
  }

  const handleButtonClick = async (buttonText, meta = null) => {
    if (meta?.contactPref) {
      await handleChatSubmit(null, null, { contactPref: meta.contactPref })
      return
    }
    await handleChatSubmit(null, buttonText)
  }

  const handleChatSubmit = async (e, buttonText = null, options = {}) => {
    if (e) e.preventDefault()

    const { contactPref } = options || {}
    let userMessage = buttonText || chatInput.trim()
    if (contactPref) {
      const labelMap = {
        phone: t('managerContactPrefPhone'),
        email: t('managerContactPrefEmail'),
        whatsapp: t('managerContactPrefWhatsapp'),
        telegram: t('managerContactPrefTelegram'),
        live_chat: t('managerContactPrefLiveChat'),
      }
      userMessage = labelMap[contactPref] || contactPref
    }
    if (!userMessage) return

    if (!buttonText && !contactPref) {
      setChatInput('')
    }

    // Добавляем сообщение пользователя
    const userMessageObj = {
      id: Date.now(),
      text: userMessage,
      sender: 'user',
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, userMessageObj])

    if (contactPref) {
      setUserPreferences((prev) => ({
        ...prev,
        preferredContact: contactPref,
        managerContactRequested: true,
        managerContactPendingChoice: false
      }))
      if (contactPref === 'live_chat') {
        const botMessage = {
          id: Date.now() + 1,
          text: t('liveChatWaitNotice'),
          sender: 'bot',
          timestamp: new Date(),
          buttons: null,
          recommendations: null,
        }
        setChatMessages((prev) => [...prev, botMessage])
        setIsChatOpen(false)
        navigate('/chat?manager=1')
        return
      }
      if (contactPref === 'telegram') {
        const tgUrl = (import.meta.env.VITE_MANAGER_TELEGRAM_URL || '').trim()
        const botMessage = {
          id: Date.now() + 1,
          text: tgUrl ? t('managerContactThanksTelegram') : t('liveChatTelegramNotConfigured'),
          sender: 'bot',
          timestamp: new Date(),
          buttons: null,
          recommendations: null
        }
        setChatMessages((prev) => [...prev, botMessage])
        if (tgUrl) window.open(tgUrl, '_blank', 'noopener,noreferrer')
        return
      }
      const thanksText =
        contactPref === 'phone'
          ? t('managerContactThanksPhone')
          : contactPref === 'email'
            ? t('managerContactThanksEmail')
            : t('managerContactThanksWhatsapp')
      const botMessage = {
        id: Date.now() + 1,
        text: thanksText,
        sender: 'bot',
        timestamp: new Date(),
        buttons: null,
        recommendations: null
      }
      setChatMessages((prev) => [...prev, botMessage])
      return
    }

    // Обновляем предпочтения на основе сообщения
    const lowerMessage = userMessage.toLowerCase()
    
    // Определяем цель
    if (lowerMessage.includes('для себя') || lowerMessage === 'для себя' || lowerMessage.includes('сам') || lowerMessage.includes('личн')) {
      setUserPreferences(prev => ({ ...prev, purpose: 'для себя' }))
    } else if (lowerMessage.includes('под сдачу') || lowerMessage === 'под сдачу' || lowerMessage.includes('сдачу') || lowerMessage.includes('аренд')) {
      setUserPreferences(prev => ({ ...prev, purpose: 'под сдачу' }))
    } else if (lowerMessage.includes('инвестиц') || lowerMessage === 'инвестиции' || lowerMessage.includes('инвест')) {
      setUserPreferences(prev => ({ ...prev, purpose: 'инвестиции' }))
    }
    
    // Определяем локацию
    if (lowerMessage.includes('испания') || lowerMessage.includes('spain') || lowerMessage.includes('españa') || 
        lowerMessage.includes('tenerife') || lowerMessage.includes('тенерифе') || lowerMessage.includes('коста') ||
        lowerMessage.includes('barcelona') || lowerMessage.includes('madrid')) {
      setUserPreferences(prev => ({ ...prev, location: 'Испания' }))
    } else if (lowerMessage.includes('дубай') || lowerMessage.includes('dubai') || lowerMessage.includes('uae') || 
               lowerMessage.includes('оаэ') || lowerMessage.includes('emirates')) {
      setUserPreferences(prev => ({ ...prev, location: 'Дубай' }))
    }

    // Извлекаем бюджет из сообщения (конвертируем рубли в евро, если указаны)
    const budgetMatch = userMessage.match(/(\d+[\s,.]?\d*)\s*(тыс|млн|k|m|€|\$|eur|usd|евро|доллар|рубл|₽|rub)/i)
    if (budgetMatch) {
      let budget = parseFloat(budgetMatch[1].replace(/\s/g, '').replace(',', '.'))
      const unit = budgetMatch[2].toLowerCase()
      
      // Конвертируем в евро (примерный курс: 1 EUR = 100 RUB)
      const eurToRubRate = 100
      
      if (unit.includes('млн') || unit === 'm') {
        budget = budget * 1000000
      } else if (unit.includes('тыс') || unit === 'k') {
        budget = budget * 1000
      }
      
      // Если указаны рубли, конвертируем в евро
      if (unit.includes('рубл') || unit.includes('₽') || unit.includes('rub')) {
        budget = budget / eurToRubRate
      }
      
      setUserPreferences(prev => ({ ...prev, budget }))
    }
    
    // Определяем тип недвижимости
    if (lowerMessage.includes('квартир') || lowerMessage.includes('апартамент') || lowerMessage.includes('apartment')) {
      setUserPreferences(prev => ({ ...prev, propertyType: 'квартира' }))
    } else if (lowerMessage.includes('вилл') || lowerMessage.includes('villa')) {
      setUserPreferences(prev => ({ ...prev, propertyType: 'вилла' }))
    } else if (lowerMessage.includes('дом') || lowerMessage.includes('таунхаус') || lowerMessage.includes('townhouse') || lowerMessage.includes('house')) {
      setUserPreferences(prev => ({ ...prev, propertyType: 'дом' }))
    }
    
    // Извлекаем количество комнат
    const roomsMatch = userMessage.match(/(\d+)\s*(комнат|room|bed)/i)
    if (roomsMatch) {
      setUserPreferences(prev => ({ ...prev, rooms: parseInt(roomsMatch[1]) }))
    }

    let wantsManager = false
    try {
      wantsManager = await detectManagerContactIntent(userMessage)
    } catch {
      wantsManager = false
    }

    if (wantsManager) {
      const alreadyDone = userPreferences.preferredContact
      if (alreadyDone) {
        const methodLabel =
          alreadyDone === 'phone'
            ? t('managerContactPrefPhone')
            : alreadyDone === 'email'
              ? t('managerContactPrefEmail')
              : alreadyDone === 'whatsapp'
                ? t('managerContactPrefWhatsapp')
                : alreadyDone === 'telegram'
                  ? t('managerContactPrefTelegram')
                  : alreadyDone === 'live_chat'
                    ? t('managerContactPrefLiveChat')
                    : String(alreadyDone)
        const botMessage = {
          id: Date.now() + 1,
          text: t('managerRequestAlready', { method: methodLabel }),
          sender: 'bot',
          timestamp: new Date(),
          buttons: null,
          recommendations: null
        }
        setChatMessages((prev) => [...prev, botMessage])
        return
      }
      if (userPreferences.managerContactPendingChoice) {
        const botMessage = {
          id: Date.now() + 1,
          text: t('managerContactPickHint'),
          sender: 'bot',
          timestamp: new Date(),
          buttons: getManagerContactButtons(t),
          recommendations: null
        }
        setChatMessages((prev) => [...prev, botMessage])
        return
      }

      setUserPreferences((prev) => ({
        ...prev,
        managerContactRequested: true,
        managerContactPendingChoice: true
      }))
      const botMessage = {
        id: Date.now() + 1,
        text: t('managerRequestAck'),
        sender: 'bot',
        timestamp: new Date(),
        buttons: getManagerContactButtons(t),
        recommendations: null
      }
      setChatMessages((prev) => [...prev, botMessage])
      return
    }

    setIsLoadingAI(true)
    setIsSlowAIResponse(false)
    if (slowResponseTimerRef.current) {
      clearTimeout(slowResponseTimerRef.current)
      slowResponseTimerRef.current = null
    }
    slowResponseTimerRef.current = setTimeout(() => setIsSlowAIResponse(true), 6000)

    try {
      // Получаем ответ от AI
      const response = await askPropertyAssistant(
        [...chatMessages, userMessageObj],
        userPreferences,
        allProperties
      )

      // Добавляем ответ бота
      const botMessage = {
        id: Date.now() + 1,
        text: response.text,
        sender: 'bot',
        timestamp: new Date(),
        buttons: response.buttons,
        recommendations: response.recommendations
      }

      setChatMessages((prev) => [...prev, botMessage])
    } catch (error) {
      console.error('Ошибка при обращении к AI:', error)
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Извините, произошла ошибка. Попробуйте еще раз.',
        sender: 'bot',
        timestamp: new Date(),
        buttons: null,
        recommendations: null
      }
      setChatMessages((prev) => [...prev, errorMessage])
    } finally {
      if (slowResponseTimerRef.current) {
        clearTimeout(slowResponseTimerRef.current)
        slowResponseTimerRef.current = null
      }
      setIsLoadingAI(false)
      setIsSlowAIResponse(false)
    }
  }

  useEffect(() => {
    if (!chatMessagesRef.current || !isChatOpen) return
    const last = chatMessages[chatMessages.length - 1]
    if (last?.sender === 'bot' && lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ block: 'start', behavior: 'smooth' })
    } else {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }, [chatMessages, isChatOpen])

  useEffect(() => {
    const footer = document.getElementById('site-footer')
    if (!footer) return

    const getScrollRoot = () =>
      layoutScrollRef?.current || document.querySelector('.app-layout') || null

    let observer = null

    const connect = () => {
      if (observer) {
        observer.disconnect()
        observer = null
      }
      observer = new IntersectionObserver(
        ([entry]) => {
          setAiAssistantHiddenByFooter(Boolean(entry?.isIntersecting))
        },
        {
          root: getScrollRoot(),
          rootMargin: '0px 0px -12% 0px',
          threshold: [0, 0.02, 0.5],
        }
      )
      observer.observe(footer)
    }

    connect()
    const raf = requestAnimationFrame(() => connect())

    return () => {
      cancelAnimationFrame(raf)
      if (observer) observer.disconnect()
    }
  }, [layoutScrollRef])

  // Функции для получения переведенных элементов (обновляются при смене языка)
  const getPropertyTypes = useMemo(() => [
      { label: 'House', displayLabel: t('house'), icon: PiHouseLine, image: '/house.png' },
      { label: 'Map', displayLabel: t('map'), icon: FiMap, isMap: true, image: '/map.png' },
      { label: 'Apartment', displayLabel: t('apartment'), icon: PiBuildingApartment, image: '/appartaments.png' },
      { label: 'Villa', displayLabel: t('villa'), icon: PiBuildings, image: '/villa.png' },
  ], [t, i18n.language])
  
  const navigationItems = useMemo(() => [
      { id: 'home', label: t('home'), icon: FaHome },
      { id: 'favourite', label: t('favorites'), icon: FaHeartSolid },
      { id: 'auction', label: t('auction'), icon: FaGavel },
      { id: 'chat', label: t('chat'), icon: FaComment },
      { id: 'profile', label: t('profile'), icon: FaUser },
  ], [t, i18n.language])

  const landingFolderData = useMemo(() => landingFolderDataBase.map((folder) => ({
    ...folder,
    title: t(folder.titleKey),
    linkLabel: folder.linkLabelKey ? t(folder.linkLabelKey) : undefined,
  })), [t, i18n.language])
  
  // Автоматический перевод пользовательского контента отключен из-за лимитов API
  // Статический контент переводится через i18next

  const handleCategoryClick = (categoryLabel) => {
    if (categoryLabel === 'Map') {
      navigate('/map')
      return
    }

    setIsLoading(true)
    setActiveCategory(categoryLabel)
    
    // Обновляем URL с параметрами фильтра
    navigate(`/auction?category=${categoryLabel}`, { replace: true })

    setTimeout(() => {
      // Фильтруем объявления по типу
      let filteredRecommended = recommendedProperties
      let filteredNearby = nearbyProperties

      if (categoryLabel === 'House') {
        // Фильтруем только дома
        filteredRecommended = recommendedProperties.filter((p) => 
          p.tag.toLowerCase() === 'house'
        )
        filteredNearby = nearbyProperties.filter((p) => 
          p.tag.toLowerCase() === 'house'
        )
      } else if (categoryLabel === 'Apartment') {
        filteredRecommended = recommendedProperties.filter((p) => 
          p.tag.toLowerCase() === 'apartment'
        )
        filteredNearby = nearbyProperties.filter((p) => 
          p.tag.toLowerCase() === 'apartment'
        )
      } else if (categoryLabel === 'Villa') {
        filteredRecommended = recommendedProperties.filter((p) => 
          p.tag.toLowerCase() === 'villa'
        )
        filteredNearby = nearbyProperties.filter((p) => 
          p.tag.toLowerCase() === 'villa'
        )
      }

      setFilteredProperties({
        recommended: filteredRecommended,
        nearby: filteredNearby,
      })
      setIsLoading(false)
    }, 2000)
  }

  const handleSocialLink = (platform) => {
    const links = {
      instagram: 'https://instagram.com/',
      whatsapp: 'https://wa.me/79991234567',
      youtube: 'https://youtube.com/',
      twitter: 'https://twitter.com/',
    }
    if (links[platform]) {
      window.open(links[platform], '_blank')
    }
  }

  const handleDownloadApp = (platform) => {
    if (platform === 'android') {
      window.open('https://play.google.com/store/apps', '_blank')
    } else if (platform === 'ios') {
      window.open('https://apps.apple.com/', '_blank')
    }
  }

  const handleWhatsApp = () => {
    window.open('https://wa.me/79991234567', '_blank')
  }

  const handleCallManager = () => {
    window.location.href = 'tel:+79991234567'
  }

  const handlePropertyClick = (category, propertyId, isClassic = false, hasTimer = false, property = null) => {
    if (!ensureCanOpenProperty()) return
    // Если объект не передан, пытаемся найти его в массивах
    let propertyToNavigate = property
    
    if (!propertyToNavigate) {
      // Ищем объект в recommendedProperties и nearbyProperties
      const allProperties = [...recommendedProperties, ...nearbyProperties]
      propertyToNavigate = allProperties.find(p => p.id === propertyId)
    }
    
    // Все объекты переходят на страницу объекта
    // PropertyDetailPage сама определит, какую страницу показывать (аукционную или классическую)
    const search = isClassic ? '?classic=1' : ''
    if (propertyToNavigate) {
      navigate(`/property/${propertyId}${search}`, { state: { property: propertyToNavigate } })
    } else {
      navigate(`/property/${propertyId}${search}`)
    }
  }

  const handleBackClick = () => {
    setSelectedProperty(null)
  }

  const togglePropertyFavorite = () => {
    if (selectedProperty) {
      toggleFavorite(selectedProperty, selectedProperty.category)
    }
  }

  const handleShare = () => {
    if (navigator.share && selectedProperty) {
      navigator
        .share({
          title: selectedProperty.name,
          text: selectedProperty.description,
          url: window.location.href,
        })
        .catch(() => {
          // Fallback если share не поддерживается
        })
    }
  }

  const handleBookNow = () => {
    // Обработчик бронирования
    showNotification('Функция бронирования будет реализована позже')
  }

  const handleCallBroker = () => {
    if (selectedProperty?.broker?.phone) {
      window.location.href = `tel:${selectedProperty.broker.phone}`
    }
  }

  const handleChatBroker = () => {
    // Обработчик чата с брокером
    showNotification('Чат с брокером будет реализован позже')
  }

  // Получаем все свойства для карты
  const allPropertiesForMap = [
    ...recommendedProperties.map((p) => ({ ...p, category: 'recommended' })),
    ...nearbyProperties.map((p) => ({ ...p, category: 'nearby' })),
  ]

  // Проверка на ошибки рендеринга
  if (!recommendedProperties || !nearbyProperties) {
    return <div className="app">{t('loading')}</div>
  }

  return (
    <div className="app">
      <section
        className="hero-section"
        // CSS-переменная для фонового изображения в pseudo-element'ах
        style={{ ['--hero-bg']: `url(${heroImage})` }}
      >
        <div className={`hero-section__image hero-section__image--rent ${propertyMode === 'rent' ? 'hero-section__image--active' : ''}`} style={{ backgroundImage: `url(${heroImages.rent})` }}></div>
        <div className={`hero-section__image hero-section__image--buy ${propertyMode === 'buy' ? 'hero-section__image--active' : ''}`} style={{ backgroundImage: `url(${heroImages.buy})` }}></div>
        <div className="hero-section__overlay"></div>
        {/* Новый хедер для десктопной версии */}
        <header className={`new-header ${isMenuOpen ? 'new-header--menu-open' : ''}`}>
        <div className={`new-header__container ${isMenuOpen ? 'new-header__container--menu-open' : ''}`}>
        <div className="new-header__left">
        <div className="new-header__location">
          <span className="new-header__location-icon">
            <FiGlobe size={20} aria-hidden />
          </span>
          <div className="new-header__location-info" ref={languageDropdownDesktopRef}>
            <span className="new-header__location-label">{t('headerLanguage')}</span>
            <button
              type="button"
              className="new-header__location-select"
              onClick={() => setIsLanguageOpen((prev) => !prev)}
              aria-haspopup="listbox"
              aria-expanded={isLanguageOpen}
              aria-label={t('selectLanguageAria')}
            >
              <span className="new-header__location-value">{currentHeaderLanguage.name}</span>
              <FiChevronDown
                size={16}
                className={`new-header__location-select-icon ${
                  isLanguageOpen ? 'new-header__location-select-icon--open' : ''
                }`}
              />
            </button>
          {isLanguageOpen && (
            <div className="new-header__location-dropdown">
              {UI_LANGUAGES.map((lang) => (
                <button
                  type="button"
                  className={`new-header__location-option ${
                    lang.code === headerLangCode ? 'new-header__location-option--active' : ''
                  }`}
                  key={lang.code}
                  onClick={() => handleHeaderLanguageSelect(lang.code)}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          )}
          </div>
        </div>
        <div className={`new-header__menu-wrapper ${isMenuOpen ? 'new-header__menu-wrapper--active' : ''}`} ref={menuRef}>
          <button 
            className={`new-header__menu-btn ${isMenuOpen ? 'new-header__menu-btn--active' : ''}`}
            onClick={(e) => {
              e.stopPropagation() // Останавливаем всплытие события
              e.preventDefault() // Предотвращаем стандартное поведение
              if (isMenuOpen) {
                setIsMenuClosing(true)
                setTimeout(() => {
                  setIsMenuOpen(false)
                  setIsMenuClosing(false)
                }, 300)
              } else {
                setIsMenuOpen(true)
              }
            }}
            aria-label="Меню"
            aria-expanded={isMenuOpen}
          >
            <MenuToggleIcon open={isMenuOpen} className="new-header__menu-icon" duration={500} />
            <span>{t('menu')}</span>
          </button>
        </div>
        
        {/* Модальное окно меню рендерится вне menu-wrapper */}
        {(isMenuOpen || isMenuClosing) && (
          <>
            <div 
              className={`menu-backdrop ${isMenuClosing ? 'menu-backdrop--closing' : ''}`}
              onClick={(e) => {
                // Закрываем меню при клике на backdrop
                // Проверяем, что клик не по кнопке меню или самому меню
                const menuBtn = menuRef.current?.querySelector('.new-header__menu-btn')
                const menuDropdown = document.querySelector('.menu-dropdown')
                
                if (menuBtn && menuBtn.contains(e.target)) {
                  // Клик по кнопке меню - не закрываем, кнопка сама переключит состояние
                  return
                }
                
                if (menuDropdown && menuDropdown.contains(e.target)) {
                  // Клик по меню - не закрываем
                  return
                }
                
                // Клик по backdrop - закрываем меню с анимацией
                setIsMenuClosing(true)
                setTimeout(() => {
                  setIsMenuOpen(false)
                  setIsMenuClosing(false)
                }, 300)
              }}
            />
            <div 
              className={`menu-dropdown ${isMenuClosing ? 'menu-dropdown--closing' : ''}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="menu-dropdown__content">
                <button
                  type="button"
                  className="menu-dropdown__close-btn"
                  aria-label="Закрыть меню"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsMenuClosing(true)
                    setTimeout(() => {
                      setIsMenuOpen(false)
                      setIsMenuClosing(false)
                    }, 300)
                  }}
                >
                  <FiX size={22} />
                </button>
                <div className="menu-dropdown__columns">
                  <div className="menu-dropdown__column">
                    <h3 className="menu-dropdown__column-title">{t('navSiteTitle')}</h3>
                    <div className="menu-dropdown__column-items">
                      <button 
                        className="menu-dropdown__item"
                        onClick={() => {
                          navigate('/')
                          setIsMenuOpen(false)
                        }}
                      >
                        <span>{t('home')}</span>
                      </button>
                      <button 
                        className="menu-dropdown__item"
                        onClick={() => {
                          navigate('/auction')
                          setIsMenuOpen(false)
                        }}
                      >
                        <span>{t('auction')}</span>
                      </button>
                      <button 
                        className="menu-dropdown__item"
                        onClick={() => {
                          navigate('/map')
                          setIsMenuOpen(false)
                        }}
                      >
                        <span>{t('map')}</span>
                      </button>
                      <button 
                        className="menu-dropdown__item"
                        onClick={() => {
                          navigate('/debts')
                          setIsMenuOpen(false)
                        }}
                      >
                        <span>Долги</span>
                      </button>
                      <button 
                        className="menu-dropdown__item"
                        onClick={() => {
                          navigate('/favorites')
                          setIsMenuOpen(false)
                        }}
                      >
                        <span>{t('favorites')}</span>
                      </button>
                      <button 
                        className="menu-dropdown__item"
                        onClick={() => {
                          navigate('/shares')
                          setIsMenuOpen(false)
                        }}
                      >
                        <span>Доли</span>
                      </button>
                      <button 
                        className="menu-dropdown__item"
                        onClick={() => {
                          navigate('/chat?manager=1')
                          setIsMenuOpen(false)
                        }}
                      >
                        <span>{t('chat')}</span>
                      </button>
                      <button 
                        className="menu-dropdown__item"
                        onClick={() => {
                          navigate('/bonuses')
                          setIsMenuOpen(false)
                        }}
                      >
                        <span>Бонусы</span>
                      </button>
                    </div>
                  </div>
                  <div className="menu-dropdown__column">
                    <h3 className="menu-dropdown__column-title">{t('profile')}</h3>
                    <div className="menu-dropdown__column-items">
                      {isLoggedIn ? (
                        <>
                          <button 
                            className="menu-dropdown__item"
                            onClick={() => {
                              navigate('/profile')
                              setIsMenuOpen(false)
                            }}
                          >
                            <span>Профиль</span>
                          </button>
                          <button 
                            className="menu-dropdown__item"
                            onClick={() => {
                              navigateToWallet(navigate, location.pathname)
                              setIsMenuOpen(false)
                            }}
                          >
                            <span>Кошелек</span>
                          </button>
                          <button 
                            className="menu-dropdown__item"
                            onClick={() => {
                              navigate('/subscriptions')
                              setIsMenuOpen(false)
                            }}
                          >
                            <span>Подписки</span>
                          </button>
                          <button 
                            className="menu-dropdown__item"
                            onClick={() => {
                              navigate('/data')
                              setIsMenuOpen(false)
                            }}
                          >
                            <span>Данные</span>
                          </button>
                        </>
                      ) : (
                        <button 
                          className="menu-dropdown__item"
                          onClick={() => {
                            setIsLoginModalOpen(true)
                            setIsMenuOpen(false)
                          }}
                        >
                          <span>Войти</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        </div>

          <div className="new-header__filters">
            <button
              type="button"
              className={`new-header__filter-btn new-header__filter-btn--hide-4 ${location.pathname === '/chat' ? 'new-header__filter-btn--active' : ''}`}
              onClick={() => navigate('/chat?manager=1')}
            >
              <span>{t('chat')}</span>
            </button>
            <button
              type="button"
              className={`new-header__filter-btn new-header__filter-btn--hide-3 ${location.pathname === '/favorites' ? 'new-header__filter-btn--active' : ''}`}
              onClick={() => navigate('/favorites')}
            >
              <span>{t('favorites')}</span>
            </button>
            <button
              type="button"
              className={`new-header__filter-btn new-header__filter-btn--hide-2 ${isChatOpen ? 'new-header__filter-btn--active' : ''}`}
              onClick={toggleChat}
            >
              <span>{t('aiAssistant')}</span>
            </button>
            <button
              type="button"
              className={`new-header__filter-btn new-header__filter-btn--hide-1 ${location.pathname === '/map' ? 'new-header__filter-btn--active' : ''}`}
              onClick={() => navigate('/map')}
            >
              <span>{t('map')}</span>
            </button>
          </div>

        <div className="new-header__right" ref={notificationRef}>
        {isSearchOpen ? (
          <div className="new-header__search-wrapper" ref={searchWrapperRef}>
            <div className="new-header__search-field">
              <FiSearch size={18} className="new-header__search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={t('search')}
                className="new-header__search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsSearchOpen(false)
                    setSearchQuery('')
                    setPageSearchResults([])
                  } else if (e.key === 'Enter' && pageSearchResults.length > 0) {
                    // Переходим на первую доступную страницу
                    const firstAccessible = pageSearchResults.find(r => r.canAccess.allowed)
                    if (firstAccessible) {
                      handleSearchResultClick(firstAccessible)
                    } else if (pageSearchResults[0]) {
                      handleSearchResultClick(pageSearchResults[0])
                    }
                  }
                }}
              />
              <button
                type="button"
                className="new-header__search-close"
                onClick={() => {
                  setIsSearchOpen(false)
                  setSearchQuery('')
                  setPageSearchResults([])
                }}
                aria-label={t('closeSearch')}
              >
                <FiX size={18} />
              </button>
            </div>
            {pageSearchResults.length > 0 && (
              <div className="new-header__search-results">
                {pageSearchResults.map((result, index) => (
                  <button
                    key={`${result.path}-${index}`}
                    type="button"
                    className={`new-header__search-result ${!result.canAccess.allowed ? 'new-header__search-result--disabled' : ''}`}
                    onClick={() => handleSearchResultClick(result)}
                    disabled={!result.canAccess.allowed}
                  >
                    <span className="new-header__search-result-title">{result.title}</span>
                    {!result.canAccess.allowed && (
                      <span className="new-header__search-result-hint">
                        {result.canAccess.reason === 'auth' ? '🔒 Требуется вход' : '⚠️ Нет доступа'}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {searchQuery.trim() && pageSearchResults.length === 0 && (
              <div className="new-header__search-results">
                <div className="new-header__search-result new-header__search-result--no-results">
                  <span>{t('nothingFound')}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <button 
              className="new-header__search-btn"
              onClick={() => {
                setIsSearchOpen(true)
                setSearchQuery('')
                setPageSearchResults([])
              }}
              aria-label="Открыть поиск"
            >
              <FiSearch size={20} />
            </button>
        <button 
          type="button"
          className="new-header__auction-btn"
          onClick={() => navigate('/auction')}
        >
          {t('auction')}
        </button>
        <button 
          className={`new-header__user-btn ${isLoggedIn ? 'new-header__user-btn--avatar' : ''}`}
          onClick={() => {
            // Всегда сначала проверяем локальные данные (роль, флаги)
            const userData = getUserData()
            const localRole = localStorage.getItem('userRole')
            const storedRole = userData.role || localRole
            const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn') === 'true'
            const isAdmin = isAdminLoggedIn && storedRole === 'admin'
            const isOwnerFlag = localStorage.getItem('isOwnerLoggedIn') === 'true'
            const isOwner =
              storedRole === 'seller' ||
              storedRole === 'owner' ||
              isOwnerFlag

            // Если по локальным данным видно, что это админ — ведем в админ-панель
            if (isAdmin) {
              navigate('/admin')
              return
            }

            // Продавца ведем в кабинет продавца
            if (isOwner) {
              navigate('/owner')
              return
            }

            // Дальше обычная логика профиля покупателя
            if (userLoaded && user) {
              navigate('/profile')
            } else if (userData.isLoggedIn) {
              navigate('/profile')
            } else {
              setIsLoginModalOpen(true)
            }
          }}
          aria-label={t('profile')}
        >
          {isLoggedIn ? (
            <div className="new-header__avatar-wrapper">
              {userPhoto ? (
                <img loading="lazy" 
                  src={userPhoto} 
                  alt="Profile" 
                  className="new-header__avatar-img"
                  onError={(e) => {
                    // Если фото не загрузилось, показываем placeholder
                    setUserPhoto(null)
                  }}
                />
              ) : (
                <div className="new-header__avatar-placeholder">
                  <FiUser size={20} />
                </div>
              )}
            </div>
          ) : (
            <FiUser size={20} />
          )}
          {isLoggedIn && hasIncompleteProfile && (
            <span className="new-header__profile-indicator" />
          )}
        </button>
        <button 
          type="button" 
          className="new-header__notification-btn"
          onClick={() => setIsNotificationOpen((prev) => !prev)}
          aria-expanded={isNotificationOpen}
        >
          <FiBell size={20} />
          <span className="new-header__notification-indicator" />
        </button>
        {isNotificationOpen && (
          <>
            <div 
              className="notification-backdrop"
              onClick={() => setIsNotificationOpen(false)}
            />
            <div className="notification-panel">
              <div className="notification-panel__content">
              <div className="notification-panel__header">
<h3 className="notification-panel__title">{t('notifications')}</h3>
                  <button 
                    type="button" 
                    className="notification-panel__close"
                    onClick={() => setIsNotificationOpen(false)}
                    aria-label={t('closeNotifications')}
                >
                  <FiX size={20} />
                </button>
              </div>
              <div className="notification-panel__list">
                {notificationsLoading ? (
<div style={{ padding: '20px', textAlign: 'center' }}>{t('loading')}</div>
                  ) : notifications.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>{t('noNotifications')}</div>
                ) : (
                  notifications.map((notification) => {
                    let notificationClass = 'notification-item--property';
                    if (notification.type === 'verification_success') {
                      notificationClass = 'notification-item--success';
                    } else if (notification.type === 'verification_rejected') {
                      notificationClass = 'notification-item--error';
                    } else if (notification.type === 'bid_outbid') {
                      notificationClass = 'notification-item--warning';
                    } else if (notification.type === 'test_drive_request') {
                      notificationClass = 'notification-item--warning';
                    } else if (notification.type === 'test_drive_result') {
                      notificationClass = 'notification-item--success';
                    }
                    
                    return (
                    <div 
                      key={notification.id} 
                      className={`notification-item ${notificationClass}`}
                      onClick={() => {
                        if (notification.type === 'test_drive_request') return
                        handleNotificationView(notification.id)
                      }}
                    >
                      <div className="notification-item__content">
                        <h4 className="notification-item__title">{notification.title}</h4>
                        {notification.message && (
                          <p className="notification-item__message">{notification.message}</p>
                        )}
                        {notification.type === 'test_drive_request' && notification.data?.booking_id ? (
                          <div
                            className="notification-item__test-drive-actions"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="notification-item__button notification-item__button--approve"
                              onClick={() => respondTestDriveRequest(notification, 'approve')}
                            >
                              Подтвердить
                            </button>
                            <button
                              type="button"
                              className="notification-item__button notification-item__button--reject"
                              onClick={() => respondTestDriveRequest(notification, 'reject')}
                            >
                              Отклонить
                            </button>
                          </div>
                        ) : notification.type === 'test_drive_result' && notification.data?.booking_id != null ? (
                          <div
                            className="notification-item__test-drive-actions"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="notification-item__button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setIsNotificationOpen(false)
                                handleNotificationView(notification.id)
                                const bid = notification.data.booking_id
                                navigate(`/profile/bookings${bid != null ? `?booking=${bid}` : ''}`)
                              }}
                            >
                              Перейти
                              <FiArrowRight size={18} />
                            </button>
                          </div>
                        ) : notification.data && notification.data.property_id ? (
                          <div className="notification-item__property">
                            <div className="notification-item__image">
                              <img loading="lazy" 
                                src={recommendedProperties[0]?.image || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=400&q=80'}
                                alt={recommendedProperties[0]?.name || 'Property'}
                                onError={(e) => {
                                  e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=400&q=80'
                                }}
                              />
                            </div>
                            <div className="notification-item__info">
                              <p className="notification-item__property-name">{recommendedProperties[0]?.name || 'Property'}</p>
                              <p className="notification-item__property-location">{recommendedProperties[0]?.location || 'Location'}</p>
                              <button 
                                type="button" 
                                className="notification-item__button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setIsNotificationOpen(false)
                                  handlePropertyClick('recommended', notification.data.property_id, false)
                                }}
                              >
                                Перейти
                                <FiArrowRight size={18} />
                              </button>
                            </div>
                          </div>
                        ) : null}
                        {!notification.data && (
                          <button 
                            type="button" 
                            className="notification-item__button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setIsNotificationOpen(false)
                            }}
                          >
                            Закрыть
                          </button>
                        )}
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          </>
        )}
          </>
        )}
        </div>
        </div>
      </header>

        <div className="hero-section__inner">
        <div className="hero-section__content">
          {/* Старый хедер для мобильной версии */}
          <header className="header">
            <div className="header__location">
              <span className="header__location-icon">
                <FiGlobe size={20} aria-hidden />
              </span>
              <div className="header__location-info" ref={languageDropdownMobileRef}>
                <span className="header__location-label">{t('headerLanguage')}</span>
                <button
                  type="button"
                  className="header__location-select"
                  onClick={() => setIsLanguageOpen((prev) => !prev)}
                  aria-haspopup="listbox"
                  aria-expanded={isLanguageOpen}
                  aria-label={t('selectLanguageAria')}
                >
                  <span className="header__location-value">{currentHeaderLanguage.name}</span>
                  <FiChevronDown
                    size={16}
                    className={`header__location-select-icon ${
                      isLanguageOpen ? 'header__location-select-icon--open' : ''
                    }`}
                  />
                </button>
                {isLanguageOpen && (
                  <div className="header__location-dropdown">
                    {UI_LANGUAGES.map((lang) => (
                      <button
                        type="button"
                        className={`header__location-option ${
                          lang.code === headerLangCode ? 'header__location-option--active' : ''
                        }`}
                        key={lang.code}
                        onClick={() => handleHeaderLanguageSelect(lang.code)}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="header__actions" ref={notificationRef}>
              <button 
                type="button" 
                className="header__action-btn"
                onClick={() => setIsNotificationOpen((prev) => !prev)}
                aria-expanded={isNotificationOpen}
              >
                <FiBell size={18} />
                <span className="header__action-indicator" />
              </button>
              {isNotificationOpen && (
                <>
                  <div 
                    className="notification-backdrop"
                    onClick={() => setIsNotificationOpen(false)}
                  />
                  <div className="notification-panel">
                    <div className="notification-panel__content">
                      <div className="notification-panel__header">
                        <h3 className="notification-panel__title">{t('notifications')}</h3>
                        <button 
                          type="button" 
                          className="notification-panel__close"
                          onClick={() => setIsNotificationOpen(false)}
                          aria-label={t('closeNotifications')}
                        >
                          <FiX size={20} />
                        </button>
                      </div>
                      <div className="notification-panel__list">
                        {notificationsLoading ? (
                          <div style={{ padding: '20px', textAlign: 'center' }}>{t('loading')}</div>
                        ) : notifications.length === 0 ? (
                          <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>{t('noNotifications')}</div>
                        ) : (
                          notifications.map((notification) => {
                            let notificationClass = 'notification-item--property';
                            if (notification.type === 'verification_success') {
                              notificationClass = 'notification-item--success';
                            } else if (notification.type === 'verification_rejected') {
                              notificationClass = 'notification-item--error';
                            } else if (notification.type === 'bid_outbid') {
                              notificationClass = 'notification-item--warning';
                            } else if (notification.type === 'test_drive_request') {
                              notificationClass = 'notification-item--warning';
                            } else if (notification.type === 'test_drive_result') {
                              notificationClass = 'notification-item--success';
                            }
                            
                            return (
                            <div 
                              key={notification.id} 
                              className={`notification-item ${notificationClass}`}
                              onClick={() => {
                                if (notification.type === 'test_drive_request') return
                                handleNotificationView(notification.id)
                              }}
                            >
                              <div className="notification-item__content">
                                <h4 className="notification-item__title">{notification.title}</h4>
                                {notification.message && (
                                  <p className="notification-item__message">{notification.message}</p>
                                )}
                                {notification.type === 'test_drive_request' && notification.data?.booking_id ? (
                                  <div
                                    className="notification-item__test-drive-actions"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      className="notification-item__button notification-item__button--approve"
                                      onClick={() => respondTestDriveRequest(notification, 'approve')}
                                    >
                                      Подтвердить
                                    </button>
                                    <button
                                      type="button"
                                      className="notification-item__button notification-item__button--reject"
                                      onClick={() => respondTestDriveRequest(notification, 'reject')}
                                    >
                                      Отклонить
                                    </button>
                                  </div>
                                ) : notification.type === 'test_drive_result' && notification.data?.booking_id != null ? (
                                  <div
                                    className="notification-item__test-drive-actions"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      className="notification-item__button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setIsNotificationOpen(false)
                                        handleNotificationView(notification.id)
                                        const bid = notification.data.booking_id
                                        navigate(`/profile/bookings${bid != null ? `?booking=${bid}` : ''}`)
                                      }}
                                    >
                                      {t('goTo')}
                                      <FiArrowRight size={18} />
                                    </button>
                                  </div>
                                ) : notification.data && notification.data.property_id ? (
                                  <div className="notification-item__property">
                                    <div className="notification-item__image">
                                      <img loading="lazy" 
                                        src={recommendedProperties[0]?.image || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=400&q=80'}
                                        alt={recommendedProperties[0]?.name || 'Property'}
                                        onError={(e) => {
                                          e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=400&q=80'
                                        }}
                                      />
                                    </div>
                                    <div className="notification-item__info">
                                      <p className="notification-item__property-name">{recommendedProperties[0]?.name || 'Property'}</p>
                                      <p className="notification-item__property-location">{recommendedProperties[0]?.location || 'Location'}</p>
                                      <button 
                                        type="button" 
                                        className="notification-item__button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setIsNotificationOpen(false)
                                          handlePropertyClick('recommended', notification.data.property_id, false)
                                        }}
                                      >
                                        {t('goTo')}
                                        <FiArrowRight size={18} />
                                      </button>
                                    </div>
                                  </div>
                                ) : null}
                                {!notification.data && (
                                  <button 
                                    type="button" 
                                    className="notification-item__button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setIsNotificationOpen(false)
                                    }}
                                  >
                                    {t('close')}
                                  </button>
                                )}
                              </div>
                            </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
              <button 
                type="button" 
                className={`header__action-btn ${isLoggedIn ? 'header__action-btn--avatar' : ''}`}
                onClick={() => {
                  // Всегда сначала проверяем локальные данные (роль, флаги)
                  const userData = getUserData()
                  const localRole = localStorage.getItem('userRole')
                  const storedRole = userData.role || localRole
                  const isOwnerFlag = localStorage.getItem('isOwnerLoggedIn') === 'true'
                  const isOwner =
                    storedRole === 'seller' ||
                    storedRole === 'owner' ||
                    isOwnerFlag

                  // Продавца ведем в кабинет продавца
                  if (isOwner) {
                    navigate('/owner')
                    return
                  }

                  // Дальше обычная логика профиля покупателя
                  if (userLoaded && user) {
                    navigate('/profile')
                  } else if (userData.isLoggedIn) {
                    navigate('/profile')
                  } else {
                    setIsLoginModalOpen(true)
                  }
                }}
                aria-label={t('profile')}
              >
                {isLoggedIn ? (
                  <div className="header__avatar-wrapper">
                    {userPhoto ? (
                      <img loading="lazy" 
                        src={userPhoto} 
                        alt="Profile" 
                        className="header__avatar-img"
                        onError={(e) => {
                          // Если фото не загрузилось, показываем placeholder
                          setUserPhoto(null)
                        }}
                      />
                    ) : (
                      <div className="header__avatar-placeholder">
                        <FiUser size={18} />
                      </div>
                    )}
                  </div>
                ) : (
                  <FiUser size={18} />
                )}
                {isLoggedIn && hasIncompleteProfile && (
                  <span className="header__profile-indicator" />
                )}
              </button>
            </div>
          </header>

          {/* Hero headline — Saleyourbrick */}
          <div className="hero-headline">
            <span className="hero-headline__accent" aria-hidden="true" />
            <p className="hero-headline__brand">Saleyourbrick</p>
            <h1 className="hero-headline__title">{t('heroTitle')}</h1>
            <p className="hero-headline__subtitle">
              {t('heroSubtitle')}
            </p>
            <a
              href="#landing-models"
              className="hero-headline__cta"
              onClick={(e) => {
                e.preventDefault()
                document.getElementById('landing-models')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              {t('heroCta')}
              <FiArrowRight size={18} aria-hidden="true" />
            </a>
          </div>
        </div>

          <section className="search">
            <div className="search__field">
              <FiSearch size={18} className="search__icon" />
              <input
                type="text"
                placeholder={t('searchPlaceholderLong')}
                className="search__input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  type="button"
                  className="search__clear"
                  onClick={() => setSearchQuery('')}
                  aria-label={t('clearSearch')}
                >
                  <FiX size={18} />
                </button>
              )}
              <button type="button" className="search__filter">
                <FiSliders size={18} />
              </button>
            </div>
          </section>

          {/* CTA-карточки справа на фото hero (glassmorphism + 3D tilt) */}
          <div className="hero-section__cta">
            <FrostedGlassCard
              variant="investor"
              title={t('becomeInvestor')}
              buttonText={t('startBtn')}
              onButtonClick={() => navigate('/auction')}
            >
              {t('investorCardText')}
            </FrostedGlassCard>
            <FrostedGlassCard
              variant="seller"
              title={t('becomeSeller')}
              buttonText={t('listProperty')}
              onButtonClick={() => navigate('/owner')}
            >
              {t('sellerCardText')}
            </FrostedGlassCard>
          </div>
        </div>
      </section>

      {/* Блок: 4 инвестиционные модели (3D-папки) */}
      <section id="landing-models" className="landing-models">
        <div className="landing-models__container">
          <h2 className="landing-models__title">
            {t('landingModelsTitle')}
          </h2>
          <p className="landing-models__subtitle">{t('landingModelsSubtitle')}</p>
          <div className="landing-models__grid landing-models__grid--folders">
            {landingFolderData.map((folder, idx) => (
              <AnimatedFolder
                key={folder.title}
                title={folder.title}
                projects={folder.projects}
                gradient={folder.gradient}
                linkLabel={folder.linkLabel}
                linkHref={folder.linkHref}
                className="landing-models__folder"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Блок подборки недвижимости */}
      <PropertySearchBlock />

      {/* Блок "Аукцион" — загрузка данных только когда секция во вьюпорте */}
      <section ref={mainSectionRef} className="apartments-section apartments-section--auction">
        <div className="apartments-section__container">
          <div 
            className="apartments-section__header"
            onClick={() => {
              window.location.href = '/auction?category=Apartment&filter=auction'
            }}
            style={{ cursor: 'pointer' }}
          >
          <h2 className="apartments-section__title">{t('auctionSectionTitle')}</h2>
            <FiArrowRight size={24} className="apartments-section__arrow" />
          </div>
          
          <div className="apartments-section__content">
            <div className="properties-grid">
              {auctionSection.map((apartment) => {
                const formatPrice = (price) => {
                  if (!price) return '$0'
                  if (price >= 1000000) {
                    return `$${(price / 1000000).toFixed(1)}M`
                  }
                  return `$${price.toLocaleString('en-US')}`
                }

                const hasTimer =
                  apartment.isAuction === true &&
                  apartment.endTime != null &&
                  apartment.endTime !== ''

                const currentBidValue =
                  apartment.currentBid != null
                    ? apartment.currentBid
                    : (apartment.auction_starting_price || apartment.price || 0)
                
                return (
                  <div key={apartment.id} className="property-card">
                    <div 
                      className="property-link"
                      onClick={() => {
                        handlePropertyClick('apartment', apartment.id, false, hasTimer, apartment)
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="property-image-container">
                        <img loading="lazy" 
                          src={apartment.image} 
                          alt={apartment.name}
                          className="property-image"
                        />
                        <button
                          type="button"
                          className={`property-favorite ${
                            isFavorite(apartment, 'apartment') ? 'active' : ''
                          }`}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleFavorite(apartment, 'apartment')
                          }}
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path 
                              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              fill={isFavorite(apartment, 'apartment') ? "currentColor" : "none"}
                            />
                          </svg>
                        </button>
                      </div>
                      <div className="property-content">
                        <div className="property-header-fixed">
                          {hasTimer && (
                            <PropertyTimer endTime={apartment.endTime} compact={true} />
                          )}
                          <h3 className="property-title">{apartment.name}</h3>
                          {apartment.description && (
                            <p className="property-description">{apartment.description}</p>
                          )}
                          <p className="property-location">{apartment.location}</p>
                        </div>
                        {/* Строка характеристик под блоком заголовка */}
                        <div className="property-specs">
                          {apartment.beds && (
                            <div className="spec-item">
                              <MdBed size={18} />
                              <span>{apartment.beds}</span>
                            </div>
                          )}
                          {apartment.baths && (
                            <div className="spec-item">
                              <MdOutlineBathtub size={18} />
                              <span>{apartment.baths}</span>
                            </div>
                          )}
                          {apartment.sqft && (
                            <div className="spec-item">
                              <BiArea size={18} />
                              <span>{apartment.sqft} {t('squareMeters')}</span>
                            </div>
                          )}
                        </div>
                        <div className="property-bid-info">
                          <span className="bid-label">{t('currentBid')}</span>
                          <span className="bid-value">
                            {formatPrice(currentBidValue)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Блок "Виллы" */}
      <section className="apartments-section apartments-section--main-cards">
        <div className="apartments-section__container">
          <div 
            className="apartments-section__header"
            onClick={() => {
              // Переход на страницу аукциона с фильтром "Купить сейчас"
              window.location.href = '/auction?category=Villa&filter=buy_now'
            }}
            style={{ cursor: 'pointer' }}
          >
            <h2 className="apartments-section__title">{t('buyNowSectionTitle')}</h2>
            <FiArrowRight size={24} className="apartments-section__arrow" />
          </div>
          
          <div className="apartments-section__content">
            <div className="properties-grid">
              {buyNowSection.map((villa) => {
                const formatPrice = (price) => {
                  if (!price) return '$0'
                  if (price >= 1000000) {
                    return `$${(price / 1000000).toFixed(1)}M`
                  }
                  return `$${price.toLocaleString('en-US')}`
                }

                return (
                  <div key={villa.id} className="property-card">
                    <div 
                      className="property-link"
                      onClick={() => {
                        handlePropertyClick('villa', villa.id, false, false, villa)
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="property-image-container">
                        <img loading="lazy" 
                          src={villa.image} 
                          alt={villa.name}
                          className="property-image"
                        />
                        <button
                          type="button"
                          className={`property-favorite ${
                            isFavorite(villa, 'villa') ? 'active' : ''
                          }`}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleFavorite(villa, 'villa')
                          }}
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path 
                              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              fill={isFavorite(villa, 'villa') ? "currentColor" : "none"}
                            />
                          </svg>
                        </button>
                      </div>
                      <div className="property-content">
                        <div className="property-header-fixed">
                          <h3 className="property-title">{villa.name}</h3>
                          {villa.description && (
                            <p className="property-description">{villa.description}</p>
                          )}
                          <p className="property-location">{villa.location}</p>
                        </div>
                        {/* Строка характеристик под блоком заголовка */}
                        <div className="property-specs">
                          {villa.beds && (
                            <div className="spec-item">
                              <MdBed size={18} />
                              <span>{villa.beds}</span>
                            </div>
                          )}
                          {villa.baths && (
                            <div className="spec-item">
                              <MdOutlineBathtub size={18} />
                              <span>{villa.baths}</span>
                            </div>
                          )}
                          {villa.sqft && (
                            <div className="spec-item">
                              <BiArea size={18} />
                              <span>{villa.sqft} {t('squareMeters')}</span>
                            </div>
                          )}
                        </div>
                        <div className="property-content-bottom">
                          <div className="property-price">{formatPrice(villa.price)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Блок "Квартиры" */}
      <section className="apartments-section apartments-section--main-cards">
        <div className="apartments-section__container">
          <div 
            className="apartments-section__header"
            onClick={() => {
              window.location.href = '/debts'
            }}
            style={{ cursor: 'pointer' }}
          >
            <h2 className="apartments-section__title">{t('debtsTitle')}</h2>
            <FiArrowRight size={24} className="apartments-section__arrow" />
          </div>
          
          <div className="apartments-section__content">
            <div className="properties-grid">
              {debtsSection.map((flat, index) => {
                const formatPrice = (price) => {
                  if (price >= 1000000) {
                    return `$${(price / 1000000).toFixed(1)}M`
                  }
                  return `$${price.toLocaleString('en-US')}`
                }
                
                return (
                  <div key={flat.id} className="property-card">
                    <div 
                      className="property-link"
                      onClick={() => {
                        const hasTimer = flat.isAuction === true && flat.endTime != null && flat.endTime !== ''
                        handlePropertyClick('debt', flat.id, false, hasTimer, flat)
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="property-image-container">
                        <img loading="lazy" 
                          src={flat.image || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'} 
                          alt={flat.name}
                          className="property-image"
                        />
                        <button
                          type="button"
                          className={`property-favorite ${
                            isFavorite(flat, 'flat') ? 'active' : ''
                          }`}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleFavorite(flat, 'flat')
                          }}
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path 
                              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              fill={isFavorite(flat, 'flat') ? "currentColor" : "none"}
                            />
                          </svg>
                        </button>
                      </div>
                      <div className="property-content">
                        <div className="property-header-fixed">
                          {flat.isAuction === true && flat.endTime != null && flat.endTime !== '' && (
                            <PropertyTimer endTime={flat.endTime} compact={true} />
                          )}
                          <h3 className="property-title">{flat.name}</h3>
                          {flat.description && (
                            <p className="property-description">{flat.description}</p>
                          )}
                          <p className="property-location">{flat.location}</p>
                        </div>
                        {/* Строка характеристик под блоком заголовка */}
                        <div className="property-specs">
                          {flat.beds && (
                            <div className="spec-item">
                              <MdBed size={18} />
                              <span>{flat.beds}</span>
                            </div>
                          )}
                          {flat.baths && (
                            <div className="spec-item">
                              <MdOutlineBathtub size={18} />
                              <span>{flat.baths}</span>
                            </div>
                          )}
                          {flat.sqft && (
                            <div className="spec-item">
                              <BiArea size={18} />
                              <span>{flat.sqft} {t('squareMeters')}</span>
                            </div>
                          )}
                        </div>
                        <div className="property-bid-info" style={{ display: 'grid', gap: 6 }}>
                          {flat.debt_amount != null && flat.debt_amount !== '' && !Number.isNaN(Number(flat.debt_amount)) && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                              <span className="bid-label">{t('debtsDebtAmount')}</span>
                              <span className="bid-value">{formatPrice(Number(flat.debt_amount))}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                            <span className="bid-label">{t('currentBid')}</span>
                            <span className="bid-value">
                              {formatPrice(flat.currentBid != null ? Number(flat.currentBid) : (flat.auction_starting_price || flat.price || 0))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Блок "Дома" */}
      <section className="apartments-section apartments-section--main-cards">
        <div className="apartments-section__container">
          <div 
            className="apartments-section__header"
            onClick={() => {
              // Для долевых объектов ведём на страницу всех долей
              navigate('/shares')
            }}
            style={{ cursor: 'pointer' }}
          >
            <h2 className="apartments-section__title">{t('fractionalSaleTitle')}</h2>
            <FiArrowRight size={24} className="apartments-section__arrow" />
          </div>
          
          <div className="apartments-section__content">
            <div className="properties-grid">
              {sharesSection.map((townhouse, index) => {
                const formatPrice = (price) => {
                  if (price >= 1000000) {
                    return `$${(price / 1000000).toFixed(1)}M`
                  }
                  return `$${price.toLocaleString('en-US')}`
                }
                
                return (
                  <div key={townhouse.id} className="property-card">
                    <div 
                      className="property-link"
                      onClick={() => {
                        // Для долевых объектов открываем специальную страницу долей
                        const propertyType = townhouse.property_type || townhouse.propertyType || 'apartment'
                        const shareId = `${propertyType}-${townhouse.id}`
                        navigate(`/shares/${shareId}`)
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="property-image-container">
                        <img loading="lazy" 
                          src={townhouse.image} 
                          alt={townhouse.name}
                          className="property-image"
                        />
                        <button
                          type="button"
                          className={`property-favorite ${
                            isFavorite(townhouse, 'townhouse') ? 'active' : ''
                          }`}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleFavorite(townhouse, 'townhouse')
                          }}
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path 
                              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              fill={isFavorite(townhouse, 'townhouse') ? "currentColor" : "none"}
                            />
                          </svg>
                        </button>
                      </div>
                      <div className="property-content">
                        {index % 2 === 1 && townhouse.isAuction && townhouse.endTime && (
                          <PropertyTimer endTime={townhouse.endTime} compact={true} />
                        )}
                        <h3 className="property-title">{townhouse.name}</h3>
                        {!(index % 2 === 1 && townhouse.isAuction && townhouse.endTime) && townhouse.description && (
                          <p className="property-description">{townhouse.description}</p>
                        )}
                        <p className="property-location">{townhouse.location}</p>
                        {index % 2 === 1 && townhouse.isAuction && townhouse.endTime ? (
                          townhouse.currentBid && (
                            <div className="property-bid-info">
                              <span className="bid-label">{t('currentBid')}</span>
                              <span className="bid-value">{formatPrice(townhouse.currentBid)}</span>
                            </div>
                          )
                        ) : (
                          <>
                            <div className="property-specs">
                            {townhouse.beds && (
                              <div className="spec-item">
                                <MdBed size={18} />
                                <span>{townhouse.beds}</span>
                              </div>
                            )}
                            {townhouse.baths && (
                              <div className="spec-item">
                                <MdOutlineBathtub size={18} />
                                <span>{townhouse.baths}</span>
                              </div>
                            )}
                            {townhouse.sqft && (
                              <div className="spec-item">
                                <BiArea size={18} />
                                <span>{townhouse.sqft} {t('squareMeters')}</span>
                              </div>
                            )}
                            </div>
                            <div className="property-price">{formatPrice(townhouse.price)}</div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Блок: Цифры Sally Your Brick — 70vh, анимация берюза → белый треугольник при скролле */}
      <section
        ref={landingStatsRef}
        className="landing-stats"
        style={{ '--stats-scroll-progress': statsScrollProgress }}
      >
        <div className="landing-stats__bg-teal" aria-hidden="true" />
        <div className="landing-stats__bg-white-triangle" aria-hidden="true" />
        <div className="landing-stats__container">
          <h2 className="landing-stats__title">{t('statsTitle')}</h2>
          <div className="landing-stats__grid">
            <div className="landing-stat">
              <span className="landing-stat__value">€1.4B+</span>
              <span className="landing-stat__label">{t('statLabel1')}</span>
            </div>
            <div className="landing-stat">
              <span className="landing-stat__value">12–25%</span>
              <span className="landing-stat__label">{t('statLabel2')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Форма обратной связи */}
      <section className="contact-form-section">
        <div className="contact-form-container">
          <div className="contact-form-wrapper">
            <div className="contact-form__image-wrapper">
              <div className="contact-form__visual-card" aria-labelledby="contact-visual-title">
                <h2 id="contact-visual-title" className="contact-form__image-title">
                  {t('haveQuestions')}
                </h2>
                <p className="contact-form__image-subtitle">{t('haveQuestionsSubtitle')}</p>
                <div className="contact-form__image">
                  <img
                    loading="lazy"
                    src="https://static.cdn-cian.ru/frontend/valuation-my-home-page-frontend/card_6_1.9222208e0e2f6d4d.svg"
                    alt=""
                  />
                </div>
              </div>
            </div>
            <form className="contact-form" onSubmit={handleContactFormSubmit}>
            <div className="contact-form__header">
              <h2 className="contact-form__title">
                <span className="contact-form__title-accent">{t('writeToUs')}</span>
                <FiArrowRight className="contact-form__arrow" size={24} />
              </h2>
            </div>
            <div className="contact-form__row">
              <div className="contact-form__field">
                <label htmlFor="email-contact" className="contact-form__label">
                  {t('emailLabel')}
                </label>
                <input
                  type="email"
                  id="email-contact"
                  name="email"
                  value={contactForm.email}
                  onChange={handleContactFormChange}
                  className="contact-form__input"
                  placeholder={t('emailPlaceholder')}
                  required
                />
              </div>
              <div className="contact-form__field">
                <label htmlFor="fullName-contact" className="contact-form__label">
                  {t('fullName')}
                </label>
                <input
                  type="text"
                  id="fullName-contact"
                  name="fullName"
                  value={contactForm.fullName}
                  onChange={handleContactFormChange}
                  className="contact-form__input"
                  placeholder={t('fullNamePlaceholder')}
                  required
                />
              </div>
            </div>
            <div className="contact-form__field">
              <label htmlFor="message-contact" className="contact-form__label">
                {t('questionDescription')}
              </label>
              <textarea
                id="message-contact"
                name="message"
                value={contactForm.message}
                onChange={handleContactFormChange}
                className="contact-form__textarea"
                  placeholder={t('questionPlaceholder')}
                rows="5"
                required
              />
            </div>
            <button type="submit" className="contact-form__submit">
              <span>{t('send')}</span>
              <FiArrowRight size={18} />
            </button>
          </form>
          </div>
        </div>
      </section>

      <div className="app__content">
      {isLoading && (
        <div className="loader-overlay">
          <div className="loader">
            <div className="loader__circle loader__circle--1"></div>
            <div className="loader__circle loader__circle--2"></div>
          </div>
        </div>
      )}
      <nav className="categories">
        {getPropertyTypes.map((type) => {
          const IconComponent = type.icon
          const isActive = activeCategory === type.label
          return (
            <button
              type="button"
              className={`categories__item ${isActive ? 'categories__item--active' : ''}`}
              key={`${type.label}-${i18n.language}`}
              onClick={() => handleCategoryClick(type.label)}
            >
              <span className="categories__icon">
                {type.image ? (
                  <img loading="lazy" 
                    src={type.image} 
                    alt={type.displayLabel}
                    className="categories__icon-image"
                  />
                ) : (
                  <IconComponent size={28} />
                )}
              </span>
              <span className="categories__label">{type.displayLabel}</span>
            </button>
          )
        })}
      </nav>

      <section className="section section--recommended">
        <div className="section__header">
          <h2 className="section__title">{t('recommended')} {t('propertyWord')}</h2>
        </div>

        <div className="properties-grid">
          {(filteredProperties?.recommended || filteredRecommended).map((property, index) => {
            const formatPrice = (price) => {
              if (price >= 1000000) {
                return `$${(price / 1000000).toFixed(1)}M`
              }
              return `$${price.toLocaleString('en-US')}`
            }
            
            return (
              <div key={property.id} className="property-card">
                <div 
                  className="property-link"
                  onClick={() => {
                    // hasTimer определяется только по данным объекта, не зависит от индекса
                    const hasTimer = property.isAuction === true && property.endTime != null && property.endTime !== ''
                    // showTimer используется только для визуального отображения таймера
                    const showTimer = index % 2 === 1 && hasTimer
                    handlePropertyClick('recommended', property.id, !showTimer, hasTimer, property)
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="property-image-container">
                    <img loading="lazy" 
                      src={property.image} 
                      alt={property.name}
                      className="property-image"
                    />
                    <button
                      type="button"
                      className={`property-favorite ${
                        isFavorite(property, 'recommended') ? 'active' : ''
                      }`}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleFavorite(property, 'recommended')
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path 
                          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          fill={isFavorite(property, 'recommended') ? "currentColor" : "none"}
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="property-content">
                    {index % 2 === 1 && property.isAuction && property.endTime && (
                      <PropertyTimer endTime={property.endTime} compact={true} />
                    )}
                    <h3 className="property-title">{property.name}</h3>
                    <p className="property-location">{property.location}</p>
                    {index % 2 === 1 && property.isAuction && property.endTime ? (
                      property.currentBid && (
                        <div className="property-bid-info">
                          <span className="bid-label">{t('currentBid')}</span>
                          <span className="bid-value">{formatPrice(property.currentBid)}</span>
                        </div>
                      )
                    ) : (
                      <>
                        <div className="property-price">{formatPrice(propertyMode === 'rent' ? property.price : property.price * 240)}</div>
                        <div className="property-specs">
                          {property.beds && (
                            <div className="spec-item">
                              <MdBed size={18} />
                              <span>{property.beds}</span>
                            </div>
                          )}
                          {property.baths && (
                            <div className="spec-item">
                              <MdOutlineBathtub size={18} />
                              <span>{property.baths}</span>
                            </div>
                          )}
                          {property.sqft && (
                            <div className="spec-item">
                              <BiArea size={18} />
                              <span>{property.sqft} {t('squareMeters')}</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="section section--spaced">
        <div className="section__header">
          <h2 className="section__title">{t('nearby')} {t('propertyWord')}</h2>
        </div>

        <div className="properties-grid">
          {(filteredProperties?.nearby || filteredNearby).map((property, index) => {
            const formatPrice = (price) => {
              if (price >= 1000000) {
                return `$${(price / 1000000).toFixed(1)}M`
              }
              return `$${price.toLocaleString('en-US')}`
            }
            
            return (
              <div key={property.id} className="property-card">
                <div 
                  className="property-link"
                  onClick={() => {
                    // hasTimer определяется только по данным объекта, не зависит от индекса
                    const hasTimer = property.isAuction === true && property.endTime != null && property.endTime !== ''
                    // showTimer используется только для визуального отображения таймера
                    const showTimer = index % 2 === 1 && hasTimer
                    handlePropertyClick('nearby', property.id, !showTimer, hasTimer, property)
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="property-image-container">
                    <img loading="lazy" 
                      src={property.image} 
                      alt={property.name}
                      className="property-image"
                    />
                    <button
                      type="button"
                      className={`property-favorite ${
                        isFavorite(property, 'nearby') ? 'active' : ''
                      }`}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleFavorite(property, 'nearby')
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path 
                          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          fill={isFavorite(property, 'nearby') ? "currentColor" : "none"}
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="property-content">
                    {index % 2 === 1 && property.isAuction && property.endTime && (
                      <PropertyTimer endTime={property.endTime} compact={true} />
                    )}
                    <h3 className="property-title">{property.name}</h3>
                    {!(index % 2 === 1 && property.isAuction && property.endTime) && property.description && (
                      <p className="property-description">{property.description}</p>
                    )}
                    <p className="property-location">{property.location}</p>
                    {index % 2 === 1 && property.isAuction && property.endTime ? (
                      property.currentBid && (
                        <div className="property-bid-info">
                          <span className="bid-label">{t('currentBid')}</span>
                          <span className="bid-value">{formatPrice(property.currentBid)}</span>
                        </div>
                      )
                    ) : (
                      <>
                        <div className="property-price">{formatPrice(propertyMode === 'rent' ? property.price : property.price * 240)}</div>
                        <div className="property-specs">
                          {property.beds && (
                            <div className="spec-item">
                              <MdBed size={18} />
                              <span>{property.beds}</span>
                            </div>
                          )}
                          {property.baths && (
                            <div className="spec-item">
                              <MdOutlineBathtub size={18} />
                              <span>{property.baths}</span>
                            </div>
                          )}
                          {property.sqft && (
                            <div className="spec-item">
                              <BiArea size={18} />
                              <span>{property.sqft} {t('squareMeters')}</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>
      </div>

      <nav className="bottom-nav">
        {navigationItems.map((item, index) => {
          const IconComponent = item.icon
          const isCenter = index === 2
          const getRoute = (id) => {
            if (id === 'home') return '/'
            if (id === 'favourite') return '/favorites'
            if (id === 'auction') return '/auction'
            if (id === 'chat') return '/chat?manager=1'
            if (id === 'profile') return '/profile'
            return '/'
          }
          const route = getRoute(item.id)
          const routePath = route.split('?')[0]
          const isActive = location.pathname === routePath

          if (isCenter) {
            return (
              <button
                type="button"
                className={`bottom-nav__center ${isActive ? 'bottom-nav__center--active' : ''}`}
                key={`${item.id}-${i18n.language}`}
                onClick={() => navigate(route)}
                aria-label={item.label}
              >
                <IconComponent size={28} />
              </button>
            )
          }

          return (
            <button
              type="button"
              className={`bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
              key={`${item.id}-${i18n.language}`}
              onClick={() => navigate(route)}
              aria-label={item.label}
            >
              <IconComponent size={26} />
            </button>
          )
        })}
      </nav>

      <div
        className={`ai-assistant-dock${aiAssistantHiddenByFooter ? ' ai-assistant-dock--footer-near' : ''}`}
        aria-hidden={aiAssistantHiddenByFooter}
      >
      <button
        type="button"
        className="ai-button"
        onClick={toggleChat}
        aria-label="AI Assistant"
        aria-expanded={isChatOpen}
      >
        AI
      </button>

      {isChatOpen && (
        <div className="chat-widget">
          <div className="chat-widget__header">
            <div className="chat-widget__header-info">
              <div className="chat-widget__avatar">AI</div>
              <div className="chat-widget__header-text">
                <h3 className="chat-widget__title">{t('chatTitle')}</h3>
                <span className="chat-widget__status">{t('chatOnline')}</span>
              </div>
            </div>
            <button
              type="button"
              className="chat-widget__close"
              onClick={toggleChat}
              aria-label={t('closeChat')}
            >
              <FiX size={20} />
            </button>
          </div>

          <div className="chat-widget__messages" ref={chatMessagesRef}>
            {chatMessages.map((message, idx) => (
              <div
                key={message.id}
                ref={idx === chatMessages.length - 1 ? lastMessageRef : null}
                className={`chat-widget__message ${
                  message.sender === 'user'
                    ? 'chat-widget__message--user'
                    : 'chat-widget__message--bot'
                }`}
              >
                <div className="chat-widget__message-content">
                  {message.text}
                  {message.recommendations && message.recommendations.length > 0 && (
                    <div className="chat-widget__recommendations">
                      <div className="chat-widget__recommendations-title">{t('chatRecommendationsTitle')}</div>
                      {message.recommendations.map((recId) => {
                        const property = allProperties.find(p => p.id === recId)
                        if (!property) return null
                        const propertyName = property.name || property.title || t('listingDefault')
                        const propertyPrice = property.price ? `${property.price.toLocaleString('ru-RU')} €` : t('priceNotSpecified')
                        const propertyArea = property.area || property.sqft
                        const propertyRooms = property.rooms || property.beds
                        
                        return (
                          <a
                            key={recId}
                            href={`/property/${recId}`}
                            className="chat-widget__recommendation-link"
                            onClick={(e) => {
                              e.preventDefault()
                              navigate(`/property/${recId}`, { 
                                state: { property: property }
                              })
                              setIsChatOpen(false)
                            }}
                          >
                            <div className="chat-widget__recommendation-item">
                              <div className="chat-widget__recommendation-title">{propertyName}</div>
                              <div className="chat-widget__recommendation-location">{property.location}</div>
                              <div className="chat-widget__recommendation-details">
                                {propertyRooms && <span>{t('roomCount', { count: propertyRooms })}</span>}
                                {propertyArea && <span>{propertyArea} {t('squareMeters')}</span>}
                              </div>
                              <div className="chat-widget__recommendation-price">{propertyPrice}</div>
                            </div>
                          </a>
                        )
                      })}
                    </div>
                  )}
                </div>
                {message.buttons && message.buttons.length > 0 && (
                  <div
                    className={`chat-widget__buttons${
                      message.buttons.some((b) => typeof b === 'object' && b?.type === 'contact_pref')
                        ? ' chat-widget__buttons--contact'
                        : ''
                    }`}
                  >
                    {message.buttons.map((button, index) => {
                      if (typeof button === 'object' && button?.type === 'contact_pref') {
                        const IconCmp =
                          button.value === 'phone'
                            ? FiPhone
                            : button.value === 'email'
                              ? FiMail
                              : button.value === 'whatsapp'
                                ? FaWhatsapp
                                : button.value === 'telegram'
                                  ? FaTelegram
                                  : FiMessageCircle
                        return (
                          <button
                            key={index}
                            type="button"
                            className="chat-widget__button chat-widget__button--contact"
                            onClick={() =>
                              !isLoadingAI && handleButtonClick(null, { contactPref: button.value })
                            }
                            disabled={isLoadingAI}
                          >
                            <IconCmp size={18} aria-hidden />
                            <span>{button.label}</span>
                          </button>
                        )
                      }
                      return (
                        <button
                          key={index}
                          className="chat-widget__button"
                          onClick={() => !isLoadingAI && handleButtonClick(button)}
                          disabled={isLoadingAI}
                        >
                          {button}
                        </button>
                      )
                    })}
                  </div>
                )}
                <div className="chat-widget__message-time">
                  {message.timestamp.toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))}
            {isLoadingAI && (
              <div className="chat-widget__message chat-widget__message--bot">
                <div className="chat-widget__message-content">
                  <div className="chat-widget__typing">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  {isSlowAIResponse && (
                    <div className="chat-widget__slow-hint">{t('chatSlowHint')}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <form className="chat-widget__input-form" onSubmit={handleChatSubmit}>
            <input
              type="text"
              className="chat-widget__input"
              placeholder={
                isLoadingAI ? t('aiThinking') : t('chatPlaceholder')
              }
              value={chatInput}
              onChange={handleChatInputChange}
              disabled={isLoadingAI}
              autoFocus
            />
            <button
              type="submit"
              className="chat-widget__send"
              aria-label={t('sendMessage')}
              disabled={isLoadingAI}
            >
              <FiSend size={18} />
            </button>
          </form>
        </div>
      )}
      </div>

      {/* Модальное окно успешной верификации */}
      {showVerificationSuccess && verificationNotification && (
        <VerificationSuccessNotification
          notification={verificationNotification}
          onClose={handleVerificationClose}
          onView={handleNotificationView}
        />
      )}

      {/* Модальное окно входа/регистрации */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </div>
  )
}

export default MainPage
