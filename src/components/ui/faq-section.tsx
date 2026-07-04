import { PhoneCall } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import './faq-section.css'

const FAQ_ITEM_KEYS = [
  { id: 'auction-faq-1', questionKey: 'aboutPage_faq1Question', answerKey: 'aboutPage_faq1Answer' },
  { id: 'auction-faq-2', questionKey: 'aboutPage_faq2Question', answerKey: 'aboutPage_faq2Answer' },
  { id: 'auction-faq-3', questionKey: 'aboutPage_faq3Question', answerKey: 'aboutPage_faq3Answer' },
  { id: 'auction-faq-4', questionKey: 'aboutPage_faq4Question', answerKey: 'aboutPage_faq4Answer' },
  { id: 'auction-faq-5', questionKey: 'aboutPage_faq5Question', answerKey: 'aboutPage_faq5Answer' },
] as const

type FaqSectionProps = {
  onContactClick?: () => void
}

function FaqSection({ onContactClick }: FaqSectionProps) {
  const { t } = useTranslation()

  const handleContactClick = () => {
    if (onContactClick) {
      onContactClick()
      return
    }
    window.dispatchEvent(new CustomEvent('openManagerChat'))
  }

  return (
    <section className="auction-faq-section faq" aria-labelledby="auction-faq-heading">
      <div className="auction-faq-section__inner">
        <div className="auction-faq-section__grid">
          <div className="auction-faq-section__intro">
            <span className="auction-faq-section__badge">{t('aboutPage_faqEyebrow')}</span>
            <h2 id="auction-faq-heading" className="auction-faq-section__title">
              {t('aboutPage_faqTitle')}
            </h2>
            <p className="auction-faq-section__lead">{t('aboutPage_faqSubtitle')}</p>
            <button type="button" className="auction-faq-section__cta" onClick={handleContactClick}>
              {t('auctionFaqReachOut')}
              <PhoneCall className="auction-faq-section__cta-icon" size={16} aria-hidden />
            </button>
          </div>

          <Accordion type="single" collapsible className="auction-faq-section__accordion">
            {FAQ_ITEM_KEYS.map((item) => (
              <AccordionItem key={item.id} value={item.id}>
                <AccordionTrigger className="auction-faq-section__trigger">
                  {t(item.questionKey)}
                </AccordionTrigger>
                <AccordionContent className="auction-faq-section__content">
                  {t(item.answerKey)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}

export { FaqSection, FAQ_ITEM_KEYS }
