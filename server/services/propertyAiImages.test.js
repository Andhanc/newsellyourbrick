import test from 'node:test'
import assert from 'node:assert/strict'

import {
  normalizePropertyAiImages,
  propertyAiMediaBaseUrl,
  resolvePropertyAiImageUrl,
} from './propertyAiImages.js'

test('normalizes string, JSON, and object listing photo entries', () => {
  assert.deepEqual(normalizePropertyAiImages([
    '["/uploads/one.jpg", {"url":"/uploads/two.jpg"}]',
    { src: 'https://img.example/three.jpg' },
    '/uploads/one.jpg',
    { path: 'javascript:bad' },
  ]), [
    '/uploads/one.jpg',
    '/uploads/two.jpg',
    'https://img.example/three.jpg',
  ])
})

test('resolves relative listing photos against the configured media origin', () => {
  assert.equal(propertyAiMediaBaseUrl({ FRONTEND_URL: 'https://sell.example/' }), 'https://sell.example/')
  assert.equal(resolvePropertyAiImageUrl('/uploads/home.jpg', 'https://sell.example/'), 'https://sell.example/uploads/home.jpg')
  assert.equal(resolvePropertyAiImageUrl('https://cdn.example/home.jpg', 'https://sell.example/'), 'https://cdn.example/home.jpg')
})
