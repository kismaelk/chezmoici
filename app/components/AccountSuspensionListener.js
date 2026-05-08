'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { verifierEtDeconnecterSiSuspendu } from '@/lib/auth'

/**
 * Déconnecte l’utilisateur si `profiles.account_suspended_until` est dans le futur
 * (ex. suspension ajoutée alors qu’il était déjà connecté).
 */
export default function AccountSuspensionListener() {
  useEffect(() => {
    let cancelled = false

    const redirectSiBesoin = async () => {
      const kicked = await verifierEtDeconnecterSiSuspendu()
      if (!kicked || cancelled || typeof window === 'undefined') return
      const path = window.location.pathname || ''
      if (path.startsWith('/connexion')) return
      window.location.href = '/connexion?suspendu=1'
    }

    redirectSiBesoin()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) return
      void redirectSiBesoin()
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return null
}
