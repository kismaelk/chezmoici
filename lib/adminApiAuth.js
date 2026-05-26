import { createClient } from '@supabase/supabase-js'
import { resolveStaffRole, staffPermissions } from '@/lib/staffRoles'

/**
 * Valide le JWT et retourne l’utilisateur + profil + rôle staff.
 * @param {Request} request
 */
export async function getStaffFromRequest(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Non autorisé', status: 401 }
  }
  const token = authHeader.slice(7).trim()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return { error: 'Configuration serveur', status: 500 }
  }

  const supabaseAuth = createClient(url, anonKey)
  const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser(token)
  if (authErr || !user) {
    return { error: 'Session invalide', status: 401 }
  }

  const supabaseUser = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: profil, error: profilErr } = await supabaseUser
    .from('profiles')
    .select('id, is_admin, admin_role, account_status, account_suspended_until, email, nom')
    .eq('id', user.id)
    .single()

  if (profilErr || !profil) {
    return { error: 'Profil introuvable', status: 403 }
  }

  const role = resolveStaffRole(profil, user.email)
  if (!role) {
    return { error: 'Accès réservé au personnel', status: 403 }
  }

  return {
    user,
    profil,
    role,
    permissions: staffPermissions(role),
    token,
  }
}
