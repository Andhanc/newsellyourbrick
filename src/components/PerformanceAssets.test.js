import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import sharp from 'sharp'

test('homepage thumbnails keep the mobile photo slots without downloading full-size PNGs', async () => {
  for (const name of ['marbella', 'nice', 'paphos', 'sorrento', 'barcelona', 'santorini']) {
    const path = `public/images/test-drive/property-${name}-thumb.webp`
    const web = new URL(`../../${path}`, import.meta.url)
    const legacy = new URL(`../../apps/client/${path}`, import.meta.url)
    assert.ok((await stat(web)).size < 12000, name)
    const metadata = await sharp(await readFile(web)).metadata()
    assert.equal(metadata.width, 160)
    assert.equal(metadata.height, 160)
    assert.deepEqual(await readFile(web), await readFile(legacy))
  }
})

test('auction hero has lightweight responsive variants with the original composition', async () => {
  for (const width of [480, 960, 1536]) {
    const path = new URL(`../../public/images/sellyourbrick/about/mission-villa-${width}.webp`, import.meta.url)
    const metadata = await sharp(await readFile(path)).metadata()
    assert.equal(metadata.width, width)
    assert.equal(metadata.height, Math.round(width * 2 / 3))
    assert.ok((await stat(path)).size < 120000)
  }
})
