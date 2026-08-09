import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiMinus, FiPlus } from 'react-icons/fi'
import './MobileDiscoverFaq.css'

const FAQ_ITEM_IDS = [
  { id: 'auction', questionKey: 'auctionPage_faqAuctionQuestion', answerKey: 'auctionPage_faqAuctionAnswer' },
  { id: 'buy-now', questionKey: 'auctionPage_faqBuyNowQuestion', answerKey: 'auctionPage_faqBuyNowAnswer' },
  { id: 'shares', questionKey: 'auctionPage_faqSharesQuestion', answerKey: 'auctionPage_faqSharesAnswer' },
  { id: 'debts', questionKey: 'auctionPage_faqDebtsQuestion', answerKey: 'auctionPage_faqDebtsAnswer' },
  { id: 'safe', questionKey: 'auctionPage_faqSafeQuestion', answerKey: 'auctionPage_faqSafeAnswer' },
]

function MobileDiscoverFaq({ idPrefix = 'md-faq' } = {}) {
  const { t } = useTranslation()
  const [openId, setOpenId] = useState(FAQ_ITEM_IDS[0]?.id ?? null)
  const titleId = `${idPrefix}-title`
  const faqItems = useMemo(
    () =>
      FAQ_ITEM_IDS.map((item) => ({
        id: item.id,
        question: t(item.questionKey),
        answer: t(item.answerKey),
      })),
    [t],
  )

  return (
    <section className="md-faq" aria-labelledby={titleId}>
      <div className="md-faq__inner">
        <header className="md-faq__header">
          <h2 id={titleId} className="md-faq__title">
            {t('auctionPage_faqTitlePrefix')}{' '}
            <span className="md-faq__title-accent">{t('auctionPage_faqTitleAccent')}</span>
          </h2>
          <p className="md-faq__subtitle">{t('auctionPage_faqSubtitle')}</p>
        </header>

        <ul className="md-faq__list">
          {faqItems.map((item) => {
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
