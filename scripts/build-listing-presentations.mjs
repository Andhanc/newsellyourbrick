/**
 * Generate a sale-aware SellYourBrick PDF from a real database listing via OpenRouter.
 * npm run presentation:property -- --id 83 --table properties_houses --language ru
 * Optional: --location "El Duque, Adeje, Tenerife, Spain" (area estimate, never an exact address)
 * Optional: --ids 83,84 --html-only --output output/pdf
 * Existing cached JSON can be re-rendered without another model request: --from-report file.json
 * Credentials are read only from the server environment; no browser API keys.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
dotenv.config({ path: path.join(ROOT, '.env'), quiet: true })
const { getPrisma, closePrisma } = await import('../server/database/prismaClient.js')
const { requestPropertyAiModel } = await import('../server/services/propertyAiGenerate.js')
const { parsePropertyAiModelContent } = await import('../server/services/propertyAiReportContract.js')
const { composePropertyPresentation, presentationImages } = await import('../server/services/propertyPresentation.js')
const { PRESENTATION_LANGUAGES } = await import('../server/services/propertyPresentationCopy.js')
const { preparePresentationLocation } = await import('../server/services/propertyPresentationMap.js')
const { preparePresentationMedia } = await import('../server/services/propertyPresentationMedia.js')
const { enrichPresentationNeighborhood } = await import('../server/services/propertyPresentationNeighborhood.js')
const { renderPropertyPresentationHtml, renderPropertyPresentationPdf } = await import('../server/services/propertyPresentationRenderer.js')

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name)
  return i < 0 ? fallback : process.argv[i + 1]
}
const table = arg('--table', 'properties_houses')
const language = arg('--language', 'ru')
const output = path.resolve(ROOT, arg('--output', 'output/pdf'))
if (!['properties', 'properties_houses', 'properties_apartments'].includes(table)) throw new Error('Invalid --table')
if (!PRESENTATION_LANGUAGES.includes(language)) throw new Error('Unsupported --language')
const ids = arg('--ids', arg('--id', '83')).split(',').map(Number)
if (ids.some((id) => !Number.isSafeInteger(id) || id < 1)) throw new Error('Invalid property ID')

async function main() {
  await fs.mkdir(output, { recursive: true })
  const cached = arg('--from-report')
  for (const id of cached ? [null] : ids) {
    let property, report
    if (cached) {
      ({ property, report } = JSON.parse(await fs.readFile(path.resolve(cached), 'utf8')))
    } else {
      console.log(`Loading ${table} #${id}`)
      const rows = await getPrisma().$queryRawUnsafe(`SELECT * FROM "${table}" WHERE id = $1 LIMIT 1`, id)
      if (!rows[0]) throw new Error(`Property ${table} #${id} not found`)
      property = { ...rows[0], source_table: table, images: presentationImages(rows[0]) }
      property = await preparePresentationMedia(property)
      const coverIndex = Number(arg('--cover-photo', '0'))
      if (Number.isInteger(coverIndex) && coverIndex > 0 && property.images[coverIndex]) {
        const [cover] = property.images.splice(coverIndex, 1)
        property.images.unshift(cover)
      }
      console.log('Preparing location maps and nearby infrastructure')
      property = await preparePresentationLocation(property, { location: arg('--location') })
      property = await enrichPresentationNeighborhood(property)
      console.log('Requesting presentation content from OpenRouter')
      const input = { property, category: 'presentation', question: 'Property sales presentation', language }
      const raw = await requestPropertyAiModel(input)
      await fs.mkdir(path.join(ROOT, 'tmp/property-presentation'), { recursive: true })
      await fs.writeFile(path.join(ROOT, 'tmp/property-presentation', `model-${table}-${id}.json`), raw)
      report = composePropertyPresentation(parsePropertyAiModelContent(raw, input), property, language)
    }
    const stem = `SellYourBrick-${property.source_table || table}-${property.id}-${report.language}`
    const html = renderPropertyPresentationHtml({ report, property })
    await fs.writeFile(path.join(output, `${stem}.html`), html)
    // Store only fields needed for rendering, never seller contact or moderation data.
    const renderProperty = Object.fromEntries(['id', 'title', 'name', 'location', 'price', 'currency', 'area', 'rooms', 'source_table'].filter((key) => property[key] != null).map((key) => [key, property[key]]))
    const cacheDir = path.join(ROOT, 'tmp/property-presentation')
    await fs.mkdir(cacheDir, { recursive: true })
    await fs.writeFile(path.join(cacheDir, `${stem}.json`), JSON.stringify({ property: renderProperty, report }, null, 2))
    if (!process.argv.includes('--html-only')) {
      console.log('Rendering PDF')
      const pdf = await renderPropertyPresentationPdf({ report, property })
      const filename = path.join(output, `${stem}.pdf`)
      await fs.writeFile(filename, pdf)
      console.log(`PDF: ${filename} (${report.slides.length} slides)`)
    }
    console.log(`HTML: ${path.join(output, `${stem}.html`)}`)
  }
}
try { await main() } catch (error) { console.error(error.message); process.exitCode = 1 } finally { await closePrisma() }
