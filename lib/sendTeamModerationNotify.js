/**
 * Canaux équipe modération (Slack, webhook JSON, Resend).
 * Même jeu de variables que /api/notify-moderation.
 */

async function fetchWithRetry(url, init, { retries = 2, delayMs = 400 } = {}) {
  let lastErr
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fetch(url, init)
      if (r.ok || r.status < 500) return r
      lastErr = new Error(`HTTP ${r.status}`)
    } catch (e) {
      lastErr = e
    }
    if (i < retries) await new Promise((res) => setTimeout(res, delayMs * (i + 1)))
  }
  throw lastErr
}

export async function sendTeamModerationNotify({ text, emailSubject, webhookBody }) {
  const results = { slack: false, webhook: false, email: false }
  const errors = []

  const slackUrl = process.env.SLACK_MODERATION_WEBHOOK_URL
  if (slackUrl) {
    try {
      const r = await fetchWithRetry(slackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      results.slack = r.ok
      if (!r.ok) {
        console.warn('[team-notify] Slack HTTP', r.status)
        errors.push('slack')
      }
    } catch (e) {
      console.error('[team-notify] Slack', e)
      errors.push('slack')
    }
  }

  const customUrl = process.env.MODERATION_NOTIFY_WEBHOOK_URL
  if (customUrl && webhookBody) {
    try {
      const r = await fetchWithRetry(customUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookBody),
      })
      results.webhook = r.ok
      if (!r.ok) {
        console.warn('[team-notify] webhook HTTP', r.status)
        errors.push('webhook')
      }
    } catch (e) {
      console.error('[team-notify] webhook', e)
      errors.push('webhook')
    }
  }

  const resendKey = process.env.RESEND_API_KEY
  const notifyEmail = process.env.MODERATION_NOTIFY_EMAIL
  if (resendKey && notifyEmail && emailSubject) {
    try {
      const r = await fetchWithRetry('https://api.resend.com/emails', {
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
        errors.push('email')
      }
    } catch (e) {
      console.error('[team-notify] Resend', e)
      errors.push('email')
    }
  }

  const sent = results.slack || results.webhook || results.email
  if (!sent) {
    console.info('[team-notify] Aucun canal configuré (SLACK / WEBHOOK / RESEND)')
  }

  return { sent, results, errors, partial: sent && errors.length > 0 }
}
