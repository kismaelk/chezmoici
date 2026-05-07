'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'
import { observerConnexion } from '@/lib/auth'
import { fetchMesAvisModeres } from '@/lib/firestoreApp'

export default function MesAvisModeresPage() {
  const [uid, setUid] = useState(null)
  const [avis, setAvis] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsub = observerConnexion((user) => {
      if (!user) {
        router.push('/connexion?redirect=/mes-avis-moderes')
        return
      }
      setUid(user.uid)
    })
    return () => unsub()
  }, [router])

  useEffect(() => {
    if (!uid) return
    ;(async () => {
      try {
        setAvis(await fetchMesAvisModeres(uid))
      } catch {
        setAvis([])
      }
      setLoading(false)
    })()
  }, [uid])

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <SiteHeader />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800">Mes avis modérés</h1>
        <p className="text-sm text-gray-500 mt-1">
          Avis masqués par l’équipe de modération, avec motif et date.
        </p>

        <div className="mt-6 space-y-3">
          {loading && (
            <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-100">
              Chargement...
            </div>
          )}
          {!loading && avis.length === 0 && (
            <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-100">
              Aucun avis masqué pour le moment.
            </div>
          )}
          {!loading && avis.map((a) => (
            <div key={a.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="font-bold text-gray-800">
                {'⭐'.repeat(Math.max(1, a.note || 0))} · {a.annonce_titre || a.annonce_id}
              </p>
              {a.commentaire && (
                <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{a.commentaire}</p>
              )}
              {a.hidden_reason && (
                <p className="text-sm text-amber-700 mt-2">Motif : {a.hidden_reason}</p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                Masqué le {a.hidden_at ? new Date(a.hidden_at).toLocaleString('fr-FR') : '—'}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-900">
            Vous souhaitez contester une modération ?
          </p>
          <div className="mt-2 flex gap-2">
            <Link href="/contact" className="text-sm font-bold text-[#1B5E20] hover:underline">
              Contacter le support
            </Link>
            <span className="text-sm text-emerald-700">·</span>
            <Link href="/messages" className="text-sm font-bold text-[#1B5E20] hover:underline">
              Ouvrir les messages
            </Link>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  )
}
