const STORAGE_KEY = 'chezmoici_admin_filtres_v1'

const TAB_FILTER_KEYS = {
  annonces: ['filtreAnnonceStatut', 'filtreAnnonceType', 'filtreAnnonceBadge'],
  utilisateurs: ['filtreUserType', 'filtreUserStatut', 'filtreUserBadge', 'filtreUserStaff', 'filtreUserEmail'],
  signalements: ['filtreSignalementStatut'],
  demandes_badge: ['filtreDemandeBadgeStatut'],
  avis: ['filtreAvisVisibilite'],
  messagerie_contact: ['filtreContactStatut'],
  historique_moderation: ['filtreLogAction'],
}

export function loadAdminPersistedOnglet() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    return typeof data.onglet === 'string' ? data.onglet : null
  } catch {
    return null
  }
}

/**
 * @param {string} tabId
 * @param {Record<string, string>} defaults
 */
export function loadAdminTabFilters(tabId, defaults = {}) {
  if (typeof window === 'undefined') return { ...defaults }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const data = raw ? JSON.parse(raw) : {}
    const tab = data.tabs?.[tabId]
    if (!tab || typeof tab !== 'object') return { ...defaults }
    const out = { ...defaults }
    for (const key of TAB_FILTER_KEYS[tabId] || Object.keys(defaults)) {
      if (key in tab && typeof tab[key] === 'string') out[key] = tab[key]
    }
    return out
  } catch {
    return { ...defaults }
  }
}

/**
 * @param {string} tabId
 * @param {Record<string, string>} partial
 */
export function saveAdminTabFilters(tabId, partial) {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const data = raw ? JSON.parse(raw) : { tabs: {} }
    if (!data.tabs) data.tabs = {}
    data.tabs[tabId] = { ...(data.tabs[tabId] || {}), ...partial }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* ignore quota */
  }
}

export function saveAdminPersistedOnglet(onglet) {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const data = raw ? JSON.parse(raw) : { tabs: {} }
    data.onglet = onglet
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* ignore */
  }
}

export function clearAdminTabFilters(tabId) {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const data = JSON.parse(raw)
    if (data.tabs?.[tabId]) {
      delete data.tabs[tabId]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }
  } catch {
    /* ignore */
  }
}

export { TAB_FILTER_KEYS }
