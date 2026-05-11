/**
 * État auth pour le header : survit aux remontages de SiteHeader (navigation pleine page)
 * et évite le flash « déconnecté ». Synchronisé avec sessionStorage pour le premier rendu client.
 */
import { observerConnexion } from '@/lib/auth'
import { getProfilFirestore } from '@/lib/firestoreApp'

const STORAGE_KEY = 'chezmoici_header_auth_v1'

let state = { user: null, profil: null }
const listeners = new Set()

function readStorage() {
  if (typeof window === 'undefined') return
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    state = {
      user: parsed.user
        ? {
            id: parsed.user.id,
            uid: parsed.user.uid || parsed.user.id,
            email: parsed.user.email,
          }
        : null,
      profil: parsed.profil || null,
    }
  } catch {
    // ignore
  }
}

export function getHeaderAuthState() {
  return state
}

export function subscribeHeaderAuth(onStoreChange) {
  listeners.add(onStoreChange)
  return () => listeners.delete(onStoreChange)
}

function emit() {
  listeners.forEach((fn) => fn())
}

function persist() {
  if (typeof window === 'undefined') return
  try {
    if (state.user) {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          user: {
            id: state.user.id,
            uid: state.user.uid || state.user.id,
            email: state.user.email,
          },
          profil: state.profil
            ? {
                nom: state.profil.nom,
                photo_url: state.profil.photo_url,
                account_status: state.profil.account_status,
                is_admin: state.profil.is_admin,
                admin_role: state.profil.admin_role,
              }
            : null,
        })
      )
    } else {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // ignore
  }
}

export function setHeaderAuthState(user, profil) {
  state = { user, profil }
  persist()
  emit()
}

let unsubscribeGlobal = null

/**
 * Un seul abonnement Supabase pour tout le site (monté depuis le layout racine).
 */
export function startHeaderAuthListener() {
  if (unsubscribeGlobal) {
    unsubscribeGlobal()
    unsubscribeGlobal = null
  }
  readStorage()
  emit()
  unsubscribeGlobal = observerConnexion(async (u) => {
    if (u) {
      try {
        const p = await getProfilFirestore(u.uid)
        setHeaderAuthState(u, p)
      } catch {
        setHeaderAuthState(u, null)
      }
    } else {
      setHeaderAuthState(null, null)
    }
  })
  return () => {
    if (unsubscribeGlobal) {
      unsubscribeGlobal()
      unsubscribeGlobal = null
    }
  }
}
