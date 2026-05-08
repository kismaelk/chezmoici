'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { estCompteSuspenduJusqua } from '@/lib/accountSuspension'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        router.replace('/connexion')
        return
      }
      const { data: profil } = await supabase
        .from('profiles')
        .select('account_suspended_until')
        .eq('id', session.user.id)
        .maybeSingle()
      if (estCompteSuspenduJusqua(profil?.account_suspended_until)) {
        await supabase.auth.signOut()
        router.replace('/connexion?suspendu=1')
        return
      }
      await supabase
        .from('profiles')
        .upsert(
          {
            id: session.user.id,
            email: session.user.email,
            nom: session.user.user_metadata?.full_name || session.user.user_metadata?.nom || session.user.email?.split('@')[0] || 'Utilisateur',
            badge: 'bronze',
            type: 'particulier',
            account_status: 'en_attente',
          },
          { onConflict: 'id', ignoreDuplicates: true }
        )
      router.replace('/tableau-de-bord')
    })
  }, [router])

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <div className="text-[#1B5E20] font-bold text-lg">Connexion en cours...</div>
    </div>
  )
}
