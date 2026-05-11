'use client'

import { useLayoutEffect } from 'react'
import { startHeaderAuthListener } from '@/lib/headerAuthStore'

/** Un abonnement auth global pour alimenter le header (évite flash déconnecté entre pages). */
export default function HeaderAuthSubscriber() {
  useLayoutEffect(() => {
    const unsub = startHeaderAuthListener()
    return () => unsub()
  }, [])
  return null
}
