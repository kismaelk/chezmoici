'use client'
import { useEffect, useState } from 'react'
import { observerConnexion } from '@/lib/auth'
import { fetchMesAnnonces, deleteAnnonce } from '@/lib/firestoreApp'
import { useRouter } from 'next/navigation'
import PageVide from '@/app/components/PageVide'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

export default function MesAnnonces() {
  const [annonces, setAnnonces] = useState([])
  const [chargement, setChargement] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsub = observerConnexion(async (user) => {
      if (!user) {
        router.push('/connexion')
        setChargement(false)
        return
      }
      const data = await fetchMesAnnonces(user.uid)
      setAnnonces(data || [])
      setChargement(false)
    })
    return () => unsub()
  }, [router])

  const supprimerAnnonce = async (id) => {
    if (!confirm('Supprimer cette annonce ?')) return
    await deleteAnnonce(id)
    setAnnonces((prev) => prev.filter((a) => a.id !== id))
  }

  const badgeLabel = { bronze: '🔓 Bronze', argent: '🥈 Argent', or: '🥇 Or' }

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

      <div className="max-w-4xl mx-auto py-10 px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1B5E20]">Mes annonces</h1>
            <p className="text-gray-500 mt-1">
              {annonces.length} annonce{annonces.length > 1 ? 's' : ''} publiée
              {annonces.length > 1 ? 's' : ''}
            </p>
          </div>
          <a
            href="/publier"
            className="bg-[#1B5E20] text-white px-5 py-3 rounded-xl font-bold hover:bg-green-800"
          >
            + Nouvelle annonce
          </a>
        </div>

        {annonces.length === 0 ? (
          <PageVide
            emoji="🏠"
            titre="Aucune annonce publiée"
            message={
              "Vous n'avez pas encore publié d'annonce. Créez votre première annonce pour la rendre visible par des milliers de personnes."
            }
            lienRetour="/tableau-de-bord"
            labelRetour="Tableau de bord"
            lienAction="/publier"
            labelAction="Publier une annonce"
          />
        ) : (
          <div className="space-y-4">
            {annonces.map((annonce) => (
              <div key={annonce.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex">
                  <div className="w-48 h-40 bg-gray-200 flex-shrink-0">
                    {annonce.photos && annonce.photos[0] ? (
                      <img
                        src={annonce.photos[0]}
                        alt={annonce.titre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl">
                        📷
                      </div>
                    )}
                  </div>

                  <div className="flex-1 p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">{annonce.titre}</h3>
                        <p className="text-gray-500 text-sm">📍 {annonce.quartier}, Abidjan</p>
                      </div>
                      <span className="text-sm bg-[#E8F5E9] text-[#1B5E20] px-3 py-1 rounded-full font-bold">
                        {badgeLabel[annonce.badge] || '🔓 Bronze'}
                      </span>
                    </div>

                    <p className="text-[#F9A825] font-bold text-xl mb-3">
                      {annonce.prix?.toLocaleString()} FCFA
                      {annonce.type === 'location' && (
                        <span className="text-gray-400 text-sm font-normal"> / mois</span>
                      )}
                    </p>

                    <p className="text-gray-500 text-sm line-clamp-2 mb-4">{annonce.description}</p>

                    <div className="flex gap-3 flex-wrap">
                      <a
                        href={`/annonces/${annonce.id}`}
                        className="text-[#1B5E20] border border-[#1B5E20] px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#E8F5E9]"
                      >
                        Voir
                      </a>
                      <a
                        href={`/modifier/${annonce.id}`}
                        className="text-gray-600 border border-gray-300 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50"
                      >
                        Modifier
                      </a>
                      <button
                        type="button"
                        onClick={() => supprimerAnnonce(annonce.id)}
                        className="text-red-500 border border-red-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-50"
                      >
                        Supprimer
                      </button>
                      <a
                        href="/badge"
                        className="bg-[#F9A825] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-yellow-600 ml-auto"
                      >
                        ✅ Demander badge vérifié
                      </a>
                    </div>
                  </div>
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
