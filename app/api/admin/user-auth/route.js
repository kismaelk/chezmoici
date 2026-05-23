import { NextResponse } from 'next/server'
import { getStaffFromRequest } from '@/lib/adminApiAuth'
import { createSupabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * Actions Auth côté serveur (service role).
 * confirm_email : super_admin uniquement (force email_confirm sur auth.users).
 * send_password_reset : super_admin + admin (envoi e-mail Supabase, sans exposer le lien).
 */
export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const action = body?.action
  const targetUserId = body?.targetUserId
  if (!targetUserId || typeof targetUserId !== 'string') {
    return NextResponse.json({ error: 'targetUserId requis' }, { status: 400 })
  }
  if (action !== 'confirm_email' && action !== 'send_password_reset') {
    return NextResponse.json({ error: 'action invalide' }, { status: 400 })
  }

  const ctx = await getStaffFromRequest(request)
  if (ctx.error) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }

  if (action === 'confirm_email' && !ctx.permissions.authConfirmEmail) {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  }
  if (action === 'send_password_reset' && !ctx.permissions.authSendPasswordReset) {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  }

  try {
    const admin = createSupabaseAdmin()
    const { data: userData, error: getErr } = await admin.auth.admin.getUserById(targetUserId)
    if (getErr || !userData?.user?.email) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    if (action === 'confirm_email') {
      const { error: upErr } = await admin.auth.admin.updateUserById(targetUserId, {
        email_confirm: true,
      })
      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 400 })
      }
      return NextResponse.json({ ok: true, message: 'E-mail marqué comme confirmé.' })
    }

    const site =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
      request.headers.get('origin') ||
      ''
    const redirectTo = site ? `${site}/nouveau-mot-de-passe` : undefined

    const { error: resetErr } = await admin.auth.resetPasswordForEmail(
      userData.user.email,
      redirectTo ? { redirectTo } : undefined
    )
    if (resetErr) {
      return NextResponse.json({ error: resetErr.message }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      message:
        'E-mail de réinitialisation envoyé si la messagerie Supabase est configurée.',
    })
  } catch (e) {
    const msg = e?.message || String(e)
    if (msg.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      return NextResponse.json(
        { error: 'Clé service Supabase non configurée sur le serveur' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
