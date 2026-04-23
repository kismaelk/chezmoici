'use client'

import { useEffect, useState } from 'react'
import { observerConnexion } from '@/lib/auth'
import { fetchFavorisAvecAnnonces, removeFavori } from '@/lib/firestoreApp'
import { useRouter } from 'next/navigation'
import PageVide from '@/app/components/PageVide'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

export default function Favoris() {
  const [favoris, setFavoris] = useState([])
  const [chargement, setChargement] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsub = observerConnexion(async (user) => {
      if (!user) {
        router.push('/connexion')
        setChargement(false)
        return
      }
      const data = await fetchFavorisAvecAnnonces(user.uid)
      setFavoris(data || [])
      setChargement(false)
    })
    return () => unsub()
  }, [router])

  const retirerFavori = async (id) => {
    await removeFavori(id)
    setFavoris((prev) => prev.filter((f) => f.id !== id))
  }

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

      <div className="max-w-4xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold text-[#1B5E20] mb-2">Mes favoris ❤️</h1>
        <p className="text-gray-500 mb-8">
          {favoris.length} annonce{favoris.length > 1 ? 's' : ''} sauvegardée
          {favoris.length > 1 ? 's' : ''}
        </p>

        {favoris.length === 0 ? (
          <PageVide
            emoji="❤️"
            titre={"Aucun favori pour l'instant"}
            message="Parcourez les annonces et cliquez sur le cœur pour sauvegarder vos biens préférés."
            lienRetour="/tableau-de-bord"
            labelRetour="Tableau de bord"
            lienAction="/annonces"
            labelAction="Voir les annonces"
          />
        ) : (
          <div className="space-y-4">
            {favoris.map((favori) => {
              const annonce = favori.annonces
              if (!annonce) return null
              return (
                <div
                  key={favori.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col sm:flex-row"
                >
                  <div className="w-full sm:w-36 h-40 sm:h-32 bg-gray-200 flex-shrink-0">
                    {annonce.photos?.[0] ? (
                      <img
                        src={annonce.photos[0]}
                        alt={annonce.titre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
                        📷
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-4">
                    <h3 className="font-bold text-gray-800 mb-1">{annonce.titre}</h3>
                    <p className="text-gray-400 text-sm mb-1">📍 {annonce.quartier}, Abidjan</p>
                    <p className="text-[#F9A825] font-bold mb-3">
                      {annonce.prix?.toLocaleString()} FCFA
                      {annonce.type === 'location' && (
                        <span className="text-gray-400 text-xs font-normal"> / mois</span>
                      )}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <a
                        href={`/annonces/${annonce.id}`}
                        className="bg-[#1B5E20] text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-green-800"
                      >
                        Voir
                      </a>
                      <button
                        type="button"
                        onClick={() => retirerFavori(favori.id)}
                        className="text-red-400 border border-red-200 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-red-50"
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  )
}
