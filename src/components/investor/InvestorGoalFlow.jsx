import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Building2,
  CalendarClock,
  Coins,
  Percent,
  PieChart,
  TrendingUp,
} from 'lucide-react'
import './InvestorGoalFlow.css'

const GOALS = [
  {
    id: 'rent',
    eyebrow: 'Регулярный доход',
    title: 'Сдавать в аренду',
    description: 'Оценим денежный поток, расходы и доходность владения.',
    chips: ['Ежегодный доход', 'Долгий горизонт'],
    Icon: Building2,
  },
  {
    id: 'resale',
    eyebrow: 'Рост капитала',
    title: 'Купить и перепродать',
    description: 'Посчитаем потенциальную прибыль от роста стоимости объекта.',
    chips: ['Рост цены', 'Выход из сделки'],
    Icon: TrendingUp,
  },
  {
    id: 'fractional',
    eyebrow: 'Совместная инвестиция',
    title: 'Купить долю',
    description: 'Рассчитаем результат с учётом вашей доли и арендного дохода.',
    chips: ['Меньше капитал', 'Доля дохода'],
    Icon: PieChart,
  },
]

const screenMotion = {
  initial: { opacity: 0, y: 30, scale: 0.97, filter: 'blur(9px)' },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.56,
      ease: [0.16, 1, 0.3, 1],
      when: 'beforeChildren',
      staggerChildren: 0.075,
    },
  },
  exit: { opacity: 0, y: -22, scale: 0.98, filter: 'blur(7px)' },
}

const itemMotion = {
  initial: { opacity: 0, y: 24, scale: 0.94 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.46, ease: [0.16, 1, 0.3, 1] },
  },
}

function GoalHeader({ title, description }) {
  return (
    <motion.header className="investor-goal-flow__header" variants={itemMotion}>
      <h2>{title}</h2>
      <p>{description}</p>
    </motion.header>
  )
}

function NumberField({ icon: Icon, label, suffix, ...inputProps }) {
  return (
    <motion.label className="investor-goal-flow__field" variants={itemMotion}>
      <span className="investor-goal-flow__field-head">
        <span className="investor-goal-flow__field-icon" aria-hidden="true">
          <Icon size={17} strokeWidth={2} />
        </span>
        <span>{label}</span>
      </span>
      <span className="investor-goal-flow__input-wrap">
        <input type="number" {...inputProps} />
        <b>{suffix}</b>
      </span>
    </motion.label>
  )
}

export default function InvestorGoalFlow({
  stage,
  selectedGoal,
  onSelectGoal,
  onBackToObject,
  onBackToGoals,
  onContinue,
  canContinue,
  ownershipPeriod,
  onOwnershipPeriodChange,
  rentalIncome,
  onRentalIncomeChange,
  buyerCostsPct,
  onBuyerCostsPctChange,
  marketGrowthRate,
  onMarketGrowthRateChange,
  ownershipShare,
  onOwnershipShareChange,
}) {
  const goal = GOALS.find((item) => item.id === selectedGoal) || GOALS[0]

  useEffect(() => {
    const scrollRoot = document.querySelector('.app-layout')
    if (scrollRoot) {
      scrollRoot.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [stage])

  return (
    <div className="investor-goal-flow">
      <AnimatePresence mode="popLayout" initial={false}>
        {stage === 'choose' ? (
          <motion.section
            key="goal-choose"
            className="investor-goal-flow__scene investor-goal-flow__choose"
            variants={screenMotion}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <GoalHeader
              title="Выберите цель"
              description="Что должна дать вам эта инвестиция?"
            />

            <motion.div
              className="investor-goal-flow__cards"
              variants={itemMotion}
              role="radiogroup"
              aria-label="Инвестиционная цель"
            >
              {GOALS.map(({ id, eyebrow, title, description, chips, Icon }, index) => (
                <motion.button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selectedGoal === id}
                  className={`investor-goal-flow__goal-card investor-goal-flow__goal-card--${id}${selectedGoal === id ? ' is-selected' : ''}`}
                  onClick={() => onSelectGoal(id)}
                  variants={itemMotion}
                  whileTap={{ scale: 0.975 }}
                >
                  <span className="investor-goal-flow__goal-topline">
                    <span>{eyebrow}</span>
                    <small>0{index + 1}</small>
                  </span>
                  <span className="investor-goal-flow__goal-icon" aria-hidden="true">
                    <Icon size={30} strokeWidth={1.8} />
                  </span>
                  <span className="investor-goal-flow__goal-copy">
                    <strong>{title}</strong>
                    <small>{description}</small>
                  </span>
                  <span className="investor-goal-flow__goal-chips" aria-hidden="true">
                    {chips.map((chip) => <span key={chip}>{chip}</span>)}
                  </span>
                  <span className="investor-goal-flow__goal-action">
                    Выбрать
                    <ArrowRight size={18} strokeWidth={2.2} />
                  </span>
                </motion.button>
              ))}
            </motion.div>

            <motion.div className="investor-goal-flow__footer" variants={itemMotion}>
              <p className="investor-goal-flow__swipe-hint">
                Листайте карточки в сторону
              </p>
              <button type="button" className="investor-goal-flow__back" onClick={onBackToObject}>
                Нажмите, чтобы вернуться назад
              </button>
            </motion.div>
          </motion.section>
        ) : (
          <motion.section
            key={`goal-values-${selectedGoal}`}
            className={`investor-goal-flow__scene investor-goal-flow__values investor-goal-flow__values--${selectedGoal}`}
            variants={screenMotion}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <GoalHeader
              title="Параметры цели"
              description={`Настроим сценарий «${goal.title.toLowerCase()}».`}
            />

            <motion.div className="investor-goal-flow__values-summary" variants={itemMotion}>
              <span className="investor-goal-flow__values-icon" aria-hidden="true">
                <goal.Icon size={25} strokeWidth={1.9} />
              </span>
              <span>
                <small>{goal.eyebrow}</small>
                <strong>{goal.title}</strong>
              </span>
            </motion.div>

            <motion.div className="investor-goal-flow__fields" variants={itemMotion}>
              <NumberField
                icon={CalendarClock}
                label="Горизонт владения"
                suffix="лет"
                inputMode="numeric"
                min="1"
                max="30"
                step="1"
                value={ownershipPeriod}
                onChange={(event) => onOwnershipPeriodChange(event.target.value)}
                placeholder="10"
              />

              {(selectedGoal === 'rent' || selectedGoal === 'fractional') && (
                <NumberField
                  icon={Coins}
                  label="Ожидаемая аренда в год"
                  suffix="€"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={rentalIncome}
                  onChange={(event) => onRentalIncomeChange(event.target.value)}
                  placeholder="24 000"
                />
              )}

              {selectedGoal === 'resale' && (
                <NumberField
                  icon={TrendingUp}
                  label="Ожидаемый рост стоимости"
                  suffix="%"
                  inputMode="decimal"
                  step="0.1"
                  value={marketGrowthRate}
                  onChange={(event) => onMarketGrowthRateChange(event.target.value)}
                  placeholder="5"
                />
              )}

              {selectedGoal === 'fractional' && (
                <NumberField
                  icon={PieChart}
                  label="Ваша доля владения"
                  suffix="%"
                  inputMode="decimal"
                  min="1"
                  max="100"
                  step="1"
                  value={ownershipShare}
                  onChange={(event) => onOwnershipShareChange(event.target.value)}
                  placeholder="50"
                />
              )}

              <NumberField
                icon={Percent}
                label="Расходы при покупке"
                suffix="%"
                inputMode="decimal"
                min="0"
                max="20"
                step="0.1"
                value={buyerCostsPct}
                onChange={(event) => onBuyerCostsPctChange(event.target.value)}
                placeholder="8"
              />
            </motion.div>

            <motion.div className="investor-goal-flow__footer" variants={itemMotion}>
              <button type="button" className="investor-goal-flow__back" onClick={onBackToGoals}>
                Нажмите, чтобы вернуться назад
              </button>
              <button
                type="button"
                className="investor-goal-flow__continue"
                onClick={onContinue}
                disabled={!canContinue}
              >
                <span>Рассчитать результат</span>
                <span className="investor-goal-flow__continue-arrow" aria-hidden="true">
                  <ArrowRight size={20} strokeWidth={2.2} />
                </span>
              </button>
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}
