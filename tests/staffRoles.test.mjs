import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveStaffRole } from '../lib/staffRoles.js'

test('fallback admin email does not grant staff without database admin flag', () => {
  assert.equal(
    resolveStaffRole({ is_admin: false, admin_role: null }, 'contact@chezmoici.com'),
    null
  )
})

test('fallback admin email can still resolve legacy admin profiles to super admin', () => {
  assert.equal(
    resolveStaffRole({ is_admin: true, admin_role: null }, 'contact@chezmoici.com'),
    'super_admin'
  )
})

test('explicit staff role still resolves for non fallback email', () => {
  assert.equal(
    resolveStaffRole({ is_admin: true, admin_role: 'moderator' }, 'modo@example.com'),
    'moderator'
  )
})
