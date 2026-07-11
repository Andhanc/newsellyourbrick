import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiArrowRight, FiBriefcase } from 'react-icons/fi'
import { FaChartPie, FaFileInvoiceDollar, FaGavel } from 'react-icons/fa'
import { publicAsset } from '../utils/publicAsset'
import './AuctionCategoryCtaCards.css'

const CTA_IMAGES = {
  shares: publicAsset('images/test-drive/cta-shares.png'),
  debts: publicAsset('images/test-drive/cta-debts.png'),
  auction: publicAsset('images/test-drive/cta-auction.png'),
  testDrive: publicAsset('images/test-drive/cta-auction.png'),
}

const AUCTION_CTA_CARDS = [
  {
    id: 'shares',
    titleKey: 'auctionPageCtaSharesTitle',
    textKey: 'auctionPageCtaSharesText',
    ctaKey: 'auctionPageCtaSharesButton',
    to: '/shares',
    icon: FaChartPie,
    image: CTA_IMAGES.shares,
    accent: 'sage',
  },
  {
    id: 'debts',
    titleKey: 'auctionPageCtaDebtsTitle',
    textKey: 'auctionPageCtaDebtsText',
    ctaKey: 'auctionPageCtaDebtsButton',
    to: '/debts',
    icon: FaFileInvoiceDollar,
    image: CTA_IMAGES.debts,
    accent: 'teal',
  },
  {
    id: 'auction',
    titleKey: 'auctionPageCtaAuctionTitle',
    textKey: 'auctionPageCtaAuctionText',
    ctaKey: 'auctionPageCtaAuctionButton',
    to: '/auction',
    icon: FaGavel,
    image: CTA_IMAGES.auction,
    accent: 'teal',
  },
  {
    id: 'test-drive',
    titleKey: 'auctionPageCtaTestDriveTitle',
    textKey: 'auctionPageCtaTestDriveText',
    ctaKey: 'auctionPageCtaTestDriveButton',
    to: '/test-drive',
    icon: FiBriefcase,
    image: CTA_IMAGES.testDrive,
    accent: 'sage',
  },
]

const DEBTS_PAGE_CTA_CARD_IDS = ['shares', 'auction', 'test-drive']
const TEST_DRIVE_PAGE_CTA_CARD_IDS = ['shares', 'auction', 'debts']

const CTA_SECTION_TITLES = {
  default: {
    desktop: 'auctionPageCtaSectionTitle',
    pill: 'auctionPageCtaSectionTitleMobilePill',
    line2: 'auctionPageCtaSectionTitleMobileLine2',
  },
  testDrivePage: {
    desktop: 'auctionPageCtaSectionTitleOur',
    pill: 'auctionPageCtaSectionTitleOurMobilePill',
    line2: 'auctionPageCtaSectionTitleOurMobileLine2',
  },
}

function AuctionCategoryCtaCards({ variant = 'default' }) {
  const { t } = useTranslation()
  const titleKeys = variant === 'testDrivePage' ? CTA_SECTION_TITLES.testDrivePage : CTA_SECTION_TITLES.default
  const cards =
    variant === 'debtsPage'
      ? DEBTS_PAGE_CTA_CARD_IDS.map((id) => AUCTION_CTA_CARDS.find((card) => card.id === id)).filter(Boolean)
      : variant === 'testDrivePage'
        ? TEST_DRIVE_PAGE_CTA_CARD_IDS.map((id) => AUCTION_CTA_CARDS.find((card) => card.id === id)).filter(Boolean)
        : AUCTION_CTA_CARDS.filter((card) => card.id !== 'auction')

  return (
    <section className="auction-cta-cards" aria-labelledby="auction-cta-heading">
      <div className="auction-cta-cards__inner">
        <h2 id="auction-cta-heading" className="auction-cta-cards__title">
          <span className="auction-cta-cards__title-desktop">{t(titleKeys.desktop)}</span>
          <span className="auction-cta-cards__title-mobile">
            <span className="auction-cta-cards__title-line">
              <span className="auction-cta-cards__title-pill">{t(titleKeys.pill)}</span>
            </span>
            <span className="auction-cta-cards__title-line">{t(titleKeys.line2)}</span>
          </span>
        </h2>
        <div
          className={`auction-cta-cards__grid${
            cards.length === 2 ? ' auction-cta-cards__grid--duo' : ''
          }${cards.length === 3 ? ' auction-cta-cards__grid--trio' : ''}`}
        >
          {cards.map(({ id, titleKey, textKey, to, icon: Icon, image, accent }) => (
            <Link key={id} to={to} className={`auction-cta-cards__card auction-cta-cards__card--${accent}`}>
              <img src={image} alt="" />
              <span className="auction-cta-cards__card-overlay" aria-hidden />
              <span className={`auction-cta-cards__icon auction-cta-cards__icon--${accent}`}>
                <Icon size={27} aria-hidden />
              </span>
              <div className="auction-cta-cards__footer">
                <div className="auction-cta-cards__content">
                  <strong>{t(titleKey)}</strong>
                  <p>{t(textKey)}</p>
                </div>
                <em className="auction-cta-cards__button">
                  <span>{t('goTo')}</span>
                  <FiArrowRight className="auction-cta-cards__button-arrow" aria-hidden />
                </em>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export default AuctionCategoryCtaCards
