'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase
          .from('profiles')
          .upsert(
            {
              id: session.user.id,
              email: session.user.email,
              nom: session.user.user_metadata?.full_name || session.user.user_metadata?.nom || session.user.email?.split('@')[0] || 'Utilisateur',
              badge: 'bronze',
              type: 'particulier',
            },
            { onConflict: 'id', ignoreDuplicates: true }
          )
          .then(() => router.replace('/tableau-de-bord'))
      } else {
        router.replace('/connexion')
      }
    })
  }, [router])

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <div className="text-[#1B5E20] font-bold text-lg">Connexion en cours...</div>
    </div>
  )
}
