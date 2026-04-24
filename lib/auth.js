import { supabase } from '@/lib/supabase'

/** Ajoute un alias uid = id pour compatibilité avec le code existant */
function normalizeUser(user) {
  if (!user) return null
  return Object.assign(Object.create(Object.getPrototypeOf(user)), user, { uid: user.id })
}

/** Inscription email + création du profil */
export async function inscrireAvecEmail(email, motDePasse, infos) {
  const nom = [(infos.prenom || '').trim(), (infos.nom || '').trim()].filter(Boolean).join(' ') || email.split('@')[0]

  const { data, error } = await supabase.auth.signUp({
    email,
    password: motDePasse,
    options: {
      data: { nom, prenom: infos.prenom || '', nom_famille: infos.nom || '' },
    },
  })
  if (error) throw error

  if (data.user) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      email: data.user.email,
      nom,
      prenom: infos.prenom || '',
      nom_famille: infos.nom || '',
      type: infos.type || 'particulier',
      telephone: infos.telephone || '',
      quartier: infos.quartier || '',
      badge: 'bronze',
    }, { onConflict: 'id' })
  }

  return normalizeUser(data.user)
}

/** Connexion email */
export async function connecterAvecEmail(email, motDePasse) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: motDePasse })
  if (error) throw error
  return normalizeUser(data.user)
}

/** Connexion Google — redirige vers /auth/callback */
export async function connecterAvecGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined,
    },
  })
  if (error) throw error
}

export async function deconnecter() {
  await supabase.auth.signOut()
}

export async function reinitialiserMotDePasse(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: typeof window !== 'undefined'
      ? `${window.location.origin}/nouveau-mot-de-passe`
      : undefined,
  })
  if (error) throw error
}

export async function mettreAJourMotDePasse(nouveauMotDePasse) {
  const { error } = await supabase.auth.updateUser({ password: nouveauMotDePasse })
  if (error) throw error
}

/**
 * Observe l'état de connexion.
 * Rappelle immédiatement avec la session courante, puis à chaque changement.
 * Retourne une fonction de désabonnement.
 */
export function observerConnexion(callback) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    callback(normalizeUser(session?.user || null))
  })

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(normalizeUser(session?.user || null))
  })

  return () => subscription.unsubscribe()
}

export async function getProfil(uid) {
  const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
  return data
}
