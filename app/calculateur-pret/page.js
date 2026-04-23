'use client'

import { useMemo, useState } from 'react'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

function formatFCFA(n) {
  if (!Number.isFinite(n)) return '—'
  return Math.round(n).toLocaleString('fr-FR') + ' FCFA'
}

export default function CalculateurCredit() {
  const [prix, setPrix] = useState(50_000_000)
  const [apport, setApport] = useState(10_000_000)
  const [dureeAnnees, setDureeAnnees] = useState(15)
  const [taux, setTaux] = useState(9.5)
  const [assuranceAnnuelle, setAssuranceAnnuelle] = useState(0.3)

  const resultat = useMemo(() => {
    const montant = Math.max(prix - apport, 0)
    const n = dureeAnnees * 12
    const tauxMensuel = taux / 100 / 12
    let mensualite = 0
    if (tauxMensuel === 0) {
      mensualite = montant / n
    } else {
      mensualite =
        (montant * tauxMensuel) / (1 - Math.pow(1 + tauxMensuel, -n))
    }
    const assuranceMensuelle = (montant * (assuranceAnnuelle / 100)) / 12
    const mensualiteTotale = mensualite + assuranceMensuelle
    const coutTotalInterets = mensualite * n - montant
    const coutTotalAssurance = assuranceMensuelle * n
    const coutTotal = mensualiteTotale * n + apport
    return {
      montant,
      mensualite,
      assuranceMensuelle,
      mensualiteTotale,
      coutTotalInterets,
      coutTotalAssurance,
      coutTotal,
    }
  }, [prix, apport, dureeAnnees, taux, assuranceAnnuelle])

  return (
    <main className="min-h-screen bg-[#F5F5F5]">
      <SiteHeader />

      <section className="bg-gradient-to-br from-[#0F3F12] to-[#1B5E20] py-12 px-4 text-center">
        <span className="inline-block bg-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/20 mb-4">
          💰 Outil gratuit
        </span>
        <h1 className="text-white text-3xl md:text-4xl font-bold">
          Calculateur de prêt immobilier
        </h1>
        <p className="text-green-100 mt-2 max-w-xl mx-auto">
          Simulez votre mensualité en 30 secondes. Taux moyens des banques CI
          (SGBCI, SIB, BICICI) en 2026.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* FORM */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-5">Votre projet</h2>

            <div className="space-y-5">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-bold text-gray-700">
                    Prix du bien
                  </label>
                  <span className="text-sm text-[#1B5E20] font-bold">
                    {formatFCFA(prix)}
                  </span>
                </div>
                <input
                  type="range"
                  min="5000000"
                  max="500000000"
                  step="1000000"
                  value={prix}
                  onChange={(e) => setPrix(Number(e.target.value))}
                  className="w-full accent-[#1B5E20]"
                />
                <input
                  type="number"
                  value={prix}
                  onChange={(e) => setPrix(Number(e.target.value) || 0)}
                  className="w-full mt-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B5E20]"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-bold text-gray-700">
                    Apport personnel
                  </label>
                  <span className="text-sm text-[#1B5E20] font-bold">
                    {formatFCFA(apport)} (
                    {prix ? Math.round((apport / prix) * 100) : 0}%)
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={prix}
                  step="500000"
                  value={apport}
                  onChange={(e) => setApport(Number(e.target.value))}
                  className="w-full accent-[#1B5E20]"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-bold text-gray-700">
                    Durée
                  </label>
                  <span className="text-sm text-[#1B5E20] font-bold">
                    {dureeAnnees} ans
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="25"
                  value={dureeAnnees}
                  onChange={(e) => setDureeAnnees(Number(e.target.value))}
                  className="w-full accent-[#1B5E20]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-1">
                    Taux d’intérêt (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={taux}
                    onChange={(e) => setTaux(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B5E20]"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-1">
                    Assurance / an (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={assuranceAnnuelle}
                    onChange={(e) =>
                      setAssuranceAnnuelle(Number(e.target.value))
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B5E20]"
                  />
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                💡 Taux moyens banques CI en 2026 : 8,5 % à 11 %. L’assurance
                décès-invalidité est souvent obligatoire (~0,3 % annuel).
              </div>
            </div>
          </div>

          {/* RESULTAT */}
          <div className="bg-gradient-to-br from-[#1B5E20] to-[#2E7D32] rounded-2xl p-6 text-white shadow-lg">
            <p className="text-green-100 text-sm">Mensualité totale</p>
            <p className="text-4xl md:text-5xl font-bold my-2">
              {formatFCFA(resultat.mensualiteTotale)}
            </p>
            <p className="text-green-100 text-xs">
              dont {formatFCFA(resultat.mensualite)} capital & intérêts +{' '}
              {formatFCFA(resultat.assuranceMensuelle)} assurance
            </p>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between border-b border-white/20 pb-2">
                <span>Montant emprunté</span>
                <span className="font-bold">
                  {formatFCFA(resultat.montant)}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/20 pb-2">
                <span>Total intérêts</span>
                <span className="font-bold">
                  {formatFCFA(resultat.coutTotalInterets)}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/20 pb-2">
                <span>Total assurance</span>
                <span className="font-bold">
                  {formatFCFA(resultat.coutTotalAssurance)}
                </span>
              </div>
              <div className="flex justify-between text-[#F9A825]">
                <span className="font-bold">Coût total du projet</span>
                <span className="font-bold">
                  {formatFCFA(resultat.coutTotal)}
                </span>
              </div>
            </div>

            <a
              href="/packs"
              className="block mt-6 bg-[#F9A825] text-white py-3 rounded-lg font-bold text-center hover:bg-yellow-600"
            >
              Demander un accompagnement achat →
            </a>
            <a
              href="/annonces?type=vente"
              className="block mt-2 bg-white/10 border border-white/20 text-white py-3 rounded-lg font-bold text-center hover:bg-white/20"
            >
              Voir les biens à vendre
            </a>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-xl p-5 border border-gray-100 text-xs text-gray-500">
          <strong className="text-gray-700">Avertissement :</strong> Les
          résultats sont indicatifs et ne constituent pas une offre de prêt.
          Les conditions finales dépendent de votre banque (SGBCI, SIB, BICICI,
          NSIA, etc.), de votre profil et des frais de notaire (~7 % du prix).
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
