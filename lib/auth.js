'use client'

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

function nomCompletDepuis(infos) {
  const p = (infos.prenom || '').trim()
  const n = (infos.nom || '').trim()
  return [p, n].filter(Boolean).join(' ').trim()
}

/** Inscription email + document profil Firestore */
export async function inscrireAvecEmail(email, motDePasse, infos) {
  const { user } = await createUserWithEmailAndPassword(auth, email, motDePasse)

  const nomComplet = nomCompletDepuis(infos)
  await updateProfile(user, { displayName: nomComplet || user.email?.split('@')[0] || 'Utilisateur' })

  await setDoc(doc(db, 'profiles', user.uid), {
    id: user.uid,
    email: user.email,
    prenom: (infos.prenom || '').trim(),
    nomFamille: (infos.nom || '').trim(),
    nom: nomComplet || (infos.prenom || '').trim() || (infos.nom || '').trim(),
    type: infos.type,
    telephone: infos.telephone || '',
    quartier: infos.quartier || '',
    dateNaissance: infos.dateNaissance || '',
    numeroCni: infos.numeroCni || '',
    objectifPrincipal: infos.objectifPrincipal || '',
    badge: 'bronze',
    createdAt: serverTimestamp(),
  })

  return user
}

/** Connexion email */
export async function connecterAvecEmail(email, motDePasse) {
  const { user } = await signInWithEmailAndPassword(auth, email, motDePasse)
  return user
}

/** Connexion Google (+ profil si nouveau compte) */
export async function connecterAvecGoogle() {
  const provider = new GoogleAuthProvider()
  const { user } = await signInWithPopup(auth, provider)

  const profilRef = doc(db, 'profiles', user.uid)
  const profilSnap = await getDoc(profilRef)

  if (!profilSnap.exists) {
    const display = (user.displayName || '').trim()
    const parts = display.split(/\s+/).filter(Boolean)
    const prenom = parts[0] || ''
    const nomFamille = parts.slice(1).join(' ')
    const nomComplet = display || user.email?.split('@')[0] || 'Utilisateur'
    await setDoc(profilRef, {
      id: user.uid,
      email: user.email,
      prenom,
      nomFamille,
      nom: nomComplet,
      type: 'particulier',
      telephone: '',
      quartier: '',
      dateNaissance: '',
      numeroCni: '',
      objectifPrincipal: '',
      badge: 'bronze',
      createdAt: serverTimestamp(),
    })
  }

  return user
}

export async function deconnecter() {
  await signOut(auth)
}

export async function reinitialiserMotDePasse(email) {
  await sendPasswordResetEmail(auth, email)
}

export function observerConnexion(callback) {
  return onAuthStateChanged(auth, callback)
}

export async function getProfil(uid) {
  const snap = await getDoc(doc(db, 'profiles', uid))
  return snap.exists ? snap.data() : null
}
