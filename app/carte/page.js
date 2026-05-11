'use client'

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point as turfPoint, polygon as turfPolygon } from '@turf/helpers'
import { fetchAnnoncesList, fetchAvisStatsForAnnonces } from '@/lib/firestoreApp'
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

function formaterNoteCourt(stat) {
  if (!stat || !stat.total) return '☆☆☆☆☆'
  return `⭐ ${stat.moyenne.toFixed(1).replace('.', ',')} (${stat.total})`
}
function estTopNote(stat) {
  return Boolean(stat && stat.total > 0 && stat.moyenne >= 4.5)
}

/** Couleurs vives (marqueurs, prix, accents liste) — aligné esprit Chez Moi CI */
const TYPE_COLORS = {
  vente:    { marker: '#1d4ed8', price: '#1e40af', accent: '#3b82f6' },
  location: { marker: '#059669', price: '#047857', accent: '#10b981' },
  service:  { marker: '#ea580c', price: '#c2410c', accent: '#fb923c' },
  artisan:  { marker: '#7c3aed', price: '#6d28d9', accent: '#a78bfa' },
}
const MARKER_SELECTED = '#f59e0b'

/** Style carte plus saturé (ignoré si `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` — styling cloud) */
const VIVID_MAP_STYLES = [
  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#06b6d4' }, { lightness: 12 }] },
  { featureType: 'landscape.natural', elementType: 'geometry.fill', stylers: [{ color: '#86efac' }, { lightness: 18 }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.fill', stylers: [{ color: '#fef08a' }, { lightness: 22 }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#4ade80' }, { lightness: 5 }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#fde047' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#ca8a04' }, { weight: 0.8 }] },
  { featureType: 'road.arterial', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.local', elementType: 'geometry.fill', stylers: [{ color: '#f1f5f9' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
]

/** Pins compacts (largeur × hauteur, ancre bas centre) */
function getClassicPinMetrics(sel) {
  return sel
    ? { w: 36, h: 44, ax: 18, ay: 44 }
    : { w: 32, h: 38, ax: 16, ay: 38 }
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

/** Abidjan — GeoJSON / Mapbox order: [longitude, latitude] */
const ABIDJAN_CENTER = { lat: 5.325, lng: -4.021 }
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
  Abidjan:       [-4.021,  5.325],
  Bouaké:        [-5.033,  7.69],
  Daloa:         [-6.45,   6.89],
  Yamoussoukro:  [-5.2767, 6.8167],
  'San-Pédro':   [-6.64,   4.75],
  Korhogo:       [-5.63,   9.46],
  Man:           [-7.55,   7.41],
  Gagnoa:        [-5.95,   6.13],
  Abengourou:    [-3.5,    6.72],
  Anyama:        [-4.05,   5.5],
  Soubré:        [-6.6,    5.78],
  Divo:          [-5.36,   5.84],
  Odienné:       [-7.56,   9.51],
  Bondoukou:     [-2.8,    8.04],
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

function getListingCoverSrc(annonce) {
  if (annonce.photos?.[0]) return annonce.photos[0]
  const t = annonce.type
  if (t === 'vente' || t === 'location' || t === 'service' || t === 'artisan') {
    return `/placeholders/listing-${t}.svg`
  }
  return '/placeholders/listing-vente.svg'
}

/** Contenu DOM pour AdvancedMarkerElement (goutte ; clic = événement `gmp-click` sur le marqueur) */
function buildMarkerContentElement(annonce, selected) {
  let emoji = getMarkerEmoji(annonce)
  if (typeof emoji !== 'string') emoji = '📍'
  const el = document.createElement('div')
  el.style.display = 'flex'
  el.style.alignItems = 'center'
  el.style.justifyContent = 'center'
  el.style.cursor = 'pointer'
  el.style.pointerEvents = 'auto'
  el.style.touchAction = 'manipulation'

  const tc = TYPE_COLORS[annonce.type] || TYPE_COLORS.vente
  const fill = selected ? MARKER_SELECTED : tc.marker
  const fillDeep = selected ? '#d97706' : tc.price
  const w = selected ? 36 : 32
  const h = selected ? 44 : 38
  el.style.width = `${w}px`
  el.style.height = `${h}px`
  el.style.borderRadius = '9999px 9999px 9999px 0'
  el.style.transform = 'rotate(-45deg)'
  el.style.background = `linear-gradient(155deg, ${fill} 0%, ${fillDeep} 100%)`
  el.style.border = '3px solid #fff'
  el.style.boxShadow = '0 4px 14px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.08)'

  const glyph = document.createElement('span')
  glyph.textContent = emoji
  glyph.style.transform = 'rotate(45deg)'
  glyph.style.fontSize = selected ? '15px' : '13px'
  glyph.style.lineHeight = '1'
  glyph.style.pointerEvents = 'none'
  el.appendChild(glyph)

  return el
}

/** Pin classique (google.maps.Marker) — même goutte, taille réduite */
function buildPinIconDataUrl(annonce, selected) {
  let emoji = getMarkerEmoji(annonce)
  if (typeof emoji !== 'string') emoji = '📍'
  const fill = selected
    ? MARKER_SELECTED
    : (TYPE_COLORS[annonce.type] || TYPE_COLORS.vente).marker
  const m = getClassicPinMetrics(selected)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${m.w}" height="${m.h}" viewBox="0 0 48 56">
    <path d="M24 3 C12 3 3 12 3 24 C3 38 24 53 24 53 C24 53 45 38 45 24 C45 12 36 3 24 3 Z"
      fill="${fill}" stroke="#ffffff" stroke-width="2.5"/>
    <text x="24" y="31" text-anchor="middle" font-size="${selected ? 14 : 12}" dominant-baseline="middle">${emoji}</text>
  </svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function releaseMapMarker(marker) {
  if (!marker) return
  try {
    if ('map' in marker && marker.map != null) marker.map = null
    else if (typeof marker.setMap === 'function') marker.setMap(null)
  } catch { /* ignore */ }
}

function pathToClosedRingLngLat(googlePath) {
  const ring = []
  googlePath.forEach((latLng) => {
    ring.push([latLng.lng(), latLng.lat()])
  })
  if (ring.length < 3) return null
  const a = ring[0]
  const b = ring[ring.length - 1]
  if (a[0] !== b[0] || a[1] !== b[1]) ring.push([a[0], a[1]])
  return ring.length >= 4 ? ring : null
}

// ─── Composant principal — Google Maps ───────────────────────────────────────

function CarteGoogleMaps() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const mapShellRef = useRef(null)
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const clustererRef = useRef(null)
  const markerEntriesRef = useRef([])
  const advancedMarkerCtorRef = useRef(null)
  const usingAdvancedMarkersRef = useRef(false)
  const mapClickListenerRef = useRef(null)
  const draftLineRef = useRef(null)
  const draftPointsRef = useRef([])
  const drawnPolygonRef = useRef(null)

  const [annonces, setAnnonces] = useState([])
  const [avisStats, setAvisStats] = useState({})
  const [selectionne, setSelectionne] = useState(null)
  const selectionneRef = useRef(null)
  const [chargement, setChargement] = useState(true)
  const [mapReady, setMapReady] = useState(false)
  const [erreur, setErreur] = useState('')
  const [showListMobile, setShowListMobile] = useState(false)
  const [filtresVisibles, setFiltresVisibles] = useState(false)
  const [triCarte, setTriCarte] = useState('recent')
  /** Anneau fermé GeoJSON [lng,lat][] pour filtre Turf, ou null */
  const [zoneRing, setZoneRing] = useState(null)
  const [dessinZoneActif, setDessinZoneActif] = useState(false)

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

  const [filtresCarte, setFiltresCarte] = useState({
    type: filtresURL.type || '',
    prixMin: filtresURL.prixMin || '',
    prixMax: filtresURL.prixMax || '',
    beds: filtresURL.nbChambres || '',
    baths: filtresURL.nbPieces || '',
  })

  /** Aligne le filtre « type » sur l’URL (bouton retour, lien partagé) sans effacer prix/chambres saisis sur la carte */
  useEffect(() => {
    setFiltresCarte((prev) => ({
      ...prev,
      type: filtresURL.type || '',
    }))
  }, [filtresURL.type])

  const FILTRES_TYPE_RAPIDES = [
    { id: '', label: 'Tout' },
    { id: 'location', label: 'Location' },
    { id: 'vente', label: 'Vente' },
    { id: 'prestations', label: 'Services & Pro' },
  ]

  const appliquerFiltreTypeRapide = (typeId) => {
    const next = new URLSearchParams(searchParams.toString())
    if (typeId) next.set('type', typeId)
    else next.delete('type')
    const q = next.toString()
    router.replace(q ? `/carte?${q}` : '/carte', { scroll: false })
  }

  const lienListe = useMemo(() => {
    const p = new URLSearchParams()
    Object.entries(filtresURL).forEach(([k, v]) => { if (v) p.set(k, v) })
    return '/annonces' + (p.toString() ? '?' + p.toString() : '')
  }, [filtresURL])

  useEffect(() => {
    async function charger() {
      setChargement(true)
      try {
        const data = await fetchAnnoncesList(filtresURL, 'recent')
        const list = (data || []).slice(0, 400)
        setAnnonces(list)
        const stats = await fetchAvisStatsForAnnonces(list.map((a) => a.id).filter(Boolean))
        setAvisStats(stats)
      } catch {
        setAnnonces([])
        setAvisStats({})
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
      if (filtresCarte.type) {
        if (filtresCarte.type === 'prestations') {
          if (a.type !== 'service' && a.type !== 'artisan') return false
        } else if (a.type !== filtresCarte.type) {
          return false
        }
      }
      if (prixMin > 0 && Number(a.prix || 0) < prixMin) return false
      if (prixMax > 0 && Number(a.prix || 0) > prixMax) return false
      if (beds  > 0 && Number(a.nb_chambres || 0) < beds)  return false
      if (baths > 0 && Number(a.nb_pieces   || 0) < baths) return false
      return true
    })
  }, [annonces, filtresCarte])

  const annoncesAfficheesBrut = useMemo(() => {
    if (!zoneRing || zoneRing.length < 4) return annoncesFiltrees
    try {
      const poly = turfPolygon([zoneRing])
      return annoncesFiltrees.filter((a) => {
        const c = getAnnonceCoords(a)
        if (!c) return false
        return booleanPointInPolygon(turfPoint(c), poly)
      })
    } catch {
      return annoncesFiltrees
    }
  }, [annoncesFiltrees, zoneRing])

  const annoncesAffichees = useMemo(() => {
    const list = [...annoncesAfficheesBrut]
    if (triCarte === 'plus_vus') {
      return list.sort((a, b) => (b.nb_vues || 0) - (a.nb_vues || 0))
    }
    if (triCarte === 'mieux_notes') {
      return list.sort((a, b) => {
        const sa = avisStats[a.id] || { moyenne: 0, total: 0 }
        const sb = avisStats[b.id] || { moyenne: 0, total: 0 }
        if (sb.moyenne !== sa.moyenne) return sb.moyenne - sa.moyenne
        if (sb.total !== sa.total) return sb.total - sa.total
        return (b.nb_vues || 0) - (a.nb_vues || 0)
      })
    }
    return list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
  }, [annoncesAfficheesBrut, triCarte, avisStats])

  useEffect(() => { selectionneRef.current = selectionne }, [selectionne])

  const selectionIndex = useMemo(
    () => annoncesAffichees.findIndex((a) => a.id === selectionne?.id),
    [annoncesAffichees, selectionne?.id],
  )

  const allerAnnonce = useCallback((annonce) => {
    if (!annonce) return
    setSelectionne(annonce)
    const coords = getAnnonceCoords(annonce)
    const map = mapRef.current
    if (coords && map) {
      map.panTo({ lat: coords[1], lng: coords[0] })
      map.setZoom(Math.max(map.getZoom() || 11, 14))
    }
  }, [])

  const allerSuivante   = () => { if (selectionIndex >= 0 && selectionIndex < annoncesAffichees.length - 1) allerAnnonce(annoncesAffichees[selectionIndex + 1]) }
  const allerPrecedente = () => { if (selectionIndex > 0) allerAnnonce(annoncesAffichees[selectionIndex - 1]) }

  const effacerZone = useCallback(() => {
    if (drawnPolygonRef.current) {
      try { drawnPolygonRef.current.setMap(null) } catch { /* ignore */ }
      drawnPolygonRef.current = null
    }
    setZoneRing(null)
    setDessinZoneActif(false)
  }, [])

  // Initialisation Google Maps + dessin
  useEffect(() => {
    if (chargement || !mapContainerRef.current || mapRef.current) return
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return
    }

    let cancelled = false

    async function initMap() {
      try {
        const mapIdFromEnv = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || '').trim()
        advancedMarkerCtorRef.current = null
        usingAdvancedMarkersRef.current = false

        const mapsAlreadyLoaded =
          typeof window !== 'undefined' &&
          !!window.google?.maps &&
          typeof window.google.maps.importLibrary === 'function'

        if (!mapsAlreadyLoaded) {
          const { Loader } = await import('@googlemaps/js-api-loader')
          const libraries = ['places', 'geometry']
          if (mapIdFromEnv) libraries.push('marker')
          const loader = new Loader({
            apiKey,
            version: 'weekly',
            libraries,
            language: 'fr',
            region: 'CI',
          })
          await loader.load()
        }
        if (cancelled || !mapContainerRef.current) return

        let mapId = mapIdFromEnv
        if (mapIdFromEnv) {
          try {
            const { AdvancedMarkerElement } = await google.maps.importLibrary('marker')
            advancedMarkerCtorRef.current = AdvancedMarkerElement
            usingAdvancedMarkersRef.current = true
          } catch (e) {
            console.warn('[Google Maps] Repères avancés indisponibles, utilisation des marqueurs classiques.', e)
            mapId = ''
            advancedMarkerCtorRef.current = null
            usingAdvancedMarkersRef.current = false
          }
        }

        const mapOpts = {
          center: ABIDJAN_CENTER,
          zoom: ABIDJAN_DEFAULT_ZOOM,
          mapId: mapId || undefined,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          mapTypeControlOptions: { position: google.maps.ControlPosition.TOP_LEFT },
        }
        if (!mapId) {
          mapOpts.styles = VIVID_MAP_STYLES
        }
        const map = new google.maps.Map(mapContainerRef.current, mapOpts)
        mapRef.current = map

        setMapReady(true)
      } catch (e) {
        if (!cancelled) {
          console.error('[Google Maps]', e)
          setErreur('Impossible d\'afficher la carte. Vérifiez la clé API et la facturation Google Cloud.')
        }
      }
    }

    initMap()
    return () => {
      cancelled = true
      if (clustererRef.current) {
        try { clustererRef.current.clearMarkers() } catch { /* ignore */ }
        clustererRef.current = null
      }
      if (mapClickListenerRef.current) {
        try { google.maps.event.removeListener(mapClickListenerRef.current) } catch { /* ignore */ }
        mapClickListenerRef.current = null
      }
      if (draftLineRef.current) {
        try { draftLineRef.current.setMap(null) } catch { /* ignore */ }
        draftLineRef.current = null
      }
      draftPointsRef.current = []
      markerEntriesRef.current.forEach(({ marker }) => {
        releaseMapMarker(marker)
      })
      markerEntriesRef.current = []
      if (drawnPolygonRef.current) {
        try { drawnPolygonRef.current.setMap(null) } catch { /* ignore */ }
        drawnPolygonRef.current = null
      }
      advancedMarkerCtorRef.current = null
      usingAdvancedMarkersRef.current = false
      mapRef.current = null
      setMapReady(false)
    }
  }, [chargement])

  // Mode dessin : clics successifs pour tracer la zone
  useEffect(() => {
    if (!mapReady || !mapRef.current || typeof google === 'undefined') return
    const map = mapRef.current

    const finaliserZone = () => {
      const pts = draftPointsRef.current
      if (pts.length < 3) {
        draftPointsRef.current = []
        if (draftLineRef.current) {
          try { draftLineRef.current.setMap(null) } catch { /* ignore */ }
          draftLineRef.current = null
        }
        setZoneRing(null)
        return
      }
      if (drawnPolygonRef.current) {
        try { drawnPolygonRef.current.setMap(null) } catch { /* ignore */ }
      }
      drawnPolygonRef.current = new google.maps.Polygon({
        paths: pts,
        fillColor: '#10b981',
        fillOpacity: 0.28,
        strokeColor: '#047857',
        strokeWeight: 3,
        clickable: false,
        editable: false,
        zIndex: 1,
      })
      drawnPolygonRef.current.setMap(map)
      const ring = pathToClosedRingLngLat(drawnPolygonRef.current.getPath())
      setZoneRing(ring)
      draftPointsRef.current = []
      if (draftLineRef.current) {
        try { draftLineRef.current.setMap(null) } catch { /* ignore */ }
        draftLineRef.current = null
      }
    }

    if (dessinZoneActif) {
      if (!draftLineRef.current) {
        draftLineRef.current = new google.maps.Polyline({
          strokeColor: '#059669',
          strokeWeight: 3,
          map,
        })
      }
      mapClickListenerRef.current = google.maps.event.addListener(map, 'click', (e) => {
        const p = e.latLng
        if (!p) return
        draftPointsRef.current.push({ lat: p.lat(), lng: p.lng() })
        draftLineRef.current?.setPath(draftPointsRef.current)
      })
    } else {
      if (mapClickListenerRef.current) {
        try { google.maps.event.removeListener(mapClickListenerRef.current) } catch { /* ignore */ }
        mapClickListenerRef.current = null
      }
      finaliserZone()
    }
    return () => {
      if (mapClickListenerRef.current) {
        try { google.maps.event.removeListener(mapClickListenerRef.current) } catch { /* ignore */ }
        mapClickListenerRef.current = null
      }
    }
  }, [dessinZoneActif, mapReady])

  // Marqueurs + clusters
  useEffect(() => {
    if (!mapReady || !mapRef.current || typeof google === 'undefined') return
    const map = mapRef.current

    if (clustererRef.current) {
      try { clustererRef.current.clearMarkers() } catch { /* ignore */ }
      clustererRef.current = null
    }
    markerEntriesRef.current.forEach(({ marker }) => {
      releaseMapMarker(marker)
    })
    markerEntriesRef.current = []

    const markers = []
    const useAdvanced = usingAdvancedMarkersRef.current
    const AdvancedMarkerElement = advancedMarkerCtorRef.current

    annoncesAffichees.forEach((annonce) => {
      const coords = getAnnonceCoords(annonce)
      if (!coords) return
      const pos = { lat: coords[1], lng: coords[0] }
      const sel = selectionneRef.current?.id === annonce.id
      let marker
      if (useAdvanced && AdvancedMarkerElement) {
        const content = buildMarkerContentElement(annonce, sel)
        marker = new AdvancedMarkerElement({
          map,
          position: pos,
          content,
          title: annonce.titre || '',
          gmpClickable: true,
        })
        marker.addEventListener('gmp-click', () => allerAnnonce(annonce))
      } else {
        const m = getClassicPinMetrics(sel)
        marker = new google.maps.Marker({
          map,
          position: pos,
          icon: {
            url: buildPinIconDataUrl(annonce, sel),
            scaledSize: new google.maps.Size(m.w, m.h),
            anchor: new google.maps.Point(m.ax, m.ay),
          },
          title: annonce.titre || '',
        })
      }
      if (!useAdvanced || !AdvancedMarkerElement) {
        marker.addListener('click', () => allerAnnonce(annonce))
      }
      markers.push(marker)
      markerEntriesRef.current.push({ marker, annonce })
    })

    import('@googlemaps/markerclusterer').then(({ MarkerClusterer }) => {
      if (!mapRef.current) return
      const clusterRenderer = {
        render(cluster) {
          const count = cluster.count
          const position = cluster.position
          const r = 16
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42">
            <defs>
              <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#15803d;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#0d9488;stop-opacity:1" />
              </linearGradient>
            </defs>
            <circle cx="21" cy="21" r="20" fill="url(#g)" stroke="#fef08a" stroke-width="2.5"/>
            <circle cx="21" cy="21" r="${r}" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>
          </svg>`
          return new google.maps.Marker({
            position,
            icon: {
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
              scaledSize: new google.maps.Size(42, 42),
              anchor: new google.maps.Point(21, 21),
            },
            label: {
              text: String(count),
              color: '#fffbeb',
              fontSize: '11px',
              fontWeight: '800',
            },
            zIndex: 1000 + count,
          })
        },
      }
      clustererRef.current = new MarkerClusterer({ map, markers, renderer: clusterRenderer })
    })
  }, [annoncesAffichees, mapReady, allerAnnonce])

  // Mise à jour visuelle sélection
  useEffect(() => {
    if (!mapReady || typeof google === 'undefined') return
    markerEntriesRef.current.forEach(({ marker, annonce }) => {
      const sel = selectionne?.id === annonce.id
      if (usingAdvancedMarkersRef.current && advancedMarkerCtorRef.current) {
        marker.content = buildMarkerContentElement(annonce, sel)
      } else {
        const m = getClassicPinMetrics(sel)
        marker.setIcon({
          url: buildPinIconDataUrl(annonce, sel),
          scaledSize: new google.maps.Size(m.w, m.h),
          anchor: new google.maps.Point(m.ax, m.ay),
        })
      }
    })
  }, [selectionne, mapReady])

  // LocalLogic (optionnel) — même pattern que REALTOR.ca ; couverture dépend du contrat
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_LOCALLOGIC_TOKEN
    if (!token || !mapReady || !mapRef.current || !mapShellRef.current) return

    let cancelled = false
    const cbName = 'initLocallogicChezMoiCI'

    function runAssistant() {
      if (cancelled || !mapRef.current || !mapShellRef.current) return
      const ll = typeof window !== 'undefined' && window.locallogic
      if (!ll || typeof ll.createMapAssistant !== 'function') return
      try {
        ll.createMapAssistant({
          locale: 'fr',
          googleMapsMap: mapRef.current,
          mapContainer: mapShellRef.current,
        })
      } catch (e) {
        console.warn('[LocalLogic]', e)
      }
    }

    if (typeof window !== 'undefined' && window.locallogic) {
      runAssistant()
      return () => { cancelled = true }
    }

    window[cbName] = runAssistant
    const s = document.createElement('script')
    s.async = true
    s.src = `https://cdn.locallogic.co/sdk/?token=${encodeURIComponent(token)}&callback=${cbName}`
    document.body.appendChild(s)

    return () => {
      cancelled = true
      try { delete window[cbName] } catch { /* ignore */ }
      try { s.remove() } catch { /* ignore */ }
    }
  }, [mapReady])

  const badgeLabel = { bronze: '🔓 Bronze', argent: '🥈 Argent', or: '🥇 Or' }
  const erreurAffichee = erreur || (
    !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      ? 'Clé Google Maps absente sur ce déploiement. En local : .env.local. En ligne (Vercel) : Project → Settings → Environment Variables → NEXT_PUBLIC_GOOGLE_MAPS_API_KEY pour Production (et Preview si besoin), puis redéployez. Google Cloud : activez Maps JavaScript API et restreignez la clé par référents HTTP (votre domaine + *.vercel.app + localhost).'
      : ''
  )

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-emerald-50 via-amber-50/40 to-teal-50/90">
      <SiteHeader />

      <div className="relative z-[600] flex flex-shrink-0 flex-col gap-2 border-b border-emerald-800/15 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 px-3 py-2.5 shadow-lg shadow-emerald-900/20 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex flex-col min-w-0 gap-0.5 sm:max-w-[40%]">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
            <span className="text-sm font-bold tracking-tight text-white drop-shadow-sm">Carte — Côte d&apos;Ivoire</span>
            {!chargement && (
              <span className="text-xs font-semibold text-amber-100 flex-shrink-0 rounded-full bg-white/15 px-2 py-0.5 backdrop-blur-sm">
                {annoncesAffichees.length} sur {annoncesFiltrees.length} annonce{annoncesFiltrees.length > 1 ? 's' : ''}
                {zoneRing ? ' (zone)' : ''}
              </span>
            )}
          </div>
          <span className="text-[10px] text-emerald-100/90 truncate">Chez Moi CI · repères colorés par type</span>
        </div>

          <div className="flex flex-1 flex-wrap items-center justify-center gap-1 sm:px-2">
          {FILTRES_TYPE_RAPIDES.map((f) => {
            const actif = (filtresURL.type || '') === f.id
            return (
              <button
                key={f.id || 'all'}
                type="button"
                onClick={() => appliquerFiltreTypeRapide(f.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                  actif
                    ? 'bg-amber-400 text-emerald-950 shadow-md ring-2 ring-white/40'
                    : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                }`}
              >
                {f.label}
              </button>
            )
          })}
            <select
              value={triCarte}
              onChange={(e) => setTriCarte(e.target.value)}
              className="rounded-full border-2 border-amber-300/60 bg-white/95 px-2.5 py-1.5 text-xs font-bold text-emerald-900 shadow-sm"
            >
              <option value="recent">Récents</option>
              <option value="plus_vus">Plus vus</option>
              <option value="mieux_notes">Mieux notés</option>
            </select>
        </div>

        <div className="flex flex-shrink-0 items-center justify-end gap-2">
          <Link
            href={lienListe}
            className="hidden md:inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-emerald-950 shadow-md transition-transform hover:scale-[1.02] hover:bg-amber-300"
          >
            Voir en liste
          </Link>
          <button
            type="button"
            onClick={() => setShowListMobile((v) => !v)}
            className="md:hidden inline-flex flex-shrink-0 items-center gap-1 rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-bold text-emerald-950 shadow-md transition-transform hover:bg-amber-300"
          >
            {showListMobile ? 'Carte' : 'Liste'}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">

        <div
          className={`${
            showListMobile ? 'flex' : 'hidden'
          } md:flex min-h-0 w-full flex-shrink-0 flex-col overflow-hidden border-t-2 border-emerald-700/20 bg-gradient-to-b from-white to-emerald-50/50 shadow-[4px_0_24px_-8px_rgba(6,95,70,0.25)] md:w-[min(100%,22rem)] md:max-h-none md:border-t-0 md:border-r-2 md:border-emerald-800/15 max-h-[46vh] md:max-h-full`}
        >
          <div className="flex-shrink-0 bg-gradient-to-r from-emerald-700 to-teal-600 px-3 py-3 text-white shadow-inner">
            <h2 className="text-sm font-bold tracking-tight">
              {chargement ? 'Chargement…' : `${annoncesAffichees.length} résultats`}
            </h2>
            <p className="text-[11px] text-emerald-100 mt-0.5 font-medium">Touchez une carte pour zoomer sur la carte</p>
          </div>
          <div className="cartes-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-emerald-50/30 px-2 py-2 [scrollbar-gutter:stable]">
            {annoncesAffichees.length === 0 && !chargement ? (
              <div className="m-2 rounded-2xl border-2 border-dashed border-amber-300/80 bg-amber-50/90 p-8 text-center">
                <p className="text-4xl mb-2">🔍</p>
                <p className="text-sm font-semibold text-emerald-900">Aucune annonce dans cette zone</p>
                {zoneRing && (
                  <button type="button" onClick={effacerZone} className="mt-4 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700">
                    Effacer le filtre zone
                  </button>
                )}
              </div>
            ) : (
              annoncesAffichees.slice(0, 80).map((annonce) => {
                const estSel = selectionne?.id === annonce.id
                const col = TYPE_COLORS[annonce.type] || TYPE_COLORS.vente
                const cover = getListingCoverSrc(annonce)
                const estPrestation = annonce.type === 'service' || annonce.type === 'artisan'
                return (
                  <button
                    key={annonce.id}
                    type="button"
                    onClick={() => allerAnnonce(annonce)}
                    className={`mb-2 w-full rounded-xl border-2 text-left shadow-sm transition-all duration-150 ${
                      estPrestation ? 'p-2' : 'p-2.5'
                    } ${
                      estSel
                        ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-white shadow-md ring-2 ring-amber-300/60 scale-[1.01]'
                        : 'border-emerald-100 bg-white hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5'
                    }`}
                    style={{
                      borderLeftWidth: '5px',
                      borderLeftStyle: 'solid',
                      borderLeftColor: col.accent || col.marker,
                    }}
                  >
                    <div className={`flex items-center ${estPrestation ? 'gap-2' : 'gap-2.5'}`}>
                      <div
                        className={`flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-slate-100 to-emerald-50 ring-2 ring-white shadow-md ${
                          estPrestation ? 'h-9 w-9' : 'h-12 w-12'
                        }`}
                      >
                        <img src={cover} alt="" className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p
                            className={`truncate font-bold leading-tight text-slate-900 ${
                              estPrestation ? 'text-[11px]' : 'text-[13px]'
                            }`}
                          >
                            {annonce.titre}
                          </p>
                          <span
                            className={`flex-shrink-0 font-extrabold tabular-nums ${
                              estPrestation ? 'text-[10px]' : 'text-[12px]'
                            }`}
                            style={{ color: col.price }}
                          >
                            {formaterPrix(annonce.prix)}
                          </span>
                        </div>
                        <p className={`truncate font-medium text-emerald-800/85 ${estPrestation ? 'mt-0 text-[10px]' : 'mt-0.5 text-[11px]'}`}>
                          {annonce.quartier}
                          {estPrestation && annonce.type_service ? ` · ${annonce.type_service}` : ''}
                        </p>
                        <p className={`truncate text-slate-600 ${estPrestation ? 'mt-0 text-[10px]' : 'mt-0.5 text-[11px]'}`}>
                          👁️ {annonce.nb_vues || 0} · {formaterNoteCourt(avisStats[annonce.id])}
                        </p>
                        {estTopNote(avisStats[annonce.id]) && (
                          <p className="mt-1 inline-block rounded-full bg-fuchsia-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">🏅 Top noté</p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div
          className={`${
            showListMobile ? 'hidden' : 'block'
          } relative min-h-0 flex-1 overflow-hidden ring-2 ring-inset ring-emerald-800/10 md:block md:min-h-0`}
          ref={mapShellRef}
        >

          <div className="absolute left-2 right-2 top-2 z-20 flex max-h-[32vh] flex-col gap-1.5 overflow-y-auto rounded-xl border-2 border-amber-300/70 bg-gradient-to-br from-emerald-900/95 via-emerald-800/92 to-teal-800/95 p-2 shadow-xl shadow-emerald-950/30 backdrop-blur-md">
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setFiltresVisibles((v) => !v)}
                className="rounded-lg bg-white/95 px-2.5 py-1 text-[10px] font-bold text-emerald-900 shadow-sm hover:bg-amber-100"
              >
                {filtresVisibles ? 'Masquer' : 'Filtres'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDessinZoneActif((v) => !v)
                }}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-bold shadow-md ${
                  dessinZoneActif ? 'bg-amber-400 text-emerald-950 ring-2 ring-white' : 'bg-teal-500 text-white hover:bg-teal-400'
                }`}
              >
                {dessinZoneActif ? 'Fin zone' : 'Zone'}
              </button>
              {zoneRing && (
                <button
                  type="button"
                  onClick={effacerZone}
                  className="rounded-lg border-2 border-white/40 bg-white/15 px-2.5 py-1 text-[10px] font-bold text-amber-100 hover:bg-white/25"
                >
                  Effacer
                </button>
              )}
              {dessinZoneActif && (
                <span className="text-[9px] font-semibold text-amber-200">Clics sur la carte, puis Fin zone</span>
              )}
            </div>
            <div
              className={`grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-5 ${
                filtresVisibles ? '' : 'hidden'
              }`}
            >
              <input type="number" value={filtresCarte.prixMin}
                onChange={(e) => setFiltresCarte((p) => ({ ...p, prixMin: e.target.value }))}
                placeholder="Prix min"
                className="rounded-lg border-2 border-emerald-200 bg-white px-1.5 py-1 text-[10px] font-medium text-emerald-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <input type="number" value={filtresCarte.prixMax}
                onChange={(e) => setFiltresCarte((p) => ({ ...p, prixMax: e.target.value }))}
                placeholder="Prix max"
                className="rounded-lg border-2 border-emerald-200 bg-white px-1.5 py-1 text-[10px] font-medium text-emerald-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <select
                value={filtresCarte.beds}
                onChange={(e) => setFiltresCarte((p) => ({ ...p, beds: e.target.value }))}
                className="rounded-lg border-2 border-emerald-200 bg-white px-1.5 py-1 text-[10px] font-medium text-emerald-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
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
                className="rounded-lg border-2 border-emerald-200 bg-white px-1.5 py-1 text-[10px] font-medium text-emerald-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">Salles de bain</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  appliquerFiltreTypeRapide('')
                  setFiltresCarte({ type: '', prixMin: '', prixMax: '', beds: '', baths: '' })
                }}
                className="rounded-lg border-2 border-amber-300 bg-amber-300 px-1.5 py-1 text-[10px] font-bold text-emerald-950 hover:bg-amber-200"
              >
                Réinit.
              </button>
            </div>
          </div>

          {chargement ? (
            <div className="flex h-full min-h-[12rem] w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-emerald-100 via-teal-50 to-amber-50 md:absolute md:inset-0 md:min-h-0">
              <div className="h-11 w-11 animate-spin rounded-full border-[3px] border-emerald-200 border-t-emerald-700" />
              <p className="text-sm font-bold text-emerald-900">Chargement de la carte…</p>
            </div>
          ) : erreurAffichee ? (
            <div className="flex h-full min-h-[12rem] w-full items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 px-6 md:absolute md:inset-0 md:min-h-0">
              <div className="text-center rounded-2xl border-2 border-amber-200 bg-white/90 p-6 shadow-lg">
                <p className="text-4xl mb-3">🗺️</p>
                <p className="text-emerald-900 text-sm font-medium">{erreurAffichee}</p>
              </div>
            </div>
          ) : (
            <div
              ref={mapContainerRef}
              className="h-full min-h-[16rem] w-full md:absolute md:inset-0 md:min-h-0"
            />
          )}

          {selectionne && !chargement && !erreurAffichee && (
            <div className="absolute bottom-3 left-3 right-3 z-20 overflow-hidden rounded-2xl border-2 border-amber-400/80 bg-gradient-to-br from-white via-emerald-50/80 to-amber-50/90 p-0 shadow-2xl shadow-emerald-900/25 md:left-auto md:right-3 md:w-[380px]">
              <div
                className="h-1.5 w-full"
                style={{ background: (TYPE_COLORS[selectionne.type] || TYPE_COLORS.vente).accent }}
              />
              <div className="flex items-start gap-3 p-3">
                <img
                  src={getListingCoverSrc(selectionne)}
                  alt={selectionne.titre}
                  className="h-20 w-24 flex-shrink-0 rounded-xl object-cover ring-2 ring-white shadow-md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">{selectionne.titre}</p>
                  <p className="truncate text-xs font-semibold text-emerald-800">{selectionne.quartier}</p>
                  <p className="mt-1 text-base font-extrabold tabular-nums" style={{ color: (TYPE_COLORS[selectionne.type] || TYPE_COLORS.vente).price }}>
                    {formaterPrix(selectionne.prix)}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-amber-900/90">{badgeLabel[selectionne.badge] || '🔓 Bronze'}</span>
                    <span className="text-[11px] font-medium text-slate-600">👁️ {selectionne.nb_vues || 0} · {formaterNoteCourt(avisStats[selectionne.id])}</span>
                  </div>
                  {estTopNote(avisStats[selectionne.id]) && (
                    <p className="mt-1 inline-block rounded-full bg-fuchsia-600 px-2 py-0.5 text-[11px] font-bold text-white">🏅 Top noté</p>
                  )}
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <Link href={`/annonces/${selectionne.id}`}
                      className="rounded-xl bg-gradient-to-r from-emerald-700 to-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-md transition-transform hover:scale-[1.02]">
                      Détails →
                    </Link>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" onClick={allerPrecedente} disabled={selectionIndex <= 0}
                      className="text-xs bg-white border-2 border-emerald-200 text-emerald-900 py-1.5 rounded-xl font-bold disabled:opacity-40 hover:bg-emerald-50">
                      ← Précédent
                    </button>
                    <button type="button" onClick={allerSuivante} disabled={selectionIndex < 0 || selectionIndex >= annoncesAffichees.length - 1}
                      className="text-xs bg-white border-2 border-emerald-200 text-emerald-900 py-1.5 rounded-xl font-bold disabled:opacity-40 hover:bg-emerald-50">
                      Suivant →
                    </button>
                  </div>
                </div>
                <button type="button" onClick={() => setSelectionne(null)}
                  className="text-emerald-700/60 hover:text-emerald-900 text-lg font-bold leading-none" aria-label="Fermer">
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-100 to-amber-50">
        <div className="h-11 w-11 animate-spin rounded-full border-[3px] border-emerald-200 border-t-emerald-700" />
      </div>
    }>
      <CarteGoogleMaps />
    </Suspense>
  )
}
