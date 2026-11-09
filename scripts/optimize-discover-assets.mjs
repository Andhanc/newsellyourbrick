import sharp from 'sharp'
import { copyFile, mkdir, stat, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const jobs = [
  ...['marbella', 'nice', 'paphos', 'sorrento', 'barcelona', 'santorini'].map(name => ({
    source: `images/test-drive/property-${name}.png`,
    target: `images/test-drive/property-${name}-thumb.webp`, width: 160, height: 160,
  })),
  ...['auction', 'buy-now', 'debts', 'shares'].map(name => ({
    source: `images/home-sale-formats/icons/${name}-3d.png`,
    target: `images/home-sale-formats/icons/${name}-3d-thumb.webp`, width: 96,
  })),
  { source: 'images/development/costa-adeje-cover.png', target: 'images/development/costa-adeje-cover-thumb.webp', width: 160, height: 160 },
  ...[480, 960, 1536].map(width => ({
    source: 'images/sellyourbrick/about/mission-villa.jpg',
    target: `images/sellyourbrick/about/mission-villa-${width}.webp`, width,
  })),
]

const report = []
for (const job of jobs) {
  const source = `public/${job.source}`
  const target = `public/${job.target}`
  await mkdir(dirname(target), { recursive: true })
  await sharp(source).rotate().resize({ width: job.width, height: job.height, fit: 'cover', withoutEnlargement: true })
    .webp({ quality: 78, effort: 5 }).toFile(target)
  const legacy = `apps/client/public/${job.target}`
  await mkdir(dirname(legacy), { recursive: true })
  await copyFile(target, legacy)
  report.push({ source: job.source, target: job.target, before: (await stat(source)).size, after: (await stat(target)).size })
}
await mkdir('artifacts/performance-2026-11-10', { recursive: true })
await writeFile('artifacts/performance-2026-11-10/image-sizes.json', JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
