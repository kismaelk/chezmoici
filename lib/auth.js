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

/** Inscription email + document profil Firestore */
export async function inscrireAvecEmail(email, motDePasse, infos) {
  const { user } = await createUserWithEmailAndPassword(auth, email, motDePasse)

  await updateProfile(user, { displayName: infos.nom })

  await setDoc(doc(db, 'profiles', user.uid), {
    id: user.uid,
    email: user.email,
    nom: infos.nom,
    type: infos.type,
    telephone: infos.telephone || '',
    quartier: infos.quartier || '',
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
    await setDoc(profilRef, {
      id: user.uid,
      email: user.email,
      nom: user.displayName || '',
      type: 'locataire',
      telephone: '',
      quartier: '',
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
