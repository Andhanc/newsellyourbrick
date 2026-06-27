import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import usePageSeo from '../hooks/usePageSeo'
import { usePageSeoContext } from '../context/PageSeoContext'
import { resolveStaticPageSeo } from '../../shared/seoStaticResolve.js'

export default function SitePageSeo() {
  const { pathname } = useLocation()
  const { t, i18n } = useTranslation()
  const { override } = usePageSeoContext() || {}

  const staticSeo = resolveStaticPageSeo(pathname, t)
  const [dynamicSeo, setDynamicSeo] = useState(null)

  useEffect(() => {
    const hit = resolveStaticPageSeo(pathname, t)
    if (hit) {
      setDynamicSeo(null)
      return undefined
    }
    let cancelled = false
    import('../../shared/seoResolveRoutes.js').then(({ resolvePageSeo }) => {
      if (!cancelled) setDynamicSeo(resolvePageSeo(pathname, t))
    })
    return () => {
      cancelled = true
    }
  }, [pathname, t, i18n.language])

  const defaultSeo = staticSeo ?? dynamicSeo
  const seo = override?.title || override?.description ? override : defaultSeo

  usePageSeo({
    title: seo?.title,
    description: seo?.description,
    canonicalPath: seo?.canonicalPath,
    noindex: seo?.noindex,
    ogImage: seo?.ogImage,
    ogType: seo?.ogType,
  })
  return null
}
