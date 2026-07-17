import { FiArrowUpRight, FiCheckCircle } from 'react-icons/fi'
import { formatPropertyPrice } from '../../utils/currency'
import { getPropertyCardImage } from '../../utils/propertyImage'
import { resolvePositivePropertyPrice } from '../../utils/compareDecision'
import './CompareDecisionSummary.css'

const FALLBACK_IMAGE = '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg'

function propertyView(item, index) {
  const property = item?.property || {}
  const price = resolvePositivePropertyPrice(property)
  return {
    title: property.name || property.title || `Объект ${index}`,
    image: getPropertyCardImage(property, FALLBACK_IMAGE),
    price: price != null && price !== ''
      ? formatPropertyPrice(price, property.currency || 'EUR', { compact: true })
      : 'Цена по запросу',
  }
}

function decisionText(summary) {
  if (!summary || summary.leader === 'unknown') return 'Пока недостаточно данных для ориентира'
  if (summary.leader === 'tie') return `Сигналы распределились поровну — ${summary.left}:${summary.right}`
  const leader = summary.leader === 'left' ? 'Объект 1' : 'Объект 2'
  return `Больше сигналов у ${leader.toLowerCase()} — ${summary.left}:${summary.right}`
}

function PropertyAction({ item, index, score, onSelect }) {
  const view = propertyView(item, index)
  return (
    <article className="compare-decision__property">
      <div className="compare-decision__property-main">
        <img
          src={view.image}
          alt=""
          aria-hidden="true"
          onError={(event) => {
            if (!event.currentTarget.src.endsWith(FALLBACK_IMAGE)) event.currentTarget.src = FALLBACK_IMAGE
          }}
        />
        <div>
          <span>Объект {index} · сигналы: {score}</span>
          <strong>{view.title}</strong>
          <small>{view.price}</small>
        </div>
      </div>
      <button
        type="button"
        className="compare-decision__action"
        onClick={onSelect}
        aria-label={`Открыть расчёт: ${view.title}`}
      >
        Рассчитать этот объект
        <FiArrowUpRight aria-hidden="true" />
      </button>
    </article>
  )
}

export default function CompareDecisionSummary({ pair, summary, onOpenCalculator }) {
  if (!pair) return null

  return (
    <section className="compare-decision" aria-labelledby="compare-decision-title">
      <header className="compare-decision__header">
        <span className="compare-decision__eyebrow"><FiCheckCircle aria-hidden="true" /> Ориентиры</span>
        <h2 id="compare-decision-title">Сигналы сравнения</h2>
        <p className="compare-decision__result">{decisionText(summary)}</p>
        <p className="compare-decision__meta">
          Учтено ценовых сигналов: {summary?.compared || 0}. Это ориентир, а не автоматический выбор: укажите
          объект сами, и мы перенесём именно его в расчёт инвестора.
        </p>
      </header>

      <div className="compare-decision__properties">
        <PropertyAction
          item={pair.left}
          index={1}
          score={summary?.left || 0}
          onSelect={() => onOpenCalculator('left')}
        />
        <PropertyAction
          item={pair.right}
          index={2}
          score={summary?.right || 0}
          onSelect={() => onOpenCalculator('right')}
        />
      </div>

      <p className="compare-decision__disclaimer">
        Не является гарантией доходности, ликвидности или юридического качества. Сигналы построены только по
        заполненным сопоставимым ценовым полям карточек.
      </p>
    </section>
  )
}
