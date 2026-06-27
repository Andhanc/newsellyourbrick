import { CO_INVESTMENT_PATH, TEST_DRIVE_PATH } from './sectionRoutes'

/** Коммерческие разделы для гайдов и блоков в новостях. */
export const PURCHASE_GUIDE_LINKS = [
  { path: '/auction', titleKey: 'auction', descriptionKey: 'seoGuideAuctionDesc' },
  { path: '/auction/buy-now', titleKey: 'buyNowSectionTitle', descriptionKey: 'seoGuideBuyNowDesc' },
  { path: CO_INVESTMENT_PATH, titleKey: 'coInvestment', descriptionKey: 'seoGuideCoInvestmentDesc' },
  { path: '/debts', titleKey: 'debtsTitle', descriptionKey: 'seoGuideDebtsDesc' },
  { path: TEST_DRIVE_PATH, titleKey: 'testDrive', descriptionKey: 'seoGuideTestDriveDesc' },
  { path: '/calculator', titleKey: 'calculator', descriptionKey: 'seoGuideCalculatorDesc' },
  { path: '/about', titleKey: 'aboutUs', descriptionKey: 'seoGuideAboutDesc' },
]

/** Ключевые разделы с главной (1 клик). */
export const HOME_KEY_SECTION_LINKS = [
  { path: '/auction', titleKey: 'auction', descriptionKey: 'homeKeySectionAuctionDesc' },
  { path: '/auction/buy-now', titleKey: 'buyNowSectionTitle', descriptionKey: 'homeKeySectionBuyNowDesc' },
  { path: CO_INVESTMENT_PATH, titleKey: 'coInvestment', descriptionKey: 'homeKeySectionCoInvestmentDesc' },
  { path: '/debts', titleKey: 'debtsTitle', descriptionKey: 'homeKeySectionDebtsDesc' },
  { path: TEST_DRIVE_PATH, titleKey: 'testDrive', descriptionKey: 'homeKeySectionTestDriveDesc' },
  { path: '/news', titleKey: 'news', descriptionKey: 'homeKeySectionNewsDesc' },
  { path: '/map', titleKey: 'mapLink', descriptionKey: 'homeKeySectionMapDesc' },
  { path: '/sections', titleKey: 'footerAllSections', descriptionKey: 'homeKeySectionAllDesc' },
]

/** Популярные geo-каталоги с главной (2 клика до листинга). */
export const HOME_CATALOG_QUICK_LINKS = [
  { path: '/uae/dubai/apartments', titleKey: 'homeCatalogDubaiApartments' },
  { path: '/spain/barcelona/apartments', titleKey: 'homeCatalogBarcelonaApartments' },
  { path: '/uae/dubai/villas', titleKey: 'homeCatalogDubaiVillas' },
]
