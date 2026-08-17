import { useTranslation } from 'react-i18next'
import {
  countryCodeForStoredCountry,
  flagEmojiForStoredCountry,
} from '../utils/countryFlagFromStored'
import { publicAsset } from '../utils/publicAsset'
import './BiddingHistoryModal.css'

const BIDS_EMPTY_IMAGE = publicAsset('images/bids-empty-step-chart.png')

function flagImageUrl(code) {
  if (!code) return null
  return `https://flagcdn.com/w160/${String(code).toLowerCase()}.png`
}

function BidderFlag({ code, emoji, country, className = '' }) {
  const src = flagImageUrl(code)
  return (
    <span className={`bh-flag ${className}`.trim()} title={country || undefined} aria-hidden>
      {src ? (
        <img className="bh-flag__img" src={src} alt="" loading="lazy" decoding="async" />
      ) : (
        <span className="bh-flag__emoji">{emoji || '🏳️'}</span>
      )}
    </span>
  )
}

export function bidderKey(bid) {
  return String(bid?.user_id_number ?? bid?.user_id ?? bid?.id ?? '')
}

/** Лучшая ставка на пользователя, по убыванию суммы. */
export function buildBidLeaderboard(bids = []) {
  const bestByUser = new Map()
  for (const bid of bids) {
    const key = bidderKey(bid)
    if (!key) continue
    const prev = bestByUser.get(key)
    const amount = Number(bid.bid_amount) || 0
    if (!prev || amount > prev.amount) {
      const country = bid.bidder_country || ''
      bestByUser.set(key, {
        key,
        amount,
        bid,
        flag: flagEmojiForStoredCountry(country) || '',
        countryCode: countryCodeForStoredCountry(country) || '',
        country,
        label: bid.user_id_number || bid.user_id || '',
      })
    }
  }
  return [...bestByUser.values()].sort((a, b) => b.amount - a.amount)
}

/**
 * Три столбца + карточки поверх + горизонтальный список (включая топ-3).
 */
export default function BidLeaderboardBoard({
  leaderboard = [],
  formatPrice,
  animateIn = true,
  restLimit = null,
  className = '',
  emptyText,
}) {
  const { t } = useTranslation()
  const podium = leaderboard.slice(0, 3)
  // Горизонтальные карточки: все места (топ-3 дублируются), с лимитом для превью
  const listRows =
    restLimit == null
      ? leaderboard
      : leaderboard.slice(0, Math.max(3, restLimit + 3))

  if (!leaderboard.length) {
    return (
      <div
        className={['bh-empty', className].filter(Boolean).join(' ')}
        role="status"
      >
        <img
          className="bh-empty__image"
          src={BIDS_EMPTY_IMAGE}
          alt=""
          loading="lazy"
          decoding="async"
        />
        <p className="bh-empty__text">{emptyText || t('bidHistoryNoBids')}</p>
      </div>
    )
  }

  const podiumSlots = [
    { place: 2, entry: podium[1], rankKey: 'bidHistoryRank2', tone: 'second' },
    { place: 1, entry: podium[0], rankKey: 'bidHistoryRank1', tone: 'first' },
    { place: 3, entry: podium[2], rankKey: 'bidHistoryRank3', tone: 'third' },
  ]

  return (
    <div
      className={['bh-board', animateIn ? 'bh-board--in' : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="bh-podium" aria-label={t('bidHistoryPodiumAria')}>
        {podiumSlots.map(({ place, entry, rankKey, tone }) => {
          if (!entry) {
            return (
              <div
                key={`empty-${place}`}
                className={`bh-podium__col bh-podium__col--${tone} bh-podium__col--empty`}
              />
            )
          }
          return (
            <div key={entry.key} className={`bh-podium__col bh-podium__col--${tone}`}>
              <article className="bh-card">
                {place === 1 ? (
                  <span className="bh-card__crown" aria-hidden>
                    <svg viewBox="0 0 24 24" width="28" height="28">
                      <path
                        fill="currentColor"
                        d="M5 16l-2-9 5 4 4-7 4 7 5-4-2 9H5zm0 2h14v2H5v-2z"
                      />
                    </svg>
                  </span>
                ) : null}
                <BidderFlag
                  className="bh-card__flag"
                  code={entry.countryCode}
                  emoji={entry.flag}
                  country={entry.country}
                />
                <span className="bh-card__name">#{entry.label}</span>
                <span className="bh-card__amount">{formatPrice(entry.amount)}</span>
              </article>
              <div className={`bh-podium__bar bh-podium__bar--${tone}`}>
                <span className="bh-podium__place">{t(rankKey)}</span>
              </div>
            </div>
          )
        })}
      </div>

      <ol
        className="bh-rank-list"
        aria-label={t('bidHistoryAllBids', { count: leaderboard.length })}
      >
        {listRows.map((entry, index) => (
          <li
            key={`list-${entry.key}`}
            className={`bh-rank-item${index < 3 ? ` bh-rank-item--top${index + 1}` : ''}`}
            style={{ '--bh-i': index }}
          >
            <span className="bh-rank-item__place">{index + 1}</span>
            <BidderFlag
              className="bh-rank-item__flag"
              code={entry.countryCode}
              emoji={entry.flag}
              country={entry.country}
            />
            <span className="bh-rank-item__name">#{entry.label}</span>
            <span className="bh-rank-item__amount">{formatPrice(entry.amount)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
