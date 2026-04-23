'use client'

import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  writeBatch,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'

/** Normalise un document Firestore (id + timestamps → ISO) */
export function normalizeDoc(docSnap) {
  if (!docSnap.exists) return null
  const data = docSnap.data()
  const row = { id: docSnap.id, ...data }
  for (const k of ['created_at', 'createdAt']) {
    const v = row[k]
    if (v && typeof v.toDate === 'function') row[k] = v.toDate().toISOString()
  }
  return row
}

function timeMs(row) {
  const c = row.created_at || row.createdAt
  if (!c) return 0
  if (typeof c === 'string') return new Date(c).getTime()
  if (c?.seconds != null) return c.seconds * 1000
  return 0
}

/** Liste annonces actives + filtres (partiellement en mémoire pour éviter trop d’index composites) */
export async function fetchAnnoncesList(filtres, tri) {
  const q = query(collection(db, 'annonces'), where('statut', '==', 'actif'))
  const snap = await getDocs(q)
  let list = snap.docs.map((d) => normalizeDoc(d)).filter(Boolean)

  if (filtres.type) list = list.filter((a) => a.type === filtres.type)
  if (filtres.quartier) list = list.filter((a) => a.quartier === filtres.quartier)
  if (filtres.prixMin) list = list.filter((a) => (a.prix || 0) >= parseInt(filtres.prixMin, 10))
  if (filtres.prixMax) list = list.filter((a) => (a.prix || 0) <= parseInt(filtres.prixMax, 10))
  if (filtres.nbPieces) list = list.filter((a) => Number(a.nb_pieces) === parseInt(filtres.nbPieces, 10))
  if (filtres.meuble === 'true') list = list.filter((a) => a.meuble === true)
  if (filtres.meuble === 'false') list = list.filter((a) => a.meuble === false)
  if (filtres.badge) list = list.filter((a) => a.badge === filtres.badge)
  if (filtres.surfaceMin) list = list.filter((a) => (a.surface || 0) >= parseInt(filtres.surfaceMin, 10))
  if (filtres.nbChambres !== '' && filtres.nbChambres != null) {
    list = list.filter((a) => Number(a.nb_chambres) === parseInt(filtres.nbChambres, 10))
  }
  if (filtres.typePropriete) list = list.filter((a) => a.type_propriete === filtres.typePropriete)
  if (filtres.typeService) list = list.filter((a) => a.type_service === filtres.typeService)
  if (filtres.disponibilite) list = list.filter((a) => a.disponibilite === filtres.disponibilite)

  if (filtres.recherche?.trim()) {
    const s = filtres.recherche.trim().toLowerCase()
    list = list.filter(
      (a) =>
        (a.titre || '').toLowerCase().includes(s) ||
        (a.description || '').toLowerCase().includes(s)
    )
  }

  if (tri === 'recent') list.sort((a, b) => timeMs(b) - timeMs(a))
  else if (tri === 'prixCroissant') list.sort((a, b) => (a.prix || 0) - (b.prix || 0))
  else if (tri === 'prixDecroissant') list.sort((a, b) => (b.prix || 0) - (a.prix || 0))
  else if (tri === 'populaire') list.sort((a, b) => (b.nb_vues || 0) - (a.nb_vues || 0))
  else list.sort((a, b) => timeMs(b) - timeMs(a))

  return list
}

export async function getAnnonceById(id) {
  const d = await getDoc(doc(db, 'annonces', id))
  return normalizeDoc(d)
}

export async function incrementAnnonceVues(id) {
  await updateDoc(doc(db, 'annonces', id), { nb_vues: increment(1) })
}

export async function createAnnonce(payload) {
  const refDoc = await addDoc(collection(db, 'annonces'), {
    ...payload,
    created_at: serverTimestamp(),
    nb_vues: payload.nb_vues ?? 0,
  })
  return refDoc.id
}

export async function updateAnnonce(id, data) {
  await updateDoc(doc(db, 'annonces', id), data)
}

export async function deleteAnnonce(id) {
  await deleteDoc(doc(db, 'annonces', id))
}

export async function fetchMesAnnonces(uid) {
  const q = query(collection(db, 'annonces'), where('utilisateur_id', '==', uid))
  const snap = await getDocs(q)
  const list = snap.docs.map((d) => normalizeDoc(d)).filter(Boolean)
  list.sort((a, b) => timeMs(b) - timeMs(a))
  return list
}

/** Annonces actives publiées par un utilisateur (profil public) */
export async function fetchAnnoncesActivesForUser(uid) {
  const q = query(collection(db, 'annonces'), where('utilisateur_id', '==', uid))
  const snap = await getDocs(q)
  const list = snap.docs
    .map((d) => normalizeDoc(d))
    .filter(Boolean)
    .filter((a) => a.statut === 'actif')
  list.sort((a, b) => timeMs(b) - timeMs(a))
  return list
}

export async function uploadPhotoChemin(chemin, file) {
  const r = ref(storage, chemin)
  await uploadBytes(r, file)
  return getDownloadURL(r)
}

/** Profil Firestore */
export async function getProfilFirestore(uid) {
  const d = await getDoc(doc(db, 'profiles', uid))
  return normalizeDoc(d)
}

export async function upsertProfilFirestore(uid, data) {
  await setDoc(doc(db, 'profiles', uid), { id: uid, ...data }, { merge: true })
}

/** Favoris — id déterministe pour éviter les doublons */
export function favoriDocId(uid, annonceId) {
  return `${uid}_${annonceId}`
}

export async function fetchFavorisAvecAnnonces(uid) {
  const q = query(collection(db, 'favoris'), where('utilisateur_id', '==', uid))
  const snap = await getDocs(q)
  const favoris = []
  for (const d of snap.docs) {
    const f = normalizeDoc(d)
    if (!f?.annonce_id) continue
    const ann = await getAnnonceById(f.annonce_id)
    if (ann) favoris.push({ id: f.id, ...f, annonces: ann })
  }
  favoris.sort((a, b) => timeMs(b) - timeMs(a))
  return favoris
}

export async function findFavori(uid, annonceId) {
  const id = favoriDocId(uid, annonceId)
  const d = await getDoc(doc(db, 'favoris', id))
  if (!d.exists) return null
  return normalizeDoc(d)
}

export async function addFavori(uid, annonceId) {
  const id = favoriDocId(uid, annonceId)
  await setDoc(doc(db, 'favoris', id), {
    utilisateur_id: uid,
    annonce_id: annonceId,
    created_at: serverTimestamp(),
  })
  return id
}

export async function removeFavori(favoriDocIdValue) {
  await deleteDoc(doc(db, 'favoris', favoriDocIdValue))
}

/** Messages */
export async function fetchMessagesForPair(uid, otherId) {
  const q1 = query(
    collection(db, 'messages'),
    where('sender_id', '==', uid),
    where('receiver_id', '==', otherId)
  )
  const q2 = query(
    collection(db, 'messages'),
    where('sender_id', '==', otherId),
    where('receiver_id', '==', uid)
  )
  const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)])
  const all = [...s1.docs, ...s2.docs].map((d) => normalizeDoc(d)).filter(Boolean)
  all.sort((a, b) => timeMs(a) - timeMs(b))
  return all
}

export async function sendMessageFirestore({ sender_id, receiver_id, content, annonce_id }) {
  await addDoc(collection(db, 'messages'), {
    sender_id,
    receiver_id,
    content,
    annonce_id: annonce_id || null,
    created_at: serverTimestamp(),
  })
}

export async function fetchAllMessagesForUser(uid) {
  const [s1, s2] = await Promise.all([
    getDocs(query(collection(db, 'messages'), where('sender_id', '==', uid))),
    getDocs(query(collection(db, 'messages'), where('receiver_id', '==', uid))),
  ])
  const map = new Map()
  for (const d of [...s1.docs, ...s2.docs]) {
    const m = normalizeDoc(d)
    if (!m) continue
    const other = m.sender_id === uid ? m.receiver_id : m.sender_id
    if (!map.has(other) || timeMs(m) > timeMs(map.get(other))) {
      map.set(other, m)
    }
  }
  return Array.from(map.entries()).map(([otherUserId, lastMsg]) => ({
    otherUserId,
    lastMsg,
  }))
}

/** Réagit aux nouveaux messages pour rafraîchir la liste des conversations */
export function listenUserConversationsSummary(uid, callback) {
  const q1 = query(collection(db, 'messages'), where('receiver_id', '==', uid))
  const q2 = query(collection(db, 'messages'), where('sender_id', '==', uid))
  const run = () => {
    fetchAllMessagesForUser(uid).then(callback)
  }
  const u1 = onSnapshot(q1, run)
  const u2 = onSnapshot(q2, run)
  return () => {
    u1()
    u2()
  }
}

export function listenPairMessages(uid, otherId, callback) {
  const q1 = query(
    collection(db, 'messages'),
    where('sender_id', '==', uid),
    where('receiver_id', '==', otherId)
  )
  const q2 = query(
    collection(db, 'messages'),
    where('sender_id', '==', otherId),
    where('receiver_id', '==', uid)
  )
  const run = async () => {
    const msgs = await fetchMessagesForPair(uid, otherId)
    callback(msgs)
  }
  const u1 = onSnapshot(q1, run)
  const u2 = onSnapshot(q2, run)
  return () => {
    u1()
    u2()
  }
}

/** Notifications */
export async function fetchNotifications(uid) {
  const q = query(
    collection(db, 'notifications'),
    where('utilisateur_id', '==', uid),
    orderBy('created_at', 'desc'),
    limit(20)
  )
  try {
    const snap = await getDocs(q)
    return snap.docs.map((d) => normalizeDoc(d)).filter(Boolean)
  } catch {
    const snap = await getDocs(
      query(collection(db, 'notifications'), where('utilisateur_id', '==', uid), limit(50))
    )
    const list = snap.docs.map((d) => normalizeDoc(d)).filter(Boolean)
    list.sort((a, b) => timeMs(b) - timeMs(a))
    return list.slice(0, 20)
  }
}

export function listenNotifications(uid, callback) {
  const q = query(
    collection(db, 'notifications'),
    where('utilisateur_id', '==', uid),
    orderBy('created_at', 'desc'),
    limit(20)
  )
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => normalizeDoc(d)).filter(Boolean))
    },
    () => {
      fetchNotifications(uid).then(callback)
    }
  )
}

export async function addNotification(data) {
  await addDoc(collection(db, 'notifications'), {
    ...data,
    created_at: serverTimestamp(),
    lu: data.lu ?? false,
  })
}

export async function markAllNotificationsRead(uid) {
  const snap = await getDocs(
    query(collection(db, 'notifications'), where('utilisateur_id', '==', uid))
  )
  const batch = writeBatch(db)
  let n = 0
  for (const d of snap.docs) {
    if (d.data().lu) continue
    batch.update(d.ref, { lu: true })
    n += 1
    if (n >= 450) break
  }
  if (n) await batch.commit()
}

/** Avis */
export async function fetchAvisForAnnonce(annonceId) {
  const snap = await getDocs(
    query(collection(db, 'avis'), where('annonce_id', '==', annonceId))
  )
  const list = []
  for (const d of snap.docs) {
    const a = normalizeDoc(d)
    if (!a) continue
    const prof = a.auteur_id ? await getProfilFirestore(a.auteur_id) : null
    list.push({ ...a, profiles: prof ? { nom: prof.nom } : null })
  }
  list.sort((a, b) => timeMs(b) - timeMs(a))
  return list
}

export async function addAvis(data) {
  await addDoc(collection(db, 'avis'), {
    ...data,
    created_at: serverTimestamp(),
  })
}

/** Collections utilitaires */
export async function addContactMessage(data) {
  await addDoc(collection(db, 'messages_contact'), {
    ...data,
    created_at: serverTimestamp(),
  })
}

export async function addDemandeBadge(data) {
  await addDoc(collection(db, 'demandes_badge'), {
    ...data,
    statut: data.statut ?? 'en_attente',
    created_at: serverTimestamp(),
  })
}

export async function fetchMesDemandesBadge(uid) {
  const q = query(collection(db, 'demandes_badge'), where('utilisateur_id', '==', uid))
  const snap = await getDocs(q)
  const list = snap.docs.map((d) => normalizeDoc(d)).filter(Boolean)
  list.sort((a, b) => timeMs(b) - timeMs(a))
  return list
}

export async function fetchAllDemandesBadgeAdmin() {
  const snap = await getDocs(collection(db, 'demandes_badge'))
  const list = snap.docs.map((d) => normalizeDoc(d)).filter(Boolean)
  list.sort((a, b) => timeMs(b) - timeMs(a))
  for (const d of list) {
    if (d.utilisateur_id) {
      const p = await getProfilFirestore(d.utilisateur_id)
      d.profiles = p ? { nom: p.nom } : null
    }
    if (d.annonce_id) {
      const a = await getAnnonceById(d.annonce_id)
      d.annonce_titre = a?.titre || null
    }
  }
  return list
}

export async function updateDemandeBadge(id, data) {
  await updateDoc(doc(db, 'demandes_badge', id), {
    ...data,
    updated_at: serverTimestamp(),
  })
}

/** Signalements annonces (modération) */
export async function addSignalement(data) {
  await addDoc(collection(db, 'signalements'), {
    ...data,
    statut: 'en_attente',
    created_at: serverTimestamp(),
  })
}

export async function fetchAllSignalementsAdmin() {
  const snap = await getDocs(collection(db, 'signalements'))
  const list = snap.docs.map((d) => normalizeDoc(d)).filter(Boolean)
  list.sort((a, b) => timeMs(b) - timeMs(a))
  for (const s of list) {
    if (s.signalant_uid) {
      const p = await getProfilFirestore(s.signalant_uid)
      s.profiles = p ? { nom: p.nom } : null
    }
    if (s.annonce_id) {
      const a = await getAnnonceById(s.annonce_id)
      s.annonce_titre = a?.titre || null
    }
  }
  return list
}

export async function updateSignalement(id, data) {
  await updateDoc(doc(db, 'signalements', id), {
    ...data,
    updated_at: serverTimestamp(),
  })
}

/** Admin */
export async function fetchAllProfiles() {
  const snap = await getDocs(collection(db, 'profiles'))
  return snap.docs.map((d) => normalizeDoc(d)).filter(Boolean)
}

export async function fetchAllAnnoncesAdmin() {
  const snap = await getDocs(collection(db, 'annonces'))
  const list = snap.docs.map((d) => normalizeDoc(d)).filter(Boolean)
  for (const a of list) {
    if (a.utilisateur_id) {
      const p = await getProfilFirestore(a.utilisateur_id)
      a.profiles = p ? { nom: p.nom } : null
    }
  }
  return list
}

export async function updateProfileField(uid, data) {
  await updateDoc(doc(db, 'profiles', uid), data)
}

/** Ajoute { profiles: { nom, badge } } pour l’affichage des cartes */
/** Messages reçus (demandes / contacts liés à une annonce) */
export async function fetchDemandesRecues(uid) {
  const snap = await getDocs(
    query(collection(db, 'messages'), where('receiver_id', '==', uid))
  )
  const list = snap.docs.map((d) => normalizeDoc(d)).filter(Boolean)
  list.sort((a, b) => timeMs(b) - timeMs(a))
  for (const m of list) {
    if (m.annonce_id) {
      m.annonces = await getAnnonceById(m.annonce_id)
    }
    if (m.sender_id) {
      const p = await getProfilFirestore(m.sender_id)
      m.profiles = p ? { nom: p.nom } : null
    }
  }
  return list
}

export async function enrichAnnoncesWithProfiles(annonces) {
  const cache = {}
  const out = []
  for (const a of annonces) {
    const uid = a.utilisateur_id
    if (!uid) {
      out.push({ ...a, profiles: null })
      continue
    }
    if (cache[uid] === undefined) {
      const p = await getProfilFirestore(uid)
      cache[uid] = p ? { nom: p.nom, badge: p.badge } : null
    }
    out.push({ ...a, profiles: cache[uid] })
  }
  return out
}
