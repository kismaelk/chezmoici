/**
 * Export CSV UTF-8 avec BOM (ouverture correcte dans Excel).
 * @param {string} nomFichier sans extension forcée
 * @param {{ key: string, label: string }[]} colonnes
 * @param {Record<string, unknown>[]} lignes
 */
export function telechargerCsv(nomFichier, colonnes, lignes) {
  if (typeof window === 'undefined') return
  const sep = ';'
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const head = colonnes.map((c) => c.label).join(sep)
  const body = lignes
    .map((row) => colonnes.map((c) => esc(row[c.key])).join(sep))
    .join('\n')
  const bom = '\uFEFF'
  const blob = new Blob([bom + head + '\n' + body], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nomFichier.endsWith('.csv') ? nomFichier : `${nomFichier}.csv`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(a.href)
}
