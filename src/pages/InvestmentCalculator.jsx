import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import Header from '../components/Header';
import IncomeExpensesChart from '../components/IncomeExpensesChart';
import BackgroundIcons from '../components/BackgroundIcons';
import { getApiBaseUrlSync } from '../utils/apiConfig';
import { ChevronDown, Wallet, Home, TrendingUp, PiggyBank } from 'lucide-react';
import './InvestmentCalculator.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const InvestmentCalculator = () => {
  const { t, i18n } = useTranslation();
  const [propertyPrice, setPropertyPrice] = useState('');
  const [renovationCost, setRenovationCost] = useState('');
  const [ownershipPeriod, setOwnershipPeriod] = useState('');
  const [marketGrowthRate, setMarketGrowthRate] = useState('');
  const [scenario, setScenario] = useState('custom');
  
  // Раскрывающиеся блоки
  const [showRentalIncome, setShowRentalIncome] = useState(false);
  const [showMortgage, setShowMortgage] = useState(false);
  
  // Арендный доход
  const [rentalIncome, setRentalIncome] = useState('');
  const [rentalGrowthRate, setRentalGrowthRate] = useState('');
  const [operatingExpenses, setOperatingExpenses] = useState('');
  
  // Ипотека
  const [useMortgage, setUseMortgage] = useState(false);
  const [mortgageRate, setMortgageRate] = useState('');
  const [mortgageTerm, setMortgageTerm] = useState('');
  const [downPayment, setDownPayment] = useState('');
  
  // Переключение графиков
  const [activeChart, setActiveChart] = useState('income-expenses'); // 'income-expenses' или 'property-value'
  
  const [marketData, setMarketData] = useState(null);
  const [mortgageRates, setMortgageRates] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchMarketData();
  }, []);

  const fetchMarketData = async () => {
    try {
      setIsLoading(true);
      const API_BASE_URL = getApiBaseUrlSync();
      
      const [marketResponse, mortgageResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/investment/market-data`).catch(() => null),
        fetch(`${API_BASE_URL}/investment/mortgage-rates`).catch(() => null)
      ]);

      if (marketResponse?.ok) {
        const market = await marketResponse.json();
        if (market.success) {
          setMarketData(market.data);
        }
      }

      if (mortgageResponse?.ok) {
        const mortgage = await mortgageResponse.json();
        if (mortgage.success) {
          setMortgageRates(mortgage.data);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (scenario === 'optimistic') {
      setMarketGrowthRate('8');
      setRentalGrowthRate('5');
    } else if (scenario === 'pessimistic') {
      setMarketGrowthRate('2');
      setRentalGrowthRate('1');
    } else if (scenario === 'stable') {
      setMarketGrowthRate('4');
      setRentalGrowthRate('3');
    }
  }, [scenario]);

  // Расчеты (пустые поля считаем как 0)
  const calculations = useMemo(() => {
    const pPrice = Number(propertyPrice) || 0;
    const rCost = Number(renovationCost) || 0;
    const period = Number(ownershipPeriod) || 0;
    const mGrowth = Number(marketGrowthRate) || 0;
    const rIncome = Number(rentalIncome) || 0;
    const rGrowth = Number(rentalGrowthRate) || 0;
    const opExp = Number(operatingExpenses) || 0;
    const mRate = Number(mortgageRate) || 0;
    const mTerm = Number(mortgageTerm) || 0;
    const dPay = Number(downPayment) || 0;

    const totalInvestment = pPrice + rCost;
    const downPaymentAmount = useMortgage 
      ? (pPrice * dPay) / 100 
      : pPrice;
    const loanAmount = useMortgage ? pPrice - downPaymentAmount : 0;
    
    const monthlyMortgagePayment = useMortgage && loanAmount > 0
      ? calculateMonthlyPayment(loanAmount, mRate / 100 / 12, mTerm * 12)
      : 0;
    
    const annualMortgagePayment = monthlyMortgagePayment * 12;
    
    // Расчет по годам
    const yearlyData = [];
    let currentPropertyValue = pPrice;
    let currentRentalIncome = rIncome;

    for (let year = 1; year <= period; year++) {
      currentPropertyValue *= (1 + mGrowth / 100);
      currentRentalIncome *= (1 + rGrowth / 100);
      
      const yearOperatingExpenses = (currentRentalIncome * opExp) / 100;
      const yearMortgagePayment = annualMortgagePayment;
      const yearIncome = currentRentalIncome;
      const yearExpenses = yearOperatingExpenses + yearMortgagePayment;

      yearlyData.push({
        year,
        propertyValue: currentPropertyValue,
        rentalIncome: yearIncome,
        operatingExpenses: yearOperatingExpenses,
        mortgagePayment: yearMortgagePayment,
        totalExpenses: yearExpenses,
        cashFlow: yearIncome - yearExpenses
      });
    }

    const lastYear = yearlyData[yearlyData.length - 1];
    const totalRentalIncome = yearlyData.reduce((sum, d) => sum + d.rentalIncome, 0);
    const totalExpensesSum = yearlyData.reduce((sum, d) => sum + d.totalExpenses, 0);
    const netCashFlow = totalRentalIncome - totalExpensesSum;
    return {
      yearlyData,
      totalInvestment,
      downPaymentAmount,
      loanAmount,
      monthlyMortgagePayment,
      finalPropertyValue: lastYear?.propertyValue ?? pPrice,
      totalRentalIncome,
      netCashFlow,
    };
  }, [
    propertyPrice, renovationCost, ownershipPeriod, marketGrowthRate,
    useMortgage, mortgageRate, mortgageTerm, downPayment,
    rentalIncome, rentalGrowthRate, operatingExpenses
  ]);

  // График соотношения доходов к расходам (при отсутствии данных — одна точка 0)
  const hasYearlyData = calculations.yearlyData.length > 0;
  const chartLabels = hasYearlyData
    ? calculations.yearlyData.map((_, i) => `${t('calcYearLabel')} ${i + 1}`)
    : [`${t('calcYearLabel')} 1`];
  const incomeExpensesChartData = {
    labels: chartLabels,
    datasets: [
      {
        label: t('calcChartIncome'),
        data: hasYearlyData ? calculations.yearlyData.map(d => d.rentalIncome) : [0],
        borderColor: '#34d399',
        backgroundColor: 'rgba(52, 211, 153, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: '#34d399',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
      {
        label: t('calcChartExpenses'),
        data: hasYearlyData ? calculations.yearlyData.map(d => d.totalExpenses) : [0],
        borderColor: '#f87171',
        backgroundColor: 'rgba(248, 113, 113, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: '#f87171',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      }
    ]
  };

  // График роста стоимости недвижимости
  const propertyValueChartData = {
    labels: chartLabels,
    datasets: [
      {
        label: t('calcChartPropertyValue'),
        data: hasYearlyData ? calculations.yearlyData.map(d => d.propertyValue) : [0],
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: 'rgba(255, 255, 255, 0.9)',
          font: {
            size: 13,
            weight: '600'
          },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: 'rgba(255, 255, 255, 0.9)',
        bodyColor: 'rgba(255, 255, 255, 0.8)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${formatCurrency(context.parsed.y, i18n.language)}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          font: { size: 12, weight: '500' },
          padding: 10
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          font: { size: 12, weight: '500' },
          padding: 10,
          callback: function(value) {
            if (value >= 1000000) {
              return (value / 1000000).toFixed(1) + 'M €';
            } else if (value >= 1000) {
              return (value / 1000).toFixed(0) + 'K €';
            }
            return formatCurrency(value, i18n.language);
          }
        }
      }
    }
  };

  return (
    <div className="investment-calculator-page">
      <BackgroundIcons />
      <Header />
      <div className="calculator-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="calculator-header"
        >
          <span className="calculator-badge">{t('calcBadge')}</span>
          <h1 className="calculator-title">{t('calculator')}</h1>
          <p className="calculator-subtitle">
            {t('calcSubtitle')}
          </p>
        </motion.div>

        {/* Ключевые показатели */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="summary-cards"
        >
          <div className="summary-card">
            <div className="summary-card__icon summary-card__icon--primary">
              <PiggyBank size={20} strokeWidth={2} />
            </div>
            <div className="summary-card__content">
              <span className="summary-card__label">{t('calcTotalInvestment')}</span>
              <span className="summary-card__value">{formatCurrency(calculations.totalInvestment, i18n.language)}</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-card__icon summary-card__icon--accent">
              <TrendingUp size={20} strokeWidth={2} />
            </div>
            <div className="summary-card__content">
              <span className="summary-card__label">
                {(Number(ownershipPeriod) || 0) > 0 ? t('calcFinalValueYears', { count: Number(ownershipPeriod) || 0 }) : t('calcFinalValue')}
              </span>
              <span className="summary-card__value">{formatCurrency(calculations.finalPropertyValue, i18n.language)}</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-card__icon summary-card__icon--green">
              <Wallet size={20} strokeWidth={2} />
            </div>
            <div className="summary-card__content">
              <span className="summary-card__label">{t('calcRentalIncomePeriod')}</span>
              <span className="summary-card__value">{formatCurrency(calculations.totalRentalIncome, i18n.language)}</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-card__icon summary-card__icon--purple">
              <Home size={20} strokeWidth={2} />
            </div>
            <div className="summary-card__content">
              <span className="summary-card__label">{t('calcNetCashFlow')}</span>
              <span className={`summary-card__value ${calculations.netCashFlow >= 0 ? 'summary-card__value--positive' : 'summary-card__value--negative'}`}>
                {formatCurrency(calculations.netCashFlow, i18n.language)}
              </span>
            </div>
          </div>
        </motion.div>

        <p className="scroll-hint" aria-hidden="true">
          {t('calcScrollHint')}
          <ChevronDown className="scroll-hint__icon" size={18} strokeWidth={2.5} />
        </p>

        {/* График */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="chart-section"
        >
          <div className="chart-header">
            <div className="chart-tabs">
              <button
                className={`chart-tab ${activeChart === 'income-expenses' ? 'active' : ''}`}
                onClick={() => setActiveChart('income-expenses')}
              >
                {t('calcChartIncomeVsExpenses')}
              </button>
              <button
                className={`chart-tab ${activeChart === 'property-value' ? 'active' : ''}`}
                onClick={() => setActiveChart('property-value')}
              >
                {t('calcChartPropertyGrowth')}
              </button>
            </div>
          </div>
          <div className="chart-wrapper">
            <AnimatePresence mode="wait">
              {activeChart === 'income-expenses' ? (
                <motion.div
                  key="income-expenses"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <IncomeExpensesChart 
                    yearlyData={calculations.yearlyData} 
                    formatCurrency={(v) => formatCurrency(v, i18n.language)}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="property-value"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  style={{ height: '100%' }}
                >
                  {hasYearlyData ? (
                    <Line
                      data={propertyValueChartData}
                      options={chartOptions}
                    />
                  ) : (
                    <div className="chart-empty-state">{t('calcNoData')}</div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Форма с 5 параметрами */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="parameters-section"
        >
          <h2 className="section-title">{t('calcMainParams')}</h2>
          <div className="parameters-grid">
            <div className="parameter-group">
              <label>{t('calcPriceLabel')}</label>
              <input
                type="number"
                min="0"
                value={propertyPrice}
                onChange={(e) => setPropertyPrice(e.target.value)}
                className="parameter-input"
                placeholder="0"
              />
            </div>
            <div className="parameter-group">
              <label>{t('calcRenovationLabel')}</label>
              <input
                type="number"
                min="0"
                value={renovationCost}
                onChange={(e) => setRenovationCost(e.target.value)}
                className="parameter-input"
                placeholder="0"
              />
            </div>
            <div className="parameter-group">
              <label>{t('calcPeriodLabel')}</label>
              <input
                type="number"
                min="1"
                max="30"
                value={ownershipPeriod}
                onChange={(e) => setOwnershipPeriod(e.target.value)}
                className="parameter-input"
                placeholder="0"
              />
            </div>
            <div className="parameter-group">
              <label>{t('calcMarketGrowthLabel')}</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={marketGrowthRate}
                onChange={(e) => setMarketGrowthRate(e.target.value)}
                className="parameter-input"
                placeholder="0"
              />
            </div>
            <div className="parameter-group">
              <label>{t('calcScenarioLabel')}</label>
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                className="parameter-input"
              >
                <option value="custom">{t('calcScenarioCustom')}</option>
                <option value="optimistic">{t('calcScenarioOptimistic')}</option>
                <option value="stable">{t('calcScenarioStable')}</option>
                <option value="pessimistic">{t('calcScenarioPessimistic')}</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Кнопка и блок арендного дохода */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="expandable-section"
        >
          <button
            className="expandable-button"
            onClick={() => setShowRentalIncome(!showRentalIncome)}
            aria-expanded={showRentalIncome}
          >
            <span className="expandable-button__label">
              <Wallet className="expandable-button__icon" size={20} strokeWidth={2} />
              {t('calcRentalSection')}
            </span>
            <ChevronDown className={`expand-icon ${showRentalIncome ? 'expanded' : ''}`} size={22} strokeWidth={2} />
          </button>
          <AnimatePresence>
            {showRentalIncome && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="expandable-content"
              >
                <div className="expandable-grid">
                  <div className="parameter-group">
                    <label>{t('calcRentalIncomeLabel')}</label>
                    <input
                      type="number"
                      min="0"
                      value={rentalIncome}
                      onChange={(e) => setRentalIncome(e.target.value)}
                      className="parameter-input"
                      placeholder="0"
                    />
                  </div>
                  <div className="parameter-group">
                    <label>{t('calcRentalGrowthLabel')}</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={rentalGrowthRate}
                      onChange={(e) => setRentalGrowthRate(e.target.value)}
                      className="parameter-input"
                      placeholder="0"
                    />
                  </div>
                  <div className="parameter-group">
                    <label>{t('calcOperatingExpensesLabel')}</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={operatingExpenses}
                      onChange={(e) => setOperatingExpenses(e.target.value)}
                      className="parameter-input"
                      placeholder="0"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Кнопка и блок ипотеки */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="expandable-section"
        >
          <button
            className="expandable-button"
            onClick={() => setShowMortgage(!showMortgage)}
            aria-expanded={showMortgage}
          >
            <span className="expandable-button__label">
              <Home className="expandable-button__icon" size={20} strokeWidth={2} />
              {t('calcMortgageSection')}
            </span>
            <ChevronDown className={`expand-icon ${showMortgage ? 'expanded' : ''}`} size={22} strokeWidth={2} />
          </button>
          <AnimatePresence>
            {showMortgage && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="expandable-content"
              >
                <div className="expandable-grid">
                  <div className="parameter-group checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={useMortgage}
                        onChange={(e) => setUseMortgage(e.target.checked)}
                      />
                      {t('calcUseMortgageLabel')}
                    </label>
                  </div>
                  {useMortgage && (
                    <>
                      <div className="parameter-group">
                        <label>{t('calcMortgageRateLabel')}</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={mortgageRate}
                          onChange={(e) => setMortgageRate(e.target.value)}
                          className="parameter-input"
                          placeholder="0"
                        />
                        {mortgageRates && (
                          <span className="data-hint">
                            {t('calcMortgageAverage', { rate: mortgageRates.averageRate?.toFixed(1) })}
                          </span>
                        )}
                      </div>
                      <div className="parameter-group">
                        <label>{t('calcMortgageTermLabel')}</label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={mortgageTerm}
                          onChange={(e) => setMortgageTerm(e.target.value)}
                          className="parameter-input"
                          placeholder="0"
                        />
                      </div>
                      <div className="parameter-group">
                        <label>{t('calcDownPaymentLabel')}</label>
                        <input
                          type="number"
                          min="10"
                          max="100"
                          value={downPayment}
                          onChange={(e) => setDownPayment(e.target.value)}
                          className="parameter-input"
                          placeholder="0"
                        />
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

// Вспомогательные функции
function calculateMonthlyPayment(principal, monthlyRate, numberOfPayments) {
  if (monthlyRate === 0) return principal / numberOfPayments;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
         (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
}

function formatCurrency(value, locale = 'ru') {
  const localeMap = { ru: 'ru-RU', en: 'en-US', de: 'de-DE', es: 'es-ES', fr: 'fr-FR', sv: 'sv-SE' };
  const resolvedLocale = localeMap[locale] || 'ru-RU';
  return new Intl.NumberFormat(resolvedLocale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

export default InvestmentCalculator;
