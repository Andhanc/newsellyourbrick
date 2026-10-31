export function developmentPortfolioHistory(rows = [], locale = 'ru-RU') {
  return rows.map((project) => {
    const date = project.lastPaidAt
    const parsed = new Date(date || 0)
    return {
      id: `development-${project.projectId}`,
      projectId: project.projectId,
      title: project.title,
      subtitle: 'DEVELOP',
      location: project.location,
      amount: new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: project.currency || 'EUR',
        maximumFractionDigits: 2,
      }).format(project.amount),
      amountValue: Number(project.amount),
      currency: project.currency,
      purchaseDate: date && Number.isFinite(parsed.getTime())
        ? new Intl.DateTimeFormat(locale, {
            day: 'numeric',
            month: 'short',
          }).format(parsed)
        : '',
      sort: parsed.getTime() || 0,
      imageSrc:
        project.imageSrc ||
        '/images/development/investment-villa-tiffany-v1.webp',
      href: `/development/${encodeURIComponent(project.slug)}`,
      development: project,
    }
  })
}
