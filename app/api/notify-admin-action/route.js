import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStaffFromRequest } from '@/lib/adminApiAuth'
import { sendTeamModerationNotify } from '@/lib/sendTeamModerationNotify'

/**
 * Notifications équipe quand un admin valide un compte ou publie une annonce.
 * Auth : JWT staff uniquement.
 * Utilise les mêmes variables que /api/notify-moderation.
 */
export async function POST(request) {
  const staff = await getStaffFromRequest(request)
  if (staff.error) {
    return NextResponse.json({ error: staff.error }, { status: staff.status })
  }
  const token = staff.token
  const user = staff.user
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Configuration serveur' }, { status: 500 })
  }

  const supabaseUser = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

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
