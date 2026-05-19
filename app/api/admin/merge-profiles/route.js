import { NextResponse } from 'next/server'
import { getStaffFromRequest } from '@/lib/adminApiAuth'
import { createSupabaseAdmin } from '@/lib/supabaseAdmin'
import { adminRateLimitKey, checkAdminRateLimit } from '@/lib/rateLimitAdmin'

async function buildMergeSummary(admin, sourceUserId, targetUserId) {
  const [{ count: annonces }, { count: demandes }, { count: favoris }] = await Promise.all([
    admin.from('annonces').select('id', { count: 'exact', head: true }).eq('utilisateur_id', sourceUserId),
    admin.from('demandes_badge').select('id', { count: 'exact', head: true }).eq('utilisateur_id', sourceUserId),
    admin.from('favoris').select('id', { count: 'exact', head: true }).eq('utilisateur_id', sourceUserId),
  ])
  const { data: source } = await admin.from('profiles').select('id, nom, email, account_status').eq('id', sourceUserId).single()
  const { data: target } = await admin.from('profiles').select('id, nom, email, account_status').eq('id', targetUserId).single()
  return {
    source: source || { id: sourceUserId },
    target: target || { id: targetUserId },
    counts: {
      annonces: annonces ?? 0,
      demandes_badge: demandes ?? 0,
      favoris: favoris ?? 0,
    },
  }
}

/**
 * Super admin : dry-run (aperçu) ou fusion réelle.
 */
export async function POST(request) {
  const staff = await getStaffFromRequest(request)
  if (staff.error) {
    return NextResponse.json({ error: staff.error }, { status: staff.status })
  }
  if (staff.role !== 'super_admin') {
    return NextResponse.json({ error: 'Réservé au super admin' }, { status: 403 })
  }

  const rl = checkAdminRateLimit(adminRateLimitKey(staff.user.id, 'merge-profiles'), { limit: 10, windowMs: 60_000 })
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Trop de requêtes. Réessayez dans ${rl.retryAfterSec}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const sourceUserId = body?.sourceUserId
  const targetUserId = body?.targetUserId
  const dryRun = Boolean(body?.dryRun)

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
    const summary = await buildMergeSummary(admin, sourceUserId, targetUserId)

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        summary,
        message: `Aperçu : ${summary.counts.annonces} annonce(s), ${summary.counts.demandes_badge} demande(s) badge, ${summary.counts.favoris} favori(s) à transférer/supprimer.`,
      })
    }

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

    await admin.from('admin_profile_merge_logs').insert({
      actor_id: staff.user.id,
      source_user_id: sourceUserId,
      target_user_id: targetUserId,
      dry_run: false,
      summary,
    })

    return NextResponse.json({
      ok: true,
      dryRun: false,
      summary,
      message:
        'Fusion effectuée. Annonces et demandes badge transférées, favoris source supprimés, profil source banni.',
    })
  } catch (e) {
    console.error('[merge-profiles]', e)
    return NextResponse.json(
      { error: e?.message || String(e) },
      { status: 500 }
    )
  }
}

/** Journal des fusions (super admin). */
export async function GET(request) {
  const staff = await getStaffFromRequest(request)
  if (staff.error) {
    return NextResponse.json({ error: staff.error }, { status: staff.status })
  }
  if (staff.role !== 'super_admin') {
    return NextResponse.json({ error: 'Réservé au super admin' }, { status: 403 })
  }
  try {
    const admin = createSupabaseAdmin()
    const { data, error } = await admin
      .from('admin_profile_merge_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)
    if (error) throw error
    return NextResponse.json({ ok: true, logs: data || [] })
  } catch (e) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
