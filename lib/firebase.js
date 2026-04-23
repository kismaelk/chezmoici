'use client'

import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

/** Nettoie les valeurs .env (espaces, retour chariot Windows) */
function cleanEnv(v) {
  if (v == null || typeof v !== 'string') return ''
  return v.replace(/\r/g, '').trim()
}

function buildConfig() {
  return {
    apiKey: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
    authDomain: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
    projectId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    storageBucket: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
    appId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  }
}

function getFirebaseApp() {
  const cfg = buildConfig()
  if (!cfg.apiKey || !cfg.projectId) {
    const hint =
      'Variables NEXT_PUBLIC_FIREBASE_* introuvables. Placez .env.local à la racine du projet (à côté de package.json), puis redémarrez le serveur de dev.'
    if (typeof window !== 'undefined') {
      console.error('[Firebase]', hint)
    }
    throw new Error(hint)
  }

  if (getApps().length === 0) {
    return initializeApp(cfg)
  }
  return getApp()
}

const app = getFirebaseApp()

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export default app
