import { useEffect, useRef, useState, useMemo, useCallback, Suspense } from 'react'
import * as THREE from 'three'
import { useManagerLiveChat } from '../hooks/useManagerLiveChat'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { publicAsset } from '../utils/publicAsset'
import { CO_INVESTMENT_PATH } from '../utils/sectionRoutes'
import './MainPage.css'
import {
  FiSearch,
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
import HeaderPinnedCatalogNav from '../components/HeaderPinnedCatalogNav'
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
import {
  PiHouseLine,
  PiBuildings,
  PiBuildingApartment,
  PiBuilding,
  PiWarehouse,
} from 'react-icons/pi'
import { FrostedGlassCard } from '../components/ui/interactive-frosted-glass-card'
import SybLandingSearchBar from '../components/SybLandingSearchBar'
import { ScrollReveal, ScrollRevealItem, ScrollRevealStagger } from '../components/ScrollReveal'
import { showToast } from '../components/ToastContainer'
import { showNotification } from '../utils/toastHelper'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import LoginModal from '../components/LoginModal'
import HeroRolePitchModal from '../components/HeroRolePitchModal'
import { askPropertyAssistant, detectManagerContactIntent, filterPropertiesByLocation } from '../services/aiService'
import { getUserData, clearUserData, isAuthenticated } from '../services/authService'
import {
  getCabinetDataPath,
  getCabinetHomePath,
  getCabinetProfilePath,
  isSellerCabinetRole,
} from '../utils/cabinetRoutes'
import { syncAssistantLead } from '../services/assistantLeadService'
import {
  isSoftLaunchFeatureBlocked,
  isSoftLaunchHrefBlocked,
} from '../utils/softLaunchAccess'
import { getManagerContactButtons } from '../services/liveChatApi'
import { NotificationsBell } from '../context/SiteNotificationsContext'
import SiteNavDrawer from '../components/SiteNavDrawer'
import CookieConsentDrawer, {
  COOKIE_CONSENT_ENABLED,
  readCookieConsentChoice,
} from '../components/CookieConsentDrawer'
import { setSiteNavDrawerOpen } from '../utils/siteNavDrawerDocumentFlag'
import { fetchUserById } from '../utils/usersApi'

import { getApiBaseUrl, getApiBaseUrlSync } from '../utils/apiConfig'
import { normalizePropertyMediaFields, getPropertyCardImage } from '../utils/propertyImage'
import { navigateToWallet } from '../utils/walletNavigation'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import { useLayoutScrollRef } from '../context/LayoutScrollContext'
import { UI_LANGUAGES } from '../constants/uiLanguages'
import { isAuctionListingEnded } from '../utils/auctionReminderBounds'
import { buildAuctionFilterPath, legacyCategoryToSlug } from '../utils/auctionFilterUrl'
import { auctionListingDedupeKey, getPropertyDetailPath, PROPERTY_DETAIL_AUCTION_TAB_BIDS, buildPropertyDetailNavigation } from '../utils/propertyDetailUrl'
import { fetchAuctionMaxBidsBatch, getMaxBidForProperty } from '../utils/fetchAuctionMaxBids'
import { resolvePropertySourceTable } from '../utils/propertySourceTable'
import { hasBuyNowOption } from '../utils/hasBuyNowOption'
import { lazyWithRetry } from '../utils/lazyWithRetry'
import { MainPageDeferredContext } from './mainPageDeferredContext'
import { MainPageSuspenseFallback } from '../components/MainPageSuspenseFallback'
import HomeSaleFormats from '../components/HomeSaleFormats'

const MainPageBelowFoldLazy = lazyWithRetry(() => import('./MainPageBelowFold'))

/** Фон hero-секции (вилла в public/images/external) */
const HERO_BACKGROUND_URL = publicAsset('images/external/shares-hero-villa.jpg')
const LANDING_MODELS_RIBBON_IMAGE = publicAsset('images/sellyourbrick/landing-models-ribbon.png')

// Используем синхронную версию для инициализации, затем обновим при загрузке
let API_BASE_URL = getApiBaseUrlSync()

const LISTING_IMAGE_FALLBACK =
  '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg'

const premiumStats = [
  { value: '4', label: 'стратегии', text: 'аукцион, фиксированная цена, доли и долги' },
  { value: '€1.4B+', label: 'активов', text: 'в объектной, долговой и инвестиционной витрине' },
  { value: '34%', label: 'быстрее', text: 'путь от интереса к квалифицированному решению' },
]

const premiumModes = [
  {
    id: 'auction',
    number: '01',
    eyebrow: 'Аукцион',
    benefit: 'Поймайте цену ниже рынка',
    proof: 'Прозрачные ставки и понятный финал торгов',
    title: 'Аукцион показывает реальный спрос',
    text: 'Подходит объектам, где важно создать конкуренцию покупателей и получить рыночную цену без хаоса в переговорах.',
    caption: 'Для продавца: управляемые торги. Для покупателя: прозрачная история ставок.',
    actionText: 'Показать аукционы',
    to: '/auction?filter=auction',
    anchorId: 'strategy-auction',
    objectsId: 'objects-auction',
    image: '/images/home-sale-formats/summer-2026/sale-format-auction-summer.webp',
    imageAlt: 'Современный европейский дом для продажи на аукционе',
    Icon: FaGavel,
  },
  {
    id: 'buy-now',
    number: '02',
    eyebrow: 'Купить сейчас',
    benefit: 'Заберите подходящий объект без ожидания',
    proof: 'Фиксированная цена и быстрый путь к сделке',
    title: 'Купить сейчас закрывает сделку быстрее',
    text: 'Формат для понятных активов с фиксированной ценой: покупатель не ждет финала торгов, продавец быстрее получает решение.',
    caption: 'Для тех, кто уже готов к сделке и хочет убрать лишние шаги.',
    actionText: 'Показать объекты',
    to: '/auction?filter=buy_now',
    anchorId: 'strategy-buy-now',
    objectsId: 'objects-buy-now',
    image: '/images/home-sale-formats/summer-2026/sale-format-buy-now-summer.webp',
    imageAlt: 'Светлая готовая вилла для быстрой покупки',
    Icon: FaBolt,
  },
  {
    id: 'shares',
    number: '03',
    eyebrow: 'Доли',
    benefit: 'Начните с меньшего капитала',
    proof: 'Доля в реальном объекте и доход пропорционально участию',
    title: 'Доли открывают вход с меньшим чеком',
    text: 'Инвестор может собрать портфель из долей в проверенных объектах, а собственник получает новый способ монетизации.',
    caption: 'Четкая структура доли, объекта, доходности и выхода.',
    actionText: 'Показать доли',
    to: '/shares',
    anchorId: 'strategy-shares',
    objectsId: 'objects-shares',
    image: '/images/home-sale-formats/summer-2026/sale-format-shares-summer.webp',
    imageAlt: 'Премиальный доходный объект для долевого участия',
    Icon: FaGem,
  },
  {
    id: 'debts',
    number: '04',
    eyebrow: 'Долги',
    benefit: 'Используйте дисконт за сложность',
    proof: 'Риск-профиль и условия известны до решения',
    title: 'Долги превращают сложность в стратегию',
    text: 'Долговые активы требуют отдельной логики: дисконт, документы, риск-профиль и сценарий выхода видны до решения.',
    caption: 'Для инвесторов, которые умеют работать с асимметрией цены и риска.',
    actionText: 'Показать долги',
    to: '/debts',
    anchorId: 'strategy-debts',
    objectsId: 'objects-debts',
    image: '/images/home-sale-formats/summer-2026/sale-format-debts-summer.webp',
    imageAlt: 'Недвижимость с инвестиционным потенциалом долгового актива',
    Icon: FiPieChart,
  },
]

const premiumFlow = [
  ['01', 'Собираем объект', 'фото, параметры, документы, ограничения и целевой сценарий продажи'],
  ['02', 'Упаковываем спрос', 'позиционирование, витрина, торги, buy now или доли'],
  ['03', 'Ведем сделку', 'чат, уведомления, депозит, история ставок и безопасное закрытие'],
]

const premiumProof = [
  'Юридический контур сделки виден до решения',
  'AI-консультант помогает сузить выбор без давления',
  'Продавец и инвестор работают в одном интерфейсе',
  'Каждый объект можно открыть как инвестиционный сценарий',
]

function TiffanyThreeScene() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    let renderer
    let frameId = null
    let resizeObserver = null

    try {
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
      camera.position.set(0, 0.1, 7.4)

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.12
      renderer.domElement.setAttribute('aria-hidden', 'true')
      mount.appendChild(renderer.domElement)

      const group = new THREE.Group()
      scene.add(group)

      const ambient = new THREE.HemisphereLight(0xf4fffd, 0x063433, 1.8)
      const key = new THREE.PointLight(0x78fff3, 7.5, 18)
      key.position.set(3.8, 4.2, 4.8)
      const rim = new THREE.PointLight(0xffffff, 4.5, 14)
      rim.position.set(-4.8, -1.6, 3.6)
      scene.add(ambient, key, rim)

      const glassMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x9ef8ef,
        metalness: 0,
        roughness: 0.08,
        transmission: 0.58,
        thickness: 1.18,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        transparent: true,
        opacity: 0.72,
        iridescence: 0.32,
        iridescenceIOR: 1.35,
      })
      const deepMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x0099A9,
        metalness: 0.1,
        roughness: 0.18,
        clearcoat: 0.8,
        transparent: true,
        opacity: 0.82,
      })
      const lineMaterial = new THREE.MeshBasicMaterial({
        color: 0xd9fffb,
        transparent: true,
        opacity: 0.44,
      })

      const heroSphere = new THREE.Mesh(new THREE.IcosahedronGeometry(1.46, 5), glassMaterial)
      heroSphere.position.set(-0.72, 0.2, 0)
      const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.76, 0.1, 180, 18), deepMaterial)
      knot.position.set(1.36, -0.34, -0.32)
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.92, 0.012, 16, 164), lineMaterial)
      ring.rotation.set(1.16, 0.2, -0.42)
      const smallOne = new THREE.Mesh(new THREE.SphereGeometry(0.28, 48, 32), glassMaterial)
      smallOne.position.set(1.9, 1.05, 0.1)
      const smallTwo = new THREE.Mesh(new THREE.SphereGeometry(0.2, 40, 24), deepMaterial)
      smallTwo.position.set(-2.02, -1.08, 0.2)
      group.add(heroSphere, knot, ring, smallOne, smallTwo)

      const particleGeometry = new THREE.BufferGeometry()
      const particleCount = 130
      const positions = new Float32Array(particleCount * 3)
      for (let i = 0; i < particleCount; i += 1) {
        const radius = 2.2 + Math.random() * 2.7
        const angle = Math.random() * Math.PI * 2
        positions[i * 3] = Math.cos(angle) * radius
        positions[i * 3 + 1] = (Math.random() - 0.5) * 3.1
        positions[i * 3 + 2] = Math.sin(angle) * radius - 1.3
      }
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const particles = new THREE.Points(
        particleGeometry,
        new THREE.PointsMaterial({
          color: 0xc7fffa,
          size: 0.025,
          transparent: true,
          opacity: 0.52,
          depthWrite: false,
        }),
      )
      scene.add(particles)

      const pointer = { x: 0, y: 0 }
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const clock = new THREE.Clock()

      const resize = () => {
        const rect = mount.getBoundingClientRect()
        const width = Math.max(1, Math.floor(rect.width))
        const height = Math.max(1, Math.floor(rect.height))
        renderer.setSize(width, height, false)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
      }

      const onPointerMove = (event) => {
        const rect = mount.getBoundingClientRect()
        pointer.x = ((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2
        pointer.y = ((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2
      }

      const animate = () => {
        const time = clock.getElapsedTime()
        const speed = reducedMotion ? 0.16 : 1
        group.rotation.y = time * 0.18 * speed + pointer.x * 0.16
        group.rotation.x = Math.sin(time * 0.42) * 0.08 - pointer.y * 0.08
        heroSphere.rotation.z = time * 0.12 * speed
        knot.rotation.x = time * 0.28 * speed
        knot.rotation.y = time * 0.36 * speed
        ring.rotation.z = time * 0.08 * speed
        particles.rotation.y = time * 0.028 * speed
        camera.position.x += (pointer.x * 0.18 - camera.position.x) * 0.035
        camera.position.y += (-pointer.y * 0.12 + 0.1 - camera.position.y) * 0.035
        camera.lookAt(0, 0, 0)
        renderer.render(scene, camera)
        frameId = requestAnimationFrame(animate)
      }

      resize()
      resizeObserver = new ResizeObserver(resize)
      resizeObserver.observe(mount)
      mount.addEventListener('pointermove', onPointerMove)
      animate()

      return () => {
        if (frameId) cancelAnimationFrame(frameId)
        mount.removeEventListener('pointermove', onPointerMove)
        if (resizeObserver) resizeObserver.disconnect()
        scene.traverse((object) => {
          if (object.geometry) object.geometry.dispose()
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose())
            } else {
              object.material.dispose()
            }
          }
        })
        renderer.dispose()
        if (renderer.domElement.parentNode === mount) {
          mount.removeChild(renderer.domElement)
        }
      }
    } catch (error) {
      console.warn('Premium hero 3D scene disabled:', error)
      if (renderer?.domElement?.parentNode === mount) {
        mount.removeChild(renderer.domElement)
      }
      return undefined
    }
  }, [])

  return <div className="premium-hero__canvas" ref={mountRef} aria-hidden="true" />
}

function asFiniteNumberOrNull(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const recommendedProperties = [
  {
    id: 1,
    tag: 'House',
    name: 'Lakeshore Blvd West',
    location: '70 Washington Square South, New York, NY 10012, United States',
    price: 797500,
    coordinates: [28.2916, -16.6291], // Costa Adeje, Tenerife
    image:
      '/images/external/photo-1505691938895-1758d7feb511-f43679f6a1.jpg',
    images: [
      '/images/external/photo-1505691938895-1758d7feb511-f43679f6a1.jpg',
      '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg',
      '/images/external/photo-1484154218962-a197022b5858-c5aa75b2e0.jpg',
      '/images/external/photo-1564013799919-ab600027ffc6-cd6cfcc604.jpg',
      '/images/external/photo-1522771739844-6a9f6d5f14af-daf4e960b5.jpg',
      '/images/external/photo-1600585154340-be6161a56a0c-753fb8cc27.jpg',
      '/images/external/photo-1600607687939-ce8a6c25118c-91f350a715.jpg',
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
        '/images/external/photo-1472099645785-5658abf4ff4e-1d5975d484.jpg',
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
      '/images/external/photo-1600596542815-ffad4c1539a9-95d912f909.jpg',
    images: [
      '/images/external/photo-1600596542815-ffad4c1539a9-95d912f909.jpg',
      '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg',
      '/images/external/photo-1484154218962-a197022b5858-c5aa75b2e0.jpg',
      '/images/external/photo-1564013799919-ab600027ffc6-cd6cfcc604.jpg',
      '/images/external/photo-1522771739844-6a9f6d5f14af-daf4e960b5.jpg',
      '/images/external/photo-1600585154340-be6161a56a0c-753fb8cc27.jpg',
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
        '/images/external/photo-1472099645785-5658abf4ff4e-1d5975d484.jpg',
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
      '/images/external/photo-1522708323590-d24dbb6b0267-cf542d6d64.jpg',
    images: [
      '/images/external/photo-1522708323590-d24dbb6b0267-cf542d6d64.jpg',
      '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg',
      '/images/external/photo-1484154218962-a197022b5858-c5aa75b2e0.jpg',
      '/images/external/photo-1564013799919-ab600027ffc6-cd6cfcc604.jpg',
      '/images/external/photo-1522771739844-6a9f6d5f14af-daf4e960b5.jpg',
      '/images/external/photo-1600585154340-be6161a56a0c-753fb8cc27.jpg',
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
        '/images/external/photo-1472099645785-5658abf4ff4e-1d5975d484.jpg',
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
      '/images/external/photo-1600596542815-ffad4c1539a9-95d912f909.jpg',
    images: [
      '/images/external/photo-1600596542815-ffad4c1539a9-95d912f909.jpg',
      '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg',
      '/images/external/photo-1484154218962-a197022b5858-c5aa75b2e0.jpg',
      '/images/external/photo-1564013799919-ab600027ffc6-cd6cfcc604.jpg',
      '/images/external/photo-1522771739844-6a9f6d5f14af-daf4e960b5.jpg',
      '/images/external/photo-1600585154340-be6161a56a0c-753fb8cc27.jpg',
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
        '/images/external/photo-1472099645785-5658abf4ff4e-1d5975d484.jpg',
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
    image: '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg',
    images: [
      '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg',
      '/images/external/photo-1484154218962-a197022b5858-c5aa75b2e0.jpg',
      '/images/external/photo-1564013799919-ab600027ffc6-cd6cfcc604.jpg',
      '/images/external/photo-1522771739844-6a9f6d5f14af-daf4e960b5.jpg',
      '/images/external/photo-1600585154340-be6161a56a0c-753fb8cc27.jpg',
      '/images/external/photo-1600607687939-ce8a6c25118c-91f350a715.jpg',
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
    image: '/images/external/photo-1600596542815-ffad4c1539a9-95d912f909.jpg',
    images: [
      '/images/external/photo-1600596542815-ffad4c1539a9-95d912f909.jpg',
      '/images/external/photo-1505691938895-1758d7feb511-f43679f6a1.jpg',
      '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg',
      '/images/external/photo-1484154218962-a197022b5858-c5aa75b2e0.jpg',
      '/images/external/photo-1564013799919-ab600027ffc6-cd6cfcc604.jpg',
      '/images/external/photo-1522771739844-6a9f6d5f14af-daf4e960b5.jpg',
      '/images/external/photo-1600585154340-be6161a56a0c-753fb8cc27.jpg',
      '/images/external/photo-1600607687939-ce8a6c25118c-91f350a715.jpg',
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
    image: '/images/external/photo-1522708323590-d24dbb6b0267-cf542d6d64.jpg',
    images: [
      '/images/external/photo-1522708323590-d24dbb6b0267-cf542d6d64.jpg',
      '/images/external/photo-1484154218962-a197022b5858-c5aa75b2e0.jpg',
      '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg',
      '/images/external/photo-1564013799919-ab600027ffc6-cd6cfcc604.jpg',
      '/images/external/photo-1522771739844-6a9f6d5f14af-daf4e960b5.jpg',
      '/images/external/photo-1600585154340-be6161a56a0c-753fb8cc27.jpg',
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
    image: '/images/external/photo-1600585154340-be6161a56a0c-753fb8cc27.jpg',
    images: [
      '/images/external/photo-1600585154340-be6161a56a0c-753fb8cc27.jpg',
      '/images/external/photo-1600585154526-990dced4db0d-857efc2969.jpg',
      '/images/external/photo-1600566753086-00f18fb6b3ea-ebdc75633e.jpg',
      '/images/external/photo-1522708323590-d24dbb6b0267-cf542d6d64.jpg',
      '/images/external/photo-1484154218962-a197022b5858-c5aa75b2e0.jpg',
      '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg',
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
  const [propertyMode] = useState('buy') // 'rent' для аренды, 'buy' для покупки
  const [activeNav, setActiveNav] = useState('home')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isManagerChatOpen, setIsManagerChatOpen] = useState(false)
  const [managerChatInput, setManagerChatInput] = useState('')
  const [aiAssistantHiddenByFooter, setAiAssistantHiddenByFooter] = useState(false)
  const layoutScrollRef = useLayoutScrollRef()
  /** Совпадает с hero @media (max-width: 768px): в ряд две CTA — короткая подпись на обеих */
  const [isHeroCtaAdaptive, setIsHeroCtaAdaptive] = useState(false)
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

  const {
    managerMessagesRef,
    managerThreadUi,
    managerConnecting,
    liveChatToken,
    enterLiveManagerChat,
    pauseManagerPolling,
    sendManagerMessage,
  } = useManagerLiveChat(getChatUserId, t)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setIsHeroCtaAdaptive(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

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
            const dbUser = await fetchUserById(API_BASE_URL, dbUserId)
            if (dbUser) {
              // Проверяем заполненность профиля из БД
              profileIncomplete = checkProfileCompleteness(dbUser)
              setHasIncompleteProfile(profileIncomplete)
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
              const result = await fetchUserById(API_BASE_URL, dbUserId, { includeMeta: true })
              
              // Если пользователь не найден в БД (404) — сессия устарела, очищаем её
              if (result.notFound) {
                console.warn('⚠️ Локальная сессия устарела: пользователь не найден в БД. Очищаем данные.')
                clearUserData()
                setIsLoggedIn(false)
                setUserPhoto(null)
                setHasIncompleteProfile(false)
                return
              }
              
              if (result.ok && result.user) {
                  const dbUser = result.user
                  
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

  const [selectedProperty, setSelectedProperty] = useState(null)
  const [showMap, setShowMap] = useState(false)
  const [selectedChat, setSelectedChat] = useState(null)
  const [activeCategory, setActiveCategory] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [filteredProperties, setFilteredProperties] = useState(null)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)
  const [activeFilter, setActiveFilter] = useState(t('forAll'))
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMenuClosing, setIsMenuClosing] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [cookieConsentOpen, setCookieConsentOpen] = useState(
    () => COOKIE_CONSENT_ENABLED && location.pathname === '/' && readCookieConsentChoice() == null,
  )

  useEffect(() => {
    if (!COOKIE_CONSENT_ENABLED) {
      setCookieConsentOpen(false)
      return
    }
    if (location.pathname === '/' && readCookieConsentChoice() == null) {
      setCookieConsentOpen(true)
    } else if (location.pathname !== '/') {
      setCookieConsentOpen(false)
    }
  }, [location.pathname])

  /** Вариант входа в LoginModal: с главной hero — default (шаг 2 формы), иначе как в шапке — мастер */
  const [mainLoginModalAuthEntry, setMainLoginModalAuthEntry] = useState('header_wizard')
  /** Модалка «стать продавцом» / «стать покупателем» для залогиненных с другой ролью */
  const [heroRolePitch, setHeroRolePitch] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [pageSearchResults, setPageSearchResults] = useState([])
  const languageDropdownDesktopRef = useRef(null)
  const languageDropdownMobileRef = useRef(null)
  const searchInputRef = useRef(null)
  const searchWrapperRef = useRef(null)
  const heroVideoRef = useRef(null)
  const chatMessagesRef = useRef(null)
  const lastMessageRef = useRef(null)
  const menuRef = useRef(null)
  const landingStatsRef = useRef(null)
  const auctionShowcaseScrollerRef = useRef(null)
  const buyNowShowcaseScrollerRef = useRef(null)
  const debtsShowcaseScrollerRef = useRef(null)
  const sharesShowcaseScrollerRef = useRef(null)
  const [statsScrollProgress, setStatsScrollProgress] = useState(0)

  const scrollAuctionShowcase = useCallback((direction) => {
    const el = auctionShowcaseScrollerRef.current
    if (!el) return
    const delta = Math.max(Math.floor(el.clientWidth * 0.72), 300)
    el.scrollBy({ left: direction * delta, behavior: 'smooth' })
  }, [])

  const scrollBuyNowShowcase = useCallback((direction) => {
    const el = buyNowShowcaseScrollerRef.current
    if (!el) return
    const delta = Math.max(Math.floor(el.clientWidth * 0.72), 300)
    el.scrollBy({ left: direction * delta, behavior: 'smooth' })
  }, [])

  const scrollDebtsShowcase = useCallback((direction) => {
    const el = debtsShowcaseScrollerRef.current
    if (!el) return
    const delta = Math.max(Math.floor(el.clientWidth * 0.72), 300)
    el.scrollBy({ left: direction * delta, behavior: 'smooth' })
  }, [])

  const scrollSharesShowcase = useCallback((direction) => {
    const el = sharesShowcaseScrollerRef.current
    if (!el) return
    const delta = Math.max(Math.floor(el.clientWidth * 0.72), 300)
    el.scrollBy({ left: direction * delta, behavior: 'smooth' })
  }, [])

  const heroImages = {
    rent: HERO_BACKGROUND_URL,
    buy: HERO_BACKGROUND_URL,
  }
  
  const heroImage = heroImages[propertyMode]

  useEffect(() => {
    const video = heroVideoRef.current
    if (!video) return undefined

    const playHeroVideo = () => {
      video.muted = true
      video.defaultMuted = true
      video.playsInline = true
      const playPromise = video.play()
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {})
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') playHeroVideo()
    }

    playHeroVideo()
    video.addEventListener('loadedmetadata', playHeroVideo)
    video.addEventListener('canplay', playHeroVideo)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      video.removeEventListener('loadedmetadata', playHeroVideo)
      video.removeEventListener('canplay', playHeroVideo)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

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
  const cabinetProfilePath = getCabinetProfilePath()
  const cabinetDataPath = getCabinetDataPath()
  const sellerCabinet = isSellerCabinetRole()
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
      requiresAuth: true,
      allowedRoles: ['buyer', 'seller', 'owner', 'admin', 'client']
    },
    {
      path: '/chat?manager=1',
      keywords: ['чат', 'chat', 'сообщения', 'messages', 'переписка'],
      title: 'Чат',
      requiresAuth: true,
      allowedRoles: ['buyer', 'seller', 'owner', 'admin', 'client']
    },
    {
      path: cabinetProfilePath,
      keywords: ['профиль', 'profile', 'аккаунт', 'личный кабинет', 'личный', 'кабинет', 'настройки', 'settings'],
      title: 'Профиль',
      requiresAuth: true,
      allowedRoles: sellerCabinet ? ['seller', 'owner', 'admin'] : ['buyer', 'client', 'admin'],
    },
    {
      path: '/favorites',
      keywords: ['избранное', 'favorites', 'избранные', 'закладки', 'bookmarks'],
      title: 'Избранное',
      requiresAuth: true,
      allowedRoles: ['buyer', 'client', 'admin'] // Только для покупателей и админов
    },
    {
      path: '/deposit',
      keywords: [
        'кошелек',
        'wallet',
        'депозит',
        'deposit',
        'баланс',
        'balance',
        'деньги',
        'money',
        'платежи',
        'payments',
      ],
      title: 'Депозит',
      requiresAuth: true,
      allowedRoles: ['buyer', 'client', 'admin'] // Только для покупателей и админов
    },
    {
      path: cabinetDataPath,
      keywords: ['данные', 'data', 'информация', 'information', 'персональные данные'],
      title: 'Данные',
      requiresAuth: true,
      allowedRoles: sellerCabinet ? ['seller', 'owner', 'admin'] : ['buyer', 'client', 'admin'],
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

  const isMainSiteUserLoggedIn = () =>
    isLoggedIn || (userLoaded && !!user) || getUserData().isLoggedIn

  const goWalletIfAuthed = () => {
    if (!isMainSiteUserLoggedIn()) {
      setMainLoginModalAuthEntry('header_wizard')
      setIsLoginModalOpen(true)
      return
    }
    navigateToWallet(navigate, location.pathname)
  }

  const openMainPageLoginDirectRegister = (role) => {
    sessionStorage.setItem('login_modal_mode', 'register')
    sessionStorage.setItem('login_modal_user_role', role === 'seller' ? 'seller' : 'buyer')
    setMainLoginModalAuthEntry('default')
    setIsLoginModalOpen(true)
  }

  const handleHeroInvestorCardClick = () => {
    if (!isMainSiteUserLoggedIn()) {
      openMainPageLoginDirectRegister('buyer')
      return
    }
    const role = getUserRole()
    if (role === 'seller' || role === 'owner') {
      setHeroRolePitch('buyer')
      return
    }
    navigate(getCabinetProfilePath())
  }

  const handleHeroSellerCardClick = () => {
    if (!isMainSiteUserLoggedIn()) {
      openMainPageLoginDirectRegister('seller')
      return
    }
    const role = getUserRole()
    if (role === 'seller' || role === 'owner') {
      navigate(getCabinetHomePath(role))
      return
    }
    setHeroRolePitch('seller')
  }

  const handleHeroRolePitchPrimary = () => {
    const kind = heroRolePitch
    setHeroRolePitch(null)
    if (kind === 'seller') {
      openMainPageLoginDirectRegister('seller')
    } else if (kind === 'buyer') {
      openMainPageLoginDirectRegister('buyer')
    }
  }

  const closeLoginModalMain = () => {
    setIsLoginModalOpen(false)
    setMainLoginModalAuthEntry('header_wizard')
  }

  // Открытие LoginModal по глобальному запросу (например, клик из toast «Войти / Регистрация»)
  useEffect(() => {
    const openForcedLoginModal = () => {
      const forceOpen = sessionStorage.getItem('login_modal_force_open')
      if (forceOpen !== 'true') return

      const wantWizard = sessionStorage.getItem('login_modal_force_wizard') === 'true'
      sessionStorage.removeItem('login_modal_force_open')
      sessionStorage.removeItem('login_modal_force_wizard')

      setMainLoginModalAuthEntry(wantWizard ? 'header_wizard' : 'default')
      setIsLoginModalOpen(true)
    }

    openForcedLoginModal()
    window.addEventListener('forceOpenLoginModal', openForcedLoginModal)
    return () => {
      window.removeEventListener('forceOpenLoginModal', openForcedLoginModal)
    }
  }, [])

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
        setMainLoginModalAuthEntry('header_wizard')
        setIsLoginModalOpen(true)
      } else {
        // Показываем сообщение об ошибке доступа
        alert(access.message)
      }
      return
    }

    // Переходим на страницу
    if (page.path === '/deposit' || page.path === '/wallet') {
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
  /** Пока первый GET объявлений для витрин не завершился — скелетоны в каруселях «Аукцион», «Долги», доля и т.д. */
  const [homePropertiesLoading, setHomePropertiesLoading] = useState(true)

  const filteredRecommended = useMemo(() => filterBySearch(recommendedProperties), [searchQuery])
  const filteredNearby = useMemo(() => filterBySearch(nearbyProperties), [searchQuery])

  // Три параллельных GET: approved + auctions + debts → homeProperties (без дублирующих запросов по type)
  const loadHomeProperties = useCallback(async (options = {}) => {
    const showSkeleton = options.showSkeleton !== false
    if (showSkeleton) setHomePropertiesLoading(true)
    try {
      const apiBase = await getApiBaseUrl()
      const lang = (i18n.language || 'ru').split('-')[0]
      const viewerRaw = localStorage.getItem('userId')
      const viewerQ =
        viewerRaw && /^\d+$/.test(String(viewerRaw).trim())
          ? `&viewer_user_id=${encodeURIComponent(String(viewerRaw).trim())}`
          : ''
      const [approvedRes, auctionsRes, debtsRes] = await Promise.all([
        fetch(`${apiBase}/properties/approved?lang=${lang}`),
        fetch(`${apiBase}/properties/auctions?lang=${lang}${viewerQ}`),
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
        const { image: normalizedImage, images: normalizedImages } = normalizePropertyMediaFields(prop)
        return {
          ...prop,
          isAuction,
          is_share: isShare ? 1 : 0,
          title: prop.title || prop.name || '',
          name: prop.name || prop.title || '',
          image: normalizedImage || LISTING_IMAGE_FALLBACK,
          images: normalizedImages.length > 0 ? normalizedImages : normalizedImage ? [normalizedImage] : [],
          price: priceNumber,
          auction_starting_price: auctionStartingPrice,
          source_table:
            prop.source_table ||
            prop.sourceTable ||
            resolvePropertySourceTable(prop),
          currentBid: prop.currentBid || prop.current_bid || prop.auction_current_bid || prop.auctionCurrentBid || null,
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
      const byKey = new Map()
      const put = (p) => {
        if (p?.id == null) return
        const k = auctionListingDedupeKey(p)
        const prev = byKey.get(k)
        byKey.set(k, prev ? { ...prev, ...p, isAuction: prev.isAuction || p.isAuction } : p)
      }
      approved.map((p) => normalizeProperty(p)).forEach(put)
      auctions.map((p) => normalizeProperty(p, { forceAuction: true })).forEach(put)
      debts.map((p) => normalizeProperty(p)).forEach(put)
      let merged = Array.from(byKey.values())
      const auctionItems = merged.filter(
        (item) =>
          item &&
          (item.isAuction === true || item.is_auction === 1 || item.is_auction === true),
      )
      const bidByKey = await fetchAuctionMaxBidsBatch(apiBase, auctionItems)
      if (bidByKey.size > 0) {
        merged = merged.map((item) => {
          const maxBid = getMaxBidForProperty(bidByKey, item)
          if (maxBid == null) return item
          const currentBid = asFiniteNumberOrNull(item.currentBid) || 0
          return {
            ...item,
            currentBid: Math.max(currentBid, maxBid),
          }
        })
      }

      setHomeProperties(merged)
    } catch (error) {
      console.error('❌ Ошибка загрузки объектов для главной страницы:', error)
    } finally {
      if (showSkeleton) setHomePropertiesLoading(false)
    }
  }, [i18n.language])

  // При смене языка в футере перезагружаем объявления с переводами
  useEffect(() => {
    loadHomeProperties()
  }, [i18n.language, loadHomeProperties])

  // SSE: новые лоты и тест-таймер с админки — без F5 (тот же канал, что на /auction)
  useEffect(() => {
    let eventSource = null
    let reconnectTimer = null
    let cancelled = false

    const connect = async () => {
      const base = await getApiBaseUrl()
      if (cancelled) return
      const url = base.startsWith('http')
        ? `${base.replace(/\/$/, '')}/events/auction-updates`
        : `${window.location.origin}${base.replace(/\/$/, '')}/events/auction-updates`
      eventSource = new EventSource(url)
      eventSource.onopen = () => {
        if (reconnectTimer) {
          clearTimeout(reconnectTimer)
          reconnectTimer = null
        }
      }
      eventSource.onmessage = (event) => {
        try {
          if (typeof event.data === 'string' && event.data.startsWith(':')) return
          const data = JSON.parse(event.data)
          if (data.type === 'test_timer_update' || data.type === 'new_auction_objects') {
            loadHomeProperties({ showSkeleton: false })
          }
        } catch (_) {}
      }
      eventSource.onerror = () => {
        if (cancelled) return
        if (eventSource) {
          eventSource.close()
          eventSource = null
        }
        if (reconnectTimer) return
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null
          void connect()
        }, 3000)
      }
    }

    void connect()
    return () => {
      cancelled = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (eventSource) eventSource.close()
    }
  }, [loadHomeProperties])

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

      // Если у лота реально доступна опция "Купить сейчас", это не "чистый" аукцион.
      return !hasBuyNowOption(p)
    }).filter((p) => !isAuctionListingEnded(p))

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
      return hasBuyNowOption(p)
    }).filter((p) => !isAuctionListingEnded(p))

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
        }, 150)

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
    setSiteNavDrawerOpen(isMenuOpen)
    return () => setSiteNavDrawerOpen(false)
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

  const toggleChat = () => {
    if (isSoftLaunchFeatureBlocked('aiAssistant') || isSoftLaunchFeatureBlocked('aiRealEstate')) {
      navigate('/chat?assistant=1')
      return
    }
    setIsChatOpen((prev) => {
      const next = !prev
      if (next) {
        setIsManagerChatOpen(false)
        pauseManagerPolling()
      }
      return next
    })
  }

  const openManagerChatDock = useCallback(async () => {
    if (!isMainSiteUserLoggedIn()) {
      setMainLoginModalAuthEntry('header_wizard')
      setIsLoginModalOpen(true)
      return
    }
    setIsChatOpen(false)
    setIsManagerChatOpen(true)
    try {
      await enterLiveManagerChat()
    } catch {
      setIsManagerChatOpen(false)
    }
  }, [enterLiveManagerChat])

  const closeManagerChatDock = useCallback(() => {
    setIsManagerChatOpen(false)
    setManagerChatInput('')
    pauseManagerPolling()
  }, [pauseManagerPolling])

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('managerChatStateChange', { detail: { isOpen: isManagerChatOpen } })
    )
  }, [isManagerChatOpen])

  useEffect(() => {
    const onOpenManager = () => {
      void openManagerChatDock()
    }
    window.addEventListener('openManagerChat', onOpenManager)
    return () => window.removeEventListener('openManagerChat', onOpenManager)
  }, [openManagerChatDock])

  useEffect(() => {
    const onOpenAI = () => {
      setIsChatOpen(true)
      setIsManagerChatOpen(false)
      pauseManagerPolling()
    }
    window.addEventListener('openAIChat', onOpenAI)
    return () => window.removeEventListener('openAIChat', onOpenAI)
  }, [pauseManagerPolling])

  const openDrawerLoginOrNavigate = (path, closeMenu = false) => {
    if (!isMainSiteUserLoggedIn()) {
      setMainLoginModalAuthEntry('header_wizard')
      setIsLoginModalOpen(true)
      if (closeMenu) setIsMenuOpen(false)
      return
    }
    if (path === '/chat?manager=1' || String(path).startsWith('/chat?manager=')) {
      void openManagerChatDock()
      if (closeMenu) setIsMenuOpen(false)
      return
    }
    navigate(path)
    if (closeMenu) setIsMenuOpen(false)
  }

  const openDrawerWalletFromMenu = (closeMenu = false) => {
    if (!isMainSiteUserLoggedIn()) {
      setMainLoginModalAuthEntry('header_wizard')
      setIsLoginModalOpen(true)
      if (closeMenu) setIsMenuOpen(false)
      return
    }
    navigateToWallet(navigate, location.pathname)
    if (closeMenu) setIsMenuOpen(false)
  }

  const goMapOrChatIfAuthed = (path) => {
    if (isSoftLaunchHrefBlocked(path)) {
      navigate(path)
      return
    }
    if (!isMainSiteUserLoggedIn()) {
      setMainLoginModalAuthEntry('header_wizard')
      setIsLoginModalOpen(true)
      return
    }
    if (path === '/chat?manager=1' || String(path).startsWith('/chat?manager=')) {
      void openManagerChatDock()
      return
    }
    navigate(path)
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
        if (!isMainSiteUserLoggedIn()) {
          setMainLoginModalAuthEntry('header_wizard')
          setIsLoginModalOpen(true)
          return
        }
        void openManagerChatDock()
        return
      }
      if (contactPref === 'telegram') {
        const tgUrl = (import.meta.env?.VITE_MANAGER_TELEGRAM_URL || '').trim()
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
    window.dispatchEvent(
      new CustomEvent('aiChatStateChange', { detail: { isOpen: isChatOpen } })
    )
  }, [isChatOpen])

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
      { label: 'House', displayLabel: t('house'), icon: PiHouseLine, image: '/house.png', href: buildAuctionFilterPath({ categorySlug: 'houses' }) },
      { label: 'Map', displayLabel: t('map'), icon: FiMap, isMap: true, image: '/map.png', href: '/map' },
      { label: 'Apartment', displayLabel: t('apartment'), icon: PiBuildingApartment, image: '/appartaments.png', href: buildAuctionFilterPath({ categorySlug: 'apartments' }) },
      { label: 'Villa', displayLabel: t('villa'), icon: PiBuildings, image: '/villa.png', href: buildAuctionFilterPath({ categorySlug: 'villas' }) },
  ], [t, i18n.language])
  
  const navigationItems = useMemo(() => [
      { id: 'home', label: t('home'), icon: FaHome },
      { id: 'favourite', label: t('favorites'), icon: FaHeartSolid },
      { id: 'auction', label: t('auction'), icon: FaGavel },
      { id: 'chat', label: t('chat'), icon: FaComment },
      { id: 'profile', label: t('profile'), icon: FaUser },
  ], [t, i18n.language])

  const salesStrategies = useMemo(() => [
    {
      id: 'auction',
      label: t('auctionSectionTitle'),
      title: t('auctionSectionTitle'),
      text: t('auctionSectionSubtitle'),
      image: '/images/sellyourbrick/about/about-category-auction.jpg',
      to: '/auction?filter=auction',
      metric: '01',
    },
    {
      id: 'buy-now',
      label: t('buyNowSectionTitle'),
      title: t('buyNowSectionTitle'),
      text: t('buyNowSectionSubtitle'),
      image: '/images/sellyourbrick/about/about-category-buynow.jpg',
      to: '/auction?filter=buy_now',
      metric: '02',
    },
    {
      id: 'shares',
      label: t('fractionalSaleTitle'),
      title: t('fractionalSaleTitle'),
      text: t('fractionalSectionSubtitle'),
      image: '/images/sellyourbrick/about/about-category-shares.jpg',
      to: '/shares',
      metric: '03',
    },
    {
      id: 'debts',
      label: t('debtsTitle'),
      title: t('debtsTitle'),
      text: t('debtsSectionSubtitle'),
      image: '/images/sellyourbrick/about/about-category-debts.jpg',
      to: '/debts',
      metric: '04',
    },
  ], [t, i18n.language])
  
  // Автоматический перевод пользовательского контента отключен из-за лимитов API
  // Статический контент переводится через i18next

  const handleCategoryClick = (categoryLabel) => {
    if (categoryLabel === 'Map') {
      goMapOrChatIfAuthed('/map')
      return
    }

    setIsLoading(true)
    setActiveCategory(categoryLabel)
    
    // Обновляем URL с параметрами фильтра
    navigate(buildAuctionFilterPath({ categorySlug: legacyCategoryToSlug(categoryLabel) }), { replace: true })

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
    }, 180)
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

  const showPropertyAuthRequiredToast = () => {
    showNotification(
      <span>
        {t('toastOpenListingLoginPrefix')}{' '}
        <button
          type="button"
          className="auth-toast-link"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            requestOpenLoginModal({ wizard: true })
          }}
        >
          {t('toastOpenListingLoginLink')}{' '}
          <span className="auth-toast-link__arrow">→</span>
        </button>
      </span>,
      'warning',
      7000
    )
  }

  const scrollToHomeAnchor = useCallback((anchorId) => {
    const target = document.getElementById(anchorId)
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handlePremiumSearchSubmit = useCallback(
    (event) => {
      event.preventDefault()
      const formData = new FormData(event.currentTarget)
      const dealType = String(formData.get('dealType') || 'auction')
      const query = String(formData.get('query') || '').trim()
      const routeByDealType = {
        auction: '/auction?filter=auction',
        buy_now: '/auction?filter=buy_now',
        shares: '/shares',
        debts: '/debts',
      }
      const baseRoute = routeByDealType[dealType] || '/auction'
      const separator = baseRoute.includes('?') ? '&' : '?'
      navigate(query ? `${baseRoute}${separator}q=${encodeURIComponent(query)}` : baseRoute)
    },
    [navigate],
  )

  const handlePropertyClick = (
    category,
    propertyId,
    isClassic = false,
    hasTimer = false,
    property = null,
    { auctionTab } = {},
  ) => {
    if (!ensureCanOpenProperty()) {
      showPropertyAuthRequiredToast()
      return
    }
    // Если объект не передан, пытаемся найти его в массивах
    let propertyToNavigate = property

    if (!propertyToNavigate) {
      // Ищем объект в recommendedProperties и nearbyProperties
      const allProperties = [...recommendedProperties, ...nearbyProperties]
      propertyToNavigate = allProperties.find(p => p.id === propertyId)
    }

    if (propertyToNavigate) {
      const { pathname, state } = buildPropertyDetailNavigation(propertyToNavigate, {
        classic: isClassic,
        auctionTab: auctionTab || undefined,
      })
      navigate(pathname, { state })
      return
    }

    navigate(getPropertyDetailPath(propertyId, { classic: isClassic }))
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
    showNotification(t('bookingFeatureSoon', 'Booking will be available soon.'))
  }

  const handleCallBroker = () => {
    if (selectedProperty?.broker?.phone) {
      window.location.href = `tel:${selectedProperty.broker.phone}`
    }
  }

  const handleChatBroker = () => {
    // Обработчик чата с брокером
    showNotification(t('brokerChatFeatureSoon', 'Broker chat will be available soon.'))
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
    <div className="app app--premium-home">
      <header className={`new-header ${isMenuOpen ? 'new-header--menu-open' : ''}`}>
        <div className={`new-header__container ${isMenuOpen ? 'new-header__container--menu-open' : ''}`}>
        <div className="new-header__left">
        <button
          type="button"
          className="new-header__brand-mini"
          onClick={() => navigate('/')}
          aria-label="SellYourBrick"
        >
          SellYourBrick
        </button>
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
              e.stopPropagation()
              e.preventDefault()
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
        <SiteNavDrawer
          menuRef={menuRef}
          isMenuOpen={isMenuOpen}
          isMenuClosing={isMenuClosing}
          setIsMenuOpen={setIsMenuOpen}
          setIsMenuClosing={setIsMenuClosing}
          isLoggedIn={isLoggedIn}
          isManagerChatOpen={isManagerChatOpen}
          aiConsultantOpen={isChatOpen}
          openLoginOrNavigate={openDrawerLoginOrNavigate}
          openWalletFromMenu={openDrawerWalletFromMenu}
          onOpenLoginWizard={() => {
            setMainLoginModalAuthEntry('header_wizard')
            setIsLoginModalOpen(true)
            setIsMenuOpen(false)
          }}
        />
        </div>

          <div className="new-header__filters">
            <button
              type="button"
              className={`new-header__filter-btn new-header__filter-btn--hide-4 ${
                location.pathname === '/chat' || isManagerChatOpen ? 'new-header__filter-btn--active' : ''
              }`}
              onClick={() => goMapOrChatIfAuthed('/chat?manager=1')}
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
              onClick={() => goMapOrChatIfAuthed('/map')}
            >
              <span>{t('map')}</span>
            </button>
          </div>

        <div className="new-header__right">
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
        <HeaderPinnedCatalogNav />
        <button 
          className={`new-header__user-btn ${isLoggedIn ? 'new-header__user-btn--avatar' : ''}`}
          onClick={() => {
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

            if (isAdmin) {
              navigate('/admin')
              return
            }

            if (isOwner) {
              navigate(getCabinetHomePath('seller'))
              return
            }

            if (userLoaded && user) {
              navigate(getCabinetProfilePath())
            } else if (userData.isLoggedIn) {
              navigate(getCabinetProfilePath())
            } else {
              setMainLoginModalAuthEntry('header_wizard')
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
        <NotificationsBell />
          </>
        )}
        </div>
        </div>
      </header>

      <section className="hero-section premium-hero" aria-labelledby="premium-home-title">
        <div className="premium-hero__ambient" aria-hidden="true" />
        <div className="new-header-spacer" aria-hidden="true" />

        <div className="premium-hero__inner">
          <div className="premium-hero__copy">
            <div className="premium-hero__badge">
              <span className="premium-hero__badge-dot" aria-hidden="true" />
              Единая платформа. 4 стратегии продажи.
            </div>
            <h1 id="premium-home-title" className="premium-hero__title">
              Продайте объект через{' '}
              <span>правильную стратегию сделки.</span>
            </h1>
            <p className="premium-hero__lead">
              SellYourBrick подбирает механику под актив: аукцион, фиксированная цена,
              доли или долговой сценарий. Покупатель видит понятную витрину, продавец —
              управляемый путь к сделке.
            </p>

            <form className="premium-search" onSubmit={handlePremiumSearchSubmit}>
              <label className="premium-search__field premium-search__field--wide">
                <span>Поиск объекта</span>
                <span className="premium-search__input-wrap">
                  <FiSearch size={19} aria-hidden />
                  <input
                    name="query"
                    type="search"
                    placeholder="Вилла, апартаменты, район или ID лота"
                    autoComplete="off"
                  />
                </span>
              </label>
              <label className="premium-search__field">
                <span>Стратегия</span>
                <select name="dealType" defaultValue="auction">
                  <option value="auction">Аукцион</option>
                  <option value="buy_now">Купить сейчас</option>
                  <option value="shares">Доли</option>
                  <option value="debts">Долги</option>
                </select>
              </label>
              <label className="premium-search__field">
                <span>Локация</span>
                <select name="location" defaultValue="tenerife">
                  <option value="tenerife">Тенерифе</option>
                  <option value="spain">Испания</option>
                  <option value="global">Все рынки</option>
                </select>
              </label>
              <button type="submit" className="premium-search__submit">
                <span>Найти</span>
                <FiArrowRight size={18} strokeWidth={2.4} aria-hidden />
              </button>
            </form>

            <div className="premium-search__filters" aria-label="Быстрые фильтры по стратегиям">
              {premiumModes.map((mode) => (
                <button
                  type="button"
                  key={mode.id}
                  className="premium-search__filter"
                  onClick={() => scrollToHomeAnchor(mode.objectsId)}
                >
                  {mode.eyebrow}
                </button>
              ))}
            </div>

          </div>

          <div className="premium-hero__object" aria-label="Featured real estate object">
            <div className="premium-object-card">
              <img
                src="/images/new-home/new-home-hero-villa.jpg"
                alt="Современная вилла у океана"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
              <div className="premium-object-card__top">
                <span>Объект недели</span>
                <strong>Villa Atlantic</strong>
              </div>
              <div className="premium-object-card__bottom">
                <div>
                  <span>Стратегия</span>
                  <strong>Auction + Buy Now</strong>
                </div>
                <div>
                  <span>Ориентир</span>
                  <strong>€1.82M</strong>
                </div>
              </div>
            </div>

            <div className="premium-object-note premium-object-note--seller">
              <span>Кабинет продавца</span>
              <strong>Цена, документы, спрос и переговоры в одном контуре.</strong>
            </div>
            <div className="premium-object-note premium-object-note--buyer">
              <span>Шортлист покупателя</span>
              <strong>Фильтры по стратегии, бюджету и типу сделки.</strong>
            </div>
          </div>

          <div className="premium-role-grid">
            <button type="button" className="premium-role-card" onClick={handleHeroInvestorCardClick}>
              <span className="premium-role-card__icon">
                <FiShoppingCart size={18} aria-hidden />
              </span>
              <strong>Я покупатель</strong>
              <span>Подобрать объект, сравнить стратегии и открыть безопасный путь к сделке.</span>
            </button>
            <button type="button" className="premium-role-card" onClick={handleHeroSellerCardClick}>
              <span className="premium-role-card__icon">
                <FaHome size={18} aria-hidden />
              </span>
              <strong>Я продавец</strong>
              <span>Упаковать объект, выбрать механику продажи и получить квалифицированный спрос.</span>
            </button>
          </div>
        </div>

        <nav className="premium-hero__strategy-rail" aria-label="Стратегии SellYourBrick">
          {premiumModes.map((mode) => {
            const Icon = mode.Icon
            return (
              <button
                type="button"
                key={mode.id}
                className="premium-strategy-pill"
                onClick={() => scrollToHomeAnchor(mode.anchorId)}
              >
                <span className="premium-strategy-pill__number">{mode.number}</span>
                <span className="premium-strategy-pill__icon">
                  <Icon size={17} aria-hidden />
                </span>
                <span>
                  <strong>{mode.eyebrow}</strong>
                  <small>{mode.title}</small>
                </span>
              </button>
            )
          })}
        </nav>
      </section>

      <HomeSaleFormats modes={premiumModes} />

      <MainPageDeferredContext.Provider
        value={{
          t,
          i18n,
          navigate,
          auctionSection,
          buyNowSection,
          debtsSection,
          sharesSection,
          auctionShowcaseScrollerRef,
          buyNowShowcaseScrollerRef,
          debtsShowcaseScrollerRef,
          sharesShowcaseScrollerRef,
          scrollAuctionShowcase,
          scrollBuyNowShowcase,
          scrollDebtsShowcase,
          scrollSharesShowcase,
          isAuctionListingEnded,
          handlePropertyClick,
          isFavorite,
          toggleFavorite,
          ensureCanOpenProperty,
          showPropertyAuthRequiredToast,
          landingStatsRef,
          statsScrollProgress,
          getPropertyTypes,
          activeCategory,
          handleCategoryClick,
          isLoading,
          homePropertiesLoading,
          filteredProperties,
          filteredRecommended,
          filteredNearby,
          propertyMode,
        }}
      >
        <Suspense fallback={<MainPageSuspenseFallback belowHero />}>
          <MainPageBelowFoldLazy />
        </Suspense>
      </MainPageDeferredContext.Provider>


      <nav className="bottom-nav">
        {navigationItems.map((item, index) => {
          const IconComponent = item.icon
          const isCenter = index === 2
          const getRoute = (id) => {
            if (id === 'home') return '/'
            if (id === 'favourite') return '/favorites'
            if (id === 'auction') return '/auction'
            if (id === 'chat') return '/chat?manager=1'
            if (id === 'profile') return getCabinetProfilePath()
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
              onClick={() => {
                if (item.id === 'chat') goMapOrChatIfAuthed(route)
                else navigate(route)
              }}
              aria-label={item.label}
            >
              <IconComponent size={26} />
            </button>
          )
        })}
      </nav>

      {!isSoftLaunchFeatureBlocked('aiAssistant') && !isSoftLaunchFeatureBlocked('aiRealEstate') ? (
      <div
        className={`ai-assistant-dock${aiAssistantHiddenByFooter ? ' ai-assistant-dock--footer-near' : ''}`}
        aria-hidden={aiAssistantHiddenByFooter && !isChatOpen && !isManagerChatOpen}
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
                            href={getPropertyDetailPath(recId, { property })}
                            className="chat-widget__recommendation-link"
                            onClick={(e) => {
                              e.preventDefault()
                              navigate(getPropertyDetailPath(recId, { property }), {
                                state: { property: property },
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

      {isManagerChatOpen && (
        <div
          className={`chat-widget chat-widget--manager-dock${
            isChatOpen ? ' chat-widget--stacked-above-ai' : ''
          }`}
          role="dialog"
          aria-label={t('chatManagerTitle')}
        >
          <div className="chat-widget__header">
            <div className="chat-widget__header-info">
              <div className="chat-widget__avatar chat-widget__avatar--manager">M</div>
              <div className="chat-widget__header-text">
                <h3 className="chat-widget__title">{t('chatManagerTitle')}</h3>
                <span className="chat-widget__status">{t('chatManagerOnline')}</span>
              </div>
            </div>
            <button
              type="button"
              className="chat-widget__close"
              onClick={closeManagerChatDock}
              aria-label={t('closeChat')}
            >
              <FiX size={20} />
            </button>
          </div>

          <div className="chat-widget__messages" ref={managerMessagesRef}>
            {managerConnecting && (
              <div className="chat-widget__message chat-widget__message--bot">
                <div className="chat-widget__message-content">
                  <div className="chat-widget__typing" aria-hidden>
                    <span />
                    <span />
                    <span />
                  </div>
                  <p className="chat-widget__manager-connect-hint">{t('liveChatWaitNotice')}</p>
                </div>
              </div>
            )}
            {!managerConnecting &&
              managerThreadUi.map((message) => (
                <div
                  key={message.id}
                  className={`chat-widget__message ${
                    message.sender === 'user'
                      ? 'chat-widget__message--user'
                      : message.sender === 'manager'
                        ? 'chat-widget__message--manager'
                        : 'chat-widget__message--system'
                  }`}
                >
                  <div className="chat-widget__message-content">{message.text}</div>
                  <div className="chat-widget__message-time">{message.time}</div>
                </div>
              ))}
          </div>

          <form
            className="chat-widget__input-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (!managerChatInput.trim() || managerConnecting || !liveChatToken) return
              const text = managerChatInput.trim()
              setManagerChatInput('')
              void sendManagerMessage(text)
            }}
          >
            <input
              type="text"
              className="chat-widget__input"
              placeholder={t('chatPlaceholder')}
              value={managerChatInput}
              onChange={(e) => setManagerChatInput(e.target.value)}
              autoComplete="off"
              disabled={managerConnecting || !liveChatToken}
            />
            <button
              type="submit"
              className="chat-widget__send"
              aria-label={t('sendMessage')}
              disabled={managerConnecting || !liveChatToken}
            >
              <FiSend size={18} />
            </button>
          </form>
        </div>
      )}
      </div>
      ) : null}

      {/* Модальное окно успешной верификации */}

      {/* Модальное окно входа/регистрации */}
      <HeroRolePitchModal
        variant={heroRolePitch}
        isOpen={heroRolePitch != null}
        onClose={() => setHeroRolePitch(null)}
        onPrimary={handleHeroRolePitchPrimary}
        title={
          heroRolePitch === 'seller'
            ? t('heroPitchBecomeSellerTitle')
            : t('heroPitchBecomeBuyerTitle')
        }
        body={
          heroRolePitch === 'seller'
            ? t('heroPitchBecomeSellerBody')
            : t('heroPitchBecomeBuyerBody')
        }
        primaryLabel={
          heroRolePitch === 'seller'
            ? t('heroPitchBecomeSellerCta')
            : t('heroPitchBecomeBuyerCta')
        }
        closeLabel={t('close')}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={closeLoginModalMain}
        authEntryVariant={mainLoginModalAuthEntry}
      />

      {COOKIE_CONSENT_ENABLED ? (
        <CookieConsentDrawer
          open={cookieConsentOpen}
          onClose={() => setCookieConsentOpen(false)}
        />
      ) : null}
    </div>
  )
}

export default MainPage
