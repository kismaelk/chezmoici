import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { normalizeStaffChatAttachmentPath } from '../lib/staffChatAttachments.js'

describe('normalizeStaffChatAttachmentPath', () => {
  it('keeps bucket-relative object paths', () => {
    assert.equal(
      normalizeStaffChatAttachmentPath('user-123/1710000000000-report.pdf'),
      'user-123/1710000000000-report.pdf'
    )
  })

  it('extracts legacy public Supabase URLs', () => {
    assert.equal(
      normalizeStaffChatAttachmentPath(
        'https://example.supabase.co/storage/v1/object/public/staff-chat/user-123/1710000000000-report.pdf'
      ),
      'user-123/1710000000000-report.pdf'
    )
  })

  it('extracts signed Supabase URLs without preserving the token', () => {
    assert.equal(
      normalizeStaffChatAttachmentPath(
        'https://example.supabase.co/storage/v1/object/sign/staff-chat/user-123/1710000000000-report.pdf?token=secret'
      ),
      'user-123/1710000000000-report.pdf'
    )
  })

  it('rejects unrelated external URLs', () => {
    assert.equal(normalizeStaffChatAttachmentPath('https://example.com/file.pdf'), null)
  })
})
