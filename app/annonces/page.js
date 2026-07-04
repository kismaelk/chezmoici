'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import ListingAnnonceActions from '@/app/components/ListingAnnonceActions'
import { ListingCardSkeletonGrid, ListingCardSkeletonRow } from '@/app/components/ListingCardSkeleton'
import {
  mergeListingFiltersFromUrl,
  loadListingPrefs,
  saveListingState,
} from '@/lib/listingFiltersPersist'
import { fetchAnnoncesList, fetchAvisStatsForAnnonces } from '@/lib/firestoreApp'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'
import { VILLES_OPTIONS, getCommunesParVille } from '@/lib/civGeo'

// ─── Définition des filtres par catégorie ────────────────────────────────────

const CATEGORIES = [
  { id: '', label: 'Tout', emoji: '🔎' },
  { id: 'location', label: 'Location', emoji: '🔑' },
  { id: 'vente', label: 'Vente', emoji: '🏠' },
  { id: 'prestations', label: 'Services & Pro', emoji: '🛠️' },
]

/** Filtre métier / prestation (services à domicile + artisans) */
const OPTIONS_PRESTATION = [
  ...[
    'Nettoyage', 'Déménagement', 'Jardinage', 'Sécurité / Gardiennage', 'Livraison',
    'Décoration intérieure', 'Photographie immobilière',
  ],
  ...[
    'Électricien', 'Plombier', 'Menuisier', 'Carreleur', 'Peintre', 'Maçon',
    'Climatiseur', 'Soudeur', 'Ferrailleur',
  ],
].map((v) => ({ value: v, label: v }))

// Les champs de filtre propres à chaque catégorie
const CHAMPS_FILTRES = {
  '': [
    { key: 'ville', label: 'Ville', type: 'select', options: VILLES_OPTIONS.map(v => ({ value: v, label: v })) },
    { key: 'quartier', label: 'Commune / Quartier', type: 'select', options: [] },
    { key: 'prixMax', label: 'Budget max (FCFA)', type: 'number', placeholder: 'Ex : 500 000' },
    { key: 'badge', label: 'Niveau vérification', type: 'radio', options: [
      { value: '', label: 'Tous' },
      { value: 'bronze', label: '🔓 Bronze' },
      { value: 'argent', label: '🥈 Argent' },
      { value: 'or', label: '🥇 Or' },
    ]},
  ],
  location: [
    { key: 'ville', label: 'Ville', type: 'select', options: VILLES_OPTIONS.map(v => ({ value: v, label: v })) },
    { key: 'quartier', label: 'Commune / Quartier', type: 'select', options: [] },
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
    { key: 'ville', label: 'Ville', type: 'select', options: VILLES_OPTIONS.map(v => ({ value: v, label: v })) },
    { key: 'quartier', label: 'Commune / Quartier', type: 'select', options: [] },
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
  prestations: [
    { key: 'ville', label: 'Ville', type: 'select', options: VILLES_OPTIONS.map(v => ({ value: v, label: v })) },
    { key: 'quartier', label: 'Zone / Commune', type: 'select', options: [] },
    { key: 'typeService', label: 'Service ou métier', type: 'select', options: OPTIONS_PRESTATION },
    { key: 'prixMax', label: 'Budget ou tarif max (FCFA)', type: 'number', placeholder: 'Ex : 50 000' },
    { key: 'disponibilite', label: 'Disponibilité', type: 'chips', options: [
      { value: '', label: 'Toutes' },
      { value: 'Disponible maintenant', label: 'Dispo maintenant' },
      { value: '7j/7', label: '7j/7' },
      { value: 'Sur rendez-vous', label: 'Sur RDV' },
      { value: 'Lun – Ven', label: 'Lun–Ven' },
    ]},
    { key: 'badge', label: 'Badge', type: 'radio', options: [
      { value: '', label: 'Tous' },
      { value: 'bronze', label: '🔓 Bronze' },
      { value: 'argent', label: '🥈 Argent' },
      { value: 'or', label: '🥇 Or' },
    ]},
  ],
}

const FILTRES_VIDES = {
  type: '',
  ville: 'Abidjan',
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

const TYPE_COLOR = {
  location: 'bg-emerald-500',
  vente:    'bg-blue-500',
  service:  'bg-orange-500',
  artisan:  'bg-purple-500',
}
const TYPE_EMOJI = { location: '🔑', vente: '🏠', service: '🔧', artisan: '👷' }

const SERVICE_ICON = {
  'Électricien': '⚡', 'Plombier': '🚿', 'Menuisier': '🪚',
  'Carreleur': '🪣', 'Peintre': '🖌️', 'Maçon': '🧱',
  'Climatiseur': '❄️', 'Soudeur': '🔥', 'Ferrailleur': '⚙️',
  'Nettoyage': '🧹', 'Déménagement': '🚛', 'Jardinage': '🌿',
  'Sécurité / Gardiennage': '🛡️', 'Livraison': '📦',
  'Décoration intérieure': '🎨', 'Photographie immobilière': '📸',
}

function getPlaceholderIcon(annonce) {
  if (annonce.type === 'service' || annonce.type === 'artisan') {
    return SERVICE_ICON[annonce.type_service] || TYPE_EMOJI[annonce.type]
  }
  return '🏠'
}
const BADGE_STYLE = {
  bronze: { label: '🔓 Bronze', cls: 'bg-amber-50 text-amber-700' },
  argent: { label: '🥈 Argent', cls: 'bg-gray-100 text-gray-700' },
  or:     { label: '🥇 Or',     cls: 'bg-yellow-50 text-yellow-700' },
}

function CarteAnnonce({ annonce, vue, avisStat, filtresPourCarte = {} }) {
  const badge = BADGE_STYLE[annonce.badge] || BADGE_STYLE.bronze
  const typeColor = TYPE_COLOR[annonce.type] || 'bg-gray-500'
  const nbVues = annonce.nb_vues || 0
  const moyenneAvis = avisStat?.moyenne || 0
  const totalAvis = avisStat?.total || 0
  const topNote = moyenneAvis >= 4.5 && totalAvis > 0

  const hrefDetail = `/annonces/${annonce.id}`

  if (vue === 'liste') {
    return (
      <div className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl sm:flex-row">
        <Link
          href={hrefDetail}
          className="flex min-w-0 flex-1 flex-col sm:flex-row"
        >
          <div className="relative h-48 w-full flex-shrink-0 overflow-hidden bg-gray-100 sm:h-auto sm:w-52">
            {annonce.photos?.[0] ? (
              <Image
                src={annonce.photos[0]}
                alt={annonce.titre}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="208px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-6xl">
                {getPlaceholderIcon(annonce)}
              </div>
            )}
            <span className={`absolute left-3 top-3 ${typeColor} rounded-full px-2.5 py-1 text-xs font-bold capitalize text-white shadow-sm`}>
              {annonce.type}
            </span>
            {topNote && (
              <span className="absolute right-3 top-3 rounded-full bg-fuchsia-600 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
                Top noté
              </span>
            )}
          </div>
          <div className="flex flex-1 flex-col p-5">
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <h3 className="line-clamp-1 text-base font-bold text-gray-900">{annonce.titre}</h3>
              <span className={`flex-shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${badge.cls}`}>
                {badge.label}
              </span>
            </div>
            <p className="mb-2 text-sm text-gray-400">📍 {annonce.quartier}, Abidjan</p>
            <p className="line-clamp-2 text-sm text-gray-500">{annonce.description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
              {annonce.nb_chambres > 0 && <span className="flex items-center gap-1">🛏 {annonce.nb_chambres} ch.</span>}
              {annonce.nb_pieces    > 0 && <span className="flex items-center gap-1">🚪 {annonce.nb_pieces}p</span>}
              {annonce.surface           && <span className="flex items-center gap-1">📐 {annonce.surface} m²</span>}
              {annonce.meuble            && <span className="flex items-center gap-1">🛋️ Meublé</span>}
              {annonce.type_service      && <span className="flex items-center gap-1">🔧 {annonce.type_service}</span>}
              {annonce.disponibilite     && <span className="flex items-center gap-1">🕐 {annonce.disponibilite}</span>}
              <span className="flex items-center gap-1">👁️ {nbVues} clics</span>
              <span className="flex items-center gap-1">
                {totalAvis > 0 ? `${renderStars(moyenneAvis)} ${moyenneAvis.toFixed(1).replace('.', ',')} (${totalAvis})` : '☆☆☆☆☆ 0 avis'}
              </span>
            </div>
            <div className="mt-auto flex items-end justify-between gap-3 pt-4">
              <p className="text-xl font-extrabold text-[#1B5E20]">
                {formaterPrix(annonce.prix)}
                {annonce.type === 'location' && <span className="text-sm font-normal text-gray-400"> /mois</span>}
                {annonce.type === 'artisan'  && <span className="text-sm font-normal text-gray-400"> /h</span>}
              </p>
              <span className="rounded-full bg-[#1B5E20] px-3 py-1.5 text-xs font-bold text-white transition-colors group-hover:bg-[#2E7D32]">
                Détails →
              </span>
            </div>
          </div>
        </Link>
        <ListingAnnonceActions
          annonceId={annonce.id}
          filtresPourCarte={filtresPourCarte}
          className="border-t border-gray-100 sm:w-[5.25rem] sm:border-l sm:border-t-0"
        />
      </div>
    )
  }

  // Vue grille — style marketplace/TikTok
  return (
    <div className="group relative block overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
      <Link href={hrefDetail} className="block">
        {/* IMAGE PRINCIPALE */}
        <div className="relative h-56 overflow-hidden bg-gray-100">
          {annonce.photos?.[0] ? (
            <Image
              src={annonce.photos[0]}
              alt={annonce.titre}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-6xl">
              {getPlaceholderIcon(annonce)}
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          <span className={`absolute left-3 top-3 ${typeColor} rounded-full px-2.5 py-1 text-xs font-bold capitalize text-white shadow-md`}>
            {annonce.type}
          </span>

          <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold shadow-md backdrop-blur-sm ${badge.cls}`}>
            {badge.label}
          </span>
          {topNote && (
            <span className="absolute right-3 top-11 rounded-full bg-fuchsia-600 px-2 py-1 text-[10px] font-bold text-white shadow-md">
              Top noté
            </span>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="text-xl font-extrabold leading-tight text-white drop-shadow">
              {formaterPrix(annonce.prix)}
              {annonce.type === 'location' && <span className="text-sm font-normal text-white/70"> /mois</span>}
              {annonce.type === 'artisan'  && <span className="text-sm font-normal text-white/70"> /h</span>}
            </p>
            <p className="mt-0.5 text-xs text-white/80 drop-shadow">📍 {annonce.quartier}, Abidjan</p>
          </div>
        </div>

        <div className="p-4">
          <h3 className="mb-2 line-clamp-1 text-sm font-bold text-gray-900">{annonce.titre}</h3>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
            {annonce.nb_chambres > 0 && <span className="rounded-full bg-gray-50 px-2 py-0.5">🛏 {annonce.nb_chambres} ch.</span>}
            {annonce.nb_pieces    > 0 && <span className="rounded-full bg-gray-50 px-2 py-0.5">🚪 {annonce.nb_pieces}p</span>}
            {annonce.surface           && <span className="rounded-full bg-gray-50 px-2 py-0.5">📐 {annonce.surface} m²</span>}
            {annonce.meuble            && <span className="rounded-full bg-gray-50 px-2 py-0.5">🛋️ Meublé</span>}
            {annonce.type_service      && <span className="rounded-full bg-gray-50 px-2 py-0.5">{annonce.type_service}</span>}
            {annonce.disponibilite     && <span className="rounded-full bg-gray-50 px-2 py-0.5">🕐 {annonce.disponibilite}</span>}
            <span className="rounded-full bg-gray-50 px-2 py-0.5">👁️ {nbVues} clics</span>
            <span className="rounded-full bg-gray-50 px-2 py-0.5">
              {totalAvis > 0 ? `⭐ ${moyenneAvis.toFixed(1).replace('.', ',')} (${totalAvis})` : '☆☆☆☆☆'}
            </span>
          </div>
        </div>
      </Link>
      <ListingAnnonceActions annonceId={annonce.id} filtresPourCarte={filtresPourCarte} layout="footer" />
    </div>
  )
}
// ─── Page principale ──────────────────────────────────────────────────────────

function AnnoncesContenu() {
  const searchParams = useSearchParams()
  const searchParamsString = searchParams.toString()
  const skipNextUrlSyncRef = useRef(false)
  const [annonces, setAnnonces] = useState([])
  const [chargement, setChargement] = useState(true)
  const [vue, setVue] = useState('grille')
  const [tri, setTri] = useState('recent')
  const [filtresHydrates, setFiltresHydrates] = useState(false)
  const [filtresMobile, setFiltresMobile] = useState(false)
  const [avisStats, setAvisStats] = useState({})

  const [filtres, setFiltres] = useState(() => ({
    ...FILTRES_VIDES,
    type: searchParams.get('type') || '',
    ville: searchParams.get('ville') || 'Abidjan',
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

  useEffect(() => {
    const merged = mergeListingFiltersFromUrl(new URLSearchParams(searchParamsString), FILTRES_VIDES)
    if (searchParamsString) {
      skipNextUrlSyncRef.current = true
    }
    setFiltres(merged)
    if (!searchParamsString) {
      const prefs = loadListingPrefs()
      setVue(prefs.vue)
      setTri(prefs.tri)
    }
    setFiltresHydrates(true)
  }, [searchParamsString])

  useEffect(() => {
    if (!filtresHydrates) return
    saveListingState(filtres, { vue, tri })
  }, [filtres, vue, tri, filtresHydrates])

  // Sync filtres → URL
  useEffect(() => {
    if (!filtresHydrates) return
    const params = new URLSearchParams()
    Object.entries(filtres).forEach(([k, v]) => { if (v) params.set(k, v) })
    const url = '/annonces' + (params.toString() ? '?' + params.toString() : '')
    if (skipNextUrlSyncRef.current) {
      skipNextUrlSyncRef.current = false
      return
    }
    window.history.replaceState({}, '', url)
  }, [filtres, filtresHydrates])

  useEffect(() => {
    if (!filtresHydrates) return
    async function charger() {
      setChargement(true)
      try {
        const data = await fetchAnnoncesList(filtres, tri === 'mieuxNotes' ? 'recent' : tri)
        const ids = (data || []).map((a) => a.id).filter(Boolean)
        const stats = await fetchAvisStatsForAnnonces(ids)
        const sorted = tri === 'mieuxNotes'
          ? [...(data || [])].sort((a, b) => {
              const sa = stats[a.id] || { moyenne: 0, total: 0 }
              const sb = stats[b.id] || { moyenne: 0, total: 0 }
              if (sb.moyenne !== sa.moyenne) return sb.moyenne - sa.moyenne
              if (sb.total !== sa.total) return sb.total - sa.total
              return (b.nb_vues || 0) - (a.nb_vues || 0)
            })
          : (data || [])
        setAnnonces(sorted)
        setAvisStats(stats)
      } catch (e) {
        console.error(e)
        setAnnonces([])
        setAvisStats({})
      }
      setChargement(false)
    }
    charger()
  }, [filtres, tri, filtresHydrates])

  // Changer de catégorie : réinitialise TOUS les autres filtres
  const changerCategorie = (nouvelleCategorie) => {
    setFiltres({ ...FILTRES_VIDES, type: nouvelleCategorie })
  }

  // Changer un filtre individuel
  const maj = (key, val) => {
    if (key === 'ville') {
      setFiltres((f) => ({ ...f, ville: val, quartier: '' }))
      return
    }
    setFiltres((f) => ({ ...f, [key]: val }))
  }

  // Effacer les filtres secondaires (garde la catégorie)
  const effacerFiltres = () => setFiltres({ ...FILTRES_VIDES, type: filtres.type })

  const communesOptions = getCommunesParVille(filtres.ville || 'Abidjan').map((q) => ({ value: q, label: q }))

  const champsActifs =
    (filtres.type && CHAMPS_FILTRES[filtres.type]) ||
    (['service', 'artisan'].includes(filtres.type) ? CHAMPS_FILTRES.prestations : CHAMPS_FILTRES[''])

  const champsActifsFinal = champsActifs.map((c) =>
    c.key === 'quartier' ? { ...c, options: communesOptions } : c
  )

  const ongletCategorieActif = (catId) =>
    filtres.type === catId ||
    (catId === 'prestations' && ['service', 'artisan'].includes(filtres.type))

  const nbFiltresActifs = Object.entries(filtres)
    .filter(([k, v]) => k !== 'type' && v)
    .length

  const TITRES = {
    location: 'Logements à louer',
    vente: 'Biens à vendre',
    prestations: 'Prestataires & artisans',
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
        {champsActifsFinal.map(champ => (
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
                  ongletCategorieActif(cat.id)
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
                <option value="mieuxNotes">Mieux notées</option>
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
            {chargement || !filtresHydrates ? (
              vue === 'liste' ? (
                <ListingCardSkeletonRow count={6} />
              ) : (
                <ListingCardSkeletonGrid count={6} />
              )
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
                {annonces.map((a) => (
                  <CarteAnnonce key={a.id} annonce={a} avisStat={avisStats[a.id]} vue="grille" filtresPourCarte={filtres} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {annonces.map((a) => (
                  <CarteAnnonce key={a.id} annonce={a} avisStat={avisStats[a.id]} vue="liste" filtresPourCarte={filtres} />
                ))}
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
      <div className="min-h-screen bg-[#F5F5F5] px-4 py-8 max-w-7xl mx-auto">
        <ListingCardSkeletonGrid count={6} />
      </div>
    }>
      <AnnoncesContenu />
    </Suspense>
  )
}
