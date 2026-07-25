import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const migration = readFileSync(
  join(root, 'supabase/migrations/20260725000000_lock_avis_contact_integrity.sql'),
  'utf8'
)
const schema = readFileSync(join(root, 'supabase/schema.sql'), 'utf8')

describe('avis contact integrity guards', () => {
  it('forces server-side messages.created_at on insert', () => {
    assert.match(migration, /messages_force_created_at/)
    assert.match(migration, /new\.created_at\s*:=\s*now\(\)/i)
    assert.match(migration, /before insert on public\.messages/i)
    assert.match(schema, /messages_force_created_at/)
  })

  it('blocks self-messages and requires listing-owner participation', () => {
    assert.match(migration, /sender_id is distinct from receiver_id/)
    assert.match(
      migration,
      /a\.utilisateur_id = messages\.sender_id\s+or\s+a\.utilisateur_id = messages\.receiver_id/s
    )
    assert.match(schema, /sender_id is distinct from receiver_id/)
  })

  it('blocks owner self-reviews while keeping the 2h contact gate', () => {
    assert.match(migration, /a\.utilisateur_id is distinct from avis\.auteur_id/)
    assert.match(migration, /interval '2 hours'/)
    assert.match(schema, /a\.utilisateur_id is distinct from avis\.auteur_id/)
    assert.match(schema, /interval '2 hours'/)
  })
})
