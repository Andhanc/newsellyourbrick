import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import sharp from 'sharp'
import { runInNewContext } from 'node:vm'

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

test('HTML preloads the responsive auction cover only on matching catalogue routes', async () => {
  const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8')
  const script = html.match(/<script id="auction-hero-preload">([\s\S]*?)<\/script>/)[1]
  for (const pathname of ['/auction', '/auction/', '/auction/bidding', '/auction/pre-auction', '/auction/ended', '/', '/profile', '/auction/buy-now', '/auction/property/example']) {
    const links = []
    runInNewContext(script.replaceAll('%BASE_URL%', '/'), {
      location: { pathname },
      document: { createElement: () => ({}), head: { appendChild: link => links.push(link) } },
    })
    const expected = ['/auction', '/auction/', '/auction/bidding', '/auction/pre-auction', '/auction/ended'].includes(pathname)
    assert.equal(links.length, expected ? 1 : 0, pathname)
    if (expected) {
      assert.equal(links[0].href, '/images/sellyourbrick/about/mission-villa-960.webp')
      assert.equal(links[0].imageSizes, '100vw')
      assert.equal(links[0].fetchPriority, 'high')
      assert.equal(links[0].imageSrcset.split(', ').length, 3)
    }
  }
})
