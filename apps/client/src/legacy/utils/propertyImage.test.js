import assert from 'node:assert/strict'
import test from 'node:test'

import { getPropertyCardImage, normalizePropertyMediaFields } from './propertyImage.js'

test('public /images paths stay site-relative (not under /uploads)', () => {
  const publicPath = '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg'
  const prop = { image: publicPath, images: [], photos: [] }

  const { image, images } = normalizePropertyMediaFields(prop)
  assert.equal(image, publicPath)
  assert.deepEqual(images, [publicPath])
  assert.equal(getPropertyCardImage(prop, '/fallback.jpg'), publicPath)
})

test('bare upload filenames still resolve under /uploads', () => {
  const { image, images } = normalizePropertyMediaFields({
    image: 'listing-abc.jpg',
    images: [],
    photos: [],
  })
  assert.equal(image, '/uploads/listing-abc.jpg')
  assert.deepEqual(images, ['/uploads/listing-abc.jpg'])
})

test('/uploads paths stay under /uploads', () => {
  const { image } = normalizePropertyMediaFields({
    image: '/uploads/properties/foo.jpg',
    images: [],
    photos: [],
  })
  assert.equal(image, '/uploads/properties/foo.jpg')
})
