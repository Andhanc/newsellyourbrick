import { Link } from 'react-router-dom'
import { FiArrowRight } from 'react-icons/fi'
import '../components/PropertyList.css'
import '../components/AuctionPropertyCard.css'
import '../components/DebtsPropertyCard.css'
import '../components/SharesPropertyCard.css'
import './MainPage.css'
import LeadGenCta from '../components/LeadGenCta'
import SybLandingBottomSections from '../components/SybLandingBottomSections'
import SybLandingNewsShowcase from '../components/SybLandingNewsShowcase'
import HomePropertyShowcaseSection from '../components/HomePropertyShowcaseSection'
import LandingAnimatedStat from '../components/LandingAnimatedStat'
import { useMainPageDeferred } from './mainPageDeferredContext'

function BelowFoldBlock({ children, className }) {
  return <div className={className ? `main-below-fold-block ${className}` : 'main-below-fold-block'}>{children}</div>
}

export default function MainPageBelowFold() {
  const {
    t,
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
    isFavorite,
    toggleFavorite,
    ensureCanOpenProperty,
    showPropertyAuthRequiredToast,
    landingStatsRef,
    statsScrollProgress,
    homePropertiesLoading,
  } = useMainPageDeferred()

  return (
    <>
      <BelowFoldBlock>
        <HomePropertyShowcaseSection
          sectionClassName="apartments-section apartments-section--auction apartments-section--auction-showcase"
          title={t('auctionSectionTitle')}
          titleTo="/auction?filter=auction"
          subtitle={t('auctionSectionSubtitle')}
          ctaLabel={t('auctionSectionCta')}
          onCtaClick={() => navigate('/auction?filter=auction')}
          scrollerRef={auctionShowcaseScrollerRef}
          onScroll={scrollAuctionShowcase}
          loading={homePropertiesLoading}
          items={auctionSection}
          variant="auction"
          hideWhenEmpty
          t={t}
          navigate={navigate}
          isFavorite={isFavorite}
          toggleFavorite={toggleFavorite}
          ensureCanOpenProperty={ensureCanOpenProperty}
          showPropertyAuthRequiredToast={showPropertyAuthRequiredToast}
        />
      </BelowFoldBlock>

      <BelowFoldBlock>
        <HomePropertyShowcaseSection
          sectionClassName="apartments-section apartments-section--buy-now-showcase"
          containerClassName="apartments-section__container apartments-section__container--mint-panel"
          title={t('buyNowSectionTitle')}
          titleTo="/auction?filter=buy_now"
          subtitle={t('buyNowSectionSubtitle')}
          ctaLabel={t('buyNowSectionCta')}
          onCtaClick={() => navigate('/auction?filter=buy_now')}
          scrollerRef={buyNowShowcaseScrollerRef}
          onScroll={scrollBuyNowShowcase}
          loading={homePropertiesLoading}
          items={buyNowSection}
          variant="buyNow"
          hideWhenEmpty
          t={t}
          navigate={navigate}
          isFavorite={isFavorite}
          toggleFavorite={toggleFavorite}
          ensureCanOpenProperty={ensureCanOpenProperty}
          showPropertyAuthRequiredToast={showPropertyAuthRequiredToast}
        />
      </BelowFoldBlock>

      <BelowFoldBlock>
        <HomePropertyShowcaseSection
          sectionClassName="apartments-section apartments-section--debts-showcase"
          title={t('debtsTitle')}
          titleTo="/debts"
          subtitle={t('debtsSectionSubtitle')}
          ctaLabel={t('debtsSectionCta')}
          onCtaClick={() => navigate('/debts')}
          scrollerRef={debtsShowcaseScrollerRef}
          onScroll={scrollDebtsShowcase}
          loading={homePropertiesLoading}
          items={debtsSection}
          variant="debts"
          t={t}
          navigate={navigate}
          isFavorite={isFavorite}
          toggleFavorite={toggleFavorite}
          ensureCanOpenProperty={ensureCanOpenProperty}
          showPropertyAuthRequiredToast={showPropertyAuthRequiredToast}
        />
      </BelowFoldBlock>

      <BelowFoldBlock>
        <HomePropertyShowcaseSection
          sectionClassName="apartments-section apartments-section--shares-showcase"
          title={t('fractionalSaleTitle')}
          titleTo="/shares"
          subtitle={t('fractionalSectionSubtitle')}
          ctaLabel={t('fractionalSectionCta')}
          onCtaClick={() => {
            if (!ensureCanOpenProperty()) {
              showPropertyAuthRequiredToast()
              return
            }
            navigate('/shares')
          }}
          scrollerRef={sharesShowcaseScrollerRef}
          onScroll={scrollSharesShowcase}
          loading={homePropertiesLoading}
          items={sharesSection}
          variant="shares"
          t={t}
          navigate={navigate}
          isFavorite={isFavorite}
          toggleFavorite={toggleFavorite}
          ensureCanOpenProperty={ensureCanOpenProperty}
          showPropertyAuthRequiredToast={showPropertyAuthRequiredToast}
        />
      </BelowFoldBlock>

      <section
        ref={landingStatsRef}
        className="landing-stats"
        style={{ '--stats-scroll-progress': statsScrollProgress }}
      >
        <div className="landing-stats__bg-teal" aria-hidden="true" />
        <div className="landing-stats__bg-white-triangle" aria-hidden="true" />
        <div className="landing-stats__container">
          <div className="landing-stats__content">
            <BelowFoldBlock>
              <h2 className="landing-stats__title">{t('statsTitle')}</h2>
            </BelowFoldBlock>
            <div className="landing-stats__grid">
              <div className="landing-stat">
                <LandingAnimatedStat
                  className="landing-stat__value"
                  value={1.4}
                  prefix="€"
                  suffix="B+"
                  decimals={1}
                />
                <span className="landing-stat__label">{t('statLabel1')}</span>
              </div>
              <div className="landing-stat">
                <LandingAnimatedStat
                  className="landing-stat__value"
                  value={34}
                  suffix="%"
                />
                <span className="landing-stat__label">{t('statLabel2')}</span>
              </div>
            </div>
            <BelowFoldBlock>
              <div className="landing-stats__about-wrap">
                <Link to="/about" className="landing-stats__about-link">
                  <span className="landing-stats__about-link-text">{t('statsAboutMore')}</span>
                  <FiArrowRight className="landing-stats__about-link-icon" size={20} strokeWidth={2.25} aria-hidden />
                </Link>
              </div>
            </BelowFoldBlock>
          </div>
        </div>
      </section>

      <BelowFoldBlock>
        <SybLandingNewsShowcase />
      </BelowFoldBlock>

      <BelowFoldBlock>
        <LeadGenCta />
      </BelowFoldBlock>

      <SybLandingBottomSections />
    </>
  )
}
