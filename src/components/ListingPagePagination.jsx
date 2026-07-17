import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './ListingPagePagination.css'

export default function ListingPagePagination({ currentPage, totalPages, onPageChange }) {
  const { t } = useTranslation()

  if (totalPages <= 1) return null

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
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
          <button
            key={page}
            type="button"
            className={`auction-desktop-pagination__page${
              page === currentPage ? ' auction-desktop-pagination__page--active' : ''
            }`}
            onClick={() => onPageChange(page)}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        ))}
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
