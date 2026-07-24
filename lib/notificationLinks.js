/**
 * Ne laisse passer que des chemins relatifs same-origin pour les liens de notification.
 * Bloque les URL absolues et protocol-relatives (phishing via la cloche).
 * @param {unknown} lien
 * @param {string} [fallback='/messages']
 * @returns {string}
 */
export function safeNotificationHref(lien, fallback = '/messages') {
  const fb = typeof fallback === 'string' && fallback.startsWith('/') && !fallback.startsWith('//')
    ? fallback
    : '/messages'
  if (typeof lien !== 'string') return fb
  const trimmed = lien.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fb
  // Refuse schémas déguisés dans le chemin (ex. "/javascript:...")
  if (/^[\\/]*[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed.slice(1))) return fb
  return trimmed
}
