import { userQueries, propertyQueries, stripeSubscriptionQueries } from './database/database.js'

function resolveWeekRange(weekStartRaw) {
  let weekStart = weekStartRaw
  if (!weekStart) {
    const now = new Date()
    const day = now.getDay()
    const mondayOffset = day === 0 ? -6 : 1 - day
    const monday = new Date(now)
    monday.setDate(now.getDate() + mondayOffset)
    weekStart = monday.toISOString().slice(0, 10)
  }
  const start = new Date(weekStart)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return { weekStart, weekEnd: end.toISOString().slice(0, 10) }
}

/**
 * Карточки и графики админской статистики одним ответом
 * вместо 8 отдельных GET (без списка Stripe-платежей на 2000 строк).
 */
export async function loadAdminDashboardStats({ weekStart: weekStartRaw } = {}) {
  const { weekStart, weekEnd } = resolveWeekRange(weekStartRaw)
  const [
    usersCount,
    countryStats,
    roleStats,
    registrationsByDay,
    propertiesCount,
    auctionsCount,
    stripePaymentsCount,
    byType,
    bySection,
  ] = await Promise.all([
    userQueries.getCount(),
    userQueries.getCountryStats(),
    userQueries.getRoleStats(),
    userQueries.getRegistrationsByDay(weekStart, weekEnd),
    propertyQueries.getApprovedCount(),
    propertyQueries.getAuctionsCount(),
    stripeSubscriptionQueries.countPayments(),
    propertyQueries.getCategoryStatsByType(),
    propertyQueries.getCategoryStatsBySection(),
  ])

  return {
    usersCount,
    countryStats,
    roleStats,
    registrationsByDay,
    weekStart,
    weekEnd,
    propertiesCount,
    auctionsCount,
    stripePaymentsCount,
    categoryStats: { byType, bySection },
  }
}
