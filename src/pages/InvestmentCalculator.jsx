import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
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
import { getPropertyCardImage } from '../utils/propertyImage';
import { buildResponsiveImageProps } from '../utils/responsiveImage';
import { scrollMainTo } from '../utils/mainScroll';
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal';
import { isSiteUserSignedIn } from '../utils/siteAuthGate';
import {
  CLERK_DB_USER_SYNCED,
  fetchNumericDbUserIdForApi,
  getStoredNumericUserId,
} from '../services/authService';
import { useFavoriteAuctionItems } from '../hooks/useFavoriteAuctionItems';
import { subscriptionUnlocksCalculator } from '../utils/subscriptionAccess';
import {
  ChevronDown,
  Wallet,
  Home,
  TrendingUp,
  PiggyBank,
  ArrowLeft,
  Building2,
  RefreshCw,
  Heart,
  PenLine,
  Sparkles,
  PieChart,
  Loader2,
} from 'lucide-react';
import './InvestmentCalculator.css';

const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80';

function listingPriceEuros(property) {
  const n = (v) => {
    const x = Number(v);
    return Number.isFinite(x) && x > 0 ? x : 0;
  };
  const bid = n(property?.currentBid);
  const price = n(property?.price);
  const start = n(property?.auction_starting_price);
  if (bid > 0) return bid;
  if (price > 0) return price;
  if (start > 0) return start;
  return 0;
}

function listingThumb(property) {
  return getPropertyCardImage(property, PLACEHOLDER_IMG);
}

function listingThumbProps(property) {
  return buildResponsiveImageProps(listingThumb(property), {
    widths: [96, 144, 192],
    sizes: '64px',
    fit: 'cover',
    quality: 72,
    format: 'webp',
  });
}

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
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoaded: userLoaded } = useUser();
  const propertyEntryHandledRef = useRef(false);

  const [propertyPrice, setPropertyPrice] = useState('');
  const [renovationCost, setRenovationCost] = useState('');
  const [ownershipPeriod, setOwnershipPeriod] = useState('');
  const [marketGrowthRate, setMarketGrowthRate] = useState('');
  const [scenario, setScenario] = useState('custom');
  
  // Арендный доход
  const [rentalIncome, setRentalIncome] = useState('');
  const [rentalGrowthRate, setRentalGrowthRate] = useState('');
  const [operatingExpenses, setOperatingExpenses] = useState('');
  
  // Ипотека
  const [useMortgage, setUseMortgage] = useState(false);
  const [mortgageRate, setMortgageRate] = useState('');
  const [mortgageTerm, setMortgageTerm] = useState('');
  const [downPayment, setDownPayment] = useState('');

  /** Упрощённые расходы сделки (Испания): ITP/покупка, продажа, налог с прироста */
  const [buyerCostsPct, setBuyerCostsPct] = useState('8');
  const [sellerCostsPct, setSellerCostsPct] = useState('4');
  const [capitalGainsTaxPct, setCapitalGainsTaxPct] = useState('19');

  // Переключение графиков
  const [activeChart, setActiveChart] = useState('income-expenses'); // 'income-expenses' или 'property-value'

  // Мастер: 1 — стратегия, 2 — источник данных, 3 — параметры и график
  const [wizardStep, setWizardStep] = useState(1);
  const [investmentStrategy, setInvestmentStrategy] = useState(null);
  const [dataSource, setDataSource] = useState(null);
  const [selectedFavoriteKey, setSelectedFavoriteKey] = useState(null);
  const [ownershipShare, setOwnershipShare] = useState('100');
  const [favDropdownOpen, setFavDropdownOpen] = useState(false);
  const favDropdownRef = useRef(null);

  const { favoriteAuctions, loadCatalog } = useFavoriteAuctionItems();

  const [mortgageRates, setMortgageRates] = useState(null);

  const [dbUserId, setDbUserId] = useState(() => getStoredNumericUserId());
  const [subGateResolved, setSubGateResolved] = useState(false);
  const [subGateAllowed, setSubGateAllowed] = useState(false);

  const showSubGateOverlay =
    userLoaded &&
    isSiteUserSignedIn(user, userLoaded) &&
    (!subGateResolved || !subGateAllowed);

  useEffect(() => {
    const applyNumericUserIdFromStorage = () => {
      const savedUserId = localStorage.getItem('userId');
      if (savedUserId && /^\d+$/.test(savedUserId)) {
        const n = parseInt(savedUserId, 10);
        setDbUserId((prev) => (prev === n ? prev : n));
      }
    };
    applyNumericUserIdFromStorage();
    window.addEventListener(CLERK_DB_USER_SYNCED, applyNumericUserIdFromStorage);
    return () => window.removeEventListener(CLERK_DB_USER_SYNCED, applyNumericUserIdFromStorage);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = await fetchNumericDbUserIdForApi({
        clerkUser: user,
        clerkUserLoaded: userLoaded,
      });
      if (!cancelled && id != null) {
        setDbUserId((prev) => (prev === id ? prev : id));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userLoaded, user?.id, user?.primaryEmailAddress?.emailAddress]);

  useEffect(() => {
    if (!userLoaded || !isSiteUserSignedIn(user, userLoaded)) return;
    if (dbUserId) return;
    const t = window.setTimeout(() => {
      setSubGateResolved(true);
      setSubGateAllowed(false);
    }, 10000);
    return () => window.clearTimeout(t);
  }, [userLoaded, user, dbUserId]);

  useEffect(() => {
    if (!userLoaded || !isSiteUserSignedIn(user, userLoaded)) return;
    if (!dbUserId) return;
    let cancelled = false;
    setSubGateResolved(false);
    setSubGateAllowed(false);
    const API_BASE_URL = getApiBaseUrlSync();
    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/users/${dbUserId}/subscription-billing`);
        const json = await r.json();
        if (cancelled) return;
        const sub = json?.success && json?.data ? json.data.subscription : null;
        setSubGateAllowed(subscriptionUnlocksCalculator(sub));
      } catch {
        if (!cancelled) setSubGateAllowed(false);
      } finally {
        if (!cancelled) setSubGateResolved(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userLoaded, user, dbUserId]);

  useEffect(() => {
    if (!showSubGateOverlay) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') e.preventDefault();
    };
    window.addEventListener('keydown', onKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prevOverflow;
    };
  }, [showSubGateOverlay]);

  useEffect(() => {
    if (!userLoaded) return;
    if (!isSiteUserSignedIn(user, userLoaded)) {
      requestOpenLoginModal({ wizard: true });
      navigate('/', { replace: true });
    }
  }, [user, userLoaded, navigate]);

  useEffect(() => {
    scrollMainTo(0, 0)
    fetchMarketData();
  }, []);

  useEffect(() => {
    scrollMainTo(0, 0, 'instant')
  }, [wizardStep]);

  // На странице калькулятора должен работать только один глобальный скролл (.app-layout).
  useEffect(() => {
    const appLayoutEl = document.querySelector('.app-layout');
    if (!appLayoutEl) return undefined;

    appLayoutEl.classList.add('app-layout--calculator-single-scroll');
    return () => {
      appLayoutEl.classList.remove('app-layout--calculator-single-scroll');
    };
  }, []);

  const fetchMarketData = async () => {
    try {
      const API_BASE_URL = getApiBaseUrlSync();
      
      const mortgageResponse = await fetch(`${API_BASE_URL}/investment/mortgage-rates`).catch(() => null);

      if (mortgageResponse?.ok) {
        const mortgage = await mortgageResponse.json();
        if (mortgage.success) {
          setMortgageRates(mortgage.data);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
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

  useEffect(() => {
    const onDoc = (e) => {
      if (!favDropdownRef.current?.contains(e.target)) setFavDropdownOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const applyPropertyPreset = useCallback(
    (property, strategy) => {
      const price = listingPriceEuros(property);
      const yearBuilt = property?.year_built ?? property?.yearBuilt;
      const age = yearBuilt ? new Date().getFullYear() - Number(yearBuilt) : 30;
      const renoRate = age > 25 ? 0.04 : 0.02;
      const rentGuess = price > 0 ? Math.round(price * 0.045) : '';

      setPropertyPrice(price > 0 ? String(Math.round(price)) : '');
      setRenovationCost(price > 0 ? String(Math.round(price * renoRate)) : '');
      setOwnershipPeriod('10');
      setOperatingExpenses('25');
      setScenario('stable');

      if (strategy === 'resale') {
        setRentalIncome('0');
      } else {
        setRentalIncome(rentGuess !== '' ? String(rentGuess) : '');
      }
      setBuyerCostsPct('8');
      setSellerCostsPct('4');
      setCapitalGainsTaxPct('19');

      if (strategy === 'fractional') {
        setOwnershipShare('50');
      } else {
        setOwnershipShare('100');
      }
    },
    []
  );

  useEffect(() => {
    if (propertyEntryHandledRef.current) return;
    const property = location.state?.calculatorFromProperty;
    if (!property || typeof property !== 'object') return;

    propertyEntryHandledRef.current = true;

    const rawStrategy = location.state?.calculatorStrategy;
    const strategy =
      rawStrategy === 'resale' || rawStrategy === 'fractional' || rawStrategy === 'rent'
        ? rawStrategy
        : 'rent';

    setInvestmentStrategy(strategy);
    setDataSource('manual');
    setSelectedFavoriteKey(null);
    applyPropertyPreset(property, strategy);
    setWizardStep(3);

    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate, applyPropertyPreset]);

  const selectedFavoriteItem = useMemo(
    () => favoriteAuctions.find((x) => x.key === selectedFavoriteKey) ?? null,
    [favoriteAuctions, selectedFavoriteKey]
  );

  useEffect(() => {
    if ((wizardStep !== 2 && wizardStep !== 3) || dataSource !== 'favorites' || !investmentStrategy) return;
    if (favoriteAuctions.length === 0) return;
    if (selectedFavoriteKey) return;
    const first = favoriteAuctions[0];
    setSelectedFavoriteKey(first.key);
    applyPropertyPreset(first.property, investmentStrategy);
  }, [
    wizardStep,
    dataSource,
    favoriteAuctions,
    selectedFavoriteKey,
    investmentStrategy,
    applyPropertyPreset,
  ]);

  useEffect(() => {
    if (wizardStep !== 2 || dataSource !== 'favorites') return;
    loadCatalog();
  }, [wizardStep, dataSource, loadCatalog]);

  const pickFavorite = useCallback(
    (item) => {
      if (!investmentStrategy) return;
      setSelectedFavoriteKey(item.key);
      applyPropertyPreset(item.property, investmentStrategy);
      setFavDropdownOpen(false);
    },
    [applyPropertyPreset, investmentStrategy]
  );

  const goStep2 = () => {
    if (!investmentStrategy) return;
    setWizardStep(2);
  };

  const goStep3 = () => {
    if (!dataSource) return;
    if (dataSource === 'favorites') loadCatalog();
    setWizardStep(3);
  };

  const resetWizard = () => {
    setWizardStep(1);
    setInvestmentStrategy(null);
    setDataSource(null);
    setSelectedFavoriteKey(null);
    setFavDropdownOpen(false);
    setOwnershipShare('100');
    setPropertyPrice('');
    setRenovationCost('');
    setOwnershipPeriod('');
    setMarketGrowthRate('');
    setScenario('custom');
    setRentalIncome('');
    setRentalGrowthRate('');
    setOperatingExpenses('');
    setUseMortgage(false);
    setMortgageRate('');
    setMortgageTerm('');
    setDownPayment('');
    setBuyerCostsPct('8');
    setSellerCostsPct('4');
    setCapitalGainsTaxPct('19');
  };

  const strategyHintKey =
    investmentStrategy === 'rent'
      ? 'calcStrategyHintRent'
      : investmentStrategy === 'resale'
        ? 'calcStrategyHintResale'
        : investmentStrategy === 'fractional'
          ? 'calcStrategyHintFractional'
          : null;

  // Расчёт: доля масштабирует цену/аренду/ремонт; ипотека — аннуитет с погашением; перепродажа — выход в последний год.
  const calculations = useMemo(() => {
    const shareRaw = Number(ownershipShare);
    const sharePct =
      investmentStrategy === 'fractional'
        ? Math.min(100, Math.max(1, Number.isFinite(shareRaw) ? shareRaw : 50))
        : 100;
    const scale = sharePct / 100;

    const pPrice = (Number(propertyPrice) || 0) * scale;
    const rCost = (Number(renovationCost) || 0) * scale;
    const period = Number(ownershipPeriod) || 0;
    const mGrowth = Number(marketGrowthRate) || 0;
    const rIncome = (Number(rentalIncome) || 0) * scale;
    const rGrowth = Number(rentalGrowthRate) || 0;
    const opExp = Number(operatingExpenses) || 0;
    const mRate = Number(mortgageRate) || 0;
    const mTerm = Math.max(0, Number(mortgageTerm) || 0);
    const dPay = Number(downPayment) || 0;
    const buyerPct = Math.max(0, Number(buyerCostsPct) || 0);
    const sellerPct = Math.max(0, Number(sellerCostsPct) || 0);
    const cgPct = Math.max(0, Number(capitalGainsTaxPct) || 0);

    const buyerFeesAmount = (pPrice * buyerPct) / 100;
    const downPaymentAmount = useMortgage ? (pPrice * dPay) / 100 : pPrice;
    const loanAmount = useMortgage ? Math.max(0, pPrice - downPaymentAmount) : 0;
    const initialEquity = downPaymentAmount + rCost + buyerFeesAmount;
    const totalInvestment = pPrice + rCost + buyerFeesAmount;

    const monthlyRate = mRate / 100 / 12;
    const totalMonths = Math.max(1, Math.round(mTerm * 12));
    const monthlyMortgagePayment =
      useMortgage && loanAmount > 0 && mTerm > 0
        ? calculateMonthlyPayment(loanAmount, monthlyRate, totalMonths)
        : 0;

    const yearlyData = [];
    let currentPropertyValue = pPrice;
    let currentRentalIncome = rIncome;
    let loanBal = loanAmount;
    let monthsElapsed = 0;
    const acquisitionBasis = pPrice + rCost + buyerFeesAmount;

    for (let year = 1; year <= period; year++) {
      currentPropertyValue *= 1 + mGrowth / 100;
      currentRentalIncome *= 1 + rGrowth / 100;

      let yearMortgagePayment = 0;
      for (let m = 0; m < 12; m++) {
        if (!useMortgage || loanBal <= 0.001 || monthsElapsed >= totalMonths) continue;
        const interest = loanBal * monthlyRate;
        const principalPart = Math.min(Math.max(monthlyMortgagePayment - interest, 0), loanBal);
        const pay = interest + principalPart;
        yearMortgagePayment += pay;
        loanBal -= principalPart;
        monthsElapsed += 1;
      }

      const yearOperatingExpenses = (currentRentalIncome * opExp) / 100;
      const operatingCash =
        currentRentalIncome - yearOperatingExpenses - yearMortgagePayment;

      let cashFlow = operatingCash;
      if (investmentStrategy === 'resale' && year === period) {
        const saleAfterSeller = currentPropertyValue * (1 - sellerPct / 100);
        const taxableGain = Math.max(0, saleAfterSeller - loanBal - acquisitionBasis);
        const cgtax = (taxableGain * cgPct) / 100;
        const exitNet = saleAfterSeller - loanBal - cgtax;
        cashFlow = operatingCash + exitNet;
        loanBal = 0;
      }

      yearlyData.push({
        year,
        propertyValue: currentPropertyValue,
        rentalIncome: currentRentalIncome,
        operatingExpenses: yearOperatingExpenses,
        mortgagePayment: yearMortgagePayment,
        totalExpenses: yearOperatingExpenses + yearMortgagePayment,
        cashFlow,
      });
    }

    const lastYear = yearlyData[yearlyData.length - 1];
    const totalRentalIncome = yearlyData.reduce((sum, d) => sum + d.rentalIncome, 0);
    const totalExpensesSum = yearlyData.reduce((sum, d) => sum + d.totalExpenses, 0);
    const sumCashFlows = yearlyData.reduce((sum, d) => sum + d.cashFlow, 0);
    const totalProfit = sumCashFlows - initialEquity;
    const totalReturnOnEquity =
      initialEquity > 0 ? (totalProfit / initialEquity) * 100 : 0;
    const y1 = yearlyData[0];
    const denomYield = pPrice + rCost;
    const grossYieldY1 =
      denomYield > 0 && y1 ? (y1.rentalIncome / denomYield) * 100 : 0;
    const netYieldY1 =
      denomYield > 0 && y1
        ? ((y1.rentalIncome - y1.operatingExpenses) / denomYield) * 100
        : 0;
    const noiMarginY1 =
      y1 && y1.rentalIncome > 0
        ? ((y1.rentalIncome - y1.operatingExpenses) / y1.rentalIncome) * 100
        : 0;
    const cashOnCashY1 =
      initialEquity > 0 && y1 ? (y1.cashFlow / initialEquity) * 100 : 0;

    return {
      yearlyData,
      totalInvestment,
      initialEquity,
      downPaymentAmount,
      loanAmount,
      monthlyMortgagePayment,
      finalPropertyValue: lastYear?.propertyValue ?? pPrice,
      totalRentalIncome,
      netCashFlow: sumCashFlows,
      totalProfit,
      grossYieldY1,
      netYieldY1,
      noiMarginY1,
      cashOnCashY1,
      totalReturnOnEquity,
    };
  }, [
    propertyPrice,
    renovationCost,
    ownershipPeriod,
    marketGrowthRate,
    useMortgage,
    mortgageRate,
    mortgageTerm,
    downPayment,
    rentalIncome,
    rentalGrowthRate,
    operatingExpenses,
    investmentStrategy,
    ownershipShare,
    buyerCostsPct,
    sellerCostsPct,
    capitalGainsTaxPct,
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

  const strategyStepperSummary =
    investmentStrategy === 'rent'
      ? t('calcStrategyRentTitle')
      : investmentStrategy === 'resale'
        ? t('calcStrategyResaleTitle')
        : investmentStrategy === 'fractional'
          ? t('calcStrategyFractionalTitle')
          : null;

  const sourceStepperSummary = (() => {
    if (!dataSource) return null;
    if (dataSource === 'manual') return t('calcSourceManualTitle');
    const base = t('calcSourceFavoritesTitle');
    const prop = selectedFavoriteItem?.property;
    const raw = prop ? String(prop.title || prop.name || (prop.id != null ? `#${prop.id}` : '')).trim() : '';
    return raw ? `${base} · ${raw}` : base;
  })();

  const stepper = (
    <div className="calc-stepper" role="list" aria-label={t('calcStepperAria')}>
      {[1, 2, 3].map((n) => {
        const showStrategyPick = n === 1 && wizardStep >= 2 && strategyStepperSummary;
        const showSourcePick = n === 2 && wizardStep >= 2 && dataSource && sourceStepperSummary;
        const pickTitle = showStrategyPick ? strategyStepperSummary : showSourcePick ? sourceStepperSummary : undefined;
        return (
          <div
            key={n}
            role="listitem"
            className={`calc-stepper__item ${wizardStep === n ? 'is-active' : ''} ${wizardStep > n ? 'is-done' : ''}`}
          >
            <span className="calc-stepper__num">{n}</span>
            <span className="calc-stepper__label">
              <span className="calc-stepper__title">
                {n === 1 ? t('calcStep1Short') : n === 2 ? t('calcStep2Short') : t('calcStep3Short')}
              </span>
              {(showStrategyPick || showSourcePick) && (
                <span className="calc-stepper__pick" title={pickTitle}>
                  {showStrategyPick ? strategyStepperSummary : sourceStepperSummary}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );

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
          <span className="calculator-badge">
            {wizardStep === 1 ? t('calcStep1Badge') : wizardStep === 2 ? t('calcStep2Badge') : t('calcStep3Badge')}
          </span>
          <h1 className="calculator-title">{t('calculator')}</h1>
          <p className="calculator-subtitle">
            {wizardStep === 1
              ? t('calcWizardIntroLead')
              : wizardStep === 2
                ? t('calcStep2Lead')
                : t('calcStep3Lead')}
          </p>
          <div className="calculator-header__stepper">{stepper}</div>
        </motion.div>

        <AnimatePresence mode="wait">
          {wizardStep === 1 && (
            <motion.section
              key="w1"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="calc-wizard-section"
            >
              <h2 className="calc-wizard-section__title">{t('calcWizardIntroTitle')}</h2>
              <div className="calc-strategy-grid">
                <button
                  type="button"
                  className={`calc-strategy-card calc-strategy-card--rent ${investmentStrategy === 'rent' ? 'is-selected' : ''}`}
                  onClick={() => {
                    setInvestmentStrategy('rent');
                  }}
                >
                  <span className="calc-strategy-card__glow" aria-hidden />
                  <span className="calc-strategy-card__icon" aria-hidden>
                    <Building2 size={26} strokeWidth={1.85} />
                  </span>
                  <span className="calc-strategy-card__body">
                    <span className="calc-strategy-card__kicker">{t('calcStrategyRentTitle')}</span>
                    <span className="calc-strategy-card__desc">{t('calcStrategyRentDesc')}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className={`calc-strategy-card calc-strategy-card--resale ${investmentStrategy === 'resale' ? 'is-selected' : ''}`}
                  onClick={() => {
                    setInvestmentStrategy('resale');
                    setRentalIncome('0');
                  }}
                >
                  <span className="calc-strategy-card__glow" aria-hidden />
                  <span className="calc-strategy-card__icon" aria-hidden>
                    <TrendingUp size={26} strokeWidth={1.85} />
                  </span>
                  <span className="calc-strategy-card__body">
                    <span className="calc-strategy-card__kicker">{t('calcStrategyResaleTitle')}</span>
                    <span className="calc-strategy-card__desc">{t('calcStrategyResaleDesc')}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className={`calc-strategy-card calc-strategy-card--fractional ${investmentStrategy === 'fractional' ? 'is-selected' : ''}`}
                  onClick={() => {
                    setInvestmentStrategy('fractional');
                    setOwnershipShare('50');
                  }}
                >
                  <span className="calc-strategy-card__glow" aria-hidden />
                  <span className="calc-strategy-card__icon" aria-hidden>
                    <PieChart size={26} strokeWidth={1.85} />
                  </span>
                  <span className="calc-strategy-card__body">
                    <span className="calc-strategy-card__kicker">{t('calcStrategyFractionalTitle')}</span>
                    <span className="calc-strategy-card__desc">{t('calcStrategyFractionalDesc')}</span>
                  </span>
                </button>
              </div>
              <div className="calc-wizard-actions">
                <button
                  type="button"
                  className="calc-wizard-btn calc-wizard-btn--primary"
                  disabled={!investmentStrategy}
                  onClick={goStep2}
                >
                  {t('calcNext')}
                </button>
              </div>
            </motion.section>
          )}

          {wizardStep === 2 && (
            <motion.section
              key="w2"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="calc-wizard-section"
            >
              <h2 className="calc-wizard-section__title">{t('calcStep2Title')}</h2>
              <p className="calc-wizard-section__subtitle">{t('calcStep2Lead')}</p>
              <div className="calc-source-grid">
                <button
                  type="button"
                  className={`calc-source-card calc-source-card--favorites ${dataSource === 'favorites' ? 'is-selected' : ''}`}
                  onClick={() => {
                    setDataSource('favorites');
                    loadCatalog();
                  }}
                >
                  <span className="calc-source-card__glow" aria-hidden />
                  <span className="calc-source-card__row">
                    <span className="calc-source-card__icon-wrap" aria-hidden>
                      <Heart size={24} strokeWidth={2} />
                    </span>
                    <span className="calc-source-card__copy">
                      <span className="calc-source-card__title">{t('calcSourceFavoritesTitle')}</span>
                      <span className="calc-source-card__desc">{t('calcSourceFavoritesDesc')}</span>
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className={`calc-source-card calc-source-card--manual ${dataSource === 'manual' ? 'is-selected' : ''}`}
                  onClick={() => {
                    setDataSource('manual');
                    setSelectedFavoriteKey(null);
                  }}
                >
                  <span className="calc-source-card__glow" aria-hidden />
                  <span className="calc-source-card__row">
                    <span className="calc-source-card__icon-wrap" aria-hidden>
                      <PenLine size={24} strokeWidth={2} />
                    </span>
                    <span className="calc-source-card__copy">
                      <span className="calc-source-card__title">{t('calcSourceManualTitle')}</span>
                      <span className="calc-source-card__desc">{t('calcSourceManualDesc')}</span>
                    </span>
                  </span>
                </button>
              </div>

              {dataSource === 'favorites' && favoriteAuctions.length > 0 && (
                <div className="calc-step2-fav-wrap">
                  <div className="calc-fav-picker calc-fav-picker--step2" ref={favDropdownRef}>
                    <label className="calc-fav-picker__label">{t('calcFavoritesSelectLabel')}</label>
                    <button
                      type="button"
                      className="calc-fav-picker__trigger"
                      aria-expanded={favDropdownOpen}
                      onClick={() => setFavDropdownOpen((o) => !o)}
                    >
                      {selectedFavoriteItem ? (
                        <>
                          <img
                            className="calc-fav-picker__thumb"
                            {...listingThumbProps(selectedFavoriteItem.property)}
                            alt=""
                            onError={(e) => {
                              e.currentTarget.src = PLACEHOLDER_IMG;
                            }}
                          />
                          <span className="calc-fav-picker__trigger-text">
                            <span className="calc-fav-picker__title">
                              {selectedFavoriteItem.property.title ||
                                selectedFavoriteItem.property.name ||
                                t('calcFavoritesPlaceholder')}
                            </span>
                            <span className="calc-fav-picker__meta">
                              {formatCurrency(listingPriceEuros(selectedFavoriteItem.property), i18n.language)}
                            </span>
                          </span>
                        </>
                      ) : (
                        <span className="calc-fav-picker__placeholder">{t('calcFavoritesPlaceholder')}</span>
                      )}
                      <ChevronDown
                        size={20}
                        className={favDropdownOpen ? 'calc-fav-picker__chev is-open' : 'calc-fav-picker__chev'}
                      />
                    </button>
                    {favDropdownOpen && (
                      <ul className="calc-fav-picker__list" role="listbox">
                        {favoriteAuctions.map((item) => (
                          <li key={item.key} role="none">
                            <button
                              type="button"
                              role="option"
                              aria-selected={item.key === selectedFavoriteKey}
                              className={`calc-fav-picker__option ${item.key === selectedFavoriteKey ? 'is-active' : ''}`}
                              onClick={() => pickFavorite(item)}
                            >
                              <img
                                className="calc-fav-picker__thumb"
                                {...listingThumbProps(item.property)}
                                alt=""
                                onError={(e) => {
                                  e.currentTarget.src = PLACEHOLDER_IMG;
                                }}
                              />
                              <span className="calc-fav-picker__option-text">
                                <span className="calc-fav-picker__title">
                                  {item.property.title || item.property.name || ` #${item.property.id}`}
                                </span>
                                <span className="calc-fav-picker__meta">
                                  {formatCurrency(listingPriceEuros(item.property), i18n.language)}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="calc-fav-picker__hint">{t('calcFavoritesEditHint')}</p>
                  </div>
                </div>
              )}

              {dataSource === 'favorites' && favoriteAuctions.length === 0 && (
                <div className="calc-step2-fav-empty">
                  <p>{t('calcFavoritesEmpty')}</p>
                  <Link to="/favorites" className="calc-wizard-btn calc-wizard-btn--secondary">
                    {t('calcFavoritesGo')}
                  </Link>
                </div>
              )}

              <div className="calc-wizard-actions calc-wizard-actions--split">
                <button type="button" className="calc-wizard-btn calc-wizard-btn--ghost" onClick={() => setWizardStep(1)}>
                  <ArrowLeft size={18} strokeWidth={2} aria-hidden />
                  {t('calcBack')}
                </button>
                <button
                  type="button"
                  className="calc-wizard-btn calc-wizard-btn--primary"
                  disabled={!dataSource}
                  onClick={goStep3}
                >
                  {t('calcNext')}
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {wizardStep === 3 && (
          <>
            {strategyHintKey && (
              <div className="calc-strategy-hint">
                <Sparkles className="calc-strategy-hint__icon" size={20} strokeWidth={2} aria-hidden />
                <p>{t(strategyHintKey)}</p>
              </div>
            )}

            {dataSource === 'favorites' && favoriteAuctions.length === 0 && (
              <div className="calc-favorites-banner">
                <p>{t('calcFavoritesEmpty')}</p>
                <div className="calc-favorites-banner__actions">
                  <Link to="/favorites" className="calc-wizard-btn calc-wizard-btn--secondary">
                    {t('calcFavoritesGo')}
                  </Link>
                  <button
                    type="button"
                    className="calc-wizard-btn calc-wizard-btn--ghost"
                    onClick={() => {
                      setDataSource('manual');
                      setSelectedFavoriteKey(null);
                    }}
                  >
                    {t('calcUseManualInstead')}
                  </button>
                </div>
              </div>
            )}

            <div className="calc-step3-shell">
              <div className="calc-dashboard">
                <div className="calc-dashboard__preview">
                  <div className="calc-step3-preview-head">
                    <h2 className="calc-step3-preview-title">{t('calcStep3PreviewTitle')}</h2>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="summary-cards calc-step3-summary"
                  >
          <div className="summary-card">
            <div className="summary-card__icon summary-card__icon--primary">
              <PiggyBank size={20} strokeWidth={2} />
            </div>
            <div className="summary-card__content">
              <span className="summary-card__label">{t('calcInitialEquity')}</span>
              <span className="summary-card__value">{formatCurrency(calculations.initialEquity, i18n.language)}</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-card__icon summary-card__icon--accent">
              <TrendingUp size={20} strokeWidth={2} />
            </div>
            <div className="summary-card__content">
              <span className="summary-card__label">{t('calcGrossYieldY1')}</span>
              <span className="summary-card__value">{formatPercent(calculations.grossYieldY1)}</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-card__icon summary-card__icon--green">
              <Wallet size={20} strokeWidth={2} />
            </div>
            <div className="summary-card__content">
              <span className="summary-card__label">
                {investmentStrategy === 'resale' ? t('calcProjectedRoi') : t('calcCashOnCashY1')}
              </span>
              <span className="summary-card__value">
                {investmentStrategy === 'resale'
                  ? formatPercent(calculations.totalReturnOnEquity)
                  : formatPercent(calculations.cashOnCashY1)}
              </span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-card__icon summary-card__icon--purple">
              <Home size={20} strokeWidth={2} />
            </div>
            <div className="summary-card__content">
              <span className="summary-card__label">{t('calcTotalProfit')}</span>
              <span className={`summary-card__value ${calculations.totalProfit >= 0 ? 'summary-card__value--positive' : 'summary-card__value--negative'}`}>
                {formatCurrency(calculations.totalProfit, i18n.language)}
              </span>
            </div>
          </div>
                  </motion.div>

                  <div className="calc-margin-strip" aria-label={t('calcMarginDriversTitle')}>
                    <div className="calc-margin-strip__row">
                      <span className="calc-margin-strip__label">{t('calcNetYieldY1')}</span>
                      <span className="calc-margin-strip__val">{formatPercent(calculations.netYieldY1)}</span>
                    </div>
                    <div className="calc-margin-strip__row">
                      <span className="calc-margin-strip__label">{t('calcNoiMarginY1')}</span>
                      <span className="calc-margin-strip__val">{formatPercent(calculations.noiMarginY1)}</span>
                    </div>
                    <div className="calc-margin-strip__row">
                      <span className="calc-margin-strip__label">
                        {(Number(ownershipPeriod) || 0) > 0
                          ? t('calcFinalValueYears', { count: Number(ownershipPeriod) || 0 })
                          : t('calcFinalValue')}
                      </span>
                      <span className="calc-margin-strip__val">
                        {formatCurrency(calculations.finalPropertyValue, i18n.language)}
                      </span>
                    </div>
                    <div className="calc-margin-strip__row">
                      <span className="calc-margin-strip__label">{t('calcRentalIncomePeriod')}</span>
                      <span className="calc-margin-strip__val">
                        {formatCurrency(calculations.totalRentalIncome, i18n.language)}
                      </span>
                    </div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 }}
                    className="chart-section calc-step3-chart"
                  >
                  <div className="chart-header">
                    <div className="chart-tabs">
                      <button
                        type="button"
                        className={`chart-tab ${activeChart === 'income-expenses' ? 'active' : ''}`}
                        onClick={() => setActiveChart('income-expenses')}
                      >
                        {t('calcChartIncomeVsExpenses')}
                      </button>
                      <button
                        type="button"
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
                          style={{ width: '100%', minWidth: 0 }}
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
                          className="chart-wrapper__line-chart"
                        >
                          {hasYearlyData ? (
                            <Line data={propertyValueChartData} options={chartOptions} />
                          ) : (
                            <div className="chart-empty-state">{t('calcNoData')}</div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  </motion.div>
                </div>

                <aside className="calc-dashboard__form calc-step3-sidebar">
                  <div className="calc-step3-sidebar-head">
                    <h2 className="calc-step3-sidebar-title">{t('calcStep3FormTitle')}</h2>
                  </div>
                  <div className="calc-margin-legend">
                    <h3 className="calc-margin-legend__title">{t('calcMarginDriversTitle')}</h3>
                    <p className="calc-margin-legend__text">{t('calcMarginDriversText')}</p>
                  </div>
                {dataSource === 'favorites' && favoriteAuctions.length > 0 && (
                  <div className="calc-fav-picker" ref={favDropdownRef}>
                    <label className="calc-fav-picker__label">{t('calcFavoritesSelectLabel')}</label>
                    <button
                      type="button"
                      className="calc-fav-picker__trigger"
                      aria-expanded={favDropdownOpen}
                      onClick={() => setFavDropdownOpen((o) => !o)}
                    >
                      {selectedFavoriteItem ? (
                        <>
                          <img
                            className="calc-fav-picker__thumb"
                            {...listingThumbProps(selectedFavoriteItem.property)}
                            alt=""
                            onError={(e) => {
                              e.currentTarget.src = PLACEHOLDER_IMG;
                            }}
                          />
                          <span className="calc-fav-picker__trigger-text">
                            <span className="calc-fav-picker__title">
                              {selectedFavoriteItem.property.title ||
                                selectedFavoriteItem.property.name ||
                                t('calcFavoritesPlaceholder')}
                            </span>
                            <span className="calc-fav-picker__meta">
                              {formatCurrency(listingPriceEuros(selectedFavoriteItem.property), i18n.language)}
                            </span>
                          </span>
                        </>
                      ) : (
                        <span className="calc-fav-picker__placeholder">{t('calcFavoritesPlaceholder')}</span>
                      )}
                      <ChevronDown size={20} className={favDropdownOpen ? 'calc-fav-picker__chev is-open' : 'calc-fav-picker__chev'} />
                    </button>
                    {favDropdownOpen && (
                      <ul className="calc-fav-picker__list" role="listbox">
                        {favoriteAuctions.map((item) => (
                          <li key={item.key} role="none">
                            <button
                              type="button"
                              role="option"
                              aria-selected={item.key === selectedFavoriteKey}
                              className={`calc-fav-picker__option ${item.key === selectedFavoriteKey ? 'is-active' : ''}`}
                              onClick={() => pickFavorite(item)}
                            >
                              <img
                                className="calc-fav-picker__thumb"
                                {...listingThumbProps(item.property)}
                                alt=""
                                onError={(e) => {
                                  e.currentTarget.src = PLACEHOLDER_IMG;
                                }}
                              />
                              <span className="calc-fav-picker__option-text">
                                <span className="calc-fav-picker__title">
                                  {item.property.title || item.property.name || ` #${item.property.id}`}
                                </span>
                                <span className="calc-fav-picker__meta">
                                  {formatCurrency(listingPriceEuros(item.property), i18n.language)}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="calc-fav-picker__hint">{t('calcFavoritesEditHint')}</p>
                  </div>
                )}

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
            {investmentStrategy === 'fractional' && (
              <div className="parameter-group">
                <label>{t('calcOwnershipShareLabel')}</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={ownershipShare}
                  onChange={(e) => setOwnershipShare(e.target.value)}
                  className="parameter-input"
                  placeholder="50"
                />
                <span className="data-hint">{t('calcOwnershipShareHint')}</span>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="parameters-section calc-input-block"
        >
          <h2 className="section-title section-title--compact">{t('calcSpainDealSection')}</h2>
          <div className="parameters-grid">
            <div className="parameter-group">
              <label>{t('calcBuyerCostsLabel')}</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="20"
                value={buyerCostsPct}
                onChange={(e) => setBuyerCostsPct(e.target.value)}
                className="parameter-input"
                placeholder="8"
              />
            </div>
            <div className="parameter-group">
              <label>{t('calcSellerCostsLabel')}</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="15"
                value={sellerCostsPct}
                onChange={(e) => setSellerCostsPct(e.target.value)}
                className="parameter-input"
                placeholder="4"
              />
            </div>
            <div className="parameter-group">
              <label>{t('calcCapitalGainsTaxLabel')}</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="50"
                value={capitalGainsTaxPct}
                onChange={(e) => setCapitalGainsTaxPct(e.target.value)}
                className="parameter-input"
                placeholder="19"
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="parameters-section calc-input-block"
        >
          <h2 className="section-title section-title--compact">{t('calcRentalBlockTitle')}</h2>
          <p className="calc-input-block__hint">
            {t('calcRentalBlockHint')}{' '}
            {investmentStrategy === 'resale' ? t('calcRentalOptionalResale') : ''}
          </p>
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="parameters-section calc-input-block"
        >
          <h2 className="section-title section-title--compact">{t('calcMortgageBlockTitle')}</h2>
          <p className="calc-input-block__hint">{t('calcMortgageBlockHint')}</p>
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

                  <div className="calc-dashboard__footer">
                    <button
                      type="button"
                      className="calc-wizard-btn calc-wizard-btn--ghost"
                      onClick={() => setWizardStep(2)}
                    >
                      <ArrowLeft size={18} strokeWidth={2} aria-hidden />
                      {t('calcBack')}
                    </button>
                    <button type="button" className="calc-wizard-btn calc-wizard-btn--secondary" onClick={resetWizard}>
                      <RefreshCw size={18} strokeWidth={2} aria-hidden />
                      {t('calcRestartWizard')}
                    </button>
                  </div>
                </aside>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="investment-calculator-page__footer-blend" aria-hidden="true" />

      {showSubGateOverlay && (
        <div className="calc-sub-gate-overlay">
          {!subGateResolved ? (
            <div className="calc-sub-gate-loading" role="status" aria-live="polite">
              <Loader2 className="calc-sub-gate-loading__icon" size={40} strokeWidth={2} aria-hidden />
              <p className="calc-sub-gate-loading__text">{t('calcSubGateLoading')}</p>
            </div>
          ) : (
            <div
              className="calc-sub-gate-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="calc-sub-gate-title"
            >
              <div className="calc-sub-gate-modal__inner">
                <h2 id="calc-sub-gate-title" className="calc-sub-gate-modal__title">
                  {t('calcSubGateTitle')}
                </h2>
                <p className="calc-sub-gate-modal__text">{t('calcSubGateBody')}</p>
                <div className="calc-sub-gate-modal__actions">
                  <button
                    type="button"
                    className="calc-sub-gate-btn calc-sub-gate-btn--primary"
                    onClick={() =>
                      navigate({ pathname: '/subscriptions', hash: 'subscriptions-pricing-section' })
                    }
                  >
                    {t('calcSubGateCtaSubscribe')}
                  </button>
                  <button
                    type="button"
                    className="calc-sub-gate-btn calc-sub-gate-btn--ghost"
                    onClick={() => navigate('/', { replace: true })}
                  >
                    {t('calcSubGateCtaHome')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
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

function formatPercent(value, fractionDigits = 1) {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(fractionDigits)} %`;
}

export default InvestmentCalculator;
