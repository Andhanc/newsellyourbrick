import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
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

function buildGoals(t) {
  return [
    {
      id: 'rent',
      eyebrow: t('smartInvestor_goalRentEyebrow'),
      title: t('smartInvestor_goalRentTitle'),
      description: t('smartInvestor_goalRentDesc'),
      chips: [t('smartInvestor_goalRentChip1'), t('smartInvestor_goalRentChip2')],
      Icon: Building2,
    },
    {
      id: 'resale',
      eyebrow: t('smartInvestor_goalResaleEyebrow'),
      title: t('smartInvestor_goalResaleTitle'),
      description: t('smartInvestor_goalResaleDesc'),
      chips: [t('smartInvestor_goalResaleChip1'), t('smartInvestor_goalResaleChip2')],
      Icon: TrendingUp,
    },
    {
      id: 'fractional',
      eyebrow: t('smartInvestor_goalFracEyebrow'),
      title: t('smartInvestor_goalFracTitle'),
      description: t('smartInvestor_goalFracDesc'),
      chips: [t('smartInvestor_goalFracChip1'), t('smartInvestor_goalFracChip2')],
      Icon: PieChart,
    },
  ]
}

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
  const { t } = useTranslation()
  const goals = useMemo(() => buildGoals(t), [t])
  const goal = goals.find((item) => item.id === selectedGoal) || goals[0]

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
              title={t('smartInvestor_chooseGoal')}
              description={t('smartInvestor_chooseGoalLead')}
            />

            <motion.div
              className="investor-goal-flow__cards"
              variants={itemMotion}
              role="radiogroup"
              aria-label={t('smartInvestor_goalAria')}
            >
              {goals.map(({ id, eyebrow, title, description, chips, Icon }, index) => (
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
                    {t('smartInvestor_goalSelect')}
                    <ArrowRight size={18} strokeWidth={2.2} />
                  </span>
                </motion.button>
              ))}
            </motion.div>

            <motion.div className="investor-goal-flow__footer" variants={itemMotion}>
              <p className="investor-goal-flow__swipe-hint">
                {t('smartInvestor_swipeHint')}
              </p>
              <button type="button" className="investor-goal-flow__back" onClick={onBackToObject}>
                {t('smartInvestor_pressToGoBack')}
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
              title={t('smartInvestor_goalParams')}
              description={t('smartInvestor_goalParamsLead', { goal: goal.title.toLowerCase() })}
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
                label={t('smartInvestor_horizon')}
                suffix={t('smartInvestor_years')}
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
                  label={t('smartInvestor_expectedRent')}
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
                  label={t('smartInvestor_expectedGrowth')}
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
                  label={t('smartInvestor_ownershipShare')}
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
                label={t('smartInvestor_purchaseCosts')}
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
                {t('smartInvestor_pressToGoBack')}
              </button>
              <button
                type="button"
                className="investor-goal-flow__continue"
                onClick={onContinue}
                disabled={!canContinue}
              >
                <span>{t('smartInvestor_calcResult')}</span>
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
