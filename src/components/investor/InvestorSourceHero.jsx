import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Heart, PenLine } from 'lucide-react'
import { applyPropertyImageFallback } from '../../utils/propertyImage'
import './InvestorSourceHero.css'

const CURATED_PROPERTY_CARDS = [
  {
    src: '/images/sellyourbrick/about/about-hero-villa.jpg',
    alt: 'Современная вилла с бассейном',
  },
  {
    src: '/images/sellyourbrick/about/mission-villa.jpg',
    alt: 'Современная вилла с панорамным бассейном',
  },
  {
    src: '/images/external/villa-palazzetta-1-577bba2c20.jpg',
    alt: 'Средиземноморская вилла у моря',
  },
  {
    src: '/images/external/shares-hero-villa.jpg',
    alt: 'Премиальная вилла с бассейном',
  },
  {
    src: '/images/external/photo-1613490493576-7fde63acd811-d800e5fb95.jpg',
    alt: 'Минималистичная вилла для продажи',
  },
  {
    src: '/images/external/photo-1600607687939-ce8a6c25118c-3f6b6fdeda.jpg',
    alt: 'Светлая дизайнерская квартира',
  },
  {
    src: '/images/external/photo-1600607687920-4e2a09cf159d-841fb3874c.jpg',
    alt: 'Современная квартира с открытой планировкой',
  },
]

function getPortfolioCards() {
  return CURATED_PROPERTY_CARDS
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
  const [hasStarted, setHasStarted] = useState(false)
  const portfolioCards = getPortfolioCards()

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
              <h1 aria-label="Создайте лучшее будущее для себя">
                <span>Создайте</span>
                <span>лучшее <mark>будущее</mark></span>
                <span>для себя</span>
              </h1>
            </div>

            <div className="investor-source-hero__portfolio" aria-label="Объекты для инвестиционного анализа">
              <span className="investor-source-hero__pair-link investor-source-hero__pair-link--upper" aria-hidden="true" />
              <span className="investor-source-hero__pair-link investor-source-hero__pair-link--lower" aria-hidden="true" />
              {portfolioCards.map((card, index) => (
                <figure
                  key={`${card.src}-${index}`}
                  className={`investor-source-hero__property-card investor-source-hero__property-card--${index + 1}`}
                >
                  <img
                    src={card.src}
                    alt={card.alt}
                    loading={index < 3 ? 'eager' : 'lazy'}
                    fetchPriority={index === 0 ? 'high' : 'auto'}
                    onError={(event) => applyPropertyImageFallback(event, CURATED_PROPERTY_CARDS[index].src)}
                  />
                </figure>
              ))}
            </div>

            <button
              type="button"
              className="investor-source-hero__start"
              onClick={() => setHasStarted(true)}
            >
              <span>Начать сейчас</span>
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
              <span>Шаг 1 из 3</span>
              <h2>Выберите объект</h2>
              <p>Возьмите сохранённый объект или начните новый расчёт.</p>
            </div>

            <fieldset className="investor-source-hero__choices">
              <legend className="sr-only">Источник данных для расчёта</legend>

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
                  <strong>Из понравившегося</strong>
                  <small>Выбрать сохранённый объект</small>
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
                  <strong>Свои значения</strong>
                  <small>Начать новый расчёт с нуля</small>
                </span>
              </label>
            </fieldset>

            <button
              type="button"
              className="investor-source-hero__back"
              onClick={() => setHasStarted(false)}
            >
              Вернуться назад
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
              <button
                type="button"
                className="investor-source-hero__setup-back"
                onClick={onBackToSource}
                aria-label="Вернуться к выбору способа"
              >
                <ArrowLeft size={20} strokeWidth={2.2} />
              </button>
              <div>
                <span>Шаг 1 из 3</span>
                <h2>{selectedSource === 'favorites' ? 'Выберите объект' : 'Свои значения'}</h2>
                <p>
                  {selectedSource === 'favorites'
                    ? 'Нажмите на объект, который хотите рассчитать.'
                    : 'Укажите исходные данные — остальное можно уточнить позже.'}
                </p>
              </div>
            </motion.header>

            {selectedSource === 'favorites' ? (
              favoriteItems.length > 0 ? (
                <motion.div
                  className="investor-source-hero__favorites-grid"
                  variants={setupItemMotion}
                  role="listbox"
                  aria-label="Понравившиеся объекты"
                >
                  {favoriteItems.map((item, index) => {
                    const property = item.property || {}
                    const isSelected = item.key === selectedFavoriteKey
                    const title = property.title || property.name || `Объект ${index + 1}`

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
                          <small>{getFavoritePriceLabel?.(item) || 'Цена уточняется'}</small>
                        </span>
                      </motion.button>
                    )
                  })}
                </motion.div>
              ) : (
                <motion.div className="investor-source-hero__empty" variants={setupItemMotion}>
                  <span className="investor-source-hero__empty-icon" aria-hidden="true">
                    <Heart size={28} strokeWidth={1.8} />
                  </span>
                  <h3>Здесь пока пусто</h3>
                  <p>Добавьте понравившиеся объекты, чтобы сравнить их инвестиционный потенциал.</p>
                  <Link to="/favorites">Перейти в понравившееся</Link>
                </motion.div>
              )
            ) : (
              <motion.div className="investor-source-hero__manual-card" variants={setupItemMotion}>
                <label className="investor-source-hero__manual-field">
                  <span>Цена покупки</span>
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
                  <span>Ремонт и подготовка</span>
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
                  Дальше выберем стратегию, срок владения и ожидаемый доход.
                </p>
              </motion.div>
            )}

            {(selectedSource === 'manual' || favoriteItems.length > 0) && (
              <motion.button
                type="button"
                className="investor-source-hero__continue"
                onClick={onContinue}
                disabled={!canContinue}
                variants={setupItemMotion}
              >
                <span>Продолжить</span>
                <span className="investor-source-hero__continue-arrow" aria-hidden="true">
                  <ArrowRight size={20} strokeWidth={2.2} />
                </span>
              </motion.button>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}
