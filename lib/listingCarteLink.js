/** Paramètres repris par /carte depuis une liste d’annonces. */
export const PARAMS_CARTE_DEPUIS_LISTE = [
  'type', 'quartier', 'prixMin', 'prixMax', 'nbPieces', 'nbChambres', 'meuble', 'badge',
  'surfaceMin', 'recherche', 'typePropriete', 'typeService', 'disponibilite',
]

/**
 * @param {string} annonceId
 * @param {Record<string, string>} [filtres]
 */
export function buildHrefCarteAnnonce(annonceId, filtres = {}) {
  const p = new URLSearchParams()
  p.set('annonce', annonceId)
  for (const key of PARAMS_CARTE_DEPUIS_LISTE) {
    const v = filtres?.[key]
    if (v != null && String(v).trim() !== '') p.set(key, String(v).trim())
  }
  return `/carte?${p.toString()}`
}

export function buildHrefCarteType(typeId, filtres = {}) {
  const p = new URLSearchParams()
  if (typeId) p.set('type', typeId)
  for (const key of PARAMS_CARTE_DEPUIS_LISTE) {
    if (key === 'type') continue
    const v = filtres?.[key]
    if (v != null && String(v).trim() !== '') p.set(key, String(v).trim())
  }
  const q = p.toString()
  return q ? `/carte?${q}` : '/carte'
}

export function IconePinCarte({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M12 2C8.13 2 5 5.13 5 9c0 4.52 4.86 9.53 6.24 10.8.14.13.33.2.51.2.18 0 .37-.07.51-.2C13.14 18.53 18 13.52 18 9c0-3.87-3.13-7-7-7z"
        className="fill-[#1B5E20]"
      />
      <circle cx="12" cy="9" r="2.25" className="fill-white" />
    </svg>
  )
}
