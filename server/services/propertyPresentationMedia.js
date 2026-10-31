import * as cheerio from 'cheerio'
import { presentationImages } from './propertyPresentation.js'

/** Repair known imported listings without trusting arbitrary URLs in a description. */
export async function preparePresentationMedia(property, overrides = {}) {
  const match = String(property.description || '').match(/(?:Источник|Source):\s*(https:\/\/\S+)/i)
  let source
  try { source = new URL(match?.[1] || '') } catch { /* no imported source */ }
  if (source?.hostname !== 'housetenerife.eu' || source.port || source.username || source.password || !/^\/(?:ru\/)?property\//.test(source.pathname)) {
    return { ...property, images: presentationImages(property) }
  }
  try {
    const response = await (overrides.fetchImpl || fetch)(source.href, {
      redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'SellYourBrick/1.0 (+https://sellyourbrick.com)' },
    })
    if (!response.ok) throw new Error('Source listing unavailable')
    const html = await response.text()
    if (html.length > 4_000_000) throw new Error('Source listing too large')
    const $ = cheerio.load(html)
    const gallery = $('.hs-gallery-v5-grid img, .single-property-gallery-row img, .lightbox-slider img')
      .map((_, element) => $(element).attr('src')).get()
      .filter((url) => {
        try { return new URL(url).hostname === source.hostname && new URL(url).pathname.startsWith('/wp-content/uploads/') } catch { return false }
      })
    const images = presentationImages({ images: gallery })
    if (!images.length) throw new Error('Source gallery empty')
    return { ...property, images, presentationMediaVerified: true, presentationSourceUrl: source.href }
  } catch {
    return { ...property, images: presentationImages(property) }
  }
}
