import assert from 'node:assert/strict'
import test from 'node:test'

import {
  STAFF_CHAT_BUCKET,
  normalizeStaffChatAttachmentPath,
} from '../lib/staffChatAttachments.js'

test('normalizes stored staff chat object paths', () => {
  assert.equal(
    normalizeStaffChatAttachmentPath('user-1/12345-file.pdf'),
    'user-1/12345-file.pdf'
  )
  assert.equal(
    normalizeStaffChatAttachmentPath(`${STAFF_CHAT_BUCKET}/user-1/12345-file.pdf`),
    'user-1/12345-file.pdf'
  )
})

test('normalizes legacy public staff chat URLs', () => {
  assert.equal(
    normalizeStaffChatAttachmentPath(
      'https://project.supabase.co/storage/v1/object/public/staff-chat/user-1/12345-file.pdf'
    ),
    'user-1/12345-file.pdf'
  )
})

test('normalizes signed staff chat URLs without retaining tokens', () => {
  assert.equal(
    normalizeStaffChatAttachmentPath(
      'https://project.supabase.co/storage/v1/object/sign/staff-chat/user-1/a%20file.pdf?token=secret'
    ),
    'user-1/a file.pdf'
  )
})

test('rejects unrelated URLs', () => {
  assert.equal(normalizeStaffChatAttachmentPath('https://example.com/file.pdf'), null)
})
