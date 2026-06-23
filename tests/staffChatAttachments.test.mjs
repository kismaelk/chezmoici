import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { normalizeStaffChatAttachmentPath } from '../lib/staffChatAttachments.js'

describe('normalizeStaffChatAttachmentPath', () => {
  it('extracts object paths from Supabase public staff-chat URLs', () => {
    assert.equal(
      normalizeStaffChatAttachmentPath(
        'https://example.supabase.co/storage/v1/object/public/staff-chat/user-1/123-doc.pdf'
      ),
      'user-1/123-doc.pdf'
    )
  })

  it('extracts object paths from Supabase signed staff-chat URLs', () => {
    assert.equal(
      normalizeStaffChatAttachmentPath(
        'https://example.supabase.co/storage/v1/object/sign/staff-chat/user-1/123-doc.pdf?token=abc'
      ),
      'user-1/123-doc.pdf'
    )
  })

  it('normalizes raw storage paths and strips an optional bucket prefix', () => {
    assert.equal(normalizeStaffChatAttachmentPath('/staff-chat/user-1/file.png'), 'user-1/file.png')
    assert.equal(normalizeStaffChatAttachmentPath('user-1/file.png'), 'user-1/file.png')
  })

  it('rejects URLs outside the staff-chat bucket', () => {
    assert.equal(
      normalizeStaffChatAttachmentPath(
        'https://example.supabase.co/storage/v1/object/public/annonces/user-1/file.png'
      ),
      null
    )
    assert.equal(normalizeStaffChatAttachmentPath('https://example.com/file.png'), null)
  })
})
