'use client'

import { useEffect, useState } from 'react'
import { fetchAnnoncesList, enrichAnnoncesWithProfiles } from '@/lib/firestoreApp'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

const CATEGORIES = [
  { id: '', label: 'Tous', emoji: '🔧' },
  { id: 'nettoyage', label: 'Nettoyage', emoji: '🧹' },
  { id: 'securite', label: 'Sécurité', emoji: '🛡️' },
  { id: 'jardinage', label: 'Jardinage', emoji: '🌿' },
  { id: 'demenagement', label: 'Déménagement', emoji: '🚚' },
  { id: 'gardiennage', label: 'Gardiennage', emoji: '👮' },
  { id: 'ménage', label: 'Ménage', emoji: '🧽' },
  { id: 'piscine', label: 'Piscine', emoji: '🏊' },
]

export default function Services() {
  const [annonces, setAnnonces] = useState([])
  const [chargement, setChargement] = useState(true)
  const [cat, setCat] = useState('')
  const [quartier, setQuartier] = useState('')
  useEffect(() => {
    async function charger() {
      setChargement(true)
      const filtres = {
        type: 'service',
        quartier: quartier || '',
        prixMin: '',
        prixMax: '',
        nbPieces: '',
        meuble: '',
        badge: '',
        surfaceMin: '',
        recherche: '',
        nbChambres: '',
        typePropriete: '',
        typeService: '',
        disponibilite: '',
      }
      let resultats = await fetchAnnoncesList(filtres, 'recent')
      if (cat) {
        resultats = resultats.filter((a) =>
          `${a.titre} ${a.description || ''}`.toLowerCase().includes(cat)
        )
      }
      setAnnonces(await enrichAnnoncesWithProfiles(resultats))
      setChargement(false)
    }
    charger()
  }, [cat, quartier])

  return (
    <main className="min-h-screen bg-[#F5F5F5]">
      <SiteHeader />

      <section className="bg-gradient-to-br from-[#0F3F12] to-[#1B5E20] py-12 px-4 text-center">
        <span className="inline-block bg-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/20 mb-4">
          🔧 Services à domicile
        </span>
        <h1 className="text-white text-3xl md:text-4xl font-bold">
          Prestataires certifiés à Abidjan
        </h1>
        <p className="text-green-100 mt-2 max-w-2xl mx-auto">
          Nettoyage, sécurité, jardinage, déménagement — des prestataires
          certifiés avec notation 5 étoiles et paiement Mobile Money.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.id || 'all'}
              type="button"
              onClick={() => setCat(c.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border whitespace-nowrap transition-colors ${
                cat === c.id
                  ? 'bg-[#1B5E20] text-white border-[#1B5E20]'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-[#1B5E20]'
              }`}
            >
              <span>{c.emoji}</span> {c.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-6">
          <select
            value={quartier}
            onChange={(e) => setQuartier(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B5E20]"
          >
            <option value="">Tous les quartiers</option>
            {[
              'Cocody',
              'Plateau',
              'Marcory',
              'Yopougon',
              'Bingerville',
              'Adjamé',
              'Abobo',
              'Koumassi',
              'Treichville',
            ].map((q) => (
              <option key={q}>{q}</option>
            ))}
          </select>
          <span className="text-gray-400 text-sm">
            {annonces.length} service{annonces.length > 1 ? 's' : ''}
          </span>
        </div>

        {chargement ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-56 bg-white rounded-xl border border-gray-100 animate-pulse"
              />
            ))}
          </div>
        ) : annonces.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center border border-gray-100">
            <div className="text-5xl mb-3">🧹</div>
            <h2 className="text-lg font-bold text-gray-700 mb-2">
              Bientôt des prestataires ici
            </h2>
            <p className="text-gray-400 text-sm mb-5">
              Nous certifions les meilleurs prestataires d’Abidjan. Vous
              proposez un service ? Inscrivez-vous gratuitement.
            </p>
            <a
              href="/inscription"
              className="inline-block bg-[#1B5E20] text-white px-6 py-3 rounded-lg font-bold text-sm hover:bg-green-800"
            >
              Je propose un service
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {annonces.map((a) => (
              <a
                key={a.id}
                href={`/annonces/${a.id}`}
                className="bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg hover:border-[#1B5E20]/30 transition-all block"
              >
                <div className="h-40 bg-gray-100 relative">
                  {a.photos?.[0] ? (
                    <img
                      src={a.photos[0]}
                      alt={a.titre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">
                      🔧
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-800 line-clamp-1">
                    {a.titre}
                  </h3>
                  <p className="text-gray-500 text-xs mt-0.5">
                    📍 {a.quartier}, Abidjan
                  </p>
                  <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                    {a.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-[#1B5E20] font-bold">
                      {a.profiles?.nom || 'Prestataire'}
                    </span>
                    <span className="text-[#F9A825] font-bold">
                      {a.prix?.toLocaleString()} FCFA
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  )
}
