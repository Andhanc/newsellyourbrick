import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getVisiblePaginationItems } from '../utils/sharesListing'
import './SharesListingPagination.css'

function SharesListingPagination({ currentPage, totalPages, onPageChange }) {
  const { t } = useTranslation()

  if (totalPages <= 1) return null

  const pageItems = getVisiblePaginationItems(currentPage, totalPages)

  return (
    <nav className="shares-listing-pagination" aria-label={t('sharesPaginationLabel')}>
      <button
        type="button"
        className="shares-listing-pagination__arrow"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label={t('sharesPaginationPrev')}
      >
        <ChevronLeft size={18} />
      </button>

      <div className="shares-listing-pagination__pages">
        {pageItems.map((item, index) =>
          item.type === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="shares-listing-pagination__ellipsis" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={item.value}
              type="button"
              className={`shares-listing-pagination__page${
                item.value === currentPage ? ' is-active' : ''
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
        className="shares-listing-pagination__arrow"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label={t('sharesPaginationNext')}
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  )
}

export default SharesListingPagination
