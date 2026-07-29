export const BUYER_CATALOGUE_PAGE_SIZE = 16

export function paginateBuyerCatalogue(
  items,
  requestedPage = 1,
  pageSize = BUYER_CATALOGUE_PAGE_SIZE,
) {
  const source = Array.isArray(items) ? items : []
  const safePageSize = Math.max(1, Number(pageSize) || BUYER_CATALOGUE_PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(source.length / safePageSize))
  const parsedPage = Number.parseInt(requestedPage, 10)
  const currentPage = Math.min(totalPages, Math.max(1, Number.isFinite(parsedPage) ? parsedPage : 1))
  const start = (currentPage - 1) * safePageSize

  return {
    items: source.slice(start, start + safePageSize),
    currentPage,
    totalPages,
    totalItems: source.length,
    pageSize: safePageSize,
  }
}
