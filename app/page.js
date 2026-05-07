'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchAnnoncesList, fetchAvisStatsForAnnonces } from '@/lib/firestoreApp'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'
import { VILLES_OPTIONS, getCommunesParVille } from '@/lib/civGeo'

function formaterPrix(p) {
  if (!p) return '—'
  if (p >= 1_000_000) {
    const m = p / 1_000_000
    const s = Number.isInteger(m) ? String(m) : m.toFixed(1).replace('.', ',')
    return s + (m >= 2 ? ' millions' : ' million') + ' FCFA'
  }
  return p.toLocaleString('fr-FR') + ' FCFA'
}

function renderStars(moyenne = 0) {
  const n = Math.max(0, Math.min(5, Math.round(moyenne)))
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}

const TYPE_COLOR_HOME = {
  location: 'bg-emerald-500',
  vente:    'bg-blue-500',
  service:  'bg-orange-500',
  artisan:  'bg-purple-500',
}

const SERVICE_ICON_HOME = {
  'Électricien': '⚡', 'Plombier': '🚿', 'Menuisier': '🪚',
  'Carreleur': '🪣', 'Peintre': '🖌️', 'Maçon': '🧱',
  'Climatiseur': '❄️', 'Soudeur': '🔥', 'Ferrailleur': '⚙️',
  'Nettoyage': '🧹', 'Déménagement': '🚛', 'Jardinage': '🌿',
  'Sécurité / Gardiennage': '🛡️', 'Livraison': '📦',
  'Décoration intérieure': '🎨', 'Photographie immobilière': '📸',
}

function placeholderHome(annonce) {
  if (annonce.type === 'service' || annonce.type === 'artisan') {
    return SERVICE_ICON_HOME[annonce.type_service] || (annonce.type === 'service' ? '🔧' : '👷')
  }
  return '🏠'
}

function CarteAnnonce({ annonce, avisStat }) {
  const badgeLabel = { bronze: '🔓 Bronze', argent: '🥈 Argent', or: '🥇 Or' }
  const typeColor = TYPE_COLOR_HOME[annonce.type] || 'bg-gray-500'
  const moyenneAvis = avisStat?.moyenne || 0
  const totalAvis = avisStat?.total || 0
  const nbVues = annonce.nb_vues || 0
  const topNote = moyenneAvis >= 4.5 && totalAvis > 0

  return (
    <a
      href={`/annonces/${annonce.id}`}
      className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 block"
    >
      <div className="relative h-56 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {annonce.photos?.[0] ? (
          <img
            src={annonce.photos[0]}
            alt={annonce.titre}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">
            {placeholderHome(annonce)}
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        <span className={`absolute top-3 left-3 ${typeColor} text-white text-xs font-bold px-2.5 py-1 rounded-full capitalize shadow-md`}>
          {annonce.type}
        </span>
        <span className="absolute top-3 right-3 bg-white/90 backdrop-blur text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
          {badgeLabel[annonce.badge] || badgeLabel.bronze}
        </span>
        {topNote && (
          <span className="absolute top-12 right-3 bg-fuchsia-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md">
            Top noté
          </span>
        )}

        {/* Prix sur l'image */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-white font-extrabold text-xl drop-shadow leading-tight">
            {formaterPrix(annonce.prix)}
            {annonce.type === 'location' && (
              <span className="text-white/70 text-sm font-normal"> /mois</span>
            )}
          </p>
          <p className="text-white/80 text-xs mt-0.5">📍 {annonce.quartier}, Abidjan</p>
        </div>
      </div>

      <div className="p-4">
        <h4 className="font-bold text-gray-900 line-clamp-1 text-sm mb-2">{annonce.titre}</h4>
        <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
          {annonce.nb_pieces > 0 && (
            <span className="bg-gray-50 px-2 py-0.5 rounded-full">🛏️ {annonce.nb_pieces} pièces</span>
          )}
          {annonce.surface && (
            <span className="bg-gray-50 px-2 py-0.5 rounded-full">📐 {annonce.surface} m²</span>
          )}
          <span className="bg-gray-50 px-2 py-0.5 rounded-full">👁️ {nbVues}</span>
          <span className="bg-gray-50 px-2 py-0.5 rounded-full">
            {totalAvis > 0 ? `${renderStars(moyenneAvis)} ${moyenneAvis.toFixed(1).replace('.', ',')} (${totalAvis})` : '☆☆☆☆☆ 0 avis'}
          </span>
        </div>
      </div>
    </a>
  )
}

function GrilleAnnonces({ type, titre, sousTitre, href, limit = 6 }) {
  const [annonces, setAnnonces] = useState([])
  const [avisStats, setAvisStats] = useState({})
  const [etat, setEtat] = useState('loading')

  useEffect(() => {
    async function charger() {
      const filtres = {
        type: type || '',
        quartier: '',
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
      const data = await fetchAnnoncesList(filtres, 'recent')
      const list = (data || []).slice(0, limit)
      const stats = await fetchAvisStatsForAnnonces(list.map((a) => a.id).filter(Boolean))
      setAvisStats(stats)
      setAnnonces(list)
      setEtat('done')
    }
    charger()
  }, [type, limit])

  if (etat === 'loading') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-72 bg-white rounded-xl border border-gray-100 animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (annonces.length === 0) return null

  return (
    <section className="px-4 py-10 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-800">{titre}</h3>
          {sousTitre && (
            <p className="text-gray-500 text-sm mt-1">{sousTitre}</p>
          )}
        </div>
        <a
          href={href}
          className="hidden sm:inline-flex items-center gap-1 text-[#1B5E20] font-bold text-sm bg-[#E8F5E9] hover:bg-[#1B5E20] hover:text-white px-4 py-2 rounded-full transition-all"
        >
          Voir tout →
        </a>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {annonces.map((a) => (
          <CarteAnnonce key={a.id} annonce={a} avisStat={avisStats[a.id]} />
        ))}
      </div>
    </section>
  )
}

export default function Accueil() {
  const [mode, setMode] = useState('location')
  const [ville, setVille] = useState('Abidjan')
  const [quartier, setQuartier] = useState('')
  const [prixMax, setPrixMax] = useState('')
  const [nbPieces, setNbPieces] = useState('')
  const router = useRouter()

  const rechercher = () => {
    const params = new URLSearchParams()
    if (mode) params.set('type', mode)
    if (ville) params.set('ville', ville)
    if (quartier) params.set('quartier', quartier)
    if (prixMax) params.set('prixMax', prixMax)
    if (nbPieces) params.set('nbPieces', nbPieces)
    router.push('/carte?' + params.toString())
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA]">
      <SiteHeader />

      {/* HERO — style moderne, dynamique */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a2e0d 0%, #1B5E20 45%, #2E7D32 75%, #1a4a0a 100%)' }}>
        {/* Cercles décoratifs animés */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#F9A825]/10 rounded-full translate-y-1/2 -translate-x-1/4" />
        <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-white/5 rounded-full" />

        <div className="relative max-w-6xl mx-auto px-4 py-14 md:py-20 text-center">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 bg-white/15 text-white text-xs font-bold px-4 py-2 rounded-full border border-white/20 mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span>🇨🇮 Immobilier & prestataires — vérification terrain & accompagnement</span>
          </div>

          <h1 className="text-white font-black mb-4 leading-none tracking-tight">
            <span className="block text-4xl md:text-6xl">Trouve ton</span>
            <span className="block text-4xl md:text-6xl text-[#F9A825]">chez-toi. 🏠</span>
          </h1>
          <p className="text-green-100/80 text-base md:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            Louer, acheter ou faire appel à des pros : une équipe peut vous accompagner pour sécuriser
            la visite, le bail ou l&apos;intervention.
          </p>

          {/* Stats rapides */}
          <div className="flex flex-wrap items-center justify-center gap-6 mb-10 text-white/70 text-xs font-medium">
            {[
              { icon: '🏠', label: 'Biens & offres' },
              { icon: '🛡️', label: 'Accompagnement' },
              { icon: '✅', label: 'Badge Vérifié' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </div>
            ))}
          </div>

          {/* BARRE DE RECHERCHE — glassmorphism */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl max-w-4xl mx-auto p-3">
            {/* Onglets type */}
            <div className="flex gap-1 p-1 mb-3 bg-gray-100 rounded-xl w-fit mx-auto flex-wrap justify-center">
              {[
                { id: 'location', label: '🔑 Louer' },
                { id: 'vente', label: '🏠 Acheter' },
                { id: 'prestations', label: '🛠️ Services & Pro' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${
                    mode === m.id
                      ? 'bg-[#1B5E20] text-white shadow-md scale-[1.02]'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div
              className={`grid grid-cols-1 gap-2 ${
                mode === 'prestations'
                  ? 'md:grid-cols-[1fr_1fr_1fr_auto]'
                  : 'md:grid-cols-[1fr_1fr_1fr_1fr_auto]'
              }`}
            >
              <select
                value={ville}
                onChange={(e) => {
                  setVille(e.target.value)
                  setQuartier('')
                }}
                className="border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:border-[#1B5E20] focus:ring-2 focus:ring-[#1B5E20]/20 bg-white"
              >
                <option value="">🏙️ Ville</option>
                {VILLES_OPTIONS.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
              <select
                value={quartier}
                onChange={(e) => setQuartier(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:border-[#1B5E20] focus:ring-2 focus:ring-[#1B5E20]/20 bg-white"
              >
                <option value="">📍 Commune / Quartier</option>
                {getCommunesParVille(ville).map((q) => (
                  <option key={q}>{q}</option>
                ))}
              </select>
              {mode !== 'prestations' && (
                <select
                  value={nbPieces}
                  onChange={(e) => setNbPieces(e.target.value)}
                  className="border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:border-[#1B5E20] focus:ring-2 focus:ring-[#1B5E20]/20 bg-white"
                >
                  <option value="">🛏️ Pièces</option>
                  <option value="1">Studio / 1 pièce</option>
                  <option value="2">2 pièces</option>
                  <option value="3">3 pièces</option>
                  <option value="4">4 pièces</option>
                  <option value="5">5 pièces et +</option>
                </select>
              )}
              <input
                type="number"
                placeholder="💰 Budget max (FCFA)"
                value={prixMax}
                onChange={(e) => setPrixMax(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:border-[#1B5E20] focus:ring-2 focus:ring-[#1B5E20]/20 bg-white"
              />
              <button
                type="button"
                onClick={rechercher}
                className="bg-gradient-to-r from-[#F9A825] to-[#f59f00] text-white px-6 py-3 rounded-xl font-bold text-sm hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                🔍 Rechercher
              </button>
            </div>

            {/* Tags tendances (logement) */}
            {mode !== 'prestations' && (
              <div className="flex flex-wrap gap-2 mt-3 px-1 items-center">
                <span className="text-xs text-gray-400 font-medium">Tendances :</span>
                {['Cocody 3 pièces', 'Plateau bureaux', 'Marcory villa', 'Yopougon studio'].map((t) => (
                  <a
                    key={t}
                    href={`/annonces?quartier=${t.split(' ')[0]}`}
                    className="text-xs text-[#1B5E20] font-semibold bg-[#E8F5E9] hover:bg-[#1B5E20] hover:text-white px-3 py-1 rounded-full transition-all"
                  >
                    {t}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
      {/* 3 PILIERS */}
      <section className="mx-auto max-w-7xl px-4 py-6 md:py-8">
        <div className="mb-5 text-center md:mb-6">
          <h2 className="mb-1.5 text-2xl font-black text-gray-900 md:text-3xl">
            Louer, acheter, faire appel à un pro
          </h2>
          <p className="mx-auto max-w-md text-sm text-gray-400 md:text-base">
            Trois entrées simples. Le détail (badge, packs, outils) reste accessible dans le menu.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 md:gap-3">
          {[
            { emoji: '🔑', titre: 'Louer', desc: 'Bail & visite encadrée possible', filtre: 'location', bg: 'bg-emerald-50', border: 'hover:border-emerald-300', text: 'text-emerald-700' },
            { emoji: '🏠', titre: 'Acheter', desc: 'Vérification titre & accompagnement', filtre: 'vente', bg: 'bg-blue-50', border: 'hover:border-blue-300', text: 'text-blue-700' },
            { emoji: '🛠️', titre: 'Services & Pro', desc: 'Professionnels de services à Abidjan', filtre: 'prestations', bg: 'bg-orange-50', border: 'hover:border-orange-300', text: 'text-orange-700' },
          ].map((p) => (
            <a
              key={p.titre}
              href={`/annonces?type=${p.filtre}`}
              className={`${p.bg} group block rounded-xl border-2 border-transparent p-4 text-center md:rounded-2xl md:p-5 ${p.border} transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md`}
            >
              <div className="mb-1.5 inline-block text-3xl transition-transform duration-300 group-hover:scale-105 md:mb-2 md:text-4xl">
                {p.emoji}
              </div>
              <h3 className={`mb-0.5 text-sm font-black md:text-base ${p.text}`}>{p.titre}</h3>
              <p className="text-[11px] leading-snug text-gray-500 md:text-xs">{p.desc}</p>
            </a>
          ))}
        </div>
      </section>

      {/* LOCATIONS */}
      <GrilleAnnonces
        type="location"
        titre="À louer à Abidjan"
        sousTitre="Sélection de logements — demandez un agent pour la visite"
        href="/annonces?type=location"
      />

      {/* VENTES */}
      <GrilleAnnonces
        type="vente"
        titre="À acheter"
        sousTitre="Maisons, villas, terrains — packs pour sécuriser l’achat"
        href="/annonces?type=vente"
      />

      {/* PRESTATIONS */}
      <GrilleAnnonces
        type="prestations"
        titre="Services & Pro"
        sousTitre="Professionnels qualifiés — contactez-nous pour encadrer l’intervention"
        href="/annonces?type=prestations"
      />

      {/* Confiance — version courte */}
      <section className="bg-white py-10 px-4 border-y border-gray-100">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">
            Badge Vérifié <span className="text-[#F9A825]">✅</span>
          </h2>
          <p className="text-gray-600 text-sm md:text-base leading-relaxed mb-5">
            Visites terrain, photos et pièces contrôlés selon le niveau Bronze, Argent ou Or.
            Le détail des garanties et tarifs est sur la page dédiée.
          </p>
          <a
            href="/badge"
            className="inline-flex items-center gap-2 text-[#1B5E20] font-bold text-sm bg-[#E8F5E9] hover:bg-[#1B5E20] hover:text-white px-5 py-2.5 rounded-full transition-colors"
          >
            Voir les niveaux de vérification →
          </a>
        </div>
      </section>

      {/* Accompagnement : agent terrain vs suivi prestations */}
      <section className="py-12 px-4 bg-gradient-to-r from-[#1B5E20] to-[#2E7D32]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <span className="inline-block bg-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/20 mb-3">
              Accompagnement humain
            </span>
            <h2 className="text-white text-2xl md:text-3xl font-bold mb-2">
              Besoin d&apos;un agent sur le terrain ?
            </h2>
            <p className="text-green-100 text-sm md:text-base max-w-2xl mx-auto">
              Pour une location ou un achat, nous pouvons vous mettre en relation avec un agent pour visiter,
              vérifier l&apos;annonce et sécuriser les étapes. Pour les Services & Pro, nous pouvons
              vous aider à encadrer l&apos;intervention et la conformité.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-5 text-white">
              <div className="text-2xl mb-2">🏠</div>
              <h3 className="font-bold text-lg mb-1">Louer ou acheter</h3>
              <p className="text-green-100 text-sm leading-relaxed">
                Agent dédié, visite accompagnée, dossier et packs location / achat / diaspora — détail sur la page Packs.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-5 text-white">
              <div className="text-2xl mb-2">🛠️</div>
              <h3 className="font-bold text-lg mb-1">Services & Pro</h3>
              <p className="text-green-100 text-sm leading-relaxed">
                Certification profil, badge et mise en confiance — idéal si vous voulez limiter les arnaques sur place.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="/contact"
              className="bg-[#F9A825] text-white px-6 py-3 rounded-xl font-bold hover:bg-yellow-600 shadow-lg"
            >
              Nous contacter — décrire mon besoin
            </a>
            <a
              href="/packs"
              className="border-2 border-white/40 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/10"
            >
              Voir les packs d&apos;accompagnement
            </a>
          </div>
          <p className="text-center text-green-200/80 text-xs mt-6 max-w-xl mx-auto">
            Calculateur de prêt, estimation et carte : liens dans le pied de page ou le menu « Carte ».
          </p>
        </div>
      </section>

      {/* CTA propriétaires */}
      <section className="bg-[#F5F5F5] py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Vous louez ou vendez un bien ?
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Publication gratuite, audience locale et diaspora. Badge Vérifié en option.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="/publier"
              className="bg-[#1B5E20] text-white px-6 py-3 rounded-xl font-bold hover:bg-green-800"
            >
              📢 Publier une annonce
            </a>
            <a
              href="/badge"
              className="bg-white border-2 border-[#1B5E20] text-[#1B5E20] px-6 py-3 rounded-xl font-bold hover:bg-[#E8F5E9]"
            >
              ✅ Demander un badge
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
