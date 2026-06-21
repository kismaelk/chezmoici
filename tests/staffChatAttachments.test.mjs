import assert from 'node:assert/strict'
import test from 'node:test'

import { extractStaffChatStoragePath } from '../lib/staffChatAttachments.mjs'

test('extractStaffChatStoragePath keeps stored object paths', () => {
  assert.equal(
    extractStaffChatStoragePath('user-1/1710000000000-document.pdf'),
    'user-1/1710000000000-document.pdf'
  )
})

test('extractStaffChatStoragePath converts legacy public staff-chat URLs to object paths', () => {
  assert.equal(
    extractStaffChatStoragePath(
      'https://example.supabase.co/storage/v1/object/public/staff-chat/user-1/1710000000000-document.pdf?t=1'
    ),
    'user-1/1710000000000-document.pdf'
  )
})

test('extractStaffChatStoragePath rejects unrelated public URLs', () => {
  assert.equal(
    extractStaffChatStoragePath('https://example.supabase.co/storage/v1/object/public/avatars/user-1.png'),
    null
  )
})

test('extractStaffChatStoragePath rejects path traversal', () => {
  assert.equal(extractStaffChatStoragePath('user-1/../secret.pdf'), null)
})
