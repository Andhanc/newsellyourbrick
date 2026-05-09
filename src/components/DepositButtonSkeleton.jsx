import './DepositButton.css'

/** Плейсхолдер той же геометрии, что и плавающий DepositButton, пока грузится баланс. */
const DepositButtonSkeleton = () => (
  <div
    className="deposit-button deposit-button--skeleton"
    role="status"
    aria-busy="true"
    aria-label="Загрузка депозита"
  >
    <div className="deposit-button__glow deposit-button__glow--skeleton" />
    <div className="deposit-button__content-wrapper deposit-button__content-wrapper--skeleton">
      <div className="deposit-button__skeleton-icon" aria-hidden />
      <div className="deposit-button__skeleton-text">
        <div className="deposit-button__skeleton-line deposit-button__skeleton-line--sm" />
        <div className="deposit-button__skeleton-line deposit-button__skeleton-line--lg" />
      </div>
      <div className="deposit-button__skeleton-arrow" aria-hidden />
    </div>
  </div>
)

export default DepositButtonSkeleton
