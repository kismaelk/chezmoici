'use client'

import { useEffect, useState } from 'react'
import {
  getProfilFirestore,
  fetchAnnoncesActivesForUser,
} from '@/lib/firestoreApp'
import { useParams, useRouter } from 'next/navigation'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

export default function ProfilPublicClient() {
  const [profil, setProfil] = useState(null)
  const [annonces, setAnnonces] = useState([])
  const [chargement, setChargement] = useState(true)
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    async function chargerProfil() {
      if (!params.id) {
        router.replace('/artisans')
        return
      }
      let row = null
      try {
        row = await getProfilFirestore(params.id)
      } catch {
        router.push('/annonces')
        return
      }

      if (!row) {
        router.push('/annonces')
        return
      }
      setProfil(row)

      try {
        const liste = await fetchAnnoncesActivesForUser(params.id)
        setAnnonces(liste)
      } catch {
        setAnnonces([])
      }
      setChargement(false)
    }

    chargerProfil()
  }, [params.id, router])

  const nomAffiche =
    [profil?.prenom, profil?.nom_famille].filter(Boolean).join(' ').trim() || profil?.nom || ''

  const typeLabel = {
    particulier: '🔍 Particulier',
    locataire: '🔍 Particulier',
    proprietaire: '🏠 Propriétaire',
    agence: '🏢 Agence immobilière',
    artisan: '🔧 Artisan / Prestataire',
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

      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-xl p-6 shadow-sm mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-[#E8F5E9] flex items-center justify-center flex-shrink-0">
            {profil?.photo_url ? (
              <img
                src={profil.photo_url}
                alt={nomAffiche || ''}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[#1B5E20] font-bold text-4xl">
                {(profil?.prenom?.[0] || profil?.nom?.[0] || '?').toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">
              {nomAffiche || 'Utilisateur'}
            </h1>
            <p className="text-gray-500 mb-2">
              {typeLabel[profil.type] || '—'}
            </p>
            <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
              <span className="bg-[#E8F5E9] text-[#1B5E20] px-3 py-1 rounded-full text-sm font-bold">
                {badgeLabel[profil.badge] || '🔓 Bronze'}
              </span>
              {profil.quartier && (
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                  📍 {profil.quartier}
                </span>
              )}
              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                {annonces.length} annonce{annonces.length > 1 ? 's' : ''} active
                {annonces.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-bold text-[#1B5E20] mb-4">
          Annonces de {profil?.prenom || profil?.nom?.split(' ')[0] || 'ce membre'}
        </h2>

        {annonces.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm text-gray-400">
            Aucune annonce active pour le moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {annonces.map((annonce) => (
              <a
                key={annonce.id}
                href={`/annonces/${annonce.id}`}
                className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md border border-gray-100 flex"
              >
                <div className="w-32 h-28 bg-gray-200 flex-shrink-0">
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
                <div className="p-4 flex-1">
                  <h3 className="font-bold text-gray-800 text-sm line-clamp-1 mb-1">
                    {annonce.titre}
                  </h3>
                  <p className="text-gray-400 text-xs mb-1">📍 {annonce.quartier}</p>
                  <p className="text-[#F9A825] font-bold text-sm">
                    {annonce.prix?.toLocaleString()} FCFA
                    {annonce.type === 'location' && (
                      <span className="text-gray-400 text-xs font-normal">
                        {' '}
                        / mois
                      </span>
                    )}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  )
}
