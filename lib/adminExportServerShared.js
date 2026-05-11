/** Plafond lignes pour éviter abus mémoire (exports pilotés par le client filtré). */
export const MAX_EXPORT_ROWS = 8000

/**
 * @param {unknown} body
 * @returns {{ error?: string, columns?: { key: string, label: string }[], rows?: Record<string, unknown>[] }}
 */
export function parseExportTablePayload(body) {
  if (!body || typeof body !== 'object') {
    return { error: 'Corps JSON invalide' }
  }
  const columns = body.columns
  if (!Array.isArray(columns) || columns.length === 0) {
    return { error: 'Colonnes requises' }
  }
  if (columns.length > 80) {
    return { error: 'Trop de colonnes' }
  }
  const normalized = []
  for (const c of columns) {
    if (!c || typeof c !== 'object') return { error: 'Colonne invalide' }
    const key = typeof c.key === 'string' ? c.key.trim() : ''
    const label = typeof c.label === 'string' ? c.label.trim() : ''
    if (!key || key.length > 80) return { error: 'Clé colonne invalide' }
    if (!label) return { error: 'Libellé colonne requis' }
    normalized.push({ key, label })
  }
  const rows = body.rows
  if (!Array.isArray(rows)) {
    return { error: 'Lignes invalides' }
  }
  if (rows.length > MAX_EXPORT_ROWS) {
    return { error: `Plafond ${MAX_EXPORT_ROWS} lignes` }
  }
  const keys = normalized.map((c) => c.key)
  const safeRows = rows.map((r) => {
    const src = r && typeof r === 'object' ? r : {}
    const out = {}
    for (const k of keys) {
      const v = Object.prototype.hasOwnProperty.call(src, k) ? src[k] : ''
      if (v != null && typeof v === 'object') {
        out[k] = JSON.stringify(v)
      } else {
        out[k] = v
      }
    }
    return out
  })
  return { columns: normalized, rows: safeRows }
}

/**
 * @param {string} base
 * @param {string} ext avec point
 */
export function safeExportBasename(base, ext) {
  const raw = String(base || 'export')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 80)
  const name = raw.endsWith(ext) ? raw.slice(0, -ext.length) : raw
  return `${name || 'export'}${ext}`
}
