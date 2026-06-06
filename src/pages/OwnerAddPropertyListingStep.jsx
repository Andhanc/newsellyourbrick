import { Gavel, Zap, PieChart, Shield, Target, Lightbulb, Check } from 'lucide-react'
import { OAP_LISTING_IMAGES } from './oapListingImages'
import './OwnerAddPropertyListingStep.css'

const LISTING_MODE_META = {
  auction: {
    Icon: Gavel,
    tone: 'teal',
  },
  auction_buy_now: {
    Icon: Zap,
    tone: 'violet',
  },
  shares: {
    Icon: PieChart,
    tone: 'blue',
  },
  debt: {
    Icon: Shield,
    tone: 'amber',
  },
  debt_auction: {
    Icon: Target,
    tone: 'slate',
  },
}

export default function OwnerAddPropertyListingStep({
  listingModes,
  listingMode,
  testDriveEnabled,
  errors = {},
  onSelectMode,
}) {
  return (
    <section className="oap-listing-step" aria-labelledby="oap-listing-title">
      <div className="oap-listing-step__layout">
        <div className="oap-listing-step__main">
          <header className="oap-listing-step__head">
            <h2 id="oap-listing-title" className="oap-listing-step__title">
              Выберите формат продажи
            </h2>
            <p className="oap-listing-step__subtitle">
              Определите способ публикации объекта на платформе
            </p>
          </header>

          <div className="oap-listing-step__card">
            <div className="oap-listing-step__section">
              <h3 className="oap-listing-step__section-title">Тип размещения</h3>
              {testDriveEnabled && (
                <p className="oap-listing-step__testdrive-note" role="note">
                  Для объявлений с тест-драйвом доступен только формат «Аукцион + Продать сейчас».
                </p>
              )}
              <div
                className={`oap-listing-step__modes${listingModes.length === 1 ? ' oap-listing-step__modes--single' : ''}`}
                role="radiogroup"
                aria-label="Формат продажи"
              >
                {listingModes.map((mode) => {
                  const meta = LISTING_MODE_META[mode.id] || LISTING_MODE_META.auction
                  const tone = mode.tone || meta.tone
                  const ModeIcon = meta.Icon
                  const isActive = listingMode === mode.id

                  return (
                    <button
                      key={mode.id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      className={`oap-listing-step__mode oap-listing-step__mode--${tone}${isActive ? ' oap-listing-step__mode--active' : ''}`}
                      onClick={() => onSelectMode(mode.id)}
                    >
                      <span
                        className={`oap-listing-step__mode-icon oap-listing-step__mode-icon--${tone}`}
                        aria-hidden
                      >
                        <ModeIcon size={20} strokeWidth={1.75} />
                      </span>
                      <span className="oap-listing-step__mode-body">
                        <span className="oap-listing-step__mode-label">{mode.label}</span>
                        <span className="oap-listing-step__mode-desc">{mode.description}</span>
                      </span>
                      <span className="oap-listing-step__mode-mark" aria-hidden>
                        {isActive ? <Check size={14} strokeWidth={2.5} /> : null}
                      </span>
                    </button>
                  )
                })}
              </div>
              {errors.listingMode && (
                <p className="oap-listing-step__error">{errors.listingMode}</p>
              )}
            </div>
          </div>
        </div>

        <aside className="oap-listing-step__sidebar" aria-label="Совет">
          <div className="oap-listing-step__sidebar-head">
            <span className="oap-listing-step__sidebar-icon" aria-hidden>
              <Lightbulb size={16} strokeWidth={2} />
            </span>
            <span className="oap-listing-step__sidebar-title">Совет</span>
          </div>
          <p className="oap-listing-step__sidebar-text">
            Выберите формат под ваш объект: классический аукцион, торги с мгновенным выкупом, продажа
            долей или работа с долговыми активами.
          </p>
          <p className="oap-listing-step__sidebar-text oap-listing-step__sidebar-text--extra">
            Аукцион с выкупом ускоряет сделку — покупатель может сразу забрать объект по фиксированной
            цене. Продажа долей подойдёт, если хотите привлечь нескольких инвесторов. Формат можно
            изменить до публикации объявления.
          </p>
          <div className="oap-listing-step__sidebar-illustration">
            <img
              src={OAP_LISTING_IMAGES.sidebarHero}
              alt=""
              className="oap-listing-step__sidebar-img"
            />
          </div>
        </aside>
      </div>
    </section>
  )
}
