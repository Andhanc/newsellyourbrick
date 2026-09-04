import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ASSISTANT_ATTACHMENT_LIMITS,
  formatAttachmentsForPrompt,
  prepareAssistantAttachments,
} from './fileAttachments.js'

test('extracts safe text attachments from data URLs', async () => {
  const [attachment] = await prepareAssistantAttachments([{
    name: 'notes.txt',
    mimeType: 'text/plain',
    size: 12,
    dataUrl: `data:text/plain;base64,${Buffer.from('auction notes').toString('base64')}`,
  }])

  assert.equal(attachment.name, 'notes.txt')
  assert.equal(attachment.text, 'auction notes')
  assert.match(formatAttachmentsForPrompt([attachment]), /FILE: notes\.txt/)
})

test('drops files above the server limit', async () => {
  const result = await prepareAssistantAttachments([{
    name: 'large.txt',
    size: ASSISTANT_ATTACHMENT_LIMITS.maxFileBytes + 1,
    dataUrl: 'data:text/plain;base64,dGVzdA==',
  }])
  assert.deepEqual(result, [])
})
