import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { estProfilCompteBloque } from '@/lib/accountSuspension'
import { resolveStaffRole } from '@/lib/staffRoles'
import { sendTeamModerationNotify } from '@/lib/sendTeamModerationNotify'

/**
 * Notifications équipe quand un admin valide un compte ou publie une annonce.
 * Auth : JWT staff uniquement.
 * Utilise les mêmes variables que /api/notify-moderation.
 */
export async function POST(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const token = authHeader.slice(7).trim()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Configuration serveur' }, { status: 500 })
  }

  const supabaseAuth = createClient(url, anonKey)
  const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser(token)
  if (authErr || !user) {
    return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
  }

  const supabaseUser = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: profilStaff, error: profilErr } = await supabaseUser
    .from('profiles')
    .select('is_admin, admin_role, account_status, account_suspended_until')
    .eq('id', user.id)
    .single()

  if (profilErr || !profilStaff) {
    return NextResponse.json({ error: 'Profil introuvable' }, { status: 403 })
  }
  if (estProfilCompteBloque(profilStaff)) {
    return NextResponse.json({ error: 'Compte suspendu' }, { status: 403 })
  }

  const role = resolveStaffRole(profilStaff, user.email)
  if (!role) {
    return NextResponse.json({ error: 'Accès réservé à l’équipe' }, { status: 403 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const event = body?.event
  if (event !== 'compte_verifie' && event !== 'annonce_validee') {
    return NextResponse.json({ error: 'event invalide' }, { status: 400 })
  }

  const siteBase =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    request.headers.get('origin') ||
    'https://www.chezmoici.com'
  const adminUrl = `${siteBase}/admin-portail`

  if (event === 'compte_verifie') {
    const cibleUserId = body?.cibleUserId
    if (!cibleUserId || typeof cibleUserId !== 'string') {
      return NextResponse.json({ error: 'cibleUserId requis' }, { status: 400 })
    }
    const { data: cible, error: cErr } = await supabaseUser
      .from('profiles')
      .select('id, nom, email, account_status')
      .eq('id', cibleUserId)
      .single()
    if (cErr || !cible || cible.account_status !== 'active') {
      return NextResponse.json({ error: 'Compte non actif ou introuvable' }, { status: 400 })
    }

    const text = [
      '✅ *Compte vérifié (actif)* — Chez Moi CI',
      `*Utilisateur:* ${cible.nom || '—'}`,
      `*E-mail:* ${cible.email || '—'}`,
      `*ID:* \`${cible.id}\``,
      `*Validé par:* ${user.email || user.id}`,
      `*Admin:* ${adminUrl}`,
    ].join('\n')

    const notify = await sendTeamModerationNotify({
      text,
      emailSubject: `[Chez Moi CI] Compte vérifié : ${cible.nom || cible.email || cible.id}`,
      webhookBody: {
        event: 'compte_verifie',
        profil: { id: cible.id, nom: cible.nom, email: cible.email },
        valide_par: { id: user.id, email: user.email },
        adminUrl,
      },
    })

    return NextResponse.json({
      ok: true,
      sent: notify.sent,
      results: notify.results,
      warnings: notify.errors?.length ? `Canaux en échec : ${notify.errors.join(', ')}` : null,
    })
  }

  const annonceId = body?.annonceId
  if (!annonceId || typeof annonceId !== 'string') {
    return NextResponse.json({ error: 'annonceId requis' }, { status: 400 })
  }

  const { data: annonce, error: aErr } = await supabaseUser
    .from('annonces')
    .select('id, titre, type, quartier, statut, utilisateur_id')
    .eq('id', annonceId)
    .single()

  if (aErr || !annonce || annonce.statut !== 'actif') {
    return NextResponse.json({ error: 'Annonce non active ou introuvable' }, { status: 400 })
  }

  const text = [
    '✅ *Annonce validée (publiée)* — Chez Moi CI',
    `*Titre:* ${annonce.titre}`,
    `*Type:* ${annonce.type} · *Quartier:* ${annonce.quartier || '—'}`,
    `*ID:* \`${annonce.id}\``,
    `*Validé par:* ${user.email || user.id}`,
    `*Lien:* ${siteBase}/annonces/${annonce.id}`,
    `*Admin:* ${adminUrl}`,
  ].join('\n')

  const notify = await sendTeamModerationNotify({
    text,
    emailSubject: `[Chez Moi CI] Annonce validée : ${annonce.titre}`,
    webhookBody: {
      event: 'annonce_validee',
      annonce: {
        id: annonce.id,
        titre: annonce.titre,
        type: annonce.type,
        quartier: annonce.quartier,
        utilisateur_id: annonce.utilisateur_id,
      },
      valide_par: { id: user.id, email: user.email },
      adminUrl,
      publicUrl: `${siteBase}/annonces/${annonce.id}`,
    },
  })

  return NextResponse.json({
    ok: true,
    sent: notify.sent,
    results: notify.results,
    warnings: notify.errors?.length ? `Canaux en échec : ${notify.errors.join(', ')}` : null,
  })
}
