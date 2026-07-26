import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendTeamModerationNotify } from '@/lib/sendTeamModerationNotify'
import { resolvePublicSiteUrl } from '@/lib/siteUrl'

/**
 * Notifie l’équipe modération qu’une annonce est en `en_verification`.
 * Sécurité : JWT utilisateur requis ; l’annonce doit appartenir à l’utilisateur et être en attente.
 *
 * Variables optionnelles (au moins une pour envoyer réellement) :
 * - SLACK_MODERATION_WEBHOOK_URL — Webhook entrant Slack
 * - MODERATION_NOTIFY_WEBHOOK_URL — URL POST JSON (Make, Zapier, n8n, etc.)
 * - RESEND_API_KEY + MODERATION_NOTIFY_EMAIL (+ RESEND_FROM si domaine vérifié)
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

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }
  const annonceId = body?.annonceId
  if (!annonceId || typeof annonceId !== 'string') {
    return NextResponse.json({ error: 'annonceId requis' }, { status: 400 })
  }

  const supabaseUser = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: annonce, error: fetchErr } = await supabaseUser
    .from('annonces')
    .select('id,titre,type,quartier,statut,utilisateur_id,created_at')
    .eq('id', annonceId)
    .single()

  if (fetchErr || !annonce) {
    return NextResponse.json({ error: 'Annonce introuvable' }, { status: 404 })
  }
  if (annonce.utilisateur_id !== user.id) {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  }
  if (annonce.statut !== 'en_verification') {
    return NextResponse.json({ error: 'Pas en vérification' }, { status: 400 })
  }

  const siteBase = resolvePublicSiteUrl()
  const adminUrl = `${siteBase}/admin-portail`

  const text = [
    '🔍 *Nouvelle annonce à modérer* — Chez Moi CI',
    `*Titre:* ${annonce.titre}`,
    `*Type:* ${annonce.type} · *Quartier:* ${annonce.quartier || '—'}`,
    `*ID:* \`${annonce.id}\``,
    `*Auteur:* ${user.email || user.id}`,
    `*Admin:* ${adminUrl}`,
  ].join('\n')

  const { sent, results } = await sendTeamModerationNotify({
    text,
    emailSubject: `[Chez Moi CI] À modérer : ${annonce.titre}`,
    webhookBody: {
      event: 'annonce_en_verification',
      annonce: {
        id: annonce.id,
        titre: annonce.titre,
        type: annonce.type,
        quartier: annonce.quartier,
      },
      auteur: { id: user.id, email: user.email },
      adminUrl,
    },
  })

  return NextResponse.json({ ok: true, sent, results })
}
