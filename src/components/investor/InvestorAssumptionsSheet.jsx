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
  const footer = (
    <button type="button" className="investor-assumptions__done" onClick={onClose}>
      Готово — показать результат
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
        <span>Допущения без скрытых цифр</span>
        <h2 id="investor-assumptions-title">Параметры сценария</h2>
        <p id="investor-assumptions-description">
          Расчёт обновляется сразу. Укажите свои значения — мы не подменяем их рыночными обещаниями.
        </p>
      </div>

      <div className="investor-assumptions__grid">
        <NumberField id="investor-sheet-price" label="Цена объекта, €" value={propertyPrice} onChange={setPropertyPrice} />
        <NumberField id="investor-sheet-renovation" label="Ремонт, €" value={renovationCost} onChange={setRenovationCost} />
        <NumberField id="investor-sheet-period" label="Срок, лет" value={ownershipPeriod} onChange={setOwnershipPeriod} min={1} max={30} step="1" inputMode="numeric" />
        <NumberField id="investor-sheet-growth" label="Рост цены, % в год" value={marketGrowthRate} onChange={setMarketGrowthRate} step="0.1" />
        <NumberField id="investor-sheet-rent" label="Аренда в год, €" value={rentalIncome} onChange={setRentalIncome} />
        <NumberField id="investor-sheet-opex" label="Эксплуатация, % аренды" value={operatingExpenses} onChange={setOperatingExpenses} max={100} step="0.1" />
        <NumberField id="investor-sheet-buyer-costs" label="Расходы покупки, %" value={buyerCostsPct} onChange={setBuyerCostsPct} max={20} step="0.1" />
      </div>

      <label className="investor-assumptions__toggle">
        <span>
          <strong>Использовать ипотеку</strong>
          <small>Платёж уменьшит денежный поток</small>
        </span>
        <input type="checkbox" checked={useMortgage} onChange={(event) => setUseMortgage(event.target.checked)} />
      </label>

      {useMortgage && (
        <>
          <div className="investor-assumptions__grid investor-assumptions__grid--mortgage">
            <NumberField id="investor-sheet-rate" label="Ожидаемая ставка, %" value={mortgageRate} onChange={setMortgageRate} step="0.1" />
            <NumberField id="investor-sheet-term" label="Срок кредита, лет" value={mortgageTerm} onChange={setMortgageTerm} min={1} max={30} step="1" inputMode="numeric" />
            <NumberField id="investor-sheet-down" label="Первый взнос, %" value={downPayment} onChange={setDownPayment} min={10} max={100} step="0.1" />
          </div>

          <div className="investor-assumptions__profile-head">
            <span>Для персональной оценки</span>
            <p>Эти данные нужны AI для предварительного диапазона ипотеки. Они не заменяют решение банка.</p>
          </div>
          <div className="investor-assumptions__grid investor-assumptions__grid--profile">
            <TextField id="investor-sheet-residence" label="Страна резидентства" value={borrowerResidenceCountry} onChange={setBorrowerResidenceCountry} placeholder="Например, Испания" />
            <NumberField id="investor-sheet-age" label="Возраст" value={borrowerAge} onChange={setBorrowerAge} min={18} max={100} step="1" inputMode="numeric" />
            <NumberField id="investor-sheet-income" label="Чистый доход в месяц, €" value={borrowerMonthlyIncome} onChange={setBorrowerMonthlyIncome} />
            <NumberField id="investor-sheet-debts" label="Другие платежи в месяц, €" value={borrowerMonthlyDebts} onChange={setBorrowerMonthlyDebts} />
          </div>
        </>
      )}
    </BuyerSheetShell>
  )
}
