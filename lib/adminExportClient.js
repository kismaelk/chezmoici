import { supabase } from '@/lib/supabase'

async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

function declencherTelechargementBlob(blob, filename) {
  if (typeof window === 'undefined') return
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(a.href)
}

/**
 * @param {{ filename: string, sheetName?: string, columns: { key: string, label: string }[], rows: Record<string, unknown>[], showToast?: (type: string, msg: string) => void }} p
 */
export async function telechargerExportXlsxAdmin(p) {
  const token = await getAccessToken()
  if (!token) {
    p.showToast?.('error', 'Session requise pour l’export Excel.')
    return false
  }
  const r = await fetch('/api/admin/export/xlsx', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      filename: p.filename,
      sheetName: p.sheetName,
      columns: p.columns,
      rows: p.rows,
    }),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    p.showToast?.('error', err.error || `Export Excel échoué (${r.status})`)
    return false
  }
  const blob = await r.blob()
  const base = String(p.filename || 'export').replace(/\.xlsx$/i, '')
  declencherTelechargementBlob(blob, `${base}.xlsx`)
  return true
}

/**
 * @param {{ filename: string, sheets: { sheetName: string, columns: { key: string, label: string }[], rows: Record<string, unknown>[] }[], showToast?: (type: string, msg: string) => void }} p
 */
export async function telechargerExportXlsxMultiAdmin(p) {
  const token = await getAccessToken()
  if (!token) {
    p.showToast?.('error', 'Session requise pour l’export Excel.')
    return false
  }
  const r = await fetch('/api/admin/export/xlsx', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ filename: p.filename, sheets: p.sheets }),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    p.showToast?.('error', err.error || `Export Excel échoué (${r.status})`)
    return false
  }
  const blob = await r.blob()
  const base = String(p.filename || 'export').replace(/\.xlsx$/i, '')
  declencherTelechargementBlob(blob, `${base}.xlsx`)
  return true
}

/**
 * @param {{ title: string, columns: { key: string, label: string }[], rows: Record<string, unknown>[], filename?: string, showToast?: (type: string, msg: string) => void }} p
 */
export async function telechargerExportPdfAdmin(p) {
  const token = await getAccessToken()
  if (!token) {
    p.showToast?.('error', 'Session requise pour l’export PDF.')
    return false
  }
  const r = await fetch('/api/admin/export/pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: p.title,
      filename: p.filename,
      columns: p.columns,
      rows: p.rows,
    }),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    p.showToast?.('error', err.error || `Export PDF échoué (${r.status})`)
    return false
  }
  const blob = await r.blob()
  const base = (p.filename || p.title || 'export')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/\.pdf$/i, '')
    .slice(0, 80)
  declencherTelechargementBlob(blob, `${base || 'export'}.pdf`)
  return true
}
