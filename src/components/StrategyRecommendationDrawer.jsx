import { FiPlay, FiStar } from 'react-icons/fi'
import BuyerSheetShell from './buyer-mobile/BuyerSheetShell'
import { publicAsset } from '../utils/publicAsset'
import './StrategyRecommendationDrawer.css'

const COPY = {
  ru: {
    eyebrow: 'Персональная подборка',
    title: 'Помочь с подбором объекта?',
    description:
      'Расскажем подробнее о каждом формате и поможем понять, какой вариант подходит именно вам.',
    stories: '7 коротких историй',
    duration: 'около 1 минуты',
    watch: 'Смотреть',
    close: 'Закрыть подборку',
  },
  en: {
    eyebrow: 'Personal selection',
    title: 'Need help choosing a property?',
    description:
      'We will explain every format and help you understand which option fits you best.',
    stories: '7 short stories',
    duration: 'about 1 minute',
    watch: 'Watch',
    close: 'Close selection',
  },
}

const PREVIEW_ICONS = [
  publicAsset('images/home-sale-formats/icons/auction-3d.png'),
  publicAsset('images/home-sale-formats/icons/buy-now-3d.png'),
  publicAsset('images/home-sale-formats/icons/shares-3d.png'),
]

export default function StrategyRecommendationDrawer({
  isOpen,
  onClose,
  onWatch,
  language = 'ru',
}) {
  const locale = String(language || 'ru').toLowerCase().startsWith('ru') ? 'ru' : 'en'
  const copy = COPY[locale]

  return (
    <BuyerSheetShell
        isOpen={isOpen}
        onClose={onClose}
        titleId="strategy-recommendation-title"
        describedBy="strategy-recommendation-description"
        tone="choice"
        closeLabel={copy.close}
        className="strategy-recommendation-drawer"
        footer={
          <button type="button" className="strategy-recommendation-drawer__watch" onClick={onWatch}>
            <span>{copy.watch}</span>
            <span className="strategy-recommendation-drawer__watch-icon" aria-hidden="true">
              <FiPlay fill="currentColor" />
            </span>
          </button>
        }
      >
        <div className="strategy-recommendation-drawer__hero" aria-hidden="true">
          <span className="strategy-recommendation-drawer__glow" />
          <span className="strategy-recommendation-drawer__orbit" />
          <span className="strategy-recommendation-drawer__spark strategy-recommendation-drawer__spark--one">
            <FiStar fill="currentColor" />
          </span>
          <span className="strategy-recommendation-drawer__spark strategy-recommendation-drawer__spark--two">
            <FiStar fill="currentColor" />
          </span>
          {PREVIEW_ICONS.map((src, index) => (
            <span
              key={src}
              className={`strategy-recommendation-drawer__preview strategy-recommendation-drawer__preview--${index + 1}`}
            >
              <img src={src} alt="" width="512" height="512" />
            </span>
          ))}
        </div>

        <div className="strategy-recommendation-drawer__copy">
          <span className="strategy-recommendation-drawer__eyebrow">{copy.eyebrow}</span>
          <h2 id="strategy-recommendation-title">{copy.title}</h2>
          <p id="strategy-recommendation-description">{copy.description}</p>
          <div className="strategy-recommendation-drawer__meta" aria-label={`${copy.stories}, ${copy.duration}`}>
            <span>{copy.stories}</span>
            <i aria-hidden="true" />
            <span>{copy.duration}</span>
          </div>
        </div>
    </BuyerSheetShell>
  )
}
