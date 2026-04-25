'use client'

import { Suspense, useEffect, useState } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { fetchAnnoncesList } from '@/lib/firestoreApp'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

const QUARTIERS = [
  'Cocody', 'Plateau', 'Marcory', 'Yopougon', 'Bingerville',
  'Adjamé', 'Abobo', 'Koumassi', 'Port-Bouët', 'Treichville', 'Attécoubé', 'Riviera', 'Angré',
]

// ─── Définition des filtres par catégorie ────────────────────────────────────

const CATEGORIES = [
  { id: '', label: 'Tout', emoji: '🔎' },
  { id: 'location', label: 'Location', emoji: '🔑' },
  { id: 'vente', label: 'Vente', emoji: '🏠' },
  { id: 'service', label: 'Services', emoji: '🔧' },
  { id: 'artisan', label: 'Artisans', emoji: '👷' },
]

// Les champs de filtre propres à chaque catégorie
const CHAMPS_FILTRES = {
  '': [
    { key: 'quartier', label: 'Quartier', type: 'select', options: QUARTIERS.map(q => ({ value: q, label: q })) },
    { key: 'prixMax', label: 'Budget max (FCFA)', type: 'number', placeholder: 'Ex : 500 000' },
    { key: 'badge', label: 'Niveau vérification', type: 'radio', options: [
      { value: '', label: 'Tous' },
      { value: 'bronze', label: '🔓 Bronze' },
      { value: 'argent', label: '🥈 Argent' },
      { value: 'or', label: '🥇 Or' },
    ]},
  ],
  location: [
    { key: 'quartier', label: 'Quartier', type: 'select', options: QUARTIERS.map(q => ({ value: q, label: q })) },
    { key: 'prixMin', label: 'Loyer min (FCFA/mois)', type: 'number', placeholder: 'Ex : 80 000' },
    { key: 'prixMax', label: 'Loyer max (FCFA/mois)', type: 'number', placeholder: 'Ex : 300 000' },
    { key: 'nbChambres', label: 'Chambres', type: 'chips', options: [
      { value: '', label: 'Toutes' },
      { value: '0', label: 'Studio' },
      { value: '1', label: '1' },
      { value: '2', label: '2' },
      { value: '3', label: '3' },
      { value: '4', label: '4+' },
    ]},
    { key: 'meuble', label: 'Meublé', type: 'chips', options: [
      { value: '', label: 'Tous' },
      { value: 'true', label: 'Oui' },
      { value: 'false', label: 'Non' },
    ]},
    { key: 'surfaceMin', label: 'Surface min (m²)', type: 'number', placeholder: 'Ex : 40' },
    { key: 'badge', label: 'Niveau vérification', type: 'radio', options: [
      { value: '', label: 'Tous' },
      { value: 'bronze', label: '🔓 Bronze' },
      { value: 'argent', label: '🥈 Argent' },
      { value: 'or', label: '🥇 Or' },
    ]},
  ],
  vente: [
    { key: 'quartier', label: 'Quartier', type: 'select', options: QUARTIERS.map(q => ({ value: q, label: q })) },
    { key: 'prixMin', label: 'Prix min (FCFA)', type: 'number', placeholder: 'Ex : 10 000 000' },
    { key: 'prixMax', label: 'Prix max (FCFA)', type: 'number', placeholder: 'Ex : 100 000 000' },
    { key: 'typePropriete', label: 'Type de bien', type: 'select', options: [
      'Appartement', 'Villa', 'Maison', 'Duplex', 'Terrain', 'Bureau', 'Local commercial', 'Immeuble',
    ].map(v => ({ value: v, label: v })) },
    { key: 'nbPieces', label: 'Pièces', type: 'chips', options: [
      { value: '', label: 'Tous' },
      { value: '1', label: '1' },
      { value: '2', label: '2' },
      { value: '3', label: '3' },
      { value: '4', label: '4' },
      { value: '5', label: '5+' },
    ]},
    { key: 'surfaceMin', label: 'Surface min (m²)', type: 'number', placeholder: 'Ex : 80' },
    { key: 'badge', label: 'Niveau vérification', type: 'radio', options: [
      { value: '', label: 'Tous' },
      { value: 'bronze', label: '🔓 Bronze' },
      { value: 'argent', label: '🥈 Argent' },
      { value: 'or', label: '🥇 Or (titre foncier)' },
    ]},
  ],
  service: [
    { key: 'quartier', label: 'Zone / Quartier', type: 'select', options: QUARTIERS.map(q => ({ value: q, label: q })) },
    { key: 'typeService', label: 'Type de service', type: 'select', options: [
      'Nettoyage', 'Déménagement', 'Jardinage', 'Sécurité / Gardiennage', 'Livraison', 'Décoration intérieure', 'Photographie immobilière',
    ].map(v => ({ value: v, label: v })) },
    { key: 'prixMax', label: 'Budget max (FCFA)', type: 'number', placeholder: 'Ex : 50 000' },
    { key: 'disponibilite', label: 'Disponibilité', type: 'chips', options: [
      { value: '', label: 'Toutes' },
      { value: 'Disponible maintenant', label: 'Dispo maintenant' },
      { value: '7j/7', label: '7j/7' },
      { value: 'Sur rendez-vous', label: 'Sur RDV' },
      { value: 'Lun – Ven', label: 'Lun–Ven' },
    ]},
  ],
  artisan: [
    { key: 'quartier', label: 'Zone / Quartier', type: 'select', options: QUARTIERS.map(q => ({ value: q, label: q })) },
    { key: 'typeService', label: 'Métier / Spécialité', type: 'select', options: [
      'Électricien', 'Plombier', 'Menuisier', 'Carreleur', 'Peintre', 'Maçon', 'Climatiseur', 'Soudeur', 'Ferrailleur',
    ].map(v => ({ value: v, label: v })) },
    { key: 'prixMax', label: 'Tarif max / heure (FCFA)', type: 'number', placeholder: 'Ex : 10 000' },
    { key: 'disponibilite', label: 'Disponibilité', type: 'chips', options: [
      { value: '', label: 'Toutes' },
      { value: 'Disponible maintenant', label: 'Dispo maintenant' },
      { value: '7j/7', label: '7j/7' },
      { value: 'Sur rendez-vous', label: 'Sur RDV' },
    ]},
    { key: 'badge', label: 'Badge', type: 'radio', options: [
      { value: '', label: 'Tous' },
      { value: 'bronze', label: '🔓 Bronze' },
      { value: 'argent', label: '🥈 Certifié Argent' },
      { value: 'or', label: '🥇 Certifié Or' },
    ]},
  ],
}

const FILTRES_VIDES = {
  type: '',
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

// ─── Composant champ de filtre ────────────────────────────────────────────────

function ChampFiltre({ champ, valeur, onChange }) {
  const cls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B5E20] bg-white'

  if (champ.type === 'select') {
    return (
      <div>
        <label className="block text-xs font-bold text-gray-600 mb-1.5">{champ.label}</label>
        <select value={valeur || ''} onChange={e => onChange(champ.key, e.target.value)} className={cls}>
          <option value="">Tous</option>
          {champ.options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    )
  }

  if (champ.type === 'number') {
    return (
      <div>
        <label className="block text-xs font-bold text-gray-600 mb-1.5">{champ.label}</label>
        <input
          type="number"
          value={valeur || ''}
          onChange={e => onChange(champ.key, e.target.value)}
          placeholder={champ.placeholder}
          className={cls}
        />
      </div>
    )
  }

  if (champ.type === 'chips') {
    return (
      <div>
        <label className="block text-xs font-bold text-gray-600 mb-1.5">{champ.label}</label>
        <div className="flex flex-wrap gap-1.5">
          {champ.options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(champ.key, o.value)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                (valeur || '') === o.value
                  ? 'bg-[#1B5E20] text-white border-[#1B5E20]'
                  : 'border-gray-200 text-gray-600 hover:border-[#1B5E20] hover:text-[#1B5E20] bg-white'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (champ.type === 'radio') {
    return (
      <div>
        <label className="block text-xs font-bold text-gray-600 mb-1.5">{champ.label}</label>
        <div className="space-y-1">
          {champ.options.map(o => (
            <label
              key={o.value}
              className={`flex items-center gap-2 text-xs cursor-pointer px-2 py-1.5 rounded-lg transition-colors ${
                (valeur || '') === o.value ? 'bg-[#E8F5E9] text-[#1B5E20] font-bold' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name={champ.key}
                checked={(valeur || '') === o.value}
                onChange={() => onChange(champ.key, o.value)}
                className="accent-[#1B5E20]"
              />
              {o.label}
            </label>
          ))}
        </div>
      </div>
    )
  }

  return null
}

// ─── Carte annonce ────────────────────────────────────────────────────────────

function formaterPrix(p) {
  if (!p) return '—'
  if (p >= 1_000_000) return (p / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M FCFA'
  if (p >= 1000) return (p / 1000).toFixed(0) + 'K FCFA'
  return p.toLocaleString() + ' FCFA'
}

const TYPE_COLOR = {
  location: 'bg-emerald-500',
  vente:    'bg-blue-500',
  service:  'bg-orange-500',
  artisan:  'bg-purple-500',
}
const TYPE_EMOJI = { location: '🔑', vente: '🏠', service: '🔧', artisan: '👷' }
const BADGE_STYLE = {
  bronze: { label: '🔓 Bronze', cls: 'bg-amber-50 text-amber-700' },
  argent: { label: '🥈 Argent', cls: 'bg-gray-100 text-gray-700' },
  or:     { label: '🥇 Or',     cls: 'bg-yellow-50 text-yellow-700' },
}

function CarteAnnonce({ annonce, vue }) {
  const badge = BADGE_STYLE[annonce.badge] || BADGE_STYLE.bronze
  const typeColor = TYPE_COLOR[annonce.type] || 'bg-gray-500'

  if (vue === 'liste') {
    return (
      <a
        href={`/annonces/${annonce.id}`}
        className="group flex flex-col sm:flex-row bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
      >
        <div className="relative w-full sm:w-52 h-48 sm:h-auto bg-gray-100 flex-shrink-0 overflow-hidden">
          {annonce.photos?.[0] ? (
            <Image
              src={annonce.photos[0]}
              alt={annonce.titre}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="208px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-200 text-5xl bg-gradient-to-br from-gray-100 to-gray-200">
              {TYPE_EMOJI[annonce.type] || '🏠'}
            </div>
          )}
          <span className={`absolute top-3 left-3 ${typeColor} text-white text-xs px-2.5 py-1 rounded-full font-bold capitalize shadow-sm`}>
            {annonce.type}
          </span>
        </div>
        <div className="p-5 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-bold text-gray-900 line-clamp-1 text-base">{annonce.titre}</h3>
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold whitespace-nowrap flex-shrink-0 ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-gray-400 text-sm mb-2">📍 {annonce.quartier}, Abidjan</p>
          <p className="text-gray-500 text-sm line-clamp-2">{annonce.description}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
            {annonce.nb_chambres > 0 && <span className="flex items-center gap-1">🛏 {annonce.nb_chambres} ch.</span>}
            {annonce.nb_pieces    > 0 && <span className="flex items-center gap-1">🚪 {annonce.nb_pieces}p</span>}
            {annonce.surface           && <span className="flex items-center gap-1">📐 {annonce.surface} m²</span>}
            {annonce.meuble            && <span className="flex items-center gap-1">🛋️ Meublé</span>}
            {annonce.type_service      && <span className="flex items-center gap-1">🔧 {annonce.type_service}</span>}
            {annonce.disponibilite     && <span className="flex items-center gap-1">🕐 {annonce.disponibilite}</span>}
          </div>
          <div className="flex items-end justify-between mt-auto pt-4">
            <p className="text-[#1B5E20] font-extrabold text-xl">
              {formaterPrix(annonce.prix)}
              {annonce.type === 'location' && <span className="text-gray-400 text-sm font-normal"> /mois</span>}
              {annonce.type === 'artisan'  && <span className="text-gray-400 text-sm font-normal"> /h</span>}
            </p>
            <span className="text-xs font-bold text-white bg-[#1B5E20] px-3 py-1.5 rounded-full group-hover:bg-[#2E7D32] transition-colors">
              Voir →
            </span>
          </div>
        </div>
      </a>
    )
  }

  // Vue grille — style marketplace/TikTok
  return (
    <a
      href={`/annonces/${annonce.id}`}
      className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 block"
    >
      {/* IMAGE PRINCIPALE */}
      <div className="relative h-56 bg-gray-100 overflow-hidden">
        {annonce.photos?.[0] ? (
          <Image
            src={annonce.photos[0]}
            alt={annonce.titre}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-6xl">
            {TYPE_EMOJI[annonce.type] || '🏠'}
          </div>
        )}

        {/* Gradient overlay du bas */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Type badge en haut à gauche */}
        <span className={`absolute top-3 left-3 ${typeColor} text-white text-xs px-2.5 py-1 rounded-full font-bold capitalize shadow-md`}>
          {annonce.type}
        </span>

        {/* Badge vérifié en haut à droite */}
        <span className={`absolute top-3 right-3 text-xs px-2.5 py-1 rounded-full font-bold shadow-md backdrop-blur-sm ${badge.cls}`}>
          {badge.label}
        </span>

        {/* Prix + localisation sur l'image */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-white font-extrabold text-xl leading-tight drop-shadow">
            {formaterPrix(annonce.prix)}
            {annonce.type === 'location' && <span className="text-white/70 text-sm font-normal"> /mois</span>}
            {annonce.type === 'artisan'  && <span className="text-white/70 text-sm font-normal"> /h</span>}
          </p>
          <p className="text-white/80 text-xs mt-0.5 drop-shadow">📍 {annonce.quartier}, Abidjan</p>
        </div>
      </div>

      {/* INFOS BAS DE CARTE */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 line-clamp-1 text-sm mb-2">{annonce.titre}</h3>
        <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
          {annonce.nb_chambres > 0 && <span className="bg-gray-50 px-2 py-0.5 rounded-full">🛏 {annonce.nb_chambres} ch.</span>}
          {annonce.nb_pieces    > 0 && <span className="bg-gray-50 px-2 py-0.5 rounded-full">🚪 {annonce.nb_pieces}p</span>}
          {annonce.surface           && <span className="bg-gray-50 px-2 py-0.5 rounded-full">📐 {annonce.surface} m²</span>}
          {annonce.meuble            && <span className="bg-gray-50 px-2 py-0.5 rounded-full">🛋️ Meublé</span>}
          {annonce.type_service      && <span className="bg-gray-50 px-2 py-0.5 rounded-full">{annonce.type_service}</span>}
          {annonce.disponibilite     && <span className="bg-gray-50 px-2 py-0.5 rounded-full">🕐 {annonce.disponibilite}</span>}
        </div>
      </div>
    </a>
  )
}
// ─── Page principale ──────────────────────────────────────────────────────────

function AnnoncesContenu() {
  const searchParams = useSearchParams()
  const [annonces, setAnnonces] = useState([])
  const [chargement, setChargement] = useState(true)
  const [vue, setVue] = useState('grille')
  const [tri, setTri] = useState('recent')
  const [filtresMobile, setFiltresMobile] = useState(false)

  const [filtres, setFiltres] = useState(() => ({
    ...FILTRES_VIDES,
    type: searchParams.get('type') || '',
    quartier: searchParams.get('quartier') || '',
    prixMin: searchParams.get('prixMin') || '',
    prixMax: searchParams.get('prixMax') || '',
    nbPieces: searchParams.get('nbPieces') || '',
    meuble: searchParams.get('meuble') || '',
    badge: searchParams.get('badge') || '',
    surfaceMin: searchParams.get('surfaceMin') || '',
    recherche: searchParams.get('recherche') || '',
    nbChambres: searchParams.get('nbChambres') || '',
    typePropriete: searchParams.get('typePropriete') || '',
    typeService: searchParams.get('typeService') || '',
    disponibilite: searchParams.get('disponibilite') || '',
  }))

  // Sync filtres → URL
  useEffect(() => {
    const params = new URLSearchParams()
    Object.entries(filtres).forEach(([k, v]) => { if (v) params.set(k, v) })
    const url = '/annonces' + (params.toString() ? '?' + params.toString() : '')
    window.history.replaceState({}, '', url)
  }, [filtres])

  useEffect(() => {
    async function charger() {
      setChargement(true)
      try {
        const data = await fetchAnnoncesList(filtres, tri)
        setAnnonces(data || [])
      } catch (e) {
        console.error(e)
        setAnnonces([])
      }
      setChargement(false)
    }
    charger()
  }, [filtres, tri])

  // Changer de catégorie : réinitialise TOUS les autres filtres
  const changerCategorie = (nouvelleCategorie) => {
    setFiltres({ ...FILTRES_VIDES, type: nouvelleCategorie })
  }

  // Changer un filtre individuel
  const maj = (key, val) => setFiltres(f => ({ ...f, [key]: val }))

  // Effacer les filtres secondaires (garde la catégorie)
  const effacerFiltres = () => setFiltres({ ...FILTRES_VIDES, type: filtres.type })

  const champsActifs = CHAMPS_FILTRES[filtres.type] || CHAMPS_FILTRES['']

  const nbFiltresActifs = Object.entries(filtres)
    .filter(([k, v]) => k !== 'type' && v)
    .length

  const TITRES = {
    location: 'Logements à louer',
    vente: 'Biens à vendre',
    service: 'Services à domicile',
    artisan: 'Artisans certifiés',
  }
  const titre = TITRES[filtres.type] || 'Toutes les annonces'

  // Panneau de filtres partagé (desktop sidebar + mobile drawer)
  function PanneauFiltres() {
    return (
      <div className="space-y-5">
        {/* Titre + effacer */}
        <div className="flex items-center justify-between">
          <p className="font-bold text-gray-800 text-sm">Filtres</p>
          {nbFiltresActifs > 0 && (
            <button
              type="button"
              onClick={effacerFiltres}
              className="text-xs text-red-500 font-semibold hover:underline"
            >
              Effacer ({nbFiltresActifs})
            </button>
          )}
        </div>

        {/* Champs dynamiques */}
        {champsActifs.map(champ => (
          <ChampFiltre
            key={champ.key}
            champ={champ}
            valeur={filtres[champ.key]}
            onChange={maj}
          />
        ))}

        <button
          type="button"
          onClick={() => setFiltresMobile(false)}
          className="lg:hidden w-full bg-[#1B5E20] text-white py-3 rounded-xl font-bold text-sm"
        >
          Voir les {annonces.length} résultat{annonces.length > 1 ? 's' : ''}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <SiteHeader />

      {/* ── BARRE CATÉGORIES ── */}
      <div className="bg-white border-b border-gray-200 sticky top-[64px] z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => changerCategorie(cat.id)}
                className={`flex items-center gap-1.5 px-5 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-all flex-shrink-0 ${
                  filtres.type === cat.id
                    ? 'border-[#1B5E20] text-[#1B5E20]'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                <span>{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── EN-TÊTE SECTION ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3">
          <div className="flex items-center justify-between gap-3 flex-wrap min-w-0">
            <div className="min-w-0 flex-1 basis-full sm:basis-auto sm:flex-initial">
              <h1 className="text-lg sm:text-xl font-bold text-gray-800 break-words">
                {titre}
                {filtres.quartier && <span className="text-gray-400 font-normal"> · {filtres.quartier}</span>}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {chargement ? 'Recherche en cours…' : `${annonces.length} annonce${annonces.length > 1 ? 's' : ''} trouvée${annonces.length > 1 ? 's' : ''}`}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full min-w-0 sm:w-auto sm:flex-nowrap sm:justify-end">
              {/* Recherche texte */}
              <div className="relative flex-1 min-w-0 sm:flex-initial sm:w-48 max-w-full">
                <input
                  type="text"
                  placeholder="Rechercher…"
                  value={filtres.recherche || ''}
                  onChange={e => maj('recherche', e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm w-full min-w-0 focus:outline-none focus:border-[#1B5E20]"
                />
                {filtres.recherche && (
                  <button
                    type="button"
                    onClick={() => maj('recherche', '')}
                    className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Voir sur la carte */}
              <a
                href={(() => {
                  const p = new URLSearchParams()
                  Object.entries(filtres).forEach(([k, v]) => { if (v) p.set(k, v) })
                  return '/carte' + (p.toString() ? '?' + p.toString() : '')
                })()}
                className="hidden sm:inline-flex items-center gap-1 border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm hover:bg-[#E8F5E9] hover:border-[#1B5E20]"
              >
                🗺️ Carte
              </a>

              {/* Tri */}
              <select
                value={tri}
                onChange={e => setTri(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:border-[#1B5E20]"
              >
                <option value="recent">Plus récentes</option>
                <option value="prixCroissant">Prix ↑</option>
                <option value="prixDecroissant">Prix ↓</option>
                <option value="populaire">Populaires</option>
              </select>

              {/* Vue grille/liste */}
              <div className="hidden md:flex border border-gray-200 rounded-lg overflow-hidden">
                <button type="button" onClick={() => setVue('grille')}
                  className={`px-3 py-2 text-sm ${vue === 'grille' ? 'bg-[#1B5E20] text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                  aria-label="Vue grille">▦</button>
                <button type="button" onClick={() => setVue('liste')}
                  className={`px-3 py-2 text-sm ${vue === 'liste' ? 'bg-[#1B5E20] text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                  aria-label="Vue liste">☰</button>
              </div>

              {/* Bouton filtres mobile */}
              <button
                type="button"
                onClick={() => setFiltresMobile(true)}
                className="lg:hidden flex items-center gap-1 bg-[#1B5E20] text-white px-3 py-2 rounded-lg text-sm font-bold"
              >
                Filtres {nbFiltresActifs > 0 && <span className="bg-white text-[#1B5E20] rounded-full w-4 h-4 text-xs flex items-center justify-center">{nbFiltresActifs}</span>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENU ── */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="flex gap-6">

          {/* SIDEBAR desktop */}
          <aside className={`${filtresMobile ? 'fixed inset-0 z-50 bg-black/50' : 'hidden'} lg:block lg:static lg:bg-transparent`}
            onClick={e => e.target === e.currentTarget && setFiltresMobile(false)}
          >
            <div className={`
              ${filtresMobile ? 'absolute right-0 top-0 bottom-0 w-80 max-w-[90vw] bg-white overflow-y-auto p-5 shadow-xl' : ''}
              lg:w-64 lg:sticky lg:top-32 lg:self-start lg:bg-white lg:rounded-xl lg:p-5 lg:border lg:border-gray-100
            `}>
              <PanneauFiltres />
            </div>
          </aside>

          {/* GRILLE / LISTE */}
          <div className="flex-1 min-w-0">
            {chargement ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-72 bg-white rounded-xl border border-gray-100 animate-pulse" />
                ))}
              </div>
            ) : annonces.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
                <div className="text-5xl mb-4">🔍</div>
                <h2 className="text-xl font-bold text-gray-700 mb-2">Aucune annonce trouvée</h2>
                <p className="text-gray-400 mb-6">Modifiez ou effacez vos filtres pour voir plus de résultats.</p>
                <button type="button" onClick={effacerFiltres}
                  className="bg-[#1B5E20] text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-green-800">
                  Effacer les filtres
                </button>
              </div>
            ) : vue === 'grille' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {annonces.map(a => <CarteAnnonce key={a.id} annonce={a} vue="grille" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {annonces.map(a => <CarteAnnonce key={a.id} annonce={a} vue="liste" />)}
              </div>
            )}
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}

export default function AnnoncesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center text-gray-400">
        Chargement des annonces…
      </div>
    }>
      <AnnoncesContenu />
    </Suspense>
  )
}
