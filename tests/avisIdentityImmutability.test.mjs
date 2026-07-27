import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const migration = readFileSync(
  join(root, 'supabase/migrations/20260727000000_lock_avis_identity_on_update.sql'),
  'utf8'
)
const schema = readFileSync(join(root, 'supabase/schema.sql'), 'utf8')

describe('avis identity immutability on update', () => {
  it('installs a before-update trigger that freezes annonce_id/auteur_id/created_at', () => {
    assert.match(migration, /protect_avis_identity_fields/)
    assert.match(migration, /before update on public\.avis/i)
    assert.match(migration, /new\.annonce_id is distinct from old\.annonce_id/)
    assert.match(migration, /new\.auteur_id is distinct from old\.auteur_id/)
    assert.match(migration, /new\.created_at is distinct from old\.created_at/)
    assert.match(migration, /Review identity fields are immutable/)

    assert.match(schema, /protect_avis_identity_fields/)
    assert.match(schema, /before update on public\.avis/i)
    assert.match(schema, /new\.annonce_id is distinct from old\.annonce_id/)
  })

  it('keeps author update policy ownership-scoped with with check', () => {
    assert.match(
      migration,
      /avis: modification par auteur[\s\S]*with check \(auth\.uid\(\) = auteur_id/i
    )
    assert.match(
      schema,
      /avis: modification par auteur[\s\S]*with check \(auth\.uid\(\) = auteur_id/i
    )
  })
})
