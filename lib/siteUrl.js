/** Domaine public de secours (jamais l’en-tête Origin, forgable par un client). */
export const DEFAULT_PUBLIC_SITE_URL = 'https://www.chezmoici.com'

/**
 * URL de base du site pour liens e-mail / Slack / reset mot de passe.
 * N’utilise jamais `Origin` / `Referer` : ces en-têtes sont contrôlés par le client.
 *
 * @returns {string} URL sans slash final
 */
export function resolvePublicSiteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL
  if (typeof fromEnv === 'string') {
    const trimmed = fromEnv.trim().replace(/\/$/, '')
    if (trimmed) return trimmed
  }
  return DEFAULT_PUBLIC_SITE_URL
}
