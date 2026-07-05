import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/** @typedef {{ title?: string, description?: string, canonicalPath?: string, noindex?: boolean, ogImage?: string, ogType?: string } | null} PageSeoOverride */

const PageSeoContext = createContext(null)

function seoOverrideEqual(a, b) {
  if (a === b) return true
  if (!a || !b) return false
  return (
    a.title === b.title &&
    a.description === b.description &&
    a.canonicalPath === b.canonicalPath &&
    a.noindex === b.noindex &&
    a.ogImage === b.ogImage &&
    a.ogType === b.ogType
  )
}

export function PageSeoProvider({ children }) {
  const [override, setOverrideState] = useState(/** @type {PageSeoOverride} */ (null))

  const setOverride = useCallback((next) => {
    setOverrideState((prev) => {
      if (next == null) return prev == null ? prev : null
      if (prev && seoOverrideEqual(prev, next)) return prev
      return next
    })
  }, [])

  const value = useMemo(() => ({ override, setOverride }), [override, setOverride])

  return <PageSeoContext.Provider value={value}>{children}</PageSeoContext.Provider>
}

export function usePageSeoContext() {
  return useContext(PageSeoContext)
}

/**
 * Переопределяет SEO текущей страницы (приоритет над SitePageSeo).
 * @param {PageSeoOverride} seo
 */
export function usePageSeoOverride(seo) {
  const setOverride = usePageSeoContext()?.setOverride

  const title = seo?.title
  const description = seo?.description
  const canonicalPath = seo?.canonicalPath
  const noindex = seo?.noindex
  const ogImage = seo?.ogImage
  const ogType = seo?.ogType

  useEffect(() => {
    if (!setOverride) return undefined
    if (!title && !description) {
      setOverride(null)
      return () => setOverride(null)
    }
    setOverride({ title, description, canonicalPath, noindex, ogImage, ogType })
    return () => setOverride(null)
  }, [setOverride, title, description, canonicalPath, noindex, ogImage, ogType])
}
