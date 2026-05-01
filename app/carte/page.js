'use client'

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { fetchAnnoncesList } from '@/lib/firestoreApp'
import SiteHeader from '@/app/components/SiteHeader'

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function formaterPrix(p) {
  if (!p) return '—'
  if (p >= 1_000_000) {
    const m = p / 1_000_000
    const s = Number.isInteger(m) ? String(m) : m.toFixed(1).replace('.', ',')
    return s + (m >= 2 ? ' millions' : ' million') + ' FCFA'
  }
  return p.toLocaleString('fr-FR') + ' FCFA'
}

const TYPE_COLORS = {
  vente:    { bg: '#2563EB', border: '#1D4ED8', text: 'white' },
  location: { bg: '#059669', border: '#047857', text: 'white' },
  service:  { bg: '#EA580C', border: '#C2410C', text: 'white' },
  artisan:  { bg: '#7C3AED', border: '#6D28D9', text: 'white' },
}

const SERVICE_ICON = {
  'Électricien': '⚡', 'Plombier': '🚿', 'Menuisier': '🪚',
  'Carreleur': '🪣', 'Peintre': '🖌️', 'Maçon': '🧱',
  'Climatiseur': '❄️', 'Soudeur': '🔥', 'Ferrailleur': '⚙️',
  'Nettoyage': '🧹', 'Déménagement': '🚛', 'Jardinage': '🌿',
  'Sécurité / Gardiennage': '🛡️', 'Livraison': '📦',
  'Décoration intérieure': '🎨', 'Photographie immobilière': '📸',
}

function getMarkerEmoji(annonce) {
  if ((annonce.type === 'service' || annonce.type === 'artisan') && annonce.type_service) {
    return SERVICE_ICON[annonce.type_service] || (annonce.type === 'service' ? '🔧' : '👷')
  }
  return { location: '🔑', vente: '🏠', service: '🔧', artisan: '🛠️' }[annonce.type] || '📍'
}

/** Centre d’Abidjan au chargement — [longitude, latitude] (Mapbox) */
const ABIDJAN_CENTER = [-4.021, 5.325]
const ABIDJAN_DEFAULT_ZOOM = 11.5

const COORDS_QUARTIER = {
  Cocody:        [-3.98,   5.36],
  Plateau:       [-4.0167, 5.3167],
  Marcory:       [-4.0,    5.2833],
  Yopougon:      [-4.0833, 5.3333],
  Bingerville:   [-3.8833, 5.35],
  Adjamé:        [-4.0333, 5.3667],
  Abobo:         [-4.0167, 5.4167],
  Koumassi:      [-3.9667, 5.2667],
  Treichville:   [-4.0167, 5.2833],
  'Port-Bouët':  [-3.9333, 5.25],
  Riviera:       [-3.95,   5.37],
  Angré:         [-3.97,   5.38],
}

function getAnnonceCoords(annonce) {
  if (
    annonce.longitude != null && annonce.latitude != null &&
    !isNaN(Number(annonce.longitude)) && !isNaN(Number(annonce.latitude))
  ) {
    return [Number(annonce.longitude), Number(annonce.latitude)]
  }
  return COORDS_QUARTIER[annonce.quartier] || null
}

// ─── Création du marqueur HTML ─────────────────────────────────────────────────

function createMarkerElement(annonce, selected = false) {
  const col = TYPE_COLORS[annonce.type] || TYPE_COLORS.vente
  const emoji = getMarkerEmoji(annonce)
  const size = selected ? 46 : 36

  const el = document.createElement('button')
  el.type = 'button'
  el.setAttribute('aria-label', annonce.titre)
  el.style.cssText = `
    all: unset;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    outline: none;
  `

  // Corps de la gouttelette / pin
  const pin = document.createElement('div')
  pin.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    background: ${selected ? '#F59E0B' : col.bg};
    border: 3px solid ${selected ? '#92400E' : col.border};
    box-shadow: 0 4px 14px rgba(0,0,0,${selected ? '0.45' : '0.3'});
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  `

  const inner = document.createElement('span')
  inner.style.cssText = `
    transform: rotate(45deg);
    font-size: ${selected ? 20 : 16}px;
    line-height: 1;
    display: block;
    user-select: none;
  `
  inner.textContent = emoji

  pin.appendChild(inner)
  el.appendChild(pin)

  // Hover effect
  el.addEventListener('mouseenter', () => {
    pin.style.transform = 'rotate(-45deg) scale(1.15)'
    pin.style.boxShadow = '0 6px 20px rgba(0,0,0,0.45)'
  })
  el.addEventListener('mouseleave', () => {
    pin.style.transform = 'rotate(-45deg) scale(1)'
    pin.style.boxShadow = `0 4px 14px rgba(0,0,0,${selected ? '0.45' : '0.3'})`
  })

  return el
}

// ─── Composant principal ───────────────────────────────────────────────────────

function CarteMapbox() {
  const searchParams = useSearchParams()
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const mapboxglRef = useRef(null)
  const domMarkersRef = useRef(new Map()) // id → { marker, annonce, el }
  const [annonces, setAnnonces] = useState([])
  const [selectionne, setSelectionne] = useState(null)
  const selectionneRef = useRef(null)
  const [chargement, setChargement] = useState(true)
  const [mapReady, setMapReady] = useState(false)
  const [erreur, setErreur] = useState('')
  const [showListMobile, setShowListMobile] = useState(false)
  /** Filtres carte : affichés par défaut ; bouton pour les masquer (mobile + desktop) */
  const [filtresVisibles, setFiltresVisibles] = useState(true)

  const [filtresCarte, setFiltresCarte] = useState({
    type: '', prixMin: '', prixMax: '', beds: '', baths: '',
  })

  const filtresURL = useMemo(() => ({
    type:          searchParams.get('type')          || '',
    quartier:      searchParams.get('quartier')      || '',
    prixMin:       searchParams.get('prixMin')       || '',
    prixMax:       searchParams.get('prixMax')       || '',
    nbPieces:      searchParams.get('nbPieces')      || '',
    nbChambres:    searchParams.get('nbChambres')    || '',
    meuble:        searchParams.get('meuble')        || '',
    badge:         searchParams.get('badge')         || '',
    surfaceMin:    searchParams.get('surfaceMin')    || '',
    recherche:     searchParams.get('recherche')     || '',
    typePropriete: searchParams.get('typePropriete') || '',
    typeService:   searchParams.get('typeService')   || '',
    disponibilite: searchParams.get('disponibilite') || '',
  }), [searchParams])

  useEffect(() => {
    setFiltresCarte((prev) => ({
      ...prev,
      type:    filtresURL.type      || prev.type,
      prixMin: filtresURL.prixMin   || prev.prixMin,
      prixMax: filtresURL.prixMax   || prev.prixMax,
      beds:    filtresURL.nbChambres || prev.beds,
      baths:   filtresURL.nbPieces  || prev.baths,
    }))
  }, [filtresURL.type, filtresURL.prixMin, filtresURL.prixMax, filtresURL.nbChambres, filtresURL.nbPieces])

  const lienListe = useMemo(() => {
    const p = new URLSearchParams()
    Object.entries(filtresURL).forEach(([k, v]) => { if (v) p.set(k, v) })
    return '/annonces' + (p.toString() ? '?' + p.toString() : '')
  }, [filtresURL])

  // Chargement des annonces
  useEffect(() => {
    async function charger() {
      setChargement(true)
      try {
        const data = await fetchAnnoncesList(filtresURL, 'recent')
        setAnnonces((data || []).slice(0, 400))
      } catch {
        setAnnonces([])
      }
      setChargement(false)
    }
    charger()
  }, [filtresURL])

  const annoncesFiltrees = useMemo(() => {
    const prixMin = Number(filtresCarte.prixMin || 0)
    const prixMax = Number(filtresCarte.prixMax || 0)
    const beds    = Number(filtresCarte.beds    || 0)
    const baths   = Number(filtresCarte.baths   || 0)
    return annonces.filter((a) => {
      if (filtresCarte.type && a.type !== filtresCarte.type) return false
      if (prixMin > 0 && Number(a.prix || 0) < prixMin) return false
      if (prixMax > 0 && Number(a.prix || 0) > prixMax) return false
      if (beds  > 0 && Number(a.nb_chambres || 0) < beds)  return false
      if (baths > 0 && Number(a.nb_pieces   || 0) < baths) return false
      return true
    })
  }, [annonces, filtresCarte])

  const selectionIndex = useMemo(
    () => annoncesFiltrees.findIndex((a) => a.id === selectionne?.id),
    [annoncesFiltrees, selectionne?.id],
  )

  // Maintenir selectionneRef à jour (utilisé dans les callbacks carte)
  useEffect(() => { selectionneRef.current = selectionne }, [selectionne])

  const allerAnnonce = useCallback((annonce) => {
    if (!annonce) return
    setSelectionne(annonce)
    const coords = getAnnonceCoords(annonce)
    if (coords && mapRef.current) {
      mapRef.current.flyTo({ center: coords, zoom: Math.max(mapRef.current.getZoom(), 14), duration: 700 })
    }
  }, [])

  const allerSuivante   = () => { if (selectionIndex >= 0 && selectionIndex < annoncesFiltrees.length - 1) allerAnnonce(annoncesFiltrees[selectionIndex + 1]) }
  const allerPrecedente = () => { if (selectionIndex > 0) allerAnnonce(annoncesFiltrees[selectionIndex - 1]) }

  // Mise à jour visibilité marqueurs DOM selon état cluster
  const syncMarkerVisibility = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    try {
      const unclustered = map.querySourceFeatures('annonces-source', {
        filter: ['!', ['has', 'point_count']],
      })
      const visibles = new Set(unclustered.map((f) => f.properties?.annonceId).filter(Boolean))
      domMarkersRef.current.forEach(({ marker }, id) => {
        marker.getElement().style.display = visibles.has(id) ? '' : 'none'
      })
    } catch { /* ignore — source pas encore prête */ }
  }, [])

  // Initialisation Mapbox (1 seule fois)
  useEffect(() => {
    if (chargement || !mapContainer.current || mapRef.current) return
    const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!TOKEN) {
      setErreur('Token Mapbox manquant. Ajoutez NEXT_PUBLIC_MAPBOX_TOKEN dans vos variables d\'environnement.')
      return
    }

    let cancelled = false

    async function initMap() {
      try {
        const mapboxgl = (await import('mapbox-gl')).default
        if (cancelled || !mapContainer.current) return

        mapboxgl.accessToken = TOKEN
        const map = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: ABIDJAN_CENTER,
          zoom: ABIDJAN_DEFAULT_ZOOM,
          language: 'fr',
        })

        map.addControl(new mapboxgl.NavigationControl(), 'top-right')
        map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left')
        map.addControl(
          new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }),
          'top-right',
        )

        map.on('load', () => {
          if (cancelled) return

          // ── Source GeoJSON avec clustering ──────────────────────────
          map.addSource('annonces-source', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
            cluster: true,
            clusterMaxZoom: 13,
            clusterRadius: 50,
          })

          // Cercles de cluster
          map.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'annonces-source',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': [
                'step', ['get', 'point_count'],
                '#1B5E20', 10, '#059669', 30, '#047857',
              ],
              'circle-radius': ['step', ['get', 'point_count'], 20, 10, 26, 30, 32],
              'circle-stroke-width': 3,
              'circle-stroke-color': '#ffffff',
            },
          })

          // Compteur dans le cluster
          map.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'annonces-source',
            filter: ['has', 'point_count'],
            layout: {
              'text-field': ['get', 'point_count_abbreviated'],
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
              'text-size': 13,
            },
            paint: { 'text-color': '#ffffff' },
          })

          // Clic cluster → zoom pour déplier
          map.on('click', 'clusters', (e) => {
            const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })
            const clusterId = features?.[0]?.properties?.cluster_id
            const source = map.getSource('annonces-source')
            if (!source || clusterId == null) return
            source.getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err) return
              map.easeTo({ center: features[0].geometry.coordinates, zoom })
            })
          })
          map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer' })
          map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = '' })

          // Synchroniser la visibilité des marqueurs DOM sur chaque rendu
          map.on('render', syncMarkerVisibility)

          mapRef.current = map
          mapboxglRef.current = mapboxgl
          setMapReady(true)
        })
      } catch (e) {
        if (!cancelled) {
          console.error('[Mapbox]', e)
          setErreur('Impossible d\'afficher la carte. Vérifiez la connexion.')
        }
      }
    }

    initMap()
    return () => {
      cancelled = true
      domMarkersRef.current.forEach(({ marker }) => {
        try { marker.remove() } catch { /* ignore */ }
      })
      domMarkersRef.current.clear()
      if (mapRef.current) {
        try { mapRef.current.remove() } catch { /* ignore */ }
        mapRef.current = null
      }
      setMapReady(false)
      mapboxglRef.current = null
    }
  }, [chargement, syncMarkerVisibility])

  // Gérer les marqueurs DOM + source GeoJSON quand les annonces filtrées changent
  useEffect(() => {
    if (!mapReady || !mapRef.current || !mapboxglRef.current) return
    const map = mapRef.current
    const mapboxgl = mapboxglRef.current

    // ── Mettre à jour la source GeoJSON (pour le clustering) ─────────
    const src = map.getSource('annonces-source')
    if (src) {
      const features = annoncesFiltrees
        .map((a) => {
          const coords = getAnnonceCoords(a)
          if (!coords) return null
          return {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: coords },
            properties: { annonceId: String(a.id) },
          }
        })
        .filter(Boolean)
      src.setData({ type: 'FeatureCollection', features })
    }

    // ── Supprimer les anciens marqueurs DOM ───────────────────────────
    domMarkersRef.current.forEach(({ marker }) => {
      try { marker.remove() } catch { /* ignore */ }
    })
    domMarkersRef.current.clear()

    // ── Créer un marqueur DOM pour chaque annonce ─────────────────────
    annoncesFiltrees.forEach((annonce) => {
      const coords = getAnnonceCoords(annonce)
      if (!coords) return

      const isSelected = selectionneRef.current?.id === annonce.id
      const el = createMarkerElement(annonce, isSelected)
      // Caché par défaut — syncMarkerVisibility le rendra visible si non-clustérisé
      el.style.display = 'none'

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat(coords)
        .addTo(map)

      el.addEventListener('click', () => {
        setSelectionne(annonce)
        map.flyTo({ center: coords, zoom: Math.max(map.getZoom(), 14), duration: 600 })
      })

      domMarkersRef.current.set(String(annonce.id), { marker, annonce, el })
    })

    // Forcer une synchro de visibilité immédiate
    setTimeout(syncMarkerVisibility, 100)
  }, [annoncesFiltrees, mapReady, syncMarkerVisibility])

  // Mettre à jour visuellement le marqueur sélectionné
  useEffect(() => {
    if (!mapReady) return
    domMarkersRef.current.forEach(({ marker, annonce }, id) => {
      const isSelected = selectionne?.id === annonce.id
      const el = marker.getElement()
      const pin = el.querySelector('div')
      if (!pin) return

      const col = TYPE_COLORS[annonce.type] || TYPE_COLORS.vente
      const size = isSelected ? 46 : 36
      pin.style.width = `${size}px`
      pin.style.height = `${size}px`
      pin.style.background = isSelected ? '#F59E0B' : col.bg
      pin.style.border = `3px solid ${isSelected ? '#92400E' : col.border}`
      pin.style.boxShadow = `0 4px 14px rgba(0,0,0,${isSelected ? '0.45' : '0.3'})`

      const inner = pin.querySelector('span')
      if (inner) inner.style.fontSize = isSelected ? '20px' : '16px'
    })
  }, [selectionne, mapReady])

  function updateSelection(annonce, entry) {
    if (!entry) return
    setSelectionne(annonce)
    const coords = getAnnonceCoords(annonce)
    if (coords && mapRef.current) {
      mapRef.current.flyTo({ center: coords, zoom: Math.max(mapRef.current.getZoom(), 14), duration: 600 })
    }
  }

  const badgeLabel = { bronze: '🔓 Bronze', argent: '🥈 Argent', or: '🥇 Or' }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#F5F5F5]">
      <SiteHeader />

      {/* Barre titre + lien liste */}
      <div className="relative z-[600] flex flex-shrink-0 items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-bold text-gray-700">🗺️ Carte interactive</span>
          {!chargement && (
            <span className="text-xs text-gray-400 flex-shrink-0">
              {annoncesFiltrees.length} annonce{annoncesFiltrees.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <a
          href={lienListe}
          className="hidden md:flex flex-shrink-0 items-center gap-1.5 bg-[#1B5E20] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-800 transition-colors"
        >
          ☰ Voir en liste
        </a>
        <button
          type="button"
          onClick={() => setShowListMobile((v) => !v)}
          className="md:hidden flex-shrink-0 flex items-center gap-1 bg-[#1B5E20] text-white px-3 py-1.5 rounded-lg text-xs font-bold"
        >
          {showListMobile ? '🗺️ Carte' : '☰ Liste'}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">

        {/* Colonne listing — scroll isolé (ne fait pas défiler la page ni la carte) */}
        <div
          className={`${
            showListMobile ? 'flex' : 'hidden'
          } md:flex min-h-0 w-full flex-shrink-0 flex-col overflow-hidden border-t border-gray-100 bg-white md:w-[260px] md:max-h-none md:border-t-0 md:border-r max-h-[42vh] md:max-h-full`}
        >
          <div className="flex-shrink-0 border-b border-gray-100 p-3">
            <h2 className="font-bold text-gray-800 text-sm">
              {chargement ? 'Chargement...' : `${annoncesFiltrees.length} résultats`}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Cliquez une annonce pour zoomer</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable]">
            {annoncesFiltrees.length === 0 && !chargement ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-4xl mb-2">🔍</p>
                <p className="text-sm">Aucune annonce trouvée</p>
              </div>
            ) : (
              annoncesFiltrees.slice(0, 80).map((annonce) => {
                const estSel = selectionne?.id === annonce.id
                const col = TYPE_COLORS[annonce.type] || TYPE_COLORS.vente
                return (
                  <button
                    key={annonce.id}
                    type="button"
                    onClick={() => allerAnnonce(annonce)}
                    className={`w-full p-3 text-left border-b border-gray-50 flex gap-3 transition-colors ${
                      estSel ? 'bg-amber-50 border-l-4 border-l-amber-400' : 'hover:bg-[#F5F5F5]'
                    }`}
                  >
                    <div className="w-14 h-12 rounded-lg flex-shrink-0 overflow-hidden">
                      {annonce.photos?.[0] ? (
                        <img src={annonce.photos[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-xl"
                          style={{ background: col.bg + '22', color: col.bg }}
                        >
                          {getMarkerEmoji(annonce)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-800 truncate">{annonce.titre}</p>
                      <p className="text-gray-400 text-xs truncate">📍 {annonce.quartier}</p>
                      <p className="font-bold text-sm mt-0.5" style={{ color: col.bg }}>
                        {formaterPrix(annonce.prix)}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Carte — hauteur fixée par le flex parent pour éviter le scroll page */}
        <div
          className={`${
            showListMobile ? 'hidden' : 'block'
          } relative min-h-0 flex-1 overflow-hidden md:block md:min-h-0`}
        >

          {/* Barre de filtres sur la carte */}
          <div className="absolute left-2 right-2 top-2 z-20 rounded-xl border border-gray-100 bg-white/95 p-2 shadow-lg backdrop-blur">
            <div className="mb-1 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setFiltresVisibles((v) => !v)}
                className="rounded-md bg-gray-100 px-2 py-1.5 text-[11px] font-bold text-gray-700 hover:bg-gray-200"
              >
                {filtresVisibles ? 'Masquer les filtres' : 'Afficher les filtres'}
              </button>
            </div>
            <div
              className={`grid grid-cols-2 gap-1.5 md:grid-cols-6 ${
                filtresVisibles ? '' : 'hidden'
              }`}
            >
              <select
                value={filtresCarte.type}
                onChange={(e) => setFiltresCarte((p) => ({ ...p, type: e.target.value }))}
                className="border border-gray-200 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:border-[#1B5E20]"
              >
                <option value="">Type</option>
                <option value="location">Location</option>
                <option value="vente">Vente</option>
                <option value="service">Service</option>
                <option value="artisan">Artisan</option>
              </select>
              <input type="number" value={filtresCarte.prixMin}
                onChange={(e) => setFiltresCarte((p) => ({ ...p, prixMin: e.target.value }))}
                placeholder="Prix min"
                className="border border-gray-200 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:border-[#1B5E20]"
              />
              <input type="number" value={filtresCarte.prixMax}
                onChange={(e) => setFiltresCarte((p) => ({ ...p, prixMax: e.target.value }))}
                placeholder="Prix max"
                className="border border-gray-200 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:border-[#1B5E20]"
              />
              <select
                value={filtresCarte.beds}
                onChange={(e) => setFiltresCarte((p) => ({ ...p, beds: e.target.value }))}
                className="border border-gray-200 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:border-[#1B5E20]"
              >
                <option value="">Chambres</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </select>
              <select
                value={filtresCarte.baths}
                onChange={(e) => setFiltresCarte((p) => ({ ...p, baths: e.target.value }))}
                className="border border-gray-200 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:border-[#1B5E20]"
              >
                <option value="">Salles de bain</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </select>
              <button
                type="button"
                onClick={() => setFiltresCarte({ type: '', prixMin: '', prixMax: '', beds: '', baths: '' })}
                className="bg-gray-100 text-gray-700 rounded-md px-2 py-1.5 text-[11px] font-bold hover:bg-gray-200"
              >
                Réinitialiser
              </button>
            </div>
          </div>

          {chargement ? (
            <div className="flex h-full min-h-[12rem] w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#E8F5E9] to-gray-100 md:absolute md:inset-0 md:min-h-0">
              <div className="w-10 h-10 border-4 border-[#1B5E20] border-t-transparent rounded-full animate-spin" />
              <p className="text-[#1B5E20] font-bold text-sm">Chargement de la carte...</p>
            </div>
          ) : erreur ? (
            <div className="flex h-full min-h-[12rem] w-full items-center justify-center bg-gray-100 px-6 md:absolute md:inset-0 md:min-h-0">
              <div className="text-center">
                <p className="text-4xl mb-3">🗺️</p>
                <p className="text-gray-600 text-sm">{erreur}</p>
              </div>
            </div>
          ) : (
            <div
              ref={mapContainer}
              className="h-full min-h-[16rem] w-full md:absolute md:inset-0 md:min-h-0"
            />
          )}

          {/* Fiche annonce sélectionnée (bas de carte) */}
          {selectionne && !chargement && !erreur && (
            <div className="absolute bottom-3 left-3 right-3 md:left-auto md:right-3 md:w-[360px] z-20 bg-white rounded-xl shadow-xl border border-gray-100 p-3">
              <div className="flex items-start gap-3">
                {selectionne.photos?.[0] ? (
                  <img src={selectionne.photos[0]} alt={selectionne.titre}
                    className="w-24 h-20 object-cover rounded-lg flex-shrink-0" />
                ) : (
                  <div
                    className="w-24 h-20 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: (TYPE_COLORS[selectionne.type] || TYPE_COLORS.vente).bg + '22' }}
                  >
                    {getMarkerEmoji(selectionne)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-gray-800 truncate">{selectionne.titre}</p>
                  <p className="text-gray-400 text-xs truncate">📍 {selectionne.quartier}</p>
                  <p className="font-bold text-sm mt-1" style={{ color: (TYPE_COLORS[selectionne.type] || TYPE_COLORS.vente).bg }}>
                    {formaterPrix(selectionne.prix)}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-gray-500">{badgeLabel[selectionne.badge] || '🔓 Bronze'}</span>
                    <a href={`/annonces/${selectionne.id}`}
                      className="text-xs bg-[#1B5E20] text-white px-3 py-1.5 rounded-lg font-bold hover:bg-green-800">
                      Détails →
                    </a>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" onClick={allerPrecedente} disabled={selectionIndex <= 0}
                      className="text-xs bg-gray-100 text-gray-700 py-1.5 rounded-lg font-bold disabled:opacity-40">
                      ← Précédent
                    </button>
                    <button type="button" onClick={allerSuivante} disabled={selectionIndex < 0 || selectionIndex >= annoncesFiltrees.length - 1}
                      className="text-xs bg-gray-100 text-gray-700 py-1.5 rounded-lg font-bold disabled:opacity-40">
                      Suivant →
                    </button>
                  </div>
                </div>
                <button type="button" onClick={() => setSelectionne(null)}
                  className="text-gray-400 hover:text-gray-600 text-lg leading-none" aria-label="Fermer">
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Carte() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#1B5E20] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CarteMapbox />
    </Suspense>
  )
}
