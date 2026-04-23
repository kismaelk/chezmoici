import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore, doc, getDoc } from 'firebase/firestore'

function env(name) {
  const v = process.env[name]
  if (v == null || typeof v !== 'string') return ''
  return v.replace(/\r/g, '').trim()
}

function getFirebaseApp() {
  const cfg = {
    apiKey: env('NEXT_PUBLIC_FIREBASE_API_KEY'),
    authDomain: env('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId: env('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
    storageBucket: env('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: env('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
    appId: env('NEXT_PUBLIC_FIREBASE_APP_ID'),
  }
  if (!cfg.apiKey || !cfg.projectId) return null
  if (getApps().length === 0) return initializeApp(cfg)
  return getApp()
}

/** Lecture Firestore côté serveur (métadonnées SEO), sans « use client » */
export async function getAnnonceForMetadata(id) {
  const app = getFirebaseApp()
  if (!app || !id) return null
  const db = getFirestore(app)
  try {
    const d = await getDoc(doc(db, 'annonces', id))
    if (!d.exists) return null
    return { id: d.id, ...d.data() }
  } catch {
    return null
  }
}
