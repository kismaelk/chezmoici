/**
 * lib/firestoreApp.js — Toutes les opérations base de données (Supabase)
 * Remplace l'ancienne version Firebase/Firestore.
 */
import { supabase } from '@/lib/supabase'

// ─── Annonces ──────────────────────────────────────────────────────────────

export async function fetchAnnoncesList(filtres = {}, tri = 'recent') {
  let q = supabase.from('annonces').select('*').eq('statut', 'actif')

  if (filtres.type) q = q.eq('type', filtres.type)
  if (filtres.quartier) q = q.eq('quartier', filtres.quartier)
  if (filtres.prixMin) q = q.gte('prix', parseInt(filtres.prixMin, 10))
  if (filtres.prixMax) q = q.lte('prix', parseInt(filtres.prixMax, 10))
  if (filtres.nbPieces) q = q.eq('nb_pieces', parseInt(filtres.nbPieces, 10))
  if (filtres.meuble === 'true') q = q.eq('meuble', true)
  if (filtres.meuble === 'false') q = q.eq('meuble', false)
  if (filtres.badge) q = q.eq('badge', filtres.badge)
  if (filtres.surfaceMin) q = q.gte('surface', parseInt(filtres.surfaceMin, 10))
  if (filtres.nbChambres !== '' && filtres.nbChambres != null) {
    q = q.eq('nb_chambres', parseInt(filtres.nbChambres, 10))
  }
  if (filtres.typePropriete) q = q.eq('type_propriete', filtres.typePropriete)
  if (filtres.typeService) q = q.eq('type_service', filtres.typeService)
  if (filtres.disponibilite) q = q.eq('disponibilite', filtres.disponibilite)
  if (filtres.recherche?.trim()) {
    const s = filtres.recherche.trim()
    q = q.or(`titre.ilike.%${s}%,description.ilike.%${s}%`)
  }

  if (tri === 'prixCroissant') q = q.order('prix', { ascending: true })
  else if (tri === 'prixDecroissant') q = q.order('prix', { ascending: false })
  else if (tri === 'populaire') q = q.order('nb_vues', { ascending: false })
  else q = q.order('created_at', { ascending: false })

  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getAnnonceById(id) {
  const { data, error } = await supabase.from('annonces').select('*').eq('id', id).single()
  if (error) return null
  return data
}

export async function incrementAnnonceVues(id) {
  await supabase.rpc('increment_vues', { annonce_id: id })
}

export async function createAnnonce(payload) {
  const { data, error } = await supabase
    .from('annonces')
    .insert({ ...payload, nb_vues: payload.nb_vues ?? 0 })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function updateAnnonce(id, data) {
  const { error } = await supabase.from('annonces').update(data).eq('id', id)
  if (error) throw error
}

export async function deleteAnnonce(id) {
  const { error } = await supabase.from('annonces').delete().eq('id', id)
  if (error) throw error
}

export async function fetchMesAnnonces(uid) {
  const { data, error } = await supabase
    .from('annonces')
    .select('*')
    .eq('utilisateur_id', uid)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchAnnoncesActivesForUser(uid) {
  const { data, error } = await supabase
    .from('annonces')
    .select('*')
    .eq('utilisateur_id', uid)
    .eq('statut', 'actif')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// ─── Storage ───────────────────────────────────────────────────────────────

export async function uploadPhotoChemin(chemin, file) {
  // chemin: 'avatars/uid-timestamp' ou 'annonces/uid/fichier'
  const parts = chemin.split('/')
  const bucket = parts[0]
  const filePath = parts.slice(1).join('/')

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, { upsert: true })
  if (error) throw error

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
  return data.publicUrl
}

// ─── Profils ───────────────────────────────────────────────────────────────

export async function getProfilFirestore(uid) {
  const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
  return data || null
}

export async function upsertProfilFirestore(uid, payload) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: uid, ...payload }, { onConflict: 'id' })
  if (error) throw error
}

// ─── Favoris ───────────────────────────────────────────────────────────────

export async function fetchFavorisAvecAnnonces(uid) {
  const { data, error } = await supabase
    .from('favoris')
    .select('*, annonces(*)')
    .eq('utilisateur_id', uid)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).filter((f) => f.annonces)
}

export async function findFavori(uid, annonceId) {
  const { data } = await supabase
    .from('favoris')
    .select('id')
    .eq('utilisateur_id', uid)
    .eq('annonce_id', annonceId)
    .maybeSingle()
  return data || null
}

export async function addFavori(uid, annonceId) {
  const { data, error } = await supabase
    .from('favoris')
    .insert({ utilisateur_id: uid, annonce_id: annonceId })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function removeFavori(favoriId) {
  const { error } = await supabase.from('favoris').delete().eq('id', favoriId)
  if (error) throw error
}

// ─── Messages ──────────────────────────────────────────────────────────────

export async function fetchMessagesForPair(uid, otherId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${uid},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${uid})`
    )
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function sendMessageFirestore({ sender_id, receiver_id, content, annonce_id }) {
  const { error } = await supabase.from('messages').insert({
    sender_id,
    receiver_id,
    content,
    annonce_id: annonce_id || null,
  })
  if (error) throw error
}

export async function fetchAllMessagesForUser(uid) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
    .order('created_at', { ascending: false })
  if (error) throw error

  const map = new Map()
  for (const m of (data || [])) {
    const other = m.sender_id === uid ? m.receiver_id : m.sender_id
    if (!map.has(other)) map.set(other, m)
  }
  return Array.from(map.entries()).map(([otherUserId, lastMsg]) => ({ otherUserId, lastMsg }))
}

export function listenUserConversationsSummary(uid, callback) {
  fetchAllMessagesForUser(uid).then(callback)

  const channel = supabase
    .channel(`conv:${uid}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${uid}` },
      () => fetchAllMessagesForUser(uid).then(callback))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `sender_id=eq.${uid}` },
      () => fetchAllMessagesForUser(uid).then(callback))
    .subscribe()

  return () => supabase.removeChannel(channel)
}

export function listenPairMessages(uid, otherId, callback) {
  fetchMessagesForPair(uid, otherId).then(callback)

  const channel = supabase
    .channel(`pair:${uid}:${otherId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
      () => fetchMessagesForPair(uid, otherId).then(callback))
    .subscribe()

  return () => supabase.removeChannel(channel)
}

// ─── Notifications ─────────────────────────────────────────────────────────

export async function fetchNotifications(uid) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('utilisateur_id', uid)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) return []
  return data || []
}

export function listenNotifications(uid, callback) {
  fetchNotifications(uid).then(callback)

  const channel = supabase
    .channel(`notif:${uid}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `utilisateur_id=eq.${uid}` },
      () => fetchNotifications(uid).then(callback))
    .subscribe()

  return () => supabase.removeChannel(channel)
}

export async function addNotification(data) {
  const { error } = await supabase.from('notifications').insert({ ...data, lu: data.lu ?? false })
  if (error) throw error
}

export async function markAllNotificationsRead(uid) {
  const { error } = await supabase
    .from('notifications')
    .update({ lu: true })
    .eq('utilisateur_id', uid)
    .eq('lu', false)
  if (error) throw error
}

// ─── Avis ──────────────────────────────────────────────────────────────────

export async function fetchAvisForAnnonce(annonceId) {
  const { data, error } = await supabase
    .from('avis')
    .select('*, profiles(nom)')
    .eq('annonce_id', annonceId)
    .order('created_at', { ascending: false })
  if (error) return []
  return data || []
}

export async function addAvis(data) {
  const { error } = await supabase.from('avis').insert(data)
  if (error) throw error
}

// ─── Contact ───────────────────────────────────────────────────────────────

export async function addContactMessage(data) {
  const { error } = await supabase.from('messages_contact').insert(data)
  if (error) throw error
}

// ─── Demandes badge ────────────────────────────────────────────────────────

export async function addDemandeBadge(data) {
  const { error } = await supabase
    .from('demandes_badge')
    .insert({ ...data, statut: data.statut ?? 'en_attente' })
  if (error) throw error
}

export async function fetchMesDemandesBadge(uid) {
  const { data, error } = await supabase
    .from('demandes_badge')
    .select('*, annonces(titre)')
    .eq('utilisateur_id', uid)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchAllDemandesBadgeAdmin() {
  const { data, error } = await supabase
    .from('demandes_badge')
    .select('*, profiles(nom), annonces(titre)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((d) => ({
    ...d,
    annonce_titre: d.annonces?.titre || null,
  }))
}

export async function updateDemandeBadge(id, data) {
  const { error } = await supabase
    .from('demandes_badge')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ─── Signalements ──────────────────────────────────────────────────────────

export async function addSignalement(data) {
  const { error } = await supabase
    .from('signalements')
    .insert({ ...data, statut: 'en_attente' })
  if (error) throw error
}

// ─── Admin ─────────────────────────────────────────────────────────────────

export async function fetchAllAnnoncesAdmin() {
  const { data, error } = await supabase
    .from('annonces')
    .select('*, profiles(nom)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchAllSignalementsAdmin() {
  const { data, error } = await supabase
    .from('signalements')
    .select('*, profiles(nom)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function updateSignalement(id, data) {
  const { error } = await supabase.from('signalements').update(data).eq('id', id)
  if (error) throw error
}

/** Demandes reçues (messages entrants avec annonce associée) */
export async function fetchDemandesRecues(uid) {
  const { data, error } = await supabase
    .from('messages')
    .select('*, annonces(titre, photos), profiles!sender_id(nom, photo_url)')
    .eq('receiver_id', uid)
    .order('created_at', { ascending: false })
  if (error) throw error
  // Regrouper par annonce + expéditeur
  const map = new Map()
  for (const m of (data || [])) {
    const key = `${m.sender_id}_${m.annonce_id || 'direct'}`
    if (!map.has(key)) map.set(key, m)
  }
  return Array.from(map.values())
}

/** Tous les profils utilisateurs (admin) */
export async function fetchAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

/** Mettre à jour un champ d'un profil (admin) */
export async function updateProfileField(uid, field, value) {
  const { error } = await supabase
    .from('profiles')
    .update({ [field]: value })
    .eq('id', uid)
  if (error) throw error
}

/** Enrichit une liste d'annonces avec les données du profil propriétaire */
export async function enrichAnnoncesWithProfiles(annonces) {
  if (!annonces?.length) return []
  const uids = [...new Set(annonces.map((a) => a.utilisateur_id).filter(Boolean))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nom, photo_url, badge')
    .in('id', uids)
  const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
  return annonces.map((a) => ({
    ...a,
    profiles: profileMap[a.utilisateur_id] || null,
  }))
}

export async function fetchStatsAdmin() {
  const [annonces, profiles, messages, signalements] = await Promise.all([
    supabase.from('annonces').select('id, statut, created_at', { count: 'exact' }),
    supabase.from('profiles').select('id', { count: 'exact' }),
    supabase.from('messages').select('id', { count: 'exact' }),
    supabase.from('signalements').select('id, statut', { count: 'exact' }),
  ])
  return {
    totalAnnonces: annonces.count || 0,
    totalUtilisateurs: profiles.count || 0,
    totalMessages: messages.count || 0,
    totalSignalements: signalements.count || 0,
    annoncesActives: (annonces.data || []).filter((a) => a.statut === 'actif').length,
    signalementsEnAttente: (signalements.data || []).filter((s) => s.statut === 'en_attente').length,
  }
}
