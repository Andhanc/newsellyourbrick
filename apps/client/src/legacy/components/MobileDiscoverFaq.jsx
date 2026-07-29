import { useState } from 'react'
import { FiMinus, FiPlus } from 'react-icons/fi'
import './MobileDiscoverFaq.css'

const FAQ_ITEMS = [
  {
    id: 'auction',
    question: 'Как участвовать в аукционе?',
    answer:
      'Выберите объект, внесите обеспечительный платёж и делайте ставки до окончания таймера. Побеждает участник с лучшей ценой — дальше сделка проходит через платформу.',
  },
  {
    id: 'buy-now',
    question: 'Чем «Купить сейчас» отличается от аукциона?',
    answer:
      'В формате «Купить сейчас» цена фиксирована: без торгов и ожидания. Подходит, если хотите быстро закрыть сделку по понятной стоимости.',
  },
  {
    id: 'shares',
    question: 'Что такое доли и с какой суммы можно войти?',
    answer:
      'Доли позволяют инвестировать в крупные объекты частями. Стартовый порог зависит от лота — часто это заметно ниже стоимости целого объекта.',
  },
  {
    id: 'debts',
    question: 'Как работают инвестиции в долги?',
    answer:
      'Вы вкладываетесь в долговые инструменты под залог недвижимости и получаете доход по условиям конкретного предложения. Риски и ставка указаны в карточке.',
  },
  {
    id: 'safe',
    question: 'Насколько безопасно покупать через SellYourBrick?',
    answer:
      'Сделки и платежи проходят в контуре платформы, а по объектам доступны ключевые данные и сопровождение. Перед покупкой всегда изучайте карточку и условия формата.',
  },
]

function MobileDiscoverFaq({ idPrefix = 'md-faq' } = {}) {
  const [openId, setOpenId] = useState(FAQ_ITEMS[0]?.id ?? null)
  const titleId = `${idPrefix}-title`

  return (
    <section className="md-faq" aria-labelledby={titleId}>
      <div className="md-faq__inner">
        <header className="md-faq__header">
          <h2 id={titleId} className="md-faq__title">
            Частые{' '}
            <span className="md-faq__title-accent">вопросы</span>
          </h2>
          <p className="md-faq__subtitle">
            Коротко о форматах продажи, рисках и том, как начать на платформе
          </p>
        </header>

        <ul className="md-faq__list">
          {FAQ_ITEMS.map((item) => {
            const isOpen = openId === item.id
            const triggerId = `${idPrefix}-q-${item.id}`
            const panelId = `${idPrefix}-a-${item.id}`
            return (
              <li key={item.id} className={`md-faq__item${isOpen ? ' is-open' : ''}`}>
                <h3 className="md-faq__item-heading">
                  <button
                    type="button"
                    id={triggerId}
                    className="md-faq__trigger"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenId(isOpen ? null : item.id)}
                  >
                    <span className="md-faq__question">{item.question}</span>
                    <span className="md-faq__icon" aria-hidden>
                      {isOpen ? <FiMinus /> : <FiPlus />}
                    </span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={triggerId}
                  className="md-faq__panel"
                  hidden={!isOpen}
                >
                  <p className="md-faq__answer">{item.answer}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

export default MobileDiscoverFaq
