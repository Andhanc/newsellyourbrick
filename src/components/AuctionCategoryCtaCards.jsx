import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiArrowRight, FiBriefcase } from 'react-icons/fi'
import { FaChartPie, FaFileInvoiceDollar } from 'react-icons/fa'
import { publicAsset } from '../utils/publicAsset'
import './AuctionCategoryCtaCards.css'

const CTA_IMAGES = {
  shares: publicAsset('images/test-drive/cta-shares.png'),
  debts: publicAsset('images/test-drive/cta-debts.png'),
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
    accent: 'coral',
  },
  {
    id: 'debts',
    titleKey: 'auctionPageCtaDebtsTitle',
    textKey: 'auctionPageCtaDebtsText',
    ctaKey: 'auctionPageCtaDebtsButton',
    to: '/debts',
    icon: FaFileInvoiceDollar,
    image: CTA_IMAGES.debts,
    accent: 'mint',
  },
  {
    id: 'test-drive',
    titleKey: 'auctionPageCtaTestDriveTitle',
    textKey: 'auctionPageCtaTestDriveText',
    ctaKey: 'auctionPageCtaTestDriveButton',
    to: '/test-drive',
    icon: FiBriefcase,
    image: CTA_IMAGES.testDrive,
    accent: 'teal',
  },
]

function AuctionCategoryCtaCards() {
  const { t } = useTranslation()

  return (
    <section className="auction-cta-cards" aria-label={t('auctionPageCtaAria')}>
      <div className="auction-cta-cards__inner">
        <div className="auction-cta-cards__grid">
          {AUCTION_CTA_CARDS.map(({ id, titleKey, textKey, ctaKey, to, icon: Icon, image, accent }) => (
            <Link key={id} to={to} className="auction-cta-cards__card">
              <img src={image} alt="" />
              <span className="auction-cta-cards__card-overlay" aria-hidden />
              <span className={`auction-cta-cards__icon auction-cta-cards__icon--${accent}`}>
                <Icon size={27} aria-hidden />
              </span>
              <span className="auction-cta-cards__content">
                <strong>{t(titleKey)}</strong>
                <span>{t(textKey)}</span>
              </span>
              <em className="auction-cta-cards__button">
                {t(ctaKey)}
                <FiArrowRight size={16} aria-hidden />
              </em>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export default AuctionCategoryCtaCards
