'use client'

import { useEffect, useState } from 'react'
import { observerConnexion } from '@/lib/auth'
import { fetchMesAnnonces } from '@/lib/firestoreApp'
import { useRouter } from 'next/navigation'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

export default function Stats() {
  const [annonces, setAnnonces] = useState([])
  const [chargement, setChargement] = useState(true)
  const [totaux, setTotaux] = useState({ vues: 0, actives: 0, total: 0 })
  const router = useRouter()

  useEffect(() => {
    const unsub = observerConnexion(async (user) => {
      if (!user) {
        router.push('/connexion')
        setChargement(false)
        return
      }
      const liste = await fetchMesAnnonces(user.uid)
      liste.sort((a, b) => (b.nb_vues || 0) - (a.nb_vues || 0))
      setAnnonces(liste)
      setTotaux({
        vues: liste.reduce((a, b) => a + (b.nb_vues || 0), 0),
        actives: liste.filter((a) => a.statut === 'actif').length,
        total: liste.length,
      })
      setChargement(false)
    })
    return () => unsub()
  }, [router])

  if (chargement) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-[#1B5E20] font-bold">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <SiteHeader />

      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-[#1B5E20] mb-2">
          Mes statistiques 📊
        </h1>
        <p className="text-gray-500 mb-8">Performance de vos annonces</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Vues totales', valeur: totaux.vues, emoji: '👁️' },
            { label: 'Annonces actives', valeur: totaux.actives, emoji: '✅' },
            { label: 'Annonces totales', valeur: totaux.total, emoji: '🏠' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl p-5 shadow-sm text-center"
            >
              <div className="text-3xl mb-2">{stat.emoji}</div>
              <div className="text-3xl font-bold text-[#1B5E20]">
                {stat.valeur}
              </div>
              <div className="text-gray-500 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <h2 className="text-lg font-bold text-gray-700 mb-4">
          Performance par annonce
        </h2>
        {annonces.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm text-gray-400">
            Aucune annonce publiée.
          </div>
        ) : (
          <div className="space-y-3">
            {annonces.map((annonce) => (
              <div
                key={annonce.id}
                className="bg-white rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-4"
              >
                <div className="w-full sm:w-20 h-32 sm:h-16 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                  {annonce.photos?.[0] ? (
                    <img
                      src={annonce.photos[0]}
                      alt={annonce.titre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      📷
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800 truncate">
                    {annonce.titre}
                  </h3>
                  <p className="text-gray-400 text-sm">📍 {annonce.quartier}</p>
                </div>
                <div className="flex gap-6 text-center flex-shrink-0 justify-between sm:justify-end">
                  <div>
                    <div className="text-2xl font-bold text-[#1B5E20]">
                      {annonce.nb_vues || 0}
                    </div>
                    <div className="text-gray-400 text-xs">vues</div>
                  </div>
                  <div className="flex items-center">
                    <div
                      className={`text-sm font-bold px-2 py-1 rounded-full ${
                        annonce.statut === 'actif'
                          ? 'bg-[#E8F5E9] text-[#1B5E20]'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {annonce.statut === 'actif' ? '✅ Actif' : '⏸️ Inactif'}
                    </div>
                  </div>
                </div>
                <a
                  href={`/annonces/${annonce.id}`}
                  className="text-[#1B5E20] text-sm font-bold hover:underline flex-shrink-0 text-center sm:text-left"
                >
                  Voir →
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  )
}
