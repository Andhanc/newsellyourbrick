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
  FiTrash2,
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
  getHeaderAccountPath,
  isSellerCabinetRole,
  readStoredUserRole,
} from '../utils/cabinetRoutes'
import { syncAssistantLead } from '../services/assistantLeadService'
import {
  isSoftLaunchFeatureBlocked,
  isSoftLaunchHrefBlocked,
} from '../utils/softLaunchAccess'
import { getManagerContactButtons } from '../services/liveChatApi'
import { getSiteLinkLabel, refreshAssistantMessageCopy, visibleAssistantButtons } from '../utils/siteAssistantHelpers'
import { NotificationsBell } from '../context/SiteNotificationsContext'
import SiteNavDrawer from '../components/SiteNavDrawer'
import CookieConsentDrawer, {
  COOKIE_CONSENT_ENABLED,
  readCookieConsentChoice,
} from '../components/CookieConsentDrawer'
import { setSiteNavDrawerOpen } from '../utils/siteNavDrawerDocumentFlag'
import { fetchUserById } from '../utils/usersApi'
import { getUiIntlLocale } from '../utils/uiIntlLocale'

import { getApiBaseUrl, getApiBaseUrlSync, getEventsBaseUrl } from '../utils/apiConfig'
import { normalizePropertyMediaFields, getPropertyCardImage } from '../utils/propertyImage'
import { navigateToWallet } from '../utils/walletNavigation'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import useSiteFooterNear from '../hooks/useSiteFooterNear'
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

/** Hero section background (villa in public/images/external) */
const HERO_BACKGROUND_URL = publicAsset('images/external/shares-hero-villa.jpg')
const LANDING_MODELS_RIBBON_IMAGE = publicAsset('images/sellyourbrick/landing-models-ribbon.png')

// Use sync version for init, then refresh on load
let API_BASE_URL = getApiBaseUrlSync()

const LISTING_IMAGE_FALLBACK =
  '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg'

// Not rendered on MainPage today (landing stats use statLabel1/2). Keyed for reuse / future wire-up.
const premiumStatDefs = [
  { value: '4', labelKey: 'mainPremiumStat_0_label', textKey: 'mainPremiumStat_0_text' },
  { value: '€1.4B+', labelKey: 'mainPremiumStat_1_label', textKey: 'mainPremiumStat_1_text' },
  { value: '34%', labelKey: 'mainPremiumStat_2_label', textKey: 'mainPremiumStat_2_text' },
]

const premiumModeDefs = [
  {
    id: 'auction',
    i18nKey: 'auction',
    number: '01',
    to: '/auction?filter=auction',
    anchorId: 'strategy-auction',
    objectsId: 'objects-auction',
    image: '/images/home-sale-formats/summer-2026/sale-format-auction-summer.webp',
    Icon: FaGavel,
  },
  {
    id: 'buy-now',
    i18nKey: 'buyNow',
    number: '02',
    to: '/auction/buy-now',
    anchorId: 'strategy-buy-now',
    objectsId: 'objects-buy-now',
    image: '/images/home-sale-formats/summer-2026/sale-format-buy-now-summer.webp',
    Icon: FaBolt,
  },
  {
    id: 'shares',
    i18nKey: 'shares',
    number: '03',
    to: '/shares',
    anchorId: 'strategy-shares',
    objectsId: 'objects-shares',
    image: '/images/home-sale-formats/summer-2026/sale-format-shares-summer.webp',
    Icon: FaGem,
  },
  {
    id: 'debts',
    i18nKey: 'debts',
    number: '04',
    to: '/debts',
    anchorId: 'strategy-debts',
    objectsId: 'objects-debts',
    image: '/images/home-sale-formats/summer-2026/sale-format-debts-summer.webp',
    Icon: FiPieChart,
  },
]

// Not rendered on MainPage today. Keyed for reuse / future wire-up.
const premiumFlowDefs = [
  { step: '01', titleKey: 'mainPremiumFlow_0_title', textKey: 'mainPremiumFlow_0_text' },
  { step: '02', titleKey: 'mainPremiumFlow_1_title', textKey: 'mainPremiumFlow_1_text' },
  { step: '03', titleKey: 'mainPremiumFlow_2_title', textKey: 'mainPremiumFlow_2_text' },
]

// Not rendered on MainPage today. Keyed for reuse / future wire-up.
const premiumProofKeys = [
  'mainPremiumProof_0',
  'mainPremiumProof_1',
  'mainPremiumProof_2',
  'mainPremiumProof_3',
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

// Demo fixtures: not used in home showcases (API-driven). May surface only via AI chat rec IDs.
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
      'Luxury property in the heart of Manhattan. Modern apartment with panoramic city views. Near top restaurants, shops and cultural landmarks.',
    owner: { firstName: 'John', lastName: 'Smith' },
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
      'Beautiful villa in upscale Costa Adeje. Modern design, spacious terraces with ocean views. Near beaches, golf clubs and restaurants.',
    owner: { firstName: 'Carlos', lastName: 'Rodriguez' },
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
      'Cozy home in Los Cristianos, one of Tenerife’s most popular resorts. Close to the beach, shops and restaurants. Quiet spot with great year-round climate.',
    owner: { firstName: 'Maria', lastName: 'Gonzalez' },
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
      'Bright apartment in historic Puerto de la Cruz. Unique north-island location with a mild climate. Near the botanical garden, black-sand beaches and many sights.',
    owner: { firstName: 'Antonio', lastName: 'Martinez' },
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
    name: 'Adeje Ocean Residence',
    location: 'Costa Adeje, Tenerife',
    price: 8500372,
    coordinates: [28.2916, -16.6291],
    owner: { firstName: 'Jose', lastName: 'Mendez' },
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
    endTime: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000 + 58 * 60 * 1000 + 53 * 1000).toISOString(), // 100 days (green — 3+ months)
    beds: 2,
    baths: 1,
    sqft: 850,
    description:
      'Modern apartment in prestigious Costa Adeje. Elite complex with pool and amenities. Near top beaches, golf courses and fine dining.',
  },
]

const villasData = [
  {
    id: 1,
    name: 'Villa Paradise',
    location: 'Costa Adeje, Tenerife',
    price: 12000000,
    coordinates: [28.2916, -16.6291],
    owner: { firstName: 'Francisco', lastName: 'Garcia' },
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
    endTime: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000 + 58 * 60 * 1000 + 53 * 1000).toISOString(), // 70 days (orange — 2–3 months)
    beds: 4,
    baths: 3,
    sqft: 2500,
    description:
      'Luxury villa in upscale Costa Adeje with panoramic ocean views. Private pool, terraces, modern kitchen. Near beaches, golf clubs and restaurants.',
  },
]

const flatsData = [
  {
    id: 1,
    name: 'Modern city-center apartment',
    location: 'Moscow, Tverskaya St., 15',
    price: 12500000,
    coordinates: [55.7558, 37.6173],
    owner: { firstName: 'Alexander', lastName: 'Ivanov' },
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
    endTime: new Date(Date.now() + 92 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000 + 58 * 60 * 1000 + 53 * 1000).toISOString(), // 92 days (green — 3+ months)
    beds: 2,
    baths: 1,
    sqft: 65,
    description:
      'Spacious two-bedroom apartment in central Moscow. Renovated, panoramic windows, park view. Large living room, modern kitchen. Furniture and appliances in excellent condition. Courtyard parking.',
  },
]

const townhousesData = [
  {
    id: 1,
    name: 'Townhouse in a gated community',
    location: 'Moscow Region, Odintsovo, Sadovaya St., 15',
    price: 24500000,
    coordinates: [55.6759, 37.2784],
    owner: { firstName: 'Vladimir', lastName: 'Novikov' },
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
      'Modern townhouse in a gated community. Two floors, garage, 600 m² plot. Fireplace, terrace, modern appliances. Secured grounds and playground.',
  },
]

function MainPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const premiumModes = useMemo(
    () =>
      premiumModeDefs.map((mode) => {
        const k = mode.i18nKey
        return {
          ...mode,
          eyebrow: t(`mainPremiumMode_${k}_eyebrow`),
          benefit: t(`mainPremiumMode_${k}_benefit`),
          proof: t(`mainPremiumMode_${k}_proof`),
          title: t(`mainPremiumMode_${k}_title`),
          text: t(`mainPremiumMode_${k}_text`),
          caption: t(`mainPremiumMode_${k}_caption`),
          actionText: t(`mainPremiumMode_${k}_action`),
          imageAlt: t(`mainPremiumMode_${k}_imageAlt`),
        }
      }),
    [t, i18n.language],
  )
  // premiumStatDefs / premiumFlowDefs / premiumProofKeys: i18n-ready, not rendered on this page.
  const { user, isLoaded: userLoaded } = useUser()
  const { isFavorite, toggleFavorite } = usePropertyFavorites()
  const [isLanguageOpen, setIsLanguageOpen] = useState(false)
  const [propertyMode] = useState('buy') // 'rent' for rentals, 'buy' for purchase
  const [activeNav, setActiveNav] = useState('home')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isManagerChatOpen, setIsManagerChatOpen] = useState(false)
  const [managerChatInput, setManagerChatInput] = useState('')
  const aiAssistantHiddenByFooter = useSiteFooterNear()
  /** Matches hero @media (max-width: 768px): two CTAs in a row — short label on both */
  const [isHeroCtaAdaptive, setIsHeroCtaAdaptive] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [isSlowAIResponse, setIsSlowAIResponse] = useState(false)
  const slowResponseTimerRef = useRef(null)
  const chatHistoryLoadedRef = useRef(false) // Flag tracking chat history load
  const [userPhoto, setUserPhoto] = useState(null) // User photo
  const [isLoggedIn, setIsLoggedIn] = useState(false) // Auth status
  const [hasIncompleteProfile, setHasIncompleteProfile] = useState(false) // Profile has incomplete fields
  const [userPreferences, setUserPreferences] = useState({
    purpose: null, // for_self | for_rent | investment
    budget: null,
    location: null,
    propertyType: null, // apartment | villa | house
    rooms: null,
    area: null,
    other: null,
    managerContactRequested: false,
    managerContactPendingChoice: false,
    preferredContact: null // 'phone' | 'email' | 'whatsapp' | 'telegram' | 'live_chat'
  })
  
  // Merge all property data
  const allProperties = useMemo(() => {
    const combined = [
      ...recommendedProperties.map(p => ({ ...p, source: 'recommended' })),
      ...nearbyProperties.map(p => ({ ...p, source: 'nearby' })),
      ...apartmentsData.map(p => ({ ...p, source: 'apartment' })),
      ...villasData.map(p => ({ ...p, source: 'villa' })),
      ...flatsData.map(p => ({ ...p, source: 'flat' })),
      ...townhousesData.map(p => ({ ...p, source: 'townhouse' }))
    ]
    // Filter to Spain and Dubai
    return filterPropertiesByLocation(combined)
  }, [])
  
  // Unique user/session id
  const getChatUserId = useMemo(() => {
    // If signed in, use user id
    if (isLoggedIn) {
      const userData = getUserData()
      const userId = userData.id || localStorage.getItem('userId')
      if (userId) {
        return `user_${userId}`
      }
    }
    
    // If anonymous, create/reuse a session id
    let sessionId = localStorage.getItem('chatSessionId')
    if (!sessionId) {
      // Generate unique session id
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

  // Load chat history from localStorage on mount or user change
  const lastChatUserIdRef = useRef(null)
  useEffect(() => {
    const chatUserId = getChatUserId
    // Load history only when user id changes
    if (lastChatUserIdRef.current !== chatUserId) {
      try {
        const historyKey = `aiChatHistory_${chatUserId}`
        const preferencesKey = `aiChatPreferences_${chatUserId}`
        
        // Load message history
        const savedChatHistory = localStorage.getItem(historyKey)
        if (savedChatHistory) {
          const parsed = JSON.parse(savedChatHistory)
          // Convert timestamp strings to Date
          const messagesWithDates = parsed.map(msg => ({
            ...msg,
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
          }))
          setChatMessages(
            messagesWithDates.map((msg) => refreshAssistantMessageCopy(msg, t('chatWelcomeMessage'))),
          )
        } else {
          setChatMessages([{
            id: 1,
            text: t('chatWelcomeMessage'),
            sender: 'bot',
            timestamp: new Date(),
            buttons: null,
          }])
        }
        
        // Load user preferences
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
  }, [getChatUserId]) // Reload when user id changes

  // Persist chat history to localStorage and sync to server for Smart Assistant
  useEffect(() => {
    if (chatHistoryLoadedRef.current && chatMessages.length > 0) {
      try {
        const chatUserId = getChatUserId
        const historyKey = `aiChatHistory_${chatUserId}`
        // Save history in localStorage keyed by user
        localStorage.setItem(historyKey, JSON.stringify(chatMessages))
        // Sync to server for Smart Assistant admin
        const userData = getUserData()
        syncAssistantLead(chatUserId, chatMessages, userPreferences, userData?.isLoggedIn ? userData : null)
      } catch (error) {
        console.error('Ошибка при сохранении истории чата:', error)
      }
    }
  }, [chatMessages, userPreferences, getChatUserId])

  // Save user preferences to localStorage
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

  // Chat history stays in localStorage and is not cleared on page close
  // Each user only sees their own conversation
  
  // Debug: i18n state
  // Check whether the profile is complete
  const checkProfileCompleteness = (userData) => {
    if (!userData) return false
    
    // Check important fields
    const hasFirstName = userData.first_name && userData.first_name.trim() !== ''
    const hasLastName = userData.last_name && userData.last_name.trim() !== ''
    const hasEmail = userData.email && userData.email.trim() !== '' && userData.is_verified === 1
    const hasPhone = userData.phone_number && userData.phone_number.trim() !== ''
    const hasAddress = userData.address && userData.address.trim() !== ''
    const hasPassportSeries = userData.passport_series && userData.passport_series.trim() !== ''
    const hasPassportNumber = userData.passport_number && userData.passport_number.trim() !== ''
    
    // Profile is incomplete if:
    // 1. Missing first name (required)
    // 2. Missing last name (important)
    // 3. No verified email or phone (at least one contact)
    // 4. No address (optional)
    // 5. No passport data (series or number) (optional)
    
    // Base required fields
    const missingBasicFields = !hasFirstName || !hasLastName || (!hasEmail && !hasPhone)
    
    // Optional fields (show indicator if any missing)
    const missingOptionalFields = !hasAddress || (!hasPassportSeries && !hasPassportNumber)
    
    // Profile incomplete if base OR optional fields are missing
    const isIncomplete = missingBasicFields || missingOptionalFields
    
    return isIncomplete
  }

  // Load user photo and check profile completeness
  useEffect(() => {
    const loadUserPhotoAndCheckProfile = async () => {
      // Check Clerk auth
      if (userLoaded && user) {
        // User signed in via Clerk
        const clerkPhoto = user.imageUrl || user.profileImageUrl || null
        setUserPhoto(clerkPhoto)
        setIsLoggedIn(true)
        
        // Try loading DB data for a full check
        const userData = getUserData()
        let profileIncomplete = false
        
        // Use numeric DB id from localStorage, not Clerk id
        const dbUserId = localStorage.getItem('userId')
        if (userData && dbUserId && /^\d+$/.test(dbUserId)) {
          try {
            const dbUser = await fetchUserById(API_BASE_URL, dbUserId)
            if (dbUser) {
              // Check profile completeness from DB
              profileIncomplete = checkProfileCompleteness(dbUser)
              setHasIncompleteProfile(profileIncomplete)
            } else {
              // On request failure, check basic Clerk fields
              profileIncomplete = !user.firstName || !user.lastName || (!user.primaryEmailAddress?.emailAddress && !user.primaryPhoneNumber?.phoneNumber)
              setHasIncompleteProfile(profileIncomplete)
            }
          } catch (error) {
            console.warn('⚠️ Не удалось загрузить данные из БД для Clerk пользователя:', error)
            // On error, check basic Clerk fields
            profileIncomplete = !user.firstName || !user.lastName || (!user.primaryEmailAddress?.emailAddress && !user.primaryPhoneNumber?.phoneNumber)
            setHasIncompleteProfile(profileIncomplete)
          }
        } else {
          // If no id in localStorage, check basic Clerk fields
          profileIncomplete = !user.firstName || !user.lastName || (!user.primaryEmailAddress?.emailAddress && !user.primaryPhoneNumber?.phoneNumber)
          setHasIncompleteProfile(profileIncomplete)
        }
      } else {
        // Check legacy auth system
        const userData = getUserData()
        if (userData.isLoggedIn) {
          setIsLoggedIn(true)
          
          // First try photo from localStorage
          let photo = userData.picture || null
          let profileIncomplete = false
          
          // Load DB data to check completeness
          // Use numeric DB id from localStorage, not Clerk id
          const dbUserId = localStorage.getItem('userId')
          if (dbUserId && /^\d+$/.test(dbUserId)) {
            try {
              const result = await fetchUserById(API_BASE_URL, dbUserId, { includeMeta: true })
              
              // User not found in DB (404) — stale session, clear it
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
                  
                  // Check profile completeness
                  profileIncomplete = checkProfileCompleteness(dbUser)
                  setHasIncompleteProfile(profileIncomplete)
                  
                  // Prefer user_photo when present
                  if (dbUser.user_photo && !photo) {
                    const photoPath = dbUser.user_photo
                    photo = photoPath.startsWith('http') 
                      ? photoPath 
                      : `${API_BASE_URL.replace('/api', '')}${photoPath}`
                    
                    // Update localStorage with photo
                    const updatedUserData = {
                      ...userData,
                      picture: photo
                    }
                    localStorage.setItem('userData', JSON.stringify(updatedUserData))
                  }
              }
            } catch (error) {
              console.warn('⚠️ Не удалось загрузить данные из БД:', error)
              // If DB load fails, fall back to localStorage
              profileIncomplete = !userData.name || (!userData.email && !userData.phone)
              setHasIncompleteProfile(profileIncomplete)
            }
          } else {
            // If no id, check localStorage only
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
    
    // Refresh on window focus (user returns to the page)
    const handleFocus = () => {
      loadUserPhotoAndCheckProfile()
    }
    
    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [user, userLoaded, location.pathname]) // Refresh on route change

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

  /** LoginModal entry: from home hero — default (form step 2), otherwise header wizard */
  const [mainLoginModalAuthEntry, setMainLoginModalAuthEntry] = useState('header_wizard')
  /** Become-seller / become-buyer modal for signed-in users with the other role */
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

  // Scroll progress for Numbers section: 0 = section at bottom, 1 = content centered (white)
  useEffect(() => {
    const el = landingStatsRef.current
    if (!el) return
    const onScroll = () => {
      const rect = el.getBoundingClientRect()
      const viewportCenter = window.innerHeight / 2
      const sectionCenter = rect.top + rect.height / 2
      // progress 0: section center below viewport center; 1: at/above center
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

  // Filter by search query
  const filterBySearch = (properties) => {
    if (!searchQuery) return properties
    const query = searchQuery.toLowerCase()
    return properties.filter(property => 
      (property.name && property.name.toLowerCase().includes(query)) ||
      (property.location && property.location.toLowerCase().includes(query))
    )
  }

  // Pages available for search
  const cabinetProfilePath = getCabinetProfilePath()
  const cabinetDataPath = getCabinetDataPath()
  const sellerCabinet = isSellerCabinetRole()
  const searchablePages = [
    {
      path: '/',
      keywords: ['главная', 'home', 'начало', 'старт'],
      title: t('home'),
      requiresAuth: false,
      allowedRoles: ['buyer', 'seller', 'owner', 'admin', 'client'] // Available to everyone
    },
    {
      path: '/auction',
      keywords: ['аукцион', 'auction', 'торги', 'продажа', 'недвижимость'],
      title: t('auction'),
      requiresAuth: false,
      allowedRoles: ['buyer', 'seller', 'owner', 'admin', 'client'] // Available to everyone
    },
    {
      path: '/map',
      keywords: ['карта', 'map', 'карты', 'локация', 'место'],
      title: t('map'),
      requiresAuth: true,
      allowedRoles: ['buyer', 'seller', 'owner', 'admin', 'client']
    },
    {
      path: '/chat?manager=1',
      keywords: ['поддержка', 'support', 'чат', 'chat', 'сообщения', 'messages', 'переписка', 'техподдержка'],
      title: t('chat'),
      requiresAuth: true,
      allowedRoles: ['buyer', 'seller', 'owner', 'admin', 'client']
    },
    {
      path: cabinetProfilePath,
      keywords: ['профиль', 'profile', 'аккаунт', 'личный кабинет', 'личный', 'кабинет', 'настройки', 'settings'],
      title: t('profile'),
      requiresAuth: true,
      allowedRoles: sellerCabinet ? ['seller', 'owner', 'admin'] : ['buyer', 'client', 'admin'],
    },
    {
      path: '/favorites',
      keywords: ['избранное', 'favorites', 'избранные', 'закладки', 'bookmarks'],
      title: t('favorites'),
      requiresAuth: true,
      allowedRoles: ['buyer', 'client', 'admin'] // Buyers and admins only
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
      title: t('buyerCabinet_tileDepositTitle'),
      requiresAuth: true,
      allowedRoles: ['buyer', 'client', 'admin'] // Buyers and admins only
    },
    {
      path: cabinetDataPath,
      keywords: ['данные', 'data', 'информация', 'information', 'персональные данные'],
      title: t('data'),
      requiresAuth: true,
      allowedRoles: sellerCabinet ? ['seller', 'owner', 'admin'] : ['buyer', 'client', 'admin'],
    },
    {
      path: '/subscriptions',
      keywords: ['подписки', 'subscriptions', 'подписка', 'subscription', 'тарифы', 'tariffs'],
      title: t('subscriptions'),
      requiresAuth: true,
      allowedRoles: ['buyer', 'client', 'admin'] // Buyers and admins only
    },
    {
      path: '/profile?history=1',
      keywords: ['история', 'history', 'история покупок', 'покупки', 'purchases'],
      title: t('history'),
      requiresAuth: true,
      allowedRoles: ['buyer', 'client', 'admin'] // Buyers and admins only
    },
    {
      path: '/owner',
      keywords: ['кабинет продавца', 'owner', 'продавец', 'seller', 'владелец', 'dashboard', 'дашборд', 'панель продавца'],
      title: t('roleSwitch_sellerCabinet'),
      requiresAuth: true,
      requiresRole: ['seller', 'owner'],
      allowedRoles: ['seller', 'owner', 'admin'] // Sellers and admins only
    },
    {
      path: '/owner/property/new',
      keywords: ['добавить недвижимость', 'add property', 'новая недвижимость', 'создать объявление', 'разместить'],
      title: t('addProperty'),
      requiresAuth: true,
      requiresRole: ['seller', 'owner'],
      allowedRoles: ['seller', 'owner', 'admin'] // Sellers and admins only
    },
    {
      path: '/admin',
      keywords: ['админ', 'admin', 'администратор', 'administrator', 'панель администратора', 'админка'],
      title: t('adminPanel'),
      requiresAuth: true,
      requiresRole: ['admin'],
      allowedRoles: ['admin'] // Admins only
    }
  ]

  // Current user role
  const getUserRole = () => {
    const userData = getUserData()
    const localRole = localStorage.getItem('userRole')
    const storedRole = userData.role || localRole || 'client'
    const isAdmin = localStorage.getItem('isAdminLoggedIn') === 'true' && storedRole === 'admin'
    const isOwner = storedRole === 'seller' || storedRole === 'owner' || localStorage.getItem('isOwnerLoggedIn') === 'true'
    
    // Admin takes priority
    if (isAdmin) return 'admin'
    
    // Check seller/owner
    if (isOwner) {
      return storedRole === 'seller' ? 'seller' : 'owner'
    }
    
    // Everyone else is a buyer (buyer or client)
    // If role is explicitly buyer return buyer, else client
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

  // Open LoginModal from a global request (e.g. toast Sign in / Register)
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

  // Page search
  const searchPages = (query) => {
    if (!query.trim()) {
      setPageSearchResults([])
      return
    }

    const queryLower = query.toLowerCase().trim()
    const currentUserRole = getUserRole()
    
    const results = searchablePages
      .filter(page => {
        // Match by keywords
        const matchesKeywords = page.keywords.some(keyword => 
          keyword.toLowerCase().includes(queryLower) || queryLower.includes(keyword.toLowerCase())
        )
        
        // Match by title
        const matchesTitle = page.title.toLowerCase().includes(queryLower)
        
        if (!(matchesKeywords || matchesTitle)) {
          return false
        }
        
        // Filter by user role
        // If anonymous, show only pages that do not require auth
        const userData = getUserData()
        const isUserLoggedIn = isLoggedIn || (userLoaded && user) || userData.isLoggedIn
        
        if (!isUserLoggedIn) {
          return !page.requiresAuth
        }
        
        // If page allows all roles or has no role limits
        if (!page.allowedRoles || page.allowedRoles.length === 0) {
          return true
        }
        
        // Strictly check whether the user role is in the allow-list
        // If role is not listed — hide the page entirely
        return page.allowedRoles.includes(currentUserRole)
      })
      .map(page => ({
        ...page,
        // Check auth
        canAccess: checkPageAccess(page)
      }))

    setPageSearchResults(results)
  }

  // Check page access
  const checkPageAccess = (page) => {
    // If the page does not require auth
    if (!page.requiresAuth) {
      return { allowed: true }
    }

    // Check auth
    const userData = getUserData()
    const isUserLoggedIn = isLoggedIn || (userLoaded && user) || userData.isLoggedIn

    if (!isUserLoggedIn) {
      return { 
        allowed: false, 
        reason: 'auth',
        message: t('pageAccessNeedLogin')
      }
    }

    // Check role when required
    if (page.requiresRole) {
      const userRole = userData.role || localStorage.getItem('userRole') || 'client'
      const isAdmin = localStorage.getItem('isAdminLoggedIn') === 'true' && userRole === 'admin'
      const isOwner = userRole === 'seller' || userRole === 'owner' || localStorage.getItem('isOwnerLoggedIn') === 'true'

      if (page.requiresRole.includes('admin') && !isAdmin) {
        return { 
          allowed: false, 
          reason: 'role',
          message: t('pageAccessAdminsOnly')
        }
      }

      if (page.requiresRole.includes('seller') && !isOwner && !isAdmin) {
        return { 
          allowed: false, 
          reason: 'role',
          message: t('pageAccessSellersOnly')
        }
      }
    }

    return { allowed: true }
  }

  // Handle search result selection
  const handleSearchResultClick = (page) => {
    const access = checkPageAccess(page)
    
    if (!access.allowed) {
      if (access.reason === 'auth') {
        setIsSearchOpen(false)
        setSearchQuery('')
        setMainLoginModalAuthEntry('header_wizard')
        setIsLoginModalOpen(true)
      } else {
        // Show access error message
        alert(access.message)
      }
      return
    }

    // Navigate to the page
    if (page.path === '/deposit' || page.path === '/wallet') {
      navigateToWallet(navigate, location.pathname)
    } else {
      navigate(page.path)
    }
    setIsSearchOpen(false)
    setSearchQuery('')
    setPageSearchResults([])
  }

  // Handle search query change
  useEffect(() => {
    if (isSearchOpen && searchQuery.trim()) {
      searchPages(searchQuery)
    } else if (!searchQuery.trim()) {
      setPageSearchResults([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, isSearchOpen])

  // Handle click outside search
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target) && isSearchOpen) {
        // Do not close search on outside click unless it is another header control
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

  // Filtered data
  // State for approved listings from API
  // and the combined listings for the home page
  const [homeProperties, setHomeProperties] = useState([])
  /** Until the first listings GET for showcases finishes — skeletons in Auction / Debts / shares carousels, etc. */
  const [homePropertiesLoading, setHomePropertiesLoading] = useState(true)

  const filteredRecommended = useMemo(() => filterBySearch(recommendedProperties), [searchQuery])
  const filteredNearby = useMemo(() => filterBySearch(nearbyProperties), [searchQuery])

  // Three parallel GETs: approved + auctions + debts → homeProperties (no duplicate type requests)
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

  // On footer language change, reload listings with translations
  useEffect(() => {
    loadHomeProperties()
  }, [i18n.language, loadHomeProperties])

  // SSE: new lots and admin test timer — no F5 (same channel as /auction)
  useEffect(() => {
    let eventSource = null
    let reconnectTimer = null
    let cancelled = false

    const connect = async () => {
      const base = await getEventsBaseUrl()
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

  // Home page sections (by sale type)
  const auctionSection = useMemo(() => {
    // Auctions without Buy Now price; share listings hidden from auction
    const base = homeProperties.filter((p) => {
      if (!p || !p.isAuction) return false
      if (p.is_shared_ownership === 1 || p.is_shared_ownership === true) return false
      // Home Auctions section excludes debts
      const isDebt =
        p.sale_type === 'debt' ||
        p.is_debt === 1 ||
        p.is_debt === true ||
        p.has_debt === 1 ||
        p.has_debt === true ||
        ['red', 'yellow', 'green'].includes(String(p.debt_severity || '').toLowerCase())
      if (isDebt) return false

      // If Buy Now is actually available, this is not a pure auction.
      return !hasBuyNowOption(p)
    }).filter((p) => !isAuctionListingEnded(p))

    return filterBySearch(base).slice(0, 7)
  }, [homeProperties, searchQuery])

  const buyNowSection = useMemo(() => {
    // Auctions with Buy Now; share listings hidden
    const base = homeProperties.filter((p) => {
      if (!p || !p.isAuction) return false
      if (p.is_shared_ownership === 1 || p.is_shared_ownership === true) return false
      // Home Buy Now section excludes debts
      const isDebt =
        p.sale_type === 'debt' ||
        p.is_debt === 1 ||
        p.is_debt === true ||
        p.has_debt === 1 ||
        p.has_debt === true ||
        ['red', 'yellow', 'green'].includes(String(p.debt_severity || '').toLowerCase())
      if (isDebt) return false
      return hasBuyNowOption(p)
    }).filter((p) => !isAuctionListingEnded(p))

    return filterBySearch(base).slice(0, 7)
  }, [homeProperties, searchQuery])

  const debtsSection = useMemo(() => {
    // Debt listings (expect flags from backend)
    const base = homeProperties.filter((p) =>
      p &&
      (p.sale_type === 'debt' ||
       p.is_debt === 1 ||
       p.is_debt === true ||
       p.has_debt === 1 ||
       p.has_debt === true ||
       ['red', 'yellow', 'green'].includes(String(p.debt_severity || '').toLowerCase()))
    )

    return filterBySearch(base).slice(0, 7)
  }, [homeProperties, searchQuery])

  const sharesSection = useMemo(() => {
    // Co-ownership / shares
    const base = homeProperties.filter((p) =>
      p &&
      (p.is_share === 1 ||
       p.is_share === true ||
       p.is_shared_ownership === 1 ||
       p.is_shared_ownership === true)
    )

    return filterBySearch(base).slice(0, 7)
  }, [homeProperties, searchQuery])

  // Read URL params and apply filters
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

            // Apply auction filter when present
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
        // Reset filters when there are no params
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

    // Check viewport width for desktop
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

  // Menu close is handled via backdrop onClick

  // Toggle body overflow when the menu is open (keep background to avoid a white flash)
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

  const clearChatHistory = () => {
    if (!window.confirm(t('clearChatConfirm'))) return
    try {
      localStorage.removeItem(`aiChatHistory_${getChatUserId}`)
      localStorage.removeItem(`aiChatPreferences_${getChatUserId}`)
    } catch (error) {
      console.error('Ошибка при очистке истории чата:', error)
    }
    setUserPreferences({
      purpose: null,
      budget: null,
      location: null,
      propertyType: null,
      rooms: null,
      area: null,
      other: null,
      managerContactRequested: false,
      managerContactPendingChoice: false,
      preferredContact: null,
    })
    setChatInput('')
    setChatMessages([
      {
        id: Date.now(),
        text: t('chatWelcomeMessage'),
        sender: 'bot',
        timestamp: new Date(),
        buttons: null,
      },
    ])
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

    // Append user message
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

    // Update preferences from the message
    const lowerMessage = userMessage.toLowerCase()
    
    // Detect goal
    if (lowerMessage.includes('для себя') || lowerMessage === 'для себя' || lowerMessage.includes('сам') || lowerMessage.includes('личн') || lowerMessage.includes('for myself') || lowerMessage.includes('personal use')) {
      setUserPreferences(prev => ({ ...prev, purpose: 'for_self' }))
    } else if (lowerMessage.includes('под сдачу') || lowerMessage === 'под сдачу' || lowerMessage.includes('сдачу') || lowerMessage.includes('аренд') || lowerMessage.includes('for rent') || lowerMessage.includes('rental')) {
      setUserPreferences(prev => ({ ...prev, purpose: 'for_rent' }))
    } else if (lowerMessage.includes('инвестиц') || lowerMessage === 'инвестиции' || lowerMessage.includes('инвест') || lowerMessage.includes('invest')) {
      setUserPreferences(prev => ({ ...prev, purpose: 'investment' }))
    }
    
    // Extract budget from the message (convert RUB to EUR when needed)
    const budgetMatch = userMessage.match(/(\d+[\s,.]?\d*)\s*(тыс|млн|k|m|€|\$|eur|usd|евро|доллар|рубл|₽|rub)/i)
    if (budgetMatch) {
      let budget = parseFloat(budgetMatch[1].replace(/\s/g, '').replace(',', '.'))
      const unit = budgetMatch[2].toLowerCase()
      
      // Convert to EUR (approx. 1 EUR = 100 RUB)
      const eurToRubRate = 100
      
      if (unit.includes('млн') || unit === 'm') {
        budget = budget * 1000000
      } else if (unit.includes('тыс') || unit === 'k') {
        budget = budget * 1000
      }
      
      // If RUB is mentioned, convert to EUR
      if (unit.includes('рубл') || unit.includes('₽') || unit.includes('rub')) {
        budget = budget / eurToRubRate
      }
      
      setUserPreferences(prev => ({ ...prev, budget }))
    }
    
    // Detect property type
    if (lowerMessage.includes('квартир') || lowerMessage.includes('апартамент') || lowerMessage.includes('apartment')) {
      setUserPreferences(prev => ({ ...prev, propertyType: 'apartment' }))
    } else if (lowerMessage.includes('вилл') || lowerMessage.includes('villa')) {
      setUserPreferences(prev => ({ ...prev, propertyType: 'villa' }))
    } else if (lowerMessage.includes('дом') || lowerMessage.includes('таунхаус') || lowerMessage.includes('townhouse') || lowerMessage.includes('house')) {
      setUserPreferences(prev => ({ ...prev, propertyType: 'house' }))
    }
    
    // Extract room count
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
      // Get AI reply
      const response = await askPropertyAssistant(
        [...chatMessages, userMessageObj],
        userPreferences,
        allProperties,
        { t },
      )

      // Append bot reply
      const botMessage = {
        id: Date.now() + 1,
        text: response.text,
        sender: 'bot',
        timestamp: new Date(),
        buttons: response.buttons,
        recommendations: response.recommendations,
        navigation: response.navigation,
        yieldEstimate: response.yieldEstimate,
      }

      setChatMessages((prev) => [...prev, botMessage])
    } catch (error) {
      console.error('Ошибка при обращении к AI:', error)
      const errorMessage = {
        id: Date.now() + 1,
        text: t('chatError'),
        sender: 'bot',
        timestamp: new Date(),
        buttons: null,
        recommendations: null,
        navigation: null,
        yieldEstimate: null,
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

  // Helpers for translated items (refresh on language change)
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
      to: '/auction/buy-now',
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
  
  // Auto-translate of user content disabled due to API limits
  // Static content is translated via i18next

  const handleCategoryClick = (categoryLabel) => {
    if (categoryLabel === 'Map') {
      goMapOrChatIfAuthed('/map')
      return
    }

    setIsLoading(true)
    setActiveCategory(categoryLabel)
    
    // Update URL with filter params
    navigate(buildAuctionFilterPath({ categorySlug: legacyCategoryToSlug(categoryLabel) }), { replace: true })

    setTimeout(() => {
      // Filter listings by type
      let filteredRecommended = recommendedProperties
      let filteredNearby = nearbyProperties

      if (categoryLabel === 'House') {
        // Filter houses only
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
        buy_now: '/auction/buy-now',
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
    // If property is missing, try finding it in local arrays
    let propertyToNavigate = property

    if (!propertyToNavigate) {
      // Look up in recommendedProperties and nearbyProperties
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
          // Fallback when Web Share is unsupported
        })
    }
  }

  const handleBookNow = () => {
    // Booking handler
    showNotification(t('bookingFeatureSoon', 'Booking will be available soon.'))
  }

  const handleCallBroker = () => {
    if (selectedProperty?.broker?.phone) {
      window.location.href = `tel:${selectedProperty.broker.phone}`
    }
  }

  const handleChatBroker = () => {
    // Broker chat handler
    showNotification(t('brokerChatFeatureSoon', 'Broker chat will be available soon.'))
  }

  // Collect all properties for the map
  const allPropertiesForMap = [
    ...recommendedProperties.map((p) => ({ ...p, category: 'recommended' })),
    ...nearbyProperties.map((p) => ({ ...p, category: 'nearby' })),
  ]

  // Render error guard
  if (!recommendedProperties || !nearbyProperties) {
    return <div className="app">{t('loading')}</div>
  }

  return (
    <div className="app app--premium-home">
      <header
        className={`new-header ${isMenuOpen ? 'new-header--menu-open' : ''} ${
          isSearchOpen ? 'new-header--search-open' : ''
        }`}
      >
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
            aria-label={t('menu')}
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
                        {result.canAccess.reason === 'auth' ? `🔒 ${t('mainSearch_loginRequired')}` : `⚠️ ${t('mainSearch_noAccess')}`}
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
              aria-label={t('openSearch')}
            >
              <FiSearch size={20} />
            </button>
        <HeaderPinnedCatalogNav />
        <button 
          className={`new-header__user-btn ${isLoggedIn ? 'new-header__user-btn--avatar' : ''}`}
          onClick={() => {
            const userData = getUserData()
            const role = readStoredUserRole()

            if (role === 'admin') {
              navigate('/admin')
              return
            }

            if (userData.isLoggedIn || (userLoaded && user)) {
              navigate(getHeaderAccountPath(role))
              return
            }

            setMainLoginModalAuthEntry('header_wizard')
            setIsLoginModalOpen(true)
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
              {t('mainPremiumHero_badge')}
            </div>
            <h1 id="premium-home-title" className="premium-hero__title">
              {t('mainPremiumHero_titleBefore')}{' '}
              <span>{t('mainPremiumHero_titleAccent')}</span>
            </h1>
            <p className="premium-hero__lead">
              {t('mainPremiumHero_lead')}
            </p>

            <form className="premium-search" onSubmit={handlePremiumSearchSubmit}>
              <label className="premium-search__field premium-search__field--wide">
                <span>{t('mainPremiumSearch_queryLabel')}</span>
                <span className="premium-search__input-wrap">
                  <FiSearch size={19} aria-hidden />
                  <input
                    name="query"
                    type="search"
                    placeholder={t('mainPremiumSearchPlaceholder')}
                    autoComplete="off"
                  />
                </span>
              </label>
              <label className="premium-search__field">
                <span>{t('mainPremiumSearch_strategyLabel')}</span>
                <select name="dealType" defaultValue="auction">
                  <option value="auction">{t('mainPremiumSearch_optAuction')}</option>
                  <option value="buy_now">{t('mainPremiumSearch_optBuyNow')}</option>
                  <option value="shares">{t('mainPremiumSearch_optShares')}</option>
                  <option value="debts">{t('mainPremiumSearch_optDebts')}</option>
                </select>
              </label>
              <label className="premium-search__field">
                <span>{t('mainPremiumSearch_locationLabel')}</span>
                <select name="location" defaultValue="tenerife">
                  <option value="tenerife">{t('mainPremiumSearch_locTenerife')}</option>
                  <option value="spain">{t('mainPremiumSearch_locSpain')}</option>
                  <option value="global">{t('mainPremiumSearch_locGlobal')}</option>
                </select>
              </label>
              <button type="submit" className="premium-search__submit">
                <span>{t('mainPremiumSearch_submit')}</span>
                <FiArrowRight size={18} strokeWidth={2.4} aria-hidden />
              </button>
            </form>

            <div className="premium-search__filters" aria-label={t('mainPremiumSearch_filtersAria')}>
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
                alt={t('mainPremiumObject_alt')}
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
              <div className="premium-object-card__top">
                <span>{t('mainPremiumObject_weekBadge')}</span>
                <strong>Villa Atlantic</strong>
              </div>
              <div className="premium-object-card__bottom">
                <div>
                  <span>{t('mainPremiumObject_strategyLabel')}</span>
                  <strong>Auction + Buy Now</strong>
                </div>
                <div>
                  <span>{t('mainPremiumObject_guideLabel')}</span>
                  <strong>€1.82M</strong>
                </div>
              </div>
            </div>

            <div className="premium-object-note premium-object-note--seller">
              <span>{t('mainPremiumNote_sellerTitle')}</span>
              <strong>{t('mainPremiumNote_sellerText')}</strong>
            </div>
            <div className="premium-object-note premium-object-note--buyer">
              <span>{t('mainPremiumNote_buyerTitle')}</span>
              <strong>{t('mainPremiumNote_buyerText')}</strong>
            </div>
          </div>

          <div className="premium-role-grid">
            <button type="button" className="premium-role-card" onClick={handleHeroInvestorCardClick}>
              <span className="premium-role-card__icon">
                <FiShoppingCart size={18} aria-hidden />
              </span>
              <strong>{t('mainPremiumRole_buyerTitle')}</strong>
              <span>{t('mainPremiumRole_buyerText')}</span>
            </button>
            <button type="button" className="premium-role-card" onClick={handleHeroSellerCardClick}>
              <span className="premium-role-card__icon">
                <FaHome size={18} aria-hidden />
              </span>
              <strong>{t('mainPremiumRole_sellerTitle')}</strong>
              <span>{t('mainPremiumRole_sellerText')}</span>
            </button>
          </div>
        </div>

        <nav className="premium-hero__strategy-rail" aria-label={t('mainPremiumHero_strategyRailAria')}>
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
            <div className="chat-widget__header-actions">
              <button
                type="button"
                className="chat-widget__close"
                onClick={clearChatHistory}
                aria-label={t('clearChat')}
                title={t('clearChat')}
                disabled={isLoadingAI}
              >
                <FiTrash2 size={18} />
              </button>
              <button
                type="button"
                className="chat-widget__close"
                onClick={toggleChat}
                aria-label={t('closeChat')}
              >
                <FiX size={20} />
              </button>
            </div>
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
                  {message.yieldEstimate && (
                    <div className="chat-widget__yield">
                      <div className="chat-widget__yield-title">{t('chatYieldTitle')}</div>
                      <div className="chat-widget__yield-grid">
                        <div>
                          <span>{t('chatYieldPrice')}</span>
                          <strong>{Number(message.yieldEstimate.price).toLocaleString(getUiIntlLocale())} €</strong>
                        </div>
                        <div>
                          <span>{t('chatYieldAnnual')}</span>
                          <strong>{Number(message.yieldEstimate.annualRent).toLocaleString(getUiIntlLocale())} €</strong>
                        </div>
                        <div>
                          <span>{t('chatYieldMonthly')}</span>
                          <strong>{Number(message.yieldEstimate.monthlyIncome).toLocaleString(getUiIntlLocale())} €</strong>
                        </div>
                        <div>
                          <span>{t('chatYieldRate')}</span>
                          <strong>{message.yieldEstimate.yieldPercent}%</strong>
                        </div>
                      </div>
                      {message.yieldEstimate.note ? (
                        <p className="chat-widget__yield-note">
                          {String(message.yieldEstimate.note).includes('_') && !String(message.yieldEstimate.note).includes(' ')
                            ? t(message.yieldEstimate.note)
                            : message.yieldEstimate.note}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        className="chat-widget__yield-cta"
                        onClick={() => {
                          navigate('/calculator')
                          setIsChatOpen(false)
                        }}
                      >
                        {t('chatYieldInvestorCta')}
                      </button>
                    </div>
                  )}
                  {message.navigation && message.navigation.length > 0 && (
                    <div className="chat-widget__navigation">
                      <div className="chat-widget__navigation-title">{t('chatNavigationTitle')}</div>
                      <div className="chat-widget__navigation-list">
                        {message.navigation.map((nav) => (
                          <button
                            key={nav.path}
                            type="button"
                            className="chat-widget__navigation-link"
                            onClick={() => {
                              navigate(nav.path)
                              setIsChatOpen(false)
                            }}
                          >
                            <span>{getSiteLinkLabel(nav, t)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {message.recommendations && message.recommendations.length > 0 && (
                    <div className="chat-widget__recommendations">
                      <div className="chat-widget__recommendations-title">{t('chatRecommendationsTitle')}</div>
                      {message.recommendations.map((recId) => {
                        const property = allProperties.find(p => p.id === recId || String(p.id) === String(recId))
                        if (!property) return null
                        const propertyName = property.name || property.title || t('listingDefault')
                        const propertyPrice = property.price ? `${property.price.toLocaleString(getUiIntlLocale())} €` : t('priceNotSpecified')
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
                              <div className="chat-widget__recommendation-cta">{t('chatOpenListing')}</div>
                            </div>
                          </a>
                        )
                      })}
                    </div>
                  )}
                </div>
                {visibleAssistantButtons(message.buttons).length > 0 && (
                  <div className="chat-widget__buttons chat-widget__buttons--contact">
                    {visibleAssistantButtons(message.buttons).map((button, index) => {
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
                  <div className="chat-widget__slow-hint">
                    {isSlowAIResponse ? t('chatSlowHint') : t('chatWaitingReply')}
                  </div>
                </div>
              </div>
            )}
          </div>

          <form className="chat-widget__input-form" onSubmit={handleChatSubmit}>
            <input
              type="text"
              className="chat-widget__input"
              placeholder={
                isLoadingAI ? t('chatWaitingReply') : t('chatPlaceholder')
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
