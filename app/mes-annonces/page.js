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
  const statutAnnonceLabel = {
    actif: { text: 'En ligne', cls: 'bg-green-100 text-green-800' },
    en_verification: { text: 'En vérification (30 min – 24 h)', cls: 'bg-amber-100 text-amber-900' },
    pause: { text: 'En pause', cls: 'bg-slate-100 text-slate-700' },
    suspendu: { text: 'Suspendu', cls: 'bg-red-100 text-red-800' },
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

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1B5E20] sm:text-3xl">Mes annonces</h1>
            <p className="mt-1 text-gray-500">
              {annonces.length} annonce{annonces.length > 1 ? 's' : ''} publiée
              {annonces.length > 1 ? 's' : ''}
            </p>
          </div>
          <a
            href="/publier"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#1B5E20] px-5 py-3 text-center font-bold text-white hover:bg-green-800"
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
              <div key={annonce.id} className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                <div className="flex flex-col sm:flex-row">
                  <div className="h-48 w-full shrink-0 bg-gray-200 sm:h-auto sm:w-48 sm:min-h-[10rem]">
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

                  <div className="flex-1 p-4 sm:p-5">
                    <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-gray-800">{annonce.titre}</h3>
                        <p className="text-sm text-gray-500">📍 {annonce.quartier}, Abidjan</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span
                          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${
                            statutAnnonceLabel[annonce.statut]?.cls || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {statutAnnonceLabel[annonce.statut]?.text || annonce.statut || '—'}
                        </span>
                        <span className="inline-flex w-fit rounded-full bg-[#E8F5E9] px-3 py-1 text-xs font-bold text-[#1B5E20]">
                          {badgeLabel[annonce.badge] || '🔓 Bronze'}
                        </span>
                      </div>
                    </div>

                    <p className="text-[#F9A825] font-bold text-xl mb-3">
                      {annonce.prix?.toLocaleString()} FCFA
                      {annonce.type === 'location' && (
                        <span className="text-gray-400 text-sm font-normal"> / mois</span>
                      )}
                    </p>

                    <p className="text-gray-500 text-sm line-clamp-2 mb-4">{annonce.description}</p>

                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
                      <a
                        href={`/annonces/${annonce.id}`}
                        className="rounded-lg border border-[#1B5E20] px-4 py-2.5 text-center text-sm font-bold text-[#1B5E20] hover:bg-[#E8F5E9] sm:py-2"
                      >
                        Voir
                      </a>
                      <a
                        href={`/modifier/${annonce.id}`}
                        className="rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-bold text-gray-600 hover:bg-gray-50 sm:py-2"
                      >
                        Modifier
                      </a>
                      <button
                        type="button"
                        onClick={() => supprimerAnnonce(annonce.id)}
                        className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 sm:py-2"
                      >
                        Supprimer
                      </button>
                      <a
                        href="/badge"
                        className="rounded-lg bg-[#F9A825] px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-yellow-600 sm:ml-auto sm:py-2"
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
