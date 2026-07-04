import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { FiChevronDown, FiStar } from 'react-icons/fi'
import {
  CATALOG_NAV_SECTIONS,
  getCatalogSectionById,
  isCatalogSectionActive,
  readPinnedCatalogSection,
  writePinnedCatalogSection,
} from '../utils/pinnedCatalogNav'
import './HeaderPinnedCatalogNav.css'

export default function HeaderPinnedCatalogNav({ className = '' }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const dropdownRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [pinnedSectionId, setPinnedSectionId] = useState(() => readPinnedCatalogSection())

  const pinnedSection = getCatalogSectionById(pinnedSectionId)
  const isPinnedSectionCurrent = isCatalogSectionActive(pathname, pinnedSection)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }

    return undefined
  }, [isOpen])

  useEffect(() => {
    function handleStorage(event) {
      if (event.key === 'pinnedCatalogNavSection') {
        setPinnedSectionId(readPinnedCatalogSection())
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const pinSection = useCallback((sectionId) => {
    writePinnedCatalogSection(sectionId)
    setPinnedSectionId(sectionId)
  }, [])

  const handleNavigate = useCallback(
    (path) => {
      setIsOpen(false)
      navigate(path)
    },
    [navigate],
  )

  return (
    <div
      className={`header-pinned-catalog-nav new-header__auction-btn ${className}`.trim()}
      ref={dropdownRef}
    >
      <div className="header-pinned-catalog-nav__control">
        <button
          type="button"
          className="header-pinned-catalog-nav__label"
          onClick={() => handleNavigate(pinnedSection.path)}
          aria-current={isPinnedSectionCurrent ? 'page' : undefined}
        >
          {t(pinnedSection.labelKey)}
        </button>
        <button
          type="button"
          className={`header-pinned-catalog-nav__toggle${isOpen ? ' header-pinned-catalog-nav__toggle--open' : ''}`}
          onClick={(event) => {
            event.stopPropagation()
            setIsOpen((prev) => !prev)
          }}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={t('headerCatalogNavToggleAria')}
        >
          <FiChevronDown size={16} aria-hidden />
        </button>
      </div>

      {isOpen ? (
        <div className="header-pinned-catalog-nav__dropdown" role="listbox">
          {CATALOG_NAV_SECTIONS.map((section) => {
            const isPinned = section.id === pinnedSectionId
            const isActive = isCatalogSectionActive(pathname, section)

            return (
              <div
                key={section.id}
                className={`header-pinned-catalog-nav__option${isActive ? ' header-pinned-catalog-nav__option--active' : ''}`}
                role="option"
                aria-selected={isActive}
              >
                <button
                  type="button"
                  className="header-pinned-catalog-nav__option-label"
                  onClick={() => handleNavigate(section.path)}
                >
                  {t(section.labelKey)}
                </button>
                <button
                  type="button"
                  className={`header-pinned-catalog-nav__pin${isPinned ? ' header-pinned-catalog-nav__pin--active' : ''}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    pinSection(section.id)
                  }}
                  aria-label={t('headerCatalogNavPinAria', { section: t(section.labelKey) })}
                  aria-pressed={isPinned}
                >
                  <FiStar size={15} aria-hidden />
                </button>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
