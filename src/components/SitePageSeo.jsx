import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import usePageSeo from '../hooks/usePageSeo'
import { usePageSeoContext } from '../context/PageSeoContext'
import { resolvePageSeo } from '../../shared/seoResolveRoutes.js'

export { resolvePageSeo }

export default function SitePageSeo() {
  const { pathname } = useLocation()
  const { t, i18n } = useTranslation()
  const { override } = usePageSeoContext() || {}

  const defaultSeo = useMemo(() => resolvePageSeo(pathname, t), [pathname, t, i18n.language])
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
