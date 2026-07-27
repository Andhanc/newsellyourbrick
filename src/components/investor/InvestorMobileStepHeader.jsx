import './InvestorMobileStepHeader.css'

const STEPS = [
  { id: 1, label: 'Объект', copy: 'Выберите, что будем оценивать' },
  { id: 2, label: 'Цель', copy: 'Укажите, как хотите зарабатывать' },
  { id: 3, label: 'Результат', copy: 'Сверьте доходность и риски' },
]

export default function InvestorMobileStepHeader({ step = 1 }) {
  const active = STEPS.find((item) => item.id === step) || STEPS[0]
  return (
    <section className="investor-mobile-step" aria-label="Этап расчёта">
      <div className="investor-mobile-step__eyebrow">Умный инвестор · шаг {active.id} из 3</div>
      <h1>{active.label}</h1>
      <p>{active.copy}</p>
      <div className="investor-mobile-step__progress" aria-label={`Выполнено ${active.id} из 3 шагов`}>
        {STEPS.map((item) => (
          <span
            key={item.id}
            className={item.id <= active.id ? 'is-filled' : ''}
            aria-current={item.id === active.id ? 'step' : undefined}
          />
        ))}
      </div>
      <ol className="investor-mobile-step__labels">
        {STEPS.map((item) => <li key={item.id} className={item.id === active.id ? 'is-active' : ''}>{item.label}</li>)}
      </ol>
    </section>
  )
}

