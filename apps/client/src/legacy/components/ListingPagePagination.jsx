import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getVisiblePaginationItems } from '../utils/sharesListing'
import './ListingPagePagination.css'

export default function ListingPagePagination({ currentPage, totalPages, onPageChange }) {
  const { t } = useTranslation()

  if (totalPages <= 1) return null

  const pageItems = getVisiblePaginationItems(currentPage, totalPages)

  return (
    <nav className="auction-desktop-pagination listing-page-pagination" aria-label={t('auctionPaginationLabel')}>
      <button
        type="button"
        className="auction-desktop-pagination__arrow"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label={t('auctionPaginationPrev')}
      >
        <ChevronLeft size={18} aria-hidden />
      </button>
      <div className="auction-desktop-pagination__pages">
        {pageItems.map((item, index) =>
          item.type === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              className="listing-page-pagination__ellipsis"
              aria-hidden
            >
              …
            </span>
          ) : (
            <button
              key={item.value}
              type="button"
              className={`auction-desktop-pagination__page${
                item.value === currentPage ? ' auction-desktop-pagination__page--active' : ''
              }`}
              onClick={() => onPageChange(item.value)}
              aria-current={item.value === currentPage ? 'page' : undefined}
            >
              {item.value}
            </button>
          ),
        )}
      </div>
      <button
        type="button"
        className="auction-desktop-pagination__arrow"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label={t('auctionPaginationNext')}
      >
        <ChevronRight size={18} aria-hidden />
      </button>
    </nav>
  )
}
