import { useEffect } from 'react'
import { isSeoNoindexPath } from '../../shared/seoRobots.js'

function upsertMeta(attrName, attrValue, content) {
  if (typeof document === 'undefined') return
  let el = document.querySelector(`meta[${attrName}="${attrValue}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attrName, attrValue)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(href) {
  if (typeof document === 'undefined' || !href) return
  let el = document.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * @param {{ title?: string, description?: string, canonicalPath?: string, noindex?: boolean, ogImage?: string, ogType?: string }} options
 */
export default function usePageSeo({
  title,
  description,
  canonicalPath,
  noindex = false,
  ogImage,
  ogType = 'website',
} = {}) {
  useEffect(() => {
    if (typeof document === 'undefined') return

    if (title) document.title = title
    if (description) upsertMeta('name', 'description', description)

    const origin = window.location.origin
    const path = canonicalPath || window.location.pathname
    const normalizedPath = path === '/main' ? '/auction' : path
    const canonicalUrl = `${origin}${normalizedPath}`
    upsertCanonical(canonicalUrl)

    if (title) upsertMeta('property', 'og:title', title)
    if (description) upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', canonicalUrl)
    upsertMeta('property', 'og:type', ogType)
    upsertMeta('property', 'og:site_name', 'Sellyourbrick')
    if (ogImage) {
      upsertMeta('property', 'og:image', ogImage)
      upsertMeta('name', 'twitter:card', 'summary_large_image')
      upsertMeta('name', 'twitter:image', ogImage)
    }
    if (title) upsertMeta('name', 'twitter:title', title)
    if (description) upsertMeta('name', 'twitter:description', description)

    const shouldNoindex =
      noindex || isSeoNoindexPath(normalizedPath)
    if (shouldNoindex) {
      upsertMeta('name', 'robots', 'noindex, nofollow')
    } else {
      const robots = document.querySelector('meta[name="robots"]')
      if (robots) robots.remove()
    }
  }, [title, description, canonicalPath, noindex, ogImage, ogType])
}
