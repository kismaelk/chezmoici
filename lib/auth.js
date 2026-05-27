import { supabase } from '@/lib/supabase'
import { estCompteBloque } from '@/lib/accountSuspension'

/** Jeton local expiré / mauvais projet Supabase : évite l’overlay « Refresh Token Not Found ». */
export function estErreurRefreshTokenInvalide(error) {
  if (!error) return false
  const msg = String(error.message || error.msg || '').toLowerCase()
  const code = String(error.code || '').toLowerCase()
  return (
    msg.includes('refresh token') ||
    msg.includes('invalid refresh') ||
    code === 'refresh_token_not_found'
  )
}

/** Déconnecte localement si la session stockée est illisible (sans erreur visible utilisateur). */
export async function deconnecterSiSessionCorrompue() {
  try {
    const { error } = await supabase.auth.getSession()
    if (error && estErreurRefreshTokenInvalide(error)) {
      await supabase.auth.signOut()
      return true
    }
  } catch (e) {
    if (estErreurRefreshTokenInvalide(e)) {
      await supabase.auth.signOut()
      return true
    }
  }
  return false
}

export class ErreurCompteSuspendu extends Error {
  constructor(suspendedUntil, accountStatus = null) {
    super('COMPTE_SUSPENDU')
    this.name = 'ErreurCompteSuspendu'
    this.suspendedUntil = suspendedUntil
    this.accountStatus = accountStatus
  }
}

async function rejeterSiProfilSuspendu(user) {
  if (!user?.id) return
  const { data: profil } = await supabase
    .from('profiles')
    .select('account_status, account_suspended_until')
    .eq('id', user.id)
    .maybeSingle()
  if (estCompteBloque(profil)) {
    await supabase.auth.signOut()
    throw new ErreurCompteSuspendu(profil?.account_suspended_until, profil?.account_status)
  }
}

/**
 * À appeler quand une session existe encore (ex. après suspension côté admin).
 * Déconnecte et retourne true si le profil est suspendu.
 */
export async function verifierEtDeconnecterSiSuspendu() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error && estErreurRefreshTokenInvalide(error)) {
    await supabase.auth.signOut()
    return false
  }
  if (!session?.user) return false
  const { data: profil } = await supabase
    .from('profiles')
    .select('account_status, account_suspended_until')
    .eq('id', session.user.id)
    .maybeSingle()
  if (estCompteBloque(profil)) {
    await supabase.auth.signOut()
    return true
  }
  return false
}

function authRedirect(path = '/auth/callback') {
  return typeof window !== 'undefined' ? `${window.location.origin}${path}` : undefined
}

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
      account_status: 'en_attente',
    }, { onConflict: 'id' })
  }

  return normalizeUser(data.user)
}

/** Connexion email */
export async function connecterAvecEmail(email, motDePasse) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: motDePasse })
  if (error) throw error
  await rejeterSiProfilSuspendu(data.user)
  return normalizeUser(data.user)
}

/** Connexion Google — redirige vers /auth/callback (désactivé côté UI tant que le provider n’est pas prêt). */
export async function connecterAvecGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: authRedirect('/auth/callback'),
    },
  })
  if (error) throw error
}

/** Connexion Facebook — redirige vers /auth/callback */
export async function connecterAvecFacebook() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: {
      redirectTo: authRedirect('/auth/callback'),
    },
  })
  if (error) throw error
}

/** Envoie un code OTP par SMS */
export async function envoyerCodeConnexionSMS(telephone) {
  const { error } = await supabase.auth.signInWithOtp({
    phone: telephone,
    options: {
      shouldCreateUser: true,
    },
  })
  if (error) throw error
}

/** Vérifie le code OTP reçu par SMS */
export async function verifierCodeConnexionSMS(telephone, code) {
  const { data, error } = await supabase.auth.verifyOtp({
    phone: telephone,
    token: code,
    type: 'sms',
  })
  if (error) throw error
  if (data?.user) await rejeterSiProfilSuspendu(data.user)
  return normalizeUser(data?.user || null)
}

export async function deconnecter() {
  await supabase.auth.signOut()
}

export async function reinitialiserMotDePasse(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: authRedirect('/nouveau-mot-de-passe'),
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
  supabase.auth
    .getSession()
    .then(async ({ data: { session }, error }) => {
      if (error && estErreurRefreshTokenInvalide(error)) {
        await supabase.auth.signOut()
        callback(null)
        return
      }
      callback(normalizeUser(session?.user || null))
    })
    .catch(async (e) => {
      if (estErreurRefreshTokenInvalide(e)) {
        await supabase.auth.signOut()
        callback(null)
        return
      }
      console.warn('[auth] getSession', e)
      callback(null)
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
