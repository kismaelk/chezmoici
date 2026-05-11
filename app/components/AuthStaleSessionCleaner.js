'use client'

import { useEffect } from 'react'
import { deconnecterSiSessionCorrompue } from '@/lib/auth'

/** Au chargement : si le stockage local contient un refresh token invalide, déconnexion silencieuse. */
export default function AuthStaleSessionCleaner() {
  useEffect(() => {
    void deconnecterSiSessionCorrompue()
  }, [])
  return null
}
