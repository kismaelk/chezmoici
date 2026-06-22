import assert from 'node:assert/strict'
import test from 'node:test'

import { isBlockedStaffProfile, resolveStaffRole } from '../lib/staffRoles.js'

test('fallback email does not grant staff access without a DB staff flag', () => {
  assert.equal(
    resolveStaffRole({ is_admin: false, admin_role: null }, 'contact@chezmoici.com'),
    null
  )
})

test('fallback email keeps super admin access for active DB staff', () => {
  assert.equal(
    resolveStaffRole({ is_admin: true, admin_role: 'moderator' }, 'contact@chezmoici.com'),
    'super_admin'
  )
})

test('legacy staff rows without admin_role still resolve as super admin', () => {
  assert.equal(
    resolveStaffRole({ is_admin: true, admin_role: null }, 'staff@example.com'),
    'super_admin'
  )
})

test('blocked staff profiles do not resolve to an admin role', () => {
  assert.equal(
    resolveStaffRole({ is_admin: true, admin_role: 'super_admin', account_status: 'banned' }, 'staff@example.com'),
    null
  )
  assert.equal(
    resolveStaffRole({ is_admin: true, admin_role: 'admin', account_status: 'suspended' }, 'staff@example.com'),
    null
  )
})

test('future account suspension marks a staff profile as blocked', () => {
  const future = new Date(Date.now() + 60_000).toISOString()
  assert.equal(isBlockedStaffProfile({ account_suspended_until: future }), true)
})
