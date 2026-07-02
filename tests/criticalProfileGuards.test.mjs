import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  estProfilCompteBloque,
  estStatutCompteBloque,
} from '../lib/accountSuspension.js'
import { resolveStaffRole } from '../lib/staffRoles.js'

test('blocked account helper rejects banned and suspended statuses', () => {
  assert.equal(estStatutCompteBloque('banned'), true)
  assert.equal(estStatutCompteBloque('suspended'), true)
  assert.equal(estStatutCompteBloque('active'), false)
  assert.equal(estProfilCompteBloque({ account_status: 'banned' }), true)
  assert.equal(estProfilCompteBloque({ account_status: 'active' }), false)
})

test('fallback admin email cannot grant staff without database staff flag', () => {
  assert.equal(resolveStaffRole({ is_admin: false }, 'contact@chezmoici.com'), null)
  assert.equal(resolveStaffRole({ is_admin: true, admin_role: 'admin' }, 'contact@chezmoici.com'), 'super_admin')
  assert.equal(resolveStaffRole({ is_admin: true, admin_role: 'admin' }, 'admin@example.com'), 'admin')
})

test('profile guard migration protects privileged fields and blocked status writes', () => {
  const sql = readFileSync(
    new URL('../supabase/migrations/20260702000000_protect_profile_privileged_fields.sql', import.meta.url),
    'utf8'
  )

  assert.match(sql, /coalesce\(p\.account_status, 'active'\) in \('banned', 'suspended'\)/)
  assert.match(sql, /create trigger protect_profile_privileged_fields/)
  assert.match(sql, /new\.is_admin is distinct from old\.is_admin/)
  assert.match(sql, /new\.admin_role is distinct from old\.admin_role/)
  assert.match(sql, /new\.admin_role = 'super_admin'/)
})
