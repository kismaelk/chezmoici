'use client'

import { useCallback, useEffect, useState } from 'react'
import { observerConnexion } from '@/lib/auth'
import { fetchDemandesRecues } from '@/lib/firestoreApp'
import { useRouter } from 'next/navigation'
import PageVide from '@/app/components/PageVide'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

export default function Demandes() {
  const [demandes, setDemandes] = useState([])
  const [chargement, setChargement] = useState(true)
  const router = useRouter()

  const chargerDemandes = useCallback(async (uid) => {
    const data = await fetchDemandesRecues(uid)
    setDemandes(data || [])
    setChargement(false)
  }, [])

  useEffect(() => {
    const unsub = observerConnexion((user) => {
      if (!user) {
        router.push('/connexion')
        setChargement(false)
        return
      }
      chargerDemandes(user.uid)
    })
    return () => unsub()
  }, [router, chargerDemandes])

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
          Mes demandes reçues
        </h1>
        <p className="text-gray-500 mb-8">
          {demandes.length} demande{demandes.length > 1 ? 's' : ''} reçue
          {demandes.length > 1 ? 's' : ''}
        </p>

        {demandes.length === 0 ? (
          <PageVide
            emoji="📬"
            titre={"Aucune demande reçue pour l'instant"}
            message="Quand des locataires ou acheteurs vous contacteront via vos annonces, leurs messages apparaîtront ici."
            lienRetour="/tableau-de-bord"
            labelRetour="Tableau de bord"
            lienAction="/publier"
            labelAction="Publier une annonce"
          />
        ) : (
          <div className="space-y-4">
            {demandes.map((demande) => (
              <div
                key={demande.id}
                className={`bg-white rounded-xl p-5 shadow-sm border ${!demande.lu ? 'border-[#1B5E20]' : 'border-gray-100'}`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-14 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                    {demande.annonces?.photos?.[0] ? (
                      <img
                        src={demande.annonces.photos[0]}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        📷
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-gray-800">
                        {demande.profiles?.nom || 'Utilisateur'}
                      </p>
                      {!demande.lu && (
                        <span className="bg-[#E8F5E9] text-[#1B5E20] text-xs px-2 py-1 rounded-full font-bold">
                          Nouveau
                        </span>
                      )}
                    </div>
                    <p className="text-[#1B5E20] text-xs mb-2">
                      📋 {demande.annonces?.titre || 'Annonce supprimée'}
                    </p>
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {demande.content || demande.contenu}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <a
                    href="/messages"
                    className="bg-[#1B5E20] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-800"
                  >
                    💬 Répondre
                  </a>
                  {demande.annonces && (
                    <a
                      href={`/annonces/${demande.annonce_id}`}
                      className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50"
                    >
                      Voir l&apos;annonce
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  )
}
