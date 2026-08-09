import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Heart, PenLine, Sparkles } from 'lucide-react'
import { applyPropertyImageFallback } from '../../utils/propertyImage'
import { publicAsset } from '../../utils/publicAsset'
import './InvestorSourceHero.css'

const FAVORITES_EMPTY_IMAGE = publicAsset('images/investor-favorites-empty-illustration.png')

function buildCuratedPropertyCards(t) {
  return [
    {
      src: '/images/sellyourbrick/about/about-hero-villa.jpg',
      alt: t('smartInvestor_cardAlt1'),
      name: t('smartInvestor_cityMarbella'),
      price: '€248 000',
      tone: 'amber',
    },
    {
      src: '/images/external/photo-1600607687939-ce8a6c25118c-3f6b6fdeda.jpg',
      alt: t('smartInvestor_cardAlt2'),
      name: t('smartInvestor_cityValencia'),
      price: '€186 400',
      tone: 'silver',
    },
    {
      src: '/images/external/villa-palazzetta-1-577bba2c20.jpg',
      alt: t('smartInvestor_cardAlt3'),
      name: t('smartInvestor_cityBarcelona'),
      price: '€312 900',
      tone: 'sky',
    },
  ]
}

const sceneMotion = {
  initial: { opacity: 0, y: 18, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -16, scale: 0.985 },
  transition: { duration: 0.46, ease: [0.22, 1, 0.36, 1] },
}

const setupMotion = {
  initial: { opacity: 0, y: 34, scale: 0.96, filter: 'blur(10px)' },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.58,
      ease: [0.16, 1, 0.3, 1],
      when: 'beforeChildren',
      staggerChildren: 0.065,
    },
  },
  exit: { opacity: 0, y: -22, scale: 0.98, filter: 'blur(7px)' },
}

const setupItemMotion = {
  initial: { opacity: 0, y: 24, scale: 0.94 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.46, ease: [0.16, 1, 0.3, 1] },
  },
}

export default function InvestorSourceHero({
  favoriteItems = [],
  selectedSource,
  selectedFavoriteKey,
  propertyPrice,
  renovationCost,
  onSelectFavorites,
  onSelectManual,
  onPickFavorite,
  onPropertyPriceChange,
  onRenovationCostChange,
  getFavoriteImageProps,
  getFavoritePriceLabel,
  onContinue,
  canContinue,
  onBackToSource,
}) {
  const { t } = useTranslation()
  const [hasStarted, setHasStarted] = useState(false)
  const portfolioCards = useMemo(() => buildCuratedPropertyCards(t), [t])

  useEffect(() => {
    const scrollRoot = document.querySelector('.app-layout')
    if (scrollRoot) {
      scrollRoot.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [hasStarted])

  return (
    <div className={`investor-source-hero${hasStarted ? ' is-choosing' : ' is-intro'}`}>
      <AnimatePresence mode="wait" initial={false}>
        {!hasStarted ? (
          <motion.section
            key="intro"
            className="investor-source-hero__scene investor-source-hero__intro"
            {...sceneMotion}
          >
            <div className="investor-source-hero__headline">
              <h1 aria-label={t('smartInvestor_introAria')}>
                <span>{t('smartInvestor_introLine1')}</span>
                <span>{t('smartInvestor_introLine2Before')} <mark>{t('smartInvestor_introLine2Mark')}</mark></span>
                <span>{t('smartInvestor_introLine3')}</span>
              </h1>
            </div>

            <div className="investor-source-hero__portfolio" aria-label={t('smartInvestor_portfolioAria')}>
              {portfolioCards.map((card, index) => (
                <button
                  key={`${card.src}-${index}`}
                  type="button"
                  className={`investor-source-hero__property-card investor-source-hero__property-card--${card.tone} investor-source-hero__property-card--${index + 1}`}
                  aria-label={t('smartInvestor_startCalcAria', { name: card.name, price: card.price })}
                  onClick={() => setHasStarted(true)}
                >
                  <span className="investor-source-hero__property-avatar">
                    <img
                      src={card.src}
                      alt=""
                      loading={index === 0 ? 'eager' : 'lazy'}
                      fetchPriority={index === 0 ? 'high' : 'auto'}
                      onError={(event) => applyPropertyImageFallback(event, portfolioCards[index].src)}
                    />
                  </span>
                  <span className="investor-source-hero__property-copy">
                    <strong>{card.name}</strong>
                    <b>{card.price}</b>
                  </span>
                  <span className="investor-source-hero__property-action" aria-hidden="true">
                    <Sparkles size={12} strokeWidth={2.4} />
                    {t('smartInvestor_calculate')}
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="investor-source-hero__start"
              onClick={() => setHasStarted(true)}
            >
              <span>{t('smartInvestor_startNow')}</span>
              <span className="investor-source-hero__start-arrow" aria-hidden="true">
                <ArrowRight size={20} strokeWidth={2.2} />
              </span>
            </button>
          </motion.section>
        ) : !selectedSource ? (
          <motion.section
            key="source"
            className="investor-source-hero__scene investor-source-hero__source"
            {...sceneMotion}
          >
            <div className="investor-source-hero__source-copy">
              <h2>{t('smartInvestor_chooseProperty')}</h2>
              <p>{t('smartInvestor_choosePropertyLead')}</p>
            </div>

            <fieldset className="investor-source-hero__choices">
              <legend className="sr-only">{t('smartInvestor_sourceLegend')}</legend>

              <label className={`investor-source-hero__choice${selectedSource === 'favorites' ? ' is-selected' : ''}`}>
                <input
                  type="radio"
                  name="investor-source"
                  value="favorites"
                  checked={selectedSource === 'favorites'}
                  onChange={onSelectFavorites}
                />
                <span className="investor-source-hero__choice-icon" aria-hidden="true">
                  <Heart size={22} strokeWidth={2} />
                </span>
                <span className="investor-source-hero__choice-copy">
                  <strong>{t('smartInvestor_fromFavorites')}</strong>
                  <small>{t('smartInvestor_fromFavoritesHint')}</small>
                </span>
              </label>

              <label className={`investor-source-hero__choice${selectedSource === 'manual' ? ' is-selected' : ''}`}>
                <input
                  type="radio"
                  name="investor-source"
                  value="manual"
                  checked={selectedSource === 'manual'}
                  onChange={onSelectManual}
                />
                <span className="investor-source-hero__choice-icon" aria-hidden="true">
                  <PenLine size={22} strokeWidth={2} />
                </span>
                <span className="investor-source-hero__choice-copy">
                  <strong>{t('smartInvestor_manualValues')}</strong>
                  <small>{t('smartInvestor_manualValuesHint')}</small>
                </span>
              </label>
            </fieldset>

            <button
              type="button"
              className="investor-source-hero__back"
              onClick={() => setHasStarted(false)}
            >
              {t('smartInvestor_goBack')}
            </button>
          </motion.section>
        ) : (
          <motion.section
            key={`setup-${selectedSource}`}
            className={`investor-source-hero__scene investor-source-hero__setup investor-source-hero__setup--${selectedSource}`}
            variants={setupMotion}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <motion.header className="investor-source-hero__setup-header" variants={setupItemMotion}>
              <h2>{selectedSource === 'favorites' ? t('smartInvestor_chooseProperty') : t('smartInvestor_manualValues')}</h2>
              <p>
                {selectedSource === 'favorites'
                  ? t('smartInvestor_pickFavoriteLead')
                  : t('smartInvestor_manualLead')}
              </p>
            </motion.header>

            {selectedSource === 'favorites' ? (
              favoriteItems.length > 0 ? (
                <motion.div
                  className="investor-source-hero__favorites-grid"
                  variants={setupItemMotion}
                  role="listbox"
                  aria-label={t('smartInvestor_favoritesAria')}
                >
                  {favoriteItems.map((item, index) => {
                    const property = item.property || {}
                    const isSelected = item.key === selectedFavoriteKey
                    const title = property.title || property.name || t('smartInvestor_propertyN', { n: index + 1 })

                    return (
                      <motion.button
                        key={item.key}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`investor-source-hero__favorite-card${isSelected ? ' is-selected' : ''}`}
                        onClick={() => onPickFavorite?.(item)}
                        variants={setupItemMotion}
                        whileTap={{ scale: 0.975 }}
                      >
                        <span className="investor-source-hero__favorite-image">
                          <img
                            {...(getFavoriteImageProps?.(item) || {})}
                            alt=""
                            loading={index < 4 ? 'eager' : 'lazy'}
                            onError={applyPropertyImageFallback}
                          />
                          <span className="investor-source-hero__favorite-check" aria-hidden="true">
                            <Check size={17} strokeWidth={2.6} />
                          </span>
                        </span>
                        <span className="investor-source-hero__favorite-copy">
                          <strong>{title}</strong>
                          <small>{getFavoritePriceLabel?.(item) || t('smartInvestor_priceTbd')}</small>
                        </span>
                      </motion.button>
                    )
                  })}
                </motion.div>
              ) : (
                <motion.div className="investor-source-hero__empty" variants={setupItemMotion}>
                  <img
                    className="investor-source-hero__empty-image"
                    src={FAVORITES_EMPTY_IMAGE}
                    alt=""
                    width={280}
                    height={280}
                    loading="eager"
                    decoding="async"
                  />
                  <h3>{t('smartInvestor_favoritesEmptyHeading')}</h3>
                  <p>{t('smartInvestor_favoritesEmptyBody')}</p>
                  <Link to="/favorites">{t('smartInvestor_goFavorites')}</Link>
                </motion.div>
              )
            ) : (
              <motion.div className="investor-source-hero__manual-fields" variants={setupItemMotion}>
                <label className="investor-source-hero__manual-field">
                  <span>{t('smartInvestor_purchasePrice')}</span>
                  <span className="investor-source-hero__manual-input">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      value={propertyPrice}
                      onChange={(event) => onPropertyPriceChange?.(event.target.value)}
                      placeholder="250 000"
                    />
                    <b>€</b>
                  </span>
                </label>

                <label className="investor-source-hero__manual-field">
                  <span>{t('smartInvestor_renovationPrep')}</span>
                  <span className="investor-source-hero__manual-input">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      value={renovationCost}
                      onChange={(event) => onRenovationCostChange?.(event.target.value)}
                      placeholder="0"
                    />
                    <b>€</b>
                  </span>
                </label>

                <p className="investor-source-hero__manual-note">
                  {t('smartInvestor_manualNote')}
                </p>
              </motion.div>
            )}

            <motion.div className="investor-source-hero__setup-footer" variants={setupItemMotion}>
              <button
                type="button"
                className="investor-source-hero__setup-back"
                onClick={onBackToSource}
              >
                {t('smartInvestor_pressToGoBack')}
              </button>
              {(selectedSource === 'manual' || favoriteItems.length > 0) && (
                <button
                  type="button"
                  className="investor-source-hero__continue"
                  onClick={onContinue}
                  disabled={!canContinue}
                >
                  <span>{t('smartInvestor_continue')}</span>
                  <span className="investor-source-hero__continue-arrow" aria-hidden="true">
                    <ArrowRight size={20} strokeWidth={2.2} />
                  </span>
                </button>
              )}
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}
