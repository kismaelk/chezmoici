import { NextResponse } from 'next/server'
import { getStaffFromRequest } from '@/lib/adminApiAuth'
import { createSupabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * Super admin uniquement : transfère annonces + demandes badge vers le compte cible,
 * supprime les favoris du compte source, bannit le profil source (les comptes Auth restent distincts).
 */
export async function POST(request) {
  const staff = await getStaffFromRequest(request)
  if (staff.error) {
    return NextResponse.json({ error: staff.error }, { status: staff.status })
  }
  if (staff.role !== 'super_admin') {
    return NextResponse.json({ error: 'Réservé au super admin' }, { status: 403 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const sourceUserId = body?.sourceUserId
  const targetUserId = body?.targetUserId
  if (!sourceUserId || !targetUserId || sourceUserId === targetUserId) {
    return NextResponse.json(
      { error: 'sourceUserId et targetUserId requis (valeurs différentes)' },
      { status: 400 }
    )
  }
  if (sourceUserId === staff.user.id) {
    return NextResponse.json({ error: 'Impossible de fusionner votre propre compte comme source' }, { status: 400 })
  }

  try {
    const admin = createSupabaseAdmin()

    const { error: e1 } = await admin
      .from('annonces')
      .update({ utilisateur_id: targetUserId })
      .eq('utilisateur_id', sourceUserId)
    if (e1) throw e1

    const { error: e2 } = await admin
      .from('demandes_badge')
      .update({ utilisateur_id: targetUserId })
      .eq('utilisateur_id', sourceUserId)
    if (e2) throw e2

    await admin.from('favoris').delete().eq('utilisateur_id', sourceUserId)

    const { error: e3 } = await admin
      .from('profiles')
      .update({
        account_status: 'banned',
        admin_role: null,
        is_admin: false,
      })
      .eq('id', sourceUserId)
    if (e3) throw e3

    return NextResponse.json({
      ok: true,
      message:
        'Annonces et demandes badge transférées vers le compte cible. Favoris du compte source supprimés. Profil source banni. Les comptes de connexion (Auth) restent deux comptes distincts : supprimez manuellement l’utilisateur source dans Supabase Auth si besoin.',
    })
  } catch (e) {
    console.error('[merge-profiles]', e)
    return NextResponse.json(
      { error: e?.message || String(e) },
      { status: 500 }
    )
  }
}
