/**
 * Canaux équipe modération (Slack, webhook JSON, Resend).
 * Même jeu de variables que /api/notify-moderation.
 */

export async function sendTeamModerationNotify({ text, emailSubject, webhookBody }) {
  const results = { slack: false, webhook: false, email: false }

  const slackUrl = process.env.SLACK_MODERATION_WEBHOOK_URL
  if (slackUrl) {
    try {
      const r = await fetch(slackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      results.slack = r.ok
      if (!r.ok) console.warn('[team-notify] Slack HTTP', r.status)
    } catch (e) {
      console.error('[team-notify] Slack', e)
    }
  }

  const customUrl = process.env.MODERATION_NOTIFY_WEBHOOK_URL
  if (customUrl && webhookBody) {
    try {
      const r = await fetch(customUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookBody),
      })
      results.webhook = r.ok
      if (!r.ok) console.warn('[team-notify] webhook HTTP', r.status)
    } catch (e) {
      console.error('[team-notify] webhook', e)
    }
  }

  const resendKey = process.env.RESEND_API_KEY
  const notifyEmail = process.env.MODERATION_NOTIFY_EMAIL
  if (resendKey && notifyEmail && emailSubject) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'Chez Moi CI <onboarding@resend.dev>',
          to: [notifyEmail],
          subject: emailSubject,
          text: text.replace(/\*/g, ''),
        }),
      })
      results.email = r.ok
      if (!r.ok) {
        const errText = await r.text().catch(() => '')
        console.warn('[team-notify] Resend HTTP', r.status, errText)
      }
    } catch (e) {
      console.error('[team-notify] Resend', e)
    }
  }

  const sent = results.slack || results.webhook || results.email
  if (!sent) {
    console.info('[team-notify] Aucun canal configuré (SLACK / WEBHOOK / RESEND)')
  }

  return { sent, results }
}
