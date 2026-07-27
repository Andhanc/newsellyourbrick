import { ArrowRight, CheckCircle2, ClipboardCheck, Home, MessagesSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import BuyerSheetShell from './buyer-mobile/BuyerSheetShell'
import ImageWithSkeleton from './ImageWithSkeleton'
import { buildResponsiveImageProps } from '../utils/responsiveImage'
import './PurchaseSuccessModal.css'

const RESERVATION_STEPS = [
  {
    icon: CheckCircle2,
    title: 'Оплата подтверждена',
    text: 'Резерв записан в истории вашего кабинета.',
  },
  {
    icon: MessagesSquare,
    title: 'Менеджер свяжется с вами',
    text: 'Уточнит документы, сроки и следующий шаг сделки.',
  },
  {
    icon: ClipboardCheck,
    title: 'План уже готов',
    text: 'Статус, контакты и действия собраны на странице объекта.',
  },
]

const SHARE_STEPS = [
  {
    icon: CheckCircle2,
    title: 'Оплата подтверждена',
    text: 'Покупка долей успешно записана.',
  },
  {
    icon: ClipboardCheck,
    title: 'Доли добавлены в активы',
    text: 'Количество и объект доступны в вашем кабинете.',
  },
  {
    icon: MessagesSquare,
    title: 'Мы остаёмся на связи',
    text: 'Уведомим о важных событиях по объекту.',
  },
]

export default function PurchaseSuccessModal({
  isOpen,
  onClose,
  property,
  onGoToGuide,
}) {
  const { t } = useTranslation()
  const title = property?.title || property?.name || t('purchaseSuccess_defaultTitle')
  const image = property?.image || property?.images?.[0] || ''
  const purchaseKind = property?.purchaseKind || 'reservation'
  const isSharePurchase = purchaseKind === 'share'
  const steps = isSharePurchase ? SHARE_STEPS : RESERVATION_STEPS
  const imageProps = image
    ? buildResponsiveImageProps(image, {
        widths: [160, 240, 320],
        sizes: '84px',
        fit: 'cover',
        quality: 74,
        format: 'webp',
      })
    : null

  const footer = (
    <div className="purchase-success-modal__actions">
      <button
        type="button"
        className="purchase-success-modal__btn purchase-success-modal__btn--primary"
        onClick={onGoToGuide}
      >
        <span>{isSharePurchase ? 'Открыть мои активы' : t('purchaseSuccess_goToObject')}</span>
        <ArrowRight size={19} aria-hidden />
      </button>
      <button
        type="button"
        className="purchase-success-modal__btn purchase-success-modal__btn--ghost"
        onClick={onClose}
      >
        {t('purchaseSuccess_later')}
      </button>
    </div>
  )

  return (
    <BuyerSheetShell
      isOpen={isOpen}
      onClose={onClose}
      tone="success"
      titleId="purchase-success-modal-title"
      describedBy="purchase-success-modal-description"
      closeLabel="Закрыть подтверждение покупки"
      className="purchase-success-modal"
      footer={footer}
    >
      <div className="purchase-success-modal__body">
        <img
          className="purchase-success-modal__illustration"
          src="/images/property-detail/deposit-success-check-3d.png"
          alt=""
          aria-hidden="true"
        />

        <p className="purchase-success-modal__eyebrow">
          <CheckCircle2 size={15} aria-hidden />
          {isSharePurchase ? 'Покупка подтверждена' : 'Резерв подтверждён'}
        </p>
        <h2 id="purchase-success-modal-title" className="purchase-success-modal__title">
          {isSharePurchase ? 'Доли куплены' : 'Объект закреплён за вами'}
        </h2>
        <p id="purchase-success-modal-description" className="purchase-success-modal__subtitle">
          Ничего запоминать не нужно — мы сохранили результат и собрали дальнейшие действия ниже.
        </p>

        <article className="purchase-success-modal__property">
          {imageProps ? (
            <div className="purchase-success-modal__property-image">
              <ImageWithSkeleton imgProps={imageProps} alt={title} />
            </div>
          ) : (
            <div className="purchase-success-modal__property-image purchase-success-modal__property-image--placeholder">
              <Home size={28} aria-hidden />
            </div>
          )}
          <div className="purchase-success-modal__property-copy">
            <span>{isSharePurchase ? 'Ваш новый актив' : 'Ваш резерв'}</span>
            <h3>{title}</h3>
            {property?.location ? <p>{property.location}</p> : null}
          </div>
        </article>

        <div className="purchase-success-modal__steps" aria-label="Что произойдёт дальше">
          {steps.map(({ icon: Icon, title: stepTitle, text }, index) => (
            <article key={stepTitle} className="purchase-success-modal__step">
              <span className="purchase-success-modal__step-icon" aria-hidden>
                <Icon size={19} />
              </span>
              <div>
                <strong>{index + 1}. {stepTitle}</strong>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </BuyerSheetShell>
  )
}
