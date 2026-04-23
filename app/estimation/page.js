'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAnnoncesList } from '@/lib/firestoreApp'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

// Prix moyens indicatifs FCFA/m² (à ajuster avec données réelles plateforme)
const PRIX_MOYENS = {
  Cocody: { location: 6000, vente: 700_000 },
  Plateau: { location: 7500, vente: 900_000 },
  Marcory: { location: 4500, vente: 500_000 },
  Yopougon: { location: 3000, vente: 280_000 },
  Bingerville: { location: 4000, vente: 420_000 },
  Adjamé: { location: 3500, vente: 320_000 },
  Abobo: { location: 2500, vente: 200_000 },
  Koumassi: { location: 3000, vente: 250_000 },
  'Port-Bouët': { location: 3200, vente: 280_000 },
  Treichville: { location: 3500, vente: 330_000 },
  Attécoubé: { location: 2800, vente: 240_000 },
  Riviera: { location: 7000, vente: 850_000 },
  Angré: { location: 5500, vente: 620_000 },
}

function formatFCFA(n) {
  if (!Number.isFinite(n)) return '—'
  return Math.round(n).toLocaleString('fr-FR') + ' FCFA'
}

export default function Estimation() {
  const [type, setType] = useState('vente')
  const [quartier, setQuartier] = useState('Cocody')
  const [surface, setSurface] = useState(100)
  const [pieces, setPieces] = useState(3)
  const [etat, setEtat] = useState('bon')
  const [estime, setEstime] = useState(false)
  const [statsMarche, setStatsMarche] = useState(null)
  useEffect(() => {
    async function charger() {
      const filtres = {
        type,
        quartier,
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
      const raw = await fetchAnnoncesList(filtres, 'recent')
      const data = (raw || [])
        .filter((a) => a.prix != null && a.surface != null && a.surface > 0)
        .slice(0, 50)
      if (data.length === 0) {
        setStatsMarche(null)
        return
      }
      const prixM2 = data.map((a) => a.prix / a.surface)
      const moyen = prixM2.reduce((s, v) => s + v, 0) / prixM2.length
      const min = Math.min(...prixM2)
      const max = Math.max(...prixM2)
      setStatsMarche({ moyen, min, max, nb: prixM2.length })
    }
    charger()
  }, [quartier, type])

  const resultat = useMemo(() => {
    const base =
      (statsMarche?.moyen ??
        PRIX_MOYENS[quartier]?.[type] ??
        (type === 'location' ? 4000 : 400_000)) * surface

    const coefEtat = { neuf: 1.15, bon: 1.0, renover: 0.75 }[etat] || 1
    const coefPieces = pieces >= 4 ? 1.05 : pieces <= 1 ? 0.95 : 1
    const prixBas = base * 0.88 * coefEtat * coefPieces
    const prixHaut = base * 1.12 * coefEtat * coefPieces
    const prixMoyen = base * coefEtat * coefPieces
    return { prixBas, prixHaut, prixMoyen }
  }, [statsMarche, quartier, type, surface, pieces, etat])

  return (
    <main className="min-h-screen bg-[#F5F5F5]">
      <SiteHeader />

      <section className="bg-gradient-to-br from-[#0F3F12] to-[#1B5E20] py-12 px-4 text-center">
        <span className="inline-block bg-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/20 mb-4">
          📊 Estimation gratuite
        </span>
        <h1 className="text-white text-3xl md:text-4xl font-bold">
          Combien vaut votre bien à Abidjan ?
        </h1>
        <p className="text-green-100 mt-2 max-w-xl mx-auto">
          Fourchette de prix basée sur le marché réel de Chez Moi CI et les
          moyennes des quartiers.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-5">Votre bien</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">
                  Type d’estimation
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'vente', label: '🏠 Vente' },
                    { id: 'location', label: '🔑 Location' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id)}
                      className={`py-2.5 rounded-lg text-sm font-bold border-2 transition-colors ${
                        type === t.id
                          ? 'border-[#1B5E20] bg-[#E8F5E9] text-[#1B5E20]'
                          : 'border-gray-200 text-gray-600 hover:border-[#1B5E20]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700 block mb-1">
                  Quartier
                </label>
                <select
                  value={quartier}
                  onChange={(e) => setQuartier(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B5E20]"
                >
                  {Object.keys(PRIX_MOYENS).map((q) => (
                    <option key={q}>{q}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700 block mb-1">
                  Surface (m²)
                </label>
                <input
                  type="number"
                  value={surface}
                  onChange={(e) => setSurface(Number(e.target.value) || 0)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B5E20]"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700 block mb-1">
                  Nombre de pièces
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPieces(n)}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${
                        pieces === n
                          ? 'border-[#1B5E20] bg-[#E8F5E9] text-[#1B5E20]'
                          : 'border-gray-200 text-gray-600 hover:border-[#1B5E20]'
                      }`}
                    >
                      {n === 5 ? '5+' : n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">
                  État du bien
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'neuf', label: 'Neuf / récent' },
                    { id: 'bon', label: 'Bon état' },
                    { id: 'renover', label: 'À rénover' },
                  ].map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setEtat(e.id)}
                      className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                        etat === e.id
                          ? 'border-[#1B5E20] bg-[#E8F5E9] text-[#1B5E20]'
                          : 'border-gray-200 text-gray-600 hover:border-[#1B5E20]'
                      }`}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEstime(true)}
                className="w-full bg-[#1B5E20] text-white py-3 rounded-xl font-bold hover:bg-green-800"
              >
                Calculer l’estimation
              </button>
            </div>
          </div>

          <div
            className={`rounded-2xl p-6 shadow-lg ${estime ? 'bg-gradient-to-br from-[#1B5E20] to-[#2E7D32] text-white' : 'bg-gray-50 border-2 border-dashed border-gray-200 text-gray-400 flex items-center justify-center text-center min-h-[300px]'}`}
          >
            {!estime ? (
              <div>
                <div className="text-5xl mb-3">📊</div>
                <p className="font-bold">
                  Votre estimation apparaîtra ici
                </p>
                <p className="text-sm mt-1">
                  Renseignez les infos du bien et cliquez sur Calculer.
                </p>
              </div>
            ) : (
              <>
                <p className="text-green-100 text-sm">
                  Fourchette estimée ({type})
                </p>
                <p className="text-4xl md:text-5xl font-bold my-3">
                  {formatFCFA(resultat.prixMoyen)}
                  {type === 'location' && (
                    <span className="text-lg font-normal text-green-100"> /mois</span>
                  )}
                </p>
                <div className="flex items-center gap-3 text-sm text-green-100 mb-5">
                  <span>Bas : {formatFCFA(resultat.prixBas)}</span>
                  <span>•</span>
                  <span>Haut : {formatFCFA(resultat.prixHaut)}</span>
                </div>

                {statsMarche && (
                  <div className="bg-white/10 border border-white/20 rounded-xl p-4 text-sm mb-5">
                    <div className="font-bold mb-1">Marché réel — {quartier}</div>
                    <div className="text-green-100 text-xs">
                      {statsMarche.nb} annonce(s) sur la plateforme · prix moyen
                      au m² : {formatFCFA(statsMarche.moyen)}
                    </div>
                  </div>
                )}

                <a
                  href="/publier"
                  className="block bg-[#F9A825] text-white py-3 rounded-lg font-bold text-center hover:bg-yellow-600"
                >
                  Publier votre annonce →
                </a>
                <a
                  href="/badge"
                  className="block mt-2 bg-white/10 border border-white/20 text-white py-3 rounded-lg font-bold text-center hover:bg-white/20"
                >
                  Demander un Badge Vérifié
                </a>
              </>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white rounded-xl p-5 border border-gray-100 text-xs text-gray-500">
          <strong className="text-gray-700">Avertissement :</strong> Cette
          estimation est purement indicative et basée sur les données publiques
          de la plateforme et des moyennes par quartier. Pour une estimation
          précise, demandez un passage d’agent Chez Moi CI (Badge Or inclus une
          évaluation certifiée).
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
