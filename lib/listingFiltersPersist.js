const STORAGE_KEY = 'chezmoici_listing_filtres_v1'

export const LISTING_FILTER_KEYS = [
  'type',
  'ville',
  'quartier',
  'prixMin',
  'prixMax',
  'nbPieces',
  'meuble',
  'badge',
  'surfaceMin',
  'recherche',
  'nbChambres',
  'typePropriete',
  'typeService',
  'disponibilite',
]

function readStore() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Fusionne filtres par défaut, persistance locale et paramètres URL (URL prioritaire).
 * @param {URLSearchParams} searchParams
 * @param {Record<string, string>} defaults
 */
export function mergeListingFiltersFromUrl(searchParams, defaults = {}) {
  const fromUrl = {}
  for (const key of LISTING_FILTER_KEYS) {
    const v = searchParams.get(key)
    if (v != null && v !== '') fromUrl[key] = v
  }

  const hasUrl = Object.keys(fromUrl).length > 0
  let fromPersist = {}
  if (!hasUrl && typeof window !== 'undefined') {
    const data = readStore()
    const f = data?.filtres
    if (f && typeof f === 'object') {
      for (const key of LISTING_FILTER_KEYS) {
        if (typeof f[key] === 'string') fromPersist[key] = f[key]
      }
    }
  }

  return { ...defaults, ...fromPersist, ...fromUrl }
}

export function loadListingPrefs() {
  const data = readStore()
  const vue = data?.vue === 'liste' ? 'liste' : 'grille'
  const tri =
    typeof data?.tri === 'string' &&
    ['recent', 'prixCroissant', 'prixDecroissant', 'populaire', 'mieuxNotes'].includes(data.tri)
      ? data.tri
      : 'recent'
  return { vue, tri }
}

/**
 * @param {Record<string, string>} filtres
 * @param {{ vue?: string, tri?: string }} prefs
 */
export function saveListingState(filtres, prefs = {}) {
  if (typeof window === 'undefined') return
  try {
    const prev = readStore() || {}
    const filtresOut = {}
    for (const key of LISTING_FILTER_KEYS) {
      if (filtres[key] != null) filtresOut[key] = String(filtres[key])
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...prev,
        filtres: filtresOut,
        ...(prefs.vue ? { vue: prefs.vue } : {}),
        ...(prefs.tri ? { tri: prefs.tri } : {}),
      })
    )
  } catch {
    /* quota */
  }
}

export function clearListingFiltersPersist() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
