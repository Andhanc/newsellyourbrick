import { useTranslation } from 'react-i18next'
import BuyerSheetShell from '../buyer-mobile/BuyerSheetShell'
import './InvestorAssumptionsSheet.css'

function NumberField({ id, label, value, onChange, min = 0, max, step = 'any', inputMode = 'decimal' }) {
  return (
    <label className="investor-assumptions__field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type="number"
        inputMode={inputMode}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function TextField({ id, label, value, onChange, placeholder = '' }) {
  return (
    <label className="investor-assumptions__field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

export default function InvestorAssumptionsSheet({
  isOpen,
  onClose,
  propertyPrice,
  setPropertyPrice,
  renovationCost,
  setRenovationCost,
  ownershipPeriod,
  setOwnershipPeriod,
  marketGrowthRate,
  setMarketGrowthRate,
  rentalIncome,
  setRentalIncome,
  operatingExpenses,
  setOperatingExpenses,
  buyerCostsPct,
  setBuyerCostsPct,
  useMortgage,
  setUseMortgage,
  mortgageRate,
  setMortgageRate,
  mortgageTerm,
  setMortgageTerm,
  downPayment,
  setDownPayment,
  borrowerResidenceCountry,
  setBorrowerResidenceCountry,
  borrowerAge,
  setBorrowerAge,
  borrowerMonthlyIncome,
  setBorrowerMonthlyIncome,
  borrowerMonthlyDebts,
  setBorrowerMonthlyDebts,
}) {
  const { t } = useTranslation()
  const footer = (
    <button type="button" className="investor-assumptions__done" onClick={onClose}>
      {t('smartInvestor_assumptionsDone')}
    </button>
  )

  return (
    <BuyerSheetShell
      isOpen={isOpen}
      onClose={onClose}
      titleId="investor-assumptions-title"
      describedBy="investor-assumptions-description"
      tone="choice"
      footer={footer}
      className="investor-assumptions-sheet"
    >
      <div className="investor-assumptions__head">
        <span>{t('smartInvestor_assumptionsEyebrow')}</span>
        <h2 id="investor-assumptions-title">{t('smartInvestor_assumptionsTitle')}</h2>
        <p id="investor-assumptions-description">{t('smartInvestor_assumptionsLead')}</p>
      </div>

      <div className="investor-assumptions__grid">
        <NumberField id="investor-sheet-price" label={t('smartInvestor_fieldPrice')} value={propertyPrice} onChange={setPropertyPrice} />
        <NumberField id="investor-sheet-renovation" label={t('smartInvestor_fieldRenovation')} value={renovationCost} onChange={setRenovationCost} />
        <NumberField id="investor-sheet-period" label={t('smartInvestor_fieldPeriod')} value={ownershipPeriod} onChange={setOwnershipPeriod} min={1} max={30} step="1" inputMode="numeric" />
        <NumberField id="investor-sheet-growth" label={t('smartInvestor_fieldGrowth')} value={marketGrowthRate} onChange={setMarketGrowthRate} step="0.1" />
        <NumberField id="investor-sheet-rent" label={t('smartInvestor_fieldRent')} value={rentalIncome} onChange={setRentalIncome} />
        <NumberField id="investor-sheet-opex" label={t('smartInvestor_fieldOpex')} value={operatingExpenses} onChange={setOperatingExpenses} max={100} step="0.1" />
        <NumberField id="investor-sheet-buyer-costs" label={t('smartInvestor_fieldBuyerCosts')} value={buyerCostsPct} onChange={setBuyerCostsPct} max={20} step="0.1" />
      </div>

      <label className="investor-assumptions__toggle">
        <span>
          <strong>{t('smartInvestor_mortgageToggle')}</strong>
          <small>{t('smartInvestor_mortgageToggleHint')}</small>
        </span>
        <input type="checkbox" checked={useMortgage} onChange={(event) => setUseMortgage(event.target.checked)} />
      </label>

      {useMortgage && (
        <>
          <div className="investor-assumptions__grid investor-assumptions__grid--mortgage">
            <NumberField id="investor-sheet-rate" label={t('smartInvestor_fieldRate')} value={mortgageRate} onChange={setMortgageRate} step="0.1" />
            <NumberField id="investor-sheet-term" label={t('smartInvestor_fieldLoanTerm')} value={mortgageTerm} onChange={setMortgageTerm} min={1} max={30} step="1" inputMode="numeric" />
            <NumberField id="investor-sheet-down" label={t('smartInvestor_fieldDown')} value={downPayment} onChange={setDownPayment} min={10} max={100} step="0.1" />
          </div>

          <div className="investor-assumptions__profile-head">
            <span>{t('smartInvestor_profileEyebrow')}</span>
            <p>{t('smartInvestor_profileLead')}</p>
          </div>
          <div className="investor-assumptions__grid investor-assumptions__grid--profile">
            <TextField
              id="investor-sheet-residence"
              label={t('smartInvestor_fieldResidence')}
              value={borrowerResidenceCountry}
              onChange={setBorrowerResidenceCountry}
              placeholder={t('smartInvestor_fieldResidencePh')}
            />
            <NumberField id="investor-sheet-age" label={t('smartInvestor_fieldAge')} value={borrowerAge} onChange={setBorrowerAge} min={18} max={100} step="1" inputMode="numeric" />
            <NumberField id="investor-sheet-income" label={t('smartInvestor_fieldIncome')} value={borrowerMonthlyIncome} onChange={setBorrowerMonthlyIncome} />
            <NumberField id="investor-sheet-debts" label={t('smartInvestor_fieldDebts')} value={borrowerMonthlyDebts} onChange={setBorrowerMonthlyDebts} />
          </div>
        </>
      )}
    </BuyerSheetShell>
  )
}
