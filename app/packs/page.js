'use client'

import { useState } from 'react'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

const PACKS = [
  {
    id: 'location',
    emoji: '🔑',
    nom: 'Location sécurisée',
    prix: '75 000 FCFA',
    prixCAD: '~120 CAD',
    cible: 'Locataires & propriétaires',
    description:
      'Tout ce qu’il faut pour emménager en toute tranquillité — un agent Chez Moi CI gère chaque étape.',
    inclus: [
      'Agent dédié du début à la fin',
      'Visite accompagnée et sécurisée',
      'Rédaction du bail numérique conforme loi N°2019-577',
      'Dépôt de garantie en escrow (fonds bloqués, libérés à la sortie)',
      'État des lieux entrée/sortie signé électroniquement',
      'Médiation gratuite en cas de litige',
    ],
    couleur: 'border-blue-200 bg-blue-50/40',
  },
  {
    id: 'achat',
    emoji: '🏠',
    nom: 'Achat accompagné',
    prix: '150 000 FCFA',
    prixCAD: '~240 CAD',
    cible: 'Acheteurs particuliers',
    description:
      'Un expert vérifie, négocie et coordonne la vente à votre place jusqu’à la signature.',
    inclus: [
      'Vérification complète du titre foncier au Cadastre',
      'Recherche de litiges et servitudes',
      'Accompagnement complet de la négociation',
      'Coordination du notaire jusqu’à l’acte de vente',
      'Assistance bancaire et calculateur de prêt',
      'Rapport juridique de 10 pages',
    ],
    couleur: 'border-green-200 bg-green-50/40',
  },
  {
    id: 'diaspora',
    emoji: '🌍',
    nom: 'Diaspora Premium',
    prix: '220 000 FCFA',
    prixCAD: '~350 CAD',
    cible: 'Ivoiriens hors CI',
    description:
      'Achetez ou investissez à Abidjan sans quitter Ottawa, Paris ou Washington. 100% à distance.',
    inclus: [
      'Tout le pack Achat accompagné',
      'Gestion 100 % à distance — aucun déplacement requis',
      'Rapports vidéo et photo hebdomadaires',
      'Procuration numérique notariée sécurisée',
      'Coordination avocat OHADA',
      'Compte-rendu détaillé après chaque étape',
      'Suivi post-achat 3 mois (inscription impôts, SODECI, CIE)',
    ],
    couleur: 'border-yellow-300 bg-yellow-50/40',
    featured: true,
  },
  {
    id: 'artisan',
    emoji: '👷',
    nom: 'Artisan Pro',
    prix: '35 000 FCFA',
    prixCAD: '~55 CAD',
    cible: 'Artisans & prestataires',
    description:
      'Certification professionnelle et visibilité premium — soyez choisi avant les autres.',
    inclus: [
      'Vérification des diplômes et références',
      'Contrôle du casier judiciaire',
      'Badge Certifié sur votre profil',
      'Profil premium mis en avant dans les recherches',
      'Gestion professionnelle des avis clients',
      'Mise en relation prioritaire avec les clients',
    ],
    couleur: 'border-orange-200 bg-orange-50/40',
  },
]

export default function Packs() {
  const [ouvert, setOuvert] = useState(null)

  return (
    <main className="min-h-screen bg-[#F5F5F5]">
      <SiteHeader />

      <section className="bg-gradient-to-br from-[#0F3F12] to-[#1B5E20] py-14 px-4 text-center">
        <span className="inline-block bg-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/20 mb-4">
          Packs d’accompagnement
        </span>
        <h1 className="text-white text-3xl md:text-5xl font-bold mb-3">
          Un expert à vos côtés, de A à Z
        </h1>
        <p className="text-green-100 max-w-2xl mx-auto">
          Location, achat, investissement diaspora, certification artisan —
          4 packs conçus pour sécuriser chaque étape de votre projet immobilier
          à Abidjan.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {PACKS.map((p) => (
            <div
              key={p.id}
              className={`rounded-2xl p-7 border-2 ${p.couleur} ${p.featured ? 'shadow-xl' : 'shadow-sm'} relative bg-white`}
            >
              {p.featured && (
                <span className="absolute -top-3 right-6 bg-[#F9A825] text-white text-xs font-bold px-3 py-1 rounded-full">
                  ★ Le plus demandé
                </span>
              )}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-4xl mb-2">{p.emoji}</div>
                  <h2 className="text-2xl font-bold text-gray-800">{p.nom}</h2>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">
                    {p.cible}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#1B5E20]">{p.prix}</div>
                  <div className="text-xs text-gray-400">{p.prixCAD}</div>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-5">{p.description}</p>

              <ul className="space-y-2 text-sm text-gray-700 mb-6">
                {p.inclus.map((i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#1B5E20] font-bold mt-0.5">✓</span>
                    <span>{i}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col sm:flex-row gap-2">
                <a
                  href={`/contact?pack=${p.id}`}
                  className="flex-1 bg-[#1B5E20] text-white py-3 rounded-lg font-bold text-sm text-center hover:bg-green-800"
                >
                  Commander ce pack
                </a>
                <button
                  type="button"
                  onClick={() => setOuvert(ouvert === p.id ? null : p.id)}
                  className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-lg font-bold text-sm hover:bg-gray-50"
                >
                  {ouvert === p.id ? 'Masquer FAQ' : 'FAQ & détails'}
                </button>
              </div>

              {ouvert === p.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600 space-y-3">
                  <div>
                    <strong>Paiement :</strong> Wave CI, Orange Money, MTN
                    MoMo ou virement bancaire. Possible en 2 versements.
                  </div>
                  <div>
                    <strong>Délai de prise en charge :</strong> Démarrage sous
                    48 h après paiement.
                  </div>
                  <div>
                    <strong>Remboursement :</strong> Voir notre{' '}
                    <a href="/conditions" className="text-[#1B5E20] underline">
                      politique de remboursement
                    </a>
                    .
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Une question avant de commander ?
          </h2>
          <p className="text-gray-500 mb-6">
            Notre équipe vous répond en moins de 30 minutes par WhatsApp ou
            e-mail — en français ivoirien, sans jargon.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="/contact"
              className="bg-[#1B5E20] text-white px-6 py-3 rounded-lg font-bold hover:bg-green-800"
            >
              Parler à un conseiller
            </a>
            <a
              href="https://wa.me/"
              target="_blank"
              rel="noreferrer"
              className="bg-green-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-600"
            >
              💬 WhatsApp
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
