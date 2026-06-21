import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveStaffRole } from '../lib/staffRoles.js'

process.env.NEXT_PUBLIC_ADMIN_EMAIL_FALLBACK = 'contact@chezmoici.com'

test('resolveStaffRole does not grant fallback admin without is_admin', () => {
  assert.equal(
    resolveStaffRole({ is_admin: false }, 'contact@chezmoici.com'),
    null
  )
})

test('resolveStaffRole grants fallback super admin only to staff profiles', () => {
  assert.equal(
    resolveStaffRole({ is_admin: true, admin_role: 'admin' }, 'contact@chezmoici.com'),
    'super_admin'
  )
})

test('resolveStaffRole rejects blocked staff profiles', () => {
  assert.equal(
    resolveStaffRole({ is_admin: true, admin_role: 'super_admin', account_status: 'banned' }, 'admin@example.com'),
    null
  )
  assert.equal(
    resolveStaffRole({ is_admin: true, admin_role: 'admin', account_status: 'suspended' }, 'admin@example.com'),
    null
  )
})
