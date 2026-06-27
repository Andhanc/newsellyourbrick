import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/** @typedef {{ title?: string, description?: string, canonicalPath?: string, noindex?: boolean, ogImage?: string, ogType?: string } | null} PageSeoOverride */

const PageSeoContext = createContext(null)

export function PageSeoProvider({ children }) {
  const [override, setOverrideState] = useState(/** @type {PageSeoOverride} */ (null))

  const setOverride = useCallback((next) => {
    setOverrideState(next)
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
  const ctx = usePageSeoContext()

  const title = seo?.title
  const description = seo?.description
  const canonicalPath = seo?.canonicalPath
  const noindex = seo?.noindex
  const ogImage = seo?.ogImage
  const ogType = seo?.ogType

  useEffect(() => {
    if (!ctx) return undefined
    if (!title && !description) {
      ctx.setOverride(null)
      return () => ctx.setOverride(null)
    }
    ctx.setOverride({ title, description, canonicalPath, noindex, ogImage, ogType })
    return () => ctx.setOverride(null)
  }, [ctx, title, description, canonicalPath, noindex, ogImage, ogType])
}
