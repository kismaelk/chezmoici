/**
 * lib/firestoreApp.js — Toutes les opérations base de données (Supabase)
 * Remplace l'ancienne version Firebase/Firestore.
 */
import { supabase } from '@/lib/supabase'
import { extractStaffChatStoragePath } from '@/lib/staffChatAttachments.mjs'

// ─── Annonces ──────────────────────────────────────────────────────────────

export async function fetchAnnoncesList(filtres = {}, tri = 'recent') {
  let q = supabase.from('annonces').select('*').eq('statut', 'actif')

  if (filtres.type === 'prestations') {
    q = q.in('type', ['service', 'artisan'])
  } else if (filtres.type) {
    q = q.eq('type', filtres.type)
  }
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
  const base = { id: uid, ...payload }
  let { error } = await supabase
    .from('profiles')
    .upsert(base, { onConflict: 'id' })
  // Tolérance déploiement: si la migration adresse_publique n'est pas encore en cache,
  // on sauvegarde quand même le reste du profil.
  if (
    error &&
    typeof error.message === 'string' &&
    error.message.toLowerCase().includes('adresse_publique')
  ) {
    const { adresse_publique: _unused, ...fallback } = base
    const retry = await supabase
      .from('profiles')
      .upsert(fallback, { onConflict: 'id' })
    error = retry.error
  }
  if (error) throw error
}

/** Vérifie si un téléphone est déjà utilisé par un autre profil */
export async function getProfilByTelephone(telephone) {
  const tel = (telephone || '').trim()
  if (!tel) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nom, email, telephone')
    .eq('telephone', tel)
    .limit(1)
  if (error) throw error
  return data?.[0] || null
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
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
  if (error) return []
  return data || []
}

export async function addAvis(data) {
  const { error } = await supabase.from('avis').insert(data)
  if (error) throw error
}

export async function upsertAvis(data) {
  const { error } = await supabase
    .from('avis')
    .upsert(data, { onConflict: 'annonce_id,auteur_id' })
  if (error) throw error
}

export async function fetchPremierContactAvis({ annonceId, auteurId, proprietaireId }) {
  if (!annonceId || !auteurId || !proprietaireId) return null
  const { data, error } = await supabase
    .from('messages')
    .select('created_at')
    .eq('annonce_id', annonceId)
    .or(
      `and(sender_id.eq.${auteurId},receiver_id.eq.${proprietaireId}),and(sender_id.eq.${proprietaireId},receiver_id.eq.${auteurId})`
    )
    .order('created_at', { ascending: true })
    .limit(1)
  if (error) throw error
  return data?.[0]?.created_at || null
}

/**
 * Statistiques d'avis pour une liste d'annonces.
 * Retourne: { [annonceId]: { moyenne: number, total: number } }
 */
export async function fetchAvisStatsForAnnonces(annonceIds = []) {
  if (!Array.isArray(annonceIds) || annonceIds.length === 0) return {}

  const ids = [...new Set(annonceIds.filter(Boolean))]
  if (ids.length === 0) return {}

  const { data, error } = await supabase
    .from('avis')
    .select('annonce_id, note')
    .in('annonce_id', ids)
    .eq('is_hidden', false)

  if (error) throw error

  const agg = {}
  for (const row of data || []) {
    const id = row.annonce_id
    if (!id) continue
    if (!agg[id]) agg[id] = { total: 0, somme: 0 }
    agg[id].total += 1
    agg[id].somme += Number(row.note) || 0
  }

  const out = {}
  Object.entries(agg).forEach(([id, v]) => {
    out[id] = {
      total: v.total,
      moyenne: v.total > 0 ? v.somme / v.total : 0,
    }
  })
  return out
}

export async function fetchAllAvisAdmin() {
  const { data, error } = await supabase
    .from('avis')
    .select('*, profiles!avis_auteur_id_fkey(nom), annonces(titre,utilisateur_id)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((a) => ({
    ...a,
    auteur_nom: a.profiles?.nom || null,
    annonce_titre: a.annonces?.titre || null,
    annonce_utilisateur_id: a.annonces?.utilisateur_id || null,
  }))
}

export async function updateAvisAdmin(id, data) {
  const { error } = await supabase.from('avis').update(data).eq('id', id)
  if (error) throw error
}

export async function addAvisModerationLog(data) {
  const { error } = await supabase.from('avis_moderation_logs').insert(data)
  if (error) throw error
}

export async function fetchAvisModerationLogsAdmin() {
  const { data, error } = await supabase
    .from('avis_moderation_logs')
    .select('*, avis(note,commentaire), annonces(titre), profiles!avis_moderation_logs_moderator_id_fkey(nom)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((r) => ({
    ...r,
    annonce_titre: r.annonces?.titre || null,
    moderateur_nom: r.profiles?.nom || null,
    avis_note: r.avis?.note || null,
    avis_commentaire: r.avis?.commentaire || null,
  }))
}

export async function fetchMesAvisModeres(ownerId) {
  if (!ownerId) return []
  const { data, error } = await supabase
    .from('avis')
    .select('id, note, commentaire, created_at, hidden_at, hidden_reason, annonce_id, annonces!inner(titre,utilisateur_id)')
    .eq('is_hidden', true)
    .eq('annonces.utilisateur_id', ownerId)
    .order('hidden_at', { ascending: false })
  if (error) throw error
  return (data || []).map((a) => ({
    ...a,
    annonce_titre: a.annonces?.titre || null,
  }))
}

// ─── Contact ───────────────────────────────────────────────────────────────

export async function addContactMessage(data) {
  const { error } = await supabase.from('messages_contact').insert(data)
  if (error) throw error
}

/** Formulaire /contact & candidatures — réservé au staff (RLS). */
export async function fetchContactMessagesAdmin() {
  const { data, error } = await supabase
    .from('messages_contact')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function updateContactMessageAdmin(id, fields) {
  const { error } = await supabase.from('messages_contact').update(fields).eq('id', id)
  if (error) throw error
}

function mapStaffDiscussionRow(m, reactionRows, currentUserId) {
  const reactions = {}
  const my_reactions = []
  for (const r of reactionRows || []) {
    if (r.message_id !== m.id) continue
    reactions[r.emoji] = (reactions[r.emoji] || 0) + 1
    if (r.user_id === currentUserId) my_reactions.push(r.emoji)
  }
  return {
    id: m.id,
    author_id: m.author_id,
    body: m.body,
    attachment_url: m.attachment_url ?? null,
    attachment_name: m.attachment_name ?? null,
    attachment_mime: m.attachment_mime ?? null,
    created_at: m.created_at,
    edited_at: m.edited_at ?? null,
    is_deleted: Boolean(m.is_deleted),
    author_nom: m.profiles?.nom || null,
    author_admin_role: m.profiles?.admin_role ?? null,
    author_is_admin: m.profiles?.is_admin ?? false,
    reactions,
    my_reactions,
  }
}

async function withSignedStaffChatAttachmentUrls(messages) {
  const rows = messages || []
  const pathByIndex = new Map()
  const paths = []

  rows.forEach((message, index) => {
    const path = extractStaffChatStoragePath(message.attachment_url)
    if (!path) return
    pathByIndex.set(index, path)
    paths.push(path)
  })

  if (paths.length === 0) return rows

  const { data, error } = await supabase.storage
    .from('staff-chat')
    .createSignedUrls(paths, 10 * 60)
  if (error) throw error

  let signedIndex = 0
  return rows.map((message, index) => {
    if (!pathByIndex.has(index)) return message
    const signedUrl = data?.[signedIndex]?.signedUrl || null
    signedIndex += 1
    return { ...message, attachment_url: signedUrl }
  })
}

/** Salon discussion équipe (RLS : tout profil is_admin). Derniers messages, ordre chronologique. */
export async function fetchStaffDiscussionMessages(limit = 200) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('staff_discussion_messages')
    .select('id, author_id, body, attachment_url, attachment_name, attachment_mime, created_at, edited_at, is_deleted, profiles(nom, admin_role, is_admin)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  const ids = (data || []).map((m) => m.id)
  let reactionRows = []
  if (ids.length > 0) {
    const { data: rx, error: rxErr } = await supabase
      .from('staff_discussion_reactions')
      .select('message_id, user_id, emoji')
      .in('message_id', ids)
    if (rxErr && !String(rxErr.message || '').includes('does not exist')) throw rxErr
    reactionRows = rx || []
  }
  const signedData = await withSignedStaffChatAttachmentUrls(data || [])
  const rows = signedData.map((m) =>
    mapStaffDiscussionRow(m, reactionRows, user?.id)
  )
  rows.reverse()
  return rows
}

export async function insertStaffDiscussionMessage(body, attachment = null) {
  const trimmed = (body || '').trim()
  if (!trimmed && !attachment?.url) throw new Error('Message vide')
  if (trimmed.length > 4000) throw new Error('Message trop long (4000 caractères max).')
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) throw new Error('Non connecté')
  const { error } = await supabase.from('staff_discussion_messages').insert({
    author_id: user.id,
    body: trimmed || (attachment?.name ? `📎 ${attachment.name}` : ''),
    attachment_url: attachment?.url ?? null,
    attachment_name: attachment?.name ?? null,
    attachment_mime: attachment?.mime ?? null,
  })
  if (error) throw error
}

/** Pièce jointe chat staff (bucket `staff-chat`). */
export async function uploadStaffChatAttachment(file) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) throw new Error('Non connecté')
  if (!file || file.size > 5 * 1024 * 1024) throw new Error('Fichier trop volumineux (5 Mo max).')
  const safeName = String(file.name || 'fichier').replace(/[^\w.\-]+/g, '_').slice(0, 80)
  const path = `${user.id}/${Date.now()}-${safeName}`
  const { error } = await supabase.storage.from('staff-chat').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  return { url: path, name: safeName, mime: file.type || 'application/octet-stream' }
}

export async function updateStaffDiscussionMessage(id, body) {
  const trimmed = (body || '').trim()
  if (!trimmed) throw new Error('Message vide')
  const { error } = await supabase
    .from('staff_discussion_messages')
    .update({ body: trimmed, edited_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function softDeleteStaffDiscussionMessage(id) {
  const { error } = await supabase
    .from('staff_discussion_messages')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function toggleStaffDiscussionReaction(messageId, emoji) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) throw new Error('Non connecté')
  const { data: existing } = await supabase
    .from('staff_discussion_reactions')
    .select('id')
    .eq('message_id', messageId)
    .eq('user_id', user.id)
    .eq('emoji', emoji)
    .maybeSingle()
  if (existing?.id) {
    const { error } = await supabase
      .from('staff_discussion_reactions')
      .delete()
      .eq('id', existing.id)
    if (error) throw error
    return
  }
  const { error } = await supabase.from('staff_discussion_reactions').insert({
    message_id: messageId,
    user_id: user.id,
    emoji,
  })
  if (error) throw error
}

function scheduleStaffChatRefresh(onUpdate) {
  fetchStaffDiscussionMessages().then(onUpdate).catch(() => {})
}

export function listenStaffDiscussionMessages(onUpdate) {
  const channel = supabase
    .channel('staff-discussion-salon')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'staff_discussion_messages' },
      () => scheduleStaffChatRefresh(onUpdate)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'staff_discussion_reactions' },
      () => scheduleStaffChatRefresh(onUpdate)
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
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

/** Mettre à jour des champs profil (admin) — ex. { badge }, { account_status }, { is_admin, admin_role } */
export async function updateProfileField(uid, fields) {
  if (!fields || typeof fields !== 'object') {
    throw new Error('updateProfileField: un objet de champs est requis')
  }
  const { error } = await supabase.from('profiles').update(fields).eq('id', uid)
  if (error) throw error
}

/** Flags fonctionnels (staff uniquement, RLS) */
export async function fetchFeatureFlagsAdmin() {
  const { data, error } = await supabase
    .from('site_feature_flags')
    .select('*')
    .order('key', { ascending: true })
  if (error) throw error
  return data || []
}

export async function updateFeatureFlagAdmin(key, value_boolean, adminUid) {
  const { error } = await supabase
    .from('site_feature_flags')
    .update({
      value_boolean,
      updated_at: new Date().toISOString(),
      updated_by: adminUid || null,
    })
    .eq('key', key)
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

/**
 * Autres annonces du vendeur, puis même quartier/type, puis prix proche — dédupliqué.
 */
export async function fetchAnnoncesAssocieesPourDetail(annonce, limit = 12) {
  if (!annonce?.id) return []
  const idExclu = annonce.id
  const seen = new Set([idExclu])
  const out = []

  function take(rows) {
    for (const r of rows || []) {
      if (r && !seen.has(r.id)) {
        seen.add(r.id)
        out.push(r)
        if (out.length >= limit) return true
      }
    }
    return false
  }

  if (annonce.utilisateur_id) {
    const { data, error } = await supabase
      .from('annonces')
      .select('*')
      .eq('statut', 'actif')
      .eq('utilisateur_id', annonce.utilisateur_id)
      .neq('id', idExclu)
      .order('created_at', { ascending: false })
      .limit(8)
    if (error) console.warn('[fetchAnnoncesAssocieesPourDetail]', error)
    if (take(data)) return out.slice(0, limit)
  }

  if (annonce.quartier) {
    let q = supabase
      .from('annonces')
      .select('*')
      .eq('statut', 'actif')
      .eq('quartier', annonce.quartier)
      .neq('id', idExclu)
    if (annonce.type) q = q.eq('type', annonce.type)
    const { data } = await q.order('created_at', { ascending: false }).limit(10)
    if (take(data)) return out.slice(0, limit)
  }

  const prix = Number(annonce.prix)
  if (annonce.type && prix > 0) {
    const lo = Math.floor(prix * 0.65)
    const hi = Math.ceil(prix * 1.35)
    const { data } = await supabase
      .from('annonces')
      .select('*')
      .eq('statut', 'actif')
      .eq('type', annonce.type)
      .gte('prix', lo)
      .lte('prix', hi)
      .neq('id', idExclu)
      .order('created_at', { ascending: false })
      .limit(10)
    take(data)
  }

  return out.slice(0, limit)
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
