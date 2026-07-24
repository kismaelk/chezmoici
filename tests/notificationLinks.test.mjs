import test from 'node:test'
import assert from 'node:assert/strict'
import { safeNotificationHref } from '../lib/notificationLinks.js'

test('safeNotificationHref keeps relative app paths', () => {
  assert.equal(safeNotificationHref('/messages'), '/messages')
  assert.equal(safeNotificationHref('/mes-avis-moderes'), '/mes-avis-moderes')
  assert.equal(safeNotificationHref('  /annonces/abc  '), '/annonces/abc')
})

test('safeNotificationHref rejects absolute and protocol-relative URLs', () => {
  assert.equal(safeNotificationHref('https://evil.example/phish'), '/messages')
  assert.equal(safeNotificationHref('http://evil.example'), '/messages')
  assert.equal(safeNotificationHref('//evil.example/phish'), '/messages')
  assert.equal(safeNotificationHref('javascript:alert(1)'), '/messages')
})

test('safeNotificationHref rejects empty or non-string values', () => {
  assert.equal(safeNotificationHref(null), '/messages')
  assert.equal(safeNotificationHref(undefined), '/messages')
  assert.equal(safeNotificationHref(''), '/messages')
  assert.equal(safeNotificationHref('messages'), '/messages')
})

test('safeNotificationHref accepts custom fallback when safe', () => {
  assert.equal(safeNotificationHref('https://evil.example', '/compte'), '/compte')
  assert.equal(safeNotificationHref(null, '//evil'), '/messages')
})
