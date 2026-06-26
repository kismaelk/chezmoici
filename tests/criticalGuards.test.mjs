import assert from 'node:assert/strict'
import test from 'node:test'

import {
  estCompteBloque,
  estCompteSuspenduJusqua,
  estStatutCompteBloque,
} from '../lib/accountSuspension.js'
import { extraireCheminPieceJointeStaffChat } from '../lib/staffChatAttachments.js'

test('blocked account statuses are treated as blocked even without a suspension date', () => {
  assert.equal(estStatutCompteBloque('banned'), true)
  assert.equal(estStatutCompteBloque('suspended'), true)
  assert.equal(estStatutCompteBloque('active'), false)
  assert.equal(estCompteBloque({ account_status: 'banned' }), true)
  assert.equal(estCompteBloque({ account_status: 'suspended' }), true)
})

test('future suspension date blocks an otherwise active account', () => {
  const future = new Date(Date.now() + 60_000).toISOString()
  const past = new Date(Date.now() - 60_000).toISOString()

  assert.equal(estCompteSuspenduJusqua(future), true)
  assert.equal(estCompteSuspenduJusqua(past), false)
  assert.equal(estCompteBloque({ account_status: 'active', account_suspended_until: future }), true)
  assert.equal(estCompteBloque({ account_status: 'active', account_suspended_until: past }), false)
})

test('staff chat attachment helper extracts object paths from stored paths and old public URLs', () => {
  assert.equal(
    extraireCheminPieceJointeStaffChat('user-1/123-document.pdf'),
    'user-1/123-document.pdf'
  )
  assert.equal(
    extraireCheminPieceJointeStaffChat('https://example.supabase.co/storage/v1/object/public/staff-chat/user-1/123-document.pdf'),
    'user-1/123-document.pdf'
  )
  assert.equal(
    extraireCheminPieceJointeStaffChat('https://example.supabase.co/storage/v1/object/sign/staff-chat/user-1/123-document.pdf?token=abc'),
    'user-1/123-document.pdf'
  )
  assert.equal(
    extraireCheminPieceJointeStaffChat('https://example.com/not-a-staff-chat-object.pdf'),
    null
  )
})
