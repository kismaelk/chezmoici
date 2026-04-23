import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyAdNr-iZzKnNpHJRrXbcGotq1932_w3Mbo",
  authDomain: "chezmoici-38dd7.firebaseapp.com",
  projectId: "chezmoici-38dd7",
  storageBucket: "chezmoici-38dd7.firebasestorage.app",
  messagingSenderId: "806811556220",
  appId: "1:806811556220:web:87c63d1fc8600f1469acf9"
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export default app