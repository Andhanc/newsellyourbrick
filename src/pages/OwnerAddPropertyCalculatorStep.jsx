import { Lightbulb, TrendingUp, CheckCircle2 } from 'lucide-react'
import PropertyCalculatorModal from '../components/PropertyCalculatorModal'
import { OAP_CALCULATOR_IMAGES } from './oapCalculatorImages'
import './OwnerAddPropertyCalculatorStep.css'

export default function OwnerAddPropertyCalculatorStep({
  propertyData,
  calculatorApplied = false,
  onApplyRecommendedPrice,
}) {
  return (
    <section className="oap-calculator-step" aria-labelledby="oap-calculator-title">
      <div className="oap-calculator-step__layout">
        <div className="oap-calculator-step__main">
          <header className="oap-calculator-step__head">
            <h2 id="oap-calculator-title" className="oap-calculator-step__title">
              Автоматический расчёт стоимости
            </h2>
            <p className="oap-calculator-step__subtitle">
              Оценка по похожим объявлениям с площадок. После расчёта ориентировочные суммы можно
              скорректировать на следующем шаге.
            </p>
          </header>

          {calculatorApplied && (
            <div className="oap-calculator-step__applied" role="status">
              <CheckCircle2 size={18} strokeWidth={2} aria-hidden />
              <span>
                Рекомендованные суммы подставлены в поля цены — их можно изменить на следующем шаге.
              </span>
            </div>
          )}

          <div className="oap-calculator-step__card">
            <div className="oap-calculator-step__card-head">
              <span className="oap-calculator-step__card-icon" aria-hidden>
                <TrendingUp size={20} strokeWidth={1.85} />
              </span>
              <div className="oap-calculator-step__card-copy">
                <h3 className="oap-calculator-step__card-title">Калькулятор стоимости</h3>
                <p className="oap-calculator-step__card-lead">
                  Параметры объекта уже заполнены — уточните район при необходимости и запустите расчёт.
                </p>
              </div>
            </div>

            <div className="oap-calculator-step__embed">
              <PropertyCalculatorModal
                isOpen
                variant="embedded"
                onClose={() => {}}
                lockFields
                initialPropertyData={propertyData}
                onApplyRecommendedPrice={onApplyRecommendedPrice}
              />
            </div>
          </div>
        </div>

        <aside className="oap-calculator-step__sidebar" aria-label="Совет">
          <div className="oap-calculator-step__sidebar-head">
            <span className="oap-calculator-step__sidebar-icon" aria-hidden>
              <Lightbulb size={16} strokeWidth={2} />
            </span>
            <span className="oap-calculator-step__sidebar-title">Совет</span>
          </div>
          <p className="oap-calculator-step__sidebar-text">
            Расчёт основан на похожих объявлениях в выбранном городе. Это ориентир — финальные суммы
            вы задаёте сами на шаге «Цена и дата».
          </p>
          <p className="oap-calculator-step__sidebar-text">
            Чем точнее площадь, район и тип объекта, тем ближе оценка к реальному рынку. При
            необходимости уточните район в форме слева перед расчётом.
          </p>
          <ul className="oap-calculator-step__sidebar-tips">
            <li>Используйте результат как стартовую точку для аукциона</li>
            <li>После расчёта суммы можно подставить в поля цены одним кликом</li>
            <li>Рынок меняется — итоговую цену всегда контролируете вы</li>
          </ul>
          <div className="oap-calculator-step__sidebar-illustration">
            <img
              src={OAP_CALCULATOR_IMAGES.sidebarHero}
              alt=""
              className="oap-calculator-step__sidebar-img"
            />
          </div>
        </aside>
      </div>
    </section>
  )
}
