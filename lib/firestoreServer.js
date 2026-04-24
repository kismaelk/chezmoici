import { createClient } from '@supabase/supabase-js'

/** Client Supabase côté serveur pour les métadonnées SEO (Server Components) */
function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function getAnnonceForMetadata(id) {
  const client = getServerClient()
  if (!client || !id) return null
  try {
    const { data } = await client.from('annonces').select('*').eq('id', id).single()
    return data || null
  } catch {
    return null
  }
}
