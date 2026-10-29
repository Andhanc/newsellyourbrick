import { ArrowRight, CheckCircle2, ClipboardCheck, Home, MessagesSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import BuyerSheetShell from './buyer-mobile/BuyerSheetShell'
import ImageWithSkeleton from './ImageWithSkeleton'
import { buildResponsiveImageProps } from '../utils/responsiveImage'
import './PurchaseSuccessModal.css'

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
  const steps = isSharePurchase
    ? [
        {
          icon: CheckCircle2,
          title: t('purchaseSuccess_step1PaymentTitle'),
          text: t('purchaseSuccess_step1ShareText'),
        },
        {
          icon: ClipboardCheck,
          title: t('purchaseSuccess_step2SharesTitle'),
          text: t('purchaseSuccess_step2SharesText'),
        },
        {
          icon: MessagesSquare,
          title: t('purchaseSuccess_step3StayTitle'),
          text: t('purchaseSuccess_step3StayText'),
        },
      ]
    : [
        {
          icon: CheckCircle2,
          title: t('purchaseSuccess_step1PaymentTitle'),
          text: t('purchaseSuccess_step1ReserveText'),
        },
        {
          icon: MessagesSquare,
          title: t('purchaseSuccess_step2ManagerTitle'),
          text: t('purchaseSuccess_step2ManagerText'),
        },
        {
          icon: ClipboardCheck,
          title: t('purchaseSuccess_step3PlanTitle'),
          text: t('purchaseSuccess_step3PlanText'),
        },
      ]
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
        <span>{isSharePurchase ? t('purchaseSuccess_goToAssets') : t('purchaseSuccess_goToObject')}</span>
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
      closeLabel={t('purchaseSuccess_closeAria')}
      className="purchase-success-modal"
      footer={footer}
    >
      <div className="purchase-success-modal__body">
        <div className="purchase-success-modal__confetti" aria-hidden>
          {Array.from({ length: 24 }, (_, index) => <i key={index} />)}
        </div>
        <img
          className="purchase-success-modal__illustration"
          src="/images/property-detail/deposit-success-check-3d.png"
          alt=""
          aria-hidden="true"
        />

        <p className="purchase-success-modal__eyebrow">
          <CheckCircle2 size={15} aria-hidden />
          {isSharePurchase ? t('purchaseSuccess_shareEyebrow') : t('purchaseSuccess_reserveEyebrow')}
        </p>
        <h2 id="purchase-success-modal-title" className="purchase-success-modal__title">
          {isSharePurchase ? t('purchaseSuccess_shareTitle') : t('purchaseSuccess_reserveTitle')}
        </h2>
        <p id="purchase-success-modal-description" className="purchase-success-modal__subtitle">
          {t('purchaseSuccess_nextStepsSubtitle')}
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
            <span>{isSharePurchase ? t('purchaseSuccess_newAssetLabel') : t('purchaseSuccess_yourReserveLabel')}</span>
            <h3>{title}</h3>
            {property?.location ? <p>{property.location}</p> : null}
          </div>
        </article>

        <div className="purchase-success-modal__steps" aria-label={t('purchaseSuccess_stepsAria')}>
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
