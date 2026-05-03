'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  getProfilFirestore,
  fetchAnnoncesActivesForUser,
} from '@/lib/firestoreApp'
import { observerConnexion } from '@/lib/auth'
import { useParams, useRouter } from 'next/navigation'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

function moisMembreDepuis(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  } catch {
    return null
  }
}

export default function ProfilPublicClient() {
  const [profil, setProfil] = useState(null)
  const [annonces, setAnnonces] = useState([])
  const [chargement, setChargement] = useState(true)
  const [visiteur, setVisiteur] = useState(null)
  const params = useParams()
  const router = useRouter()

  const connecte = Boolean(visiteur)
  const estSonProfil = connecte && visiteur.uid === params.id
  /** Membre connecté qui consulte un autre profil : infos « pro » débloquées */
  const afficherCoordonneesPro = connecte && !estSonProfil

  useEffect(() => {
    const unsub = observerConnexion((u) => setVisiteur(u))
    return () => unsub()
  }, [])

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
      <div className="min-h-screen bg-[var(--chez-surface,#F5F5F5)] flex items-center justify-center">
        <div className="text-[color:var(--chez-green,#1B5E20)] font-bold">Chargement...</div>
      </div>
    )
  }

  const membreDepuis = moisMembreDepuis(profil?.created_at || profil?.cree_le)

  return (
    <div className="min-h-screen bg-[var(--chez-surface,#F5F5F5)]">
      <SiteHeader />

      {!connecte && (
        <div className="bg-[var(--chez-coral-soft,#FFF8E1)] border-b border-orange-200/60">
          <div className="max-w-4xl mx-auto px-4 py-3 text-sm text-slate-700 flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong className="text-slate-900">Créez un compte ou connectez-vous</strong> pour voir le téléphone
              professionnel et l&apos;adresse (agences).
            </span>
            <Link
              href={`/connexion?redirect=/profil/${params.id}`}
              className="font-bold text-[color:var(--chez-coral,#e85d04)] hover:underline whitespace-nowrap"
            >
              Se connecter →
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-xl p-6 shadow-sm mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 border border-slate-100">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center flex-shrink-0 ring-2 ring-[color:var(--chez-green,#1B5E20)]/15">
            {profil?.photo_url ? (
              <img
                src={profil.photo_url}
                alt={nomAffiche || ''}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[color:var(--chez-green,#1B5E20)] font-bold text-4xl">
                {(profil?.prenom?.[0] || profil?.nom?.[0] || '?').toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">
              {nomAffiche || 'Utilisateur'}
            </h1>
            <p className="text-gray-500 mb-2">
              {typeLabel[profil?.type] || '—'}
            </p>
            {membreDepuis && (
              <p className="text-xs text-slate-400 mb-2">
                Membre depuis <span className="font-semibold text-slate-600 capitalize">{membreDepuis}</span>
              </p>
            )}
            <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
              <span className="bg-emerald-50 text-[color:var(--chez-green,#1B5E20)] px-3 py-1 rounded-full text-sm font-bold">
                {badgeLabel[profil?.badge] || '🔓 Bronze'}
              </span>
              {profil?.quartier && (
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm">
                  📍 Activité : {profil.quartier}
                </span>
              )}
              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm">
                {annonces.length} annonce{annonces.length > 1 ? 's' : ''} active{annonces.length > 1 ? 's' : ''}
              </span>
            </div>

            {(afficherCoordonneesPro || estSonProfil) && profil?.telephone && (
              <p className="mt-4 text-sm">
                <span className="text-slate-500">Téléphone professionnel : </span>
                <a href={`tel:${profil.telephone}`} className="font-bold text-[color:var(--chez-green,#1B5E20)] hover:underline">
                  {profil.telephone}
                </a>
              </p>
            )}
            {(afficherCoordonneesPro || estSonProfil) && profil?.type === 'agence' && profil?.adresse_publique && (
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-700">Adresse : </span>
                {profil.adresse_publique}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50/80 to-white p-4 mb-6">
          <p className="text-sm text-slate-700">
            <strong className="text-[color:var(--chez-green,#1B5E20)]">Confiance :</strong> les avis sur les annonces, les badges vérifiés et les visites accompagnées renforcent la transparence sur Chez Moi CI.
          </p>
        </div>

        <h2 className="text-xl font-bold text-[color:var(--chez-green,#1B5E20)] mb-4">
          Annonces publiées
        </h2>

        {annonces.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm text-gray-400">
            Aucune annonce active pour le moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {annonces.map((annonce) => (
              <Link
                key={annonce.id}
                href={`/annonces/${annonce.id}`}
                className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md border border-gray-100 flex transition hover:border-[color:var(--chez-green,#1B5E20)]/25"
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
                  <p className="text-[color:var(--chez-coral,#ea580c)] font-bold text-sm">
                    {annonce.prix?.toLocaleString()} FCFA
                    {annonce.type === 'location' && (
                      <span className="text-gray-400 text-xs font-normal">
                        {' '}
                        / mois
                      </span>
                    )}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  )
}
