'use client'

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point as turfPoint, polygon as turfPolygon } from '@turf/helpers'
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

/** Couleurs d’origine (goutte sur la carte, comme sur ta capture) */
const TYPE_COLORS = {
  vente:    { marker: '#2563EB', price: '#2563EB' },
  location: { marker: '#059669', price: '#059669' },
  service:  { marker: '#EA580C', price: '#EA580C' },
  artisan:  { marker: '#7C3AED', price: '#7C3AED' },
}
const MARKER_SELECTED = '#F59E0B'

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

  const fill = selected
    ? MARKER_SELECTED
    : (TYPE_COLORS[annonce.type] || TYPE_COLORS.vente).marker
  const w = selected ? 36 : 32
  const h = selected ? 44 : 38
  el.style.width = `${w}px`
  el.style.height = `${h}px`
  el.style.borderRadius = '9999px 9999px 9999px 0'
  el.style.transform = 'rotate(-45deg)'
  el.style.background = fill
  el.style.border = 'none'
  el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)'

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
      fill="${fill}" stroke="none"/>
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
  const [selectionne, setSelectionne] = useState(null)
  const selectionneRef = useRef(null)
  const [chargement, setChargement] = useState(true)
  const [mapReady, setMapReady] = useState(false)
  const [erreur, setErreur] = useState('')
  const [showListMobile, setShowListMobile] = useState(false)
  const [filtresVisibles, setFiltresVisibles] = useState(false)
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

  const annoncesAffichees = useMemo(() => {
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

        const map = new google.maps.Map(mapContainerRef.current, {
          center: ABIDJAN_CENTER,
          zoom: ABIDJAN_DEFAULT_ZOOM,
          mapId: mapId || undefined,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          mapTypeControlOptions: { position: google.maps.ControlPosition.TOP_LEFT },
        })
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
        fillColor: '#0f766e',
        fillOpacity: 0.18,
        strokeColor: '#0f766e',
        strokeWeight: 2,
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
          strokeColor: '#0f766e',
          strokeWeight: 2,
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
          const r = 17
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38">
            <circle cx="19" cy="19" r="${r}" fill="#475569"/>
          </svg>`
          return new google.maps.Marker({
            position,
            icon: {
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
              scaledSize: new google.maps.Size(38, 38),
              anchor: new google.maps.Point(19, 19),
            },
            label: {
              text: String(count),
              color: 'rgba(255,255,255,0.95)',
              fontSize: '10px',
              fontWeight: '600',
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
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#F5F5F5]">
      <SiteHeader />

      <div className="relative z-[600] flex flex-shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-[#F5F5F5] px-4 py-2">
        <div className="flex flex-col min-w-0 gap-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-slate-800">Carte — Côte d&apos;Ivoire</span>
            {!chargement && (
              <span className="text-xs text-slate-500 flex-shrink-0">
                {annoncesAffichees.length} sur {annoncesFiltrees.length} annonce{annoncesFiltrees.length > 1 ? 's' : ''}
                {zoneRing ? ' (zone)' : ''}
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 truncate">Chez Moi CI · Google Maps</span>
        </div>
        <Link
          href={lienListe}
          className="hidden md:flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-[#1B5E20] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#2E7D32]"
        >
          Voir en liste
        </Link>
        <button
          type="button"
          onClick={() => setShowListMobile((v) => !v)}
          className="md:hidden flex-shrink-0 flex items-center gap-1 rounded-lg bg-[#1B5E20] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#2E7D32]"
        >
          {showListMobile ? 'Carte' : 'Liste'}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">

        <div
          className={`${
            showListMobile ? 'flex' : 'hidden'
          } md:flex min-h-0 w-full flex-shrink-0 flex-col overflow-hidden border-t border-slate-200 bg-white md:w-[300px] md:max-h-none md:border-t-0 md:border-r md:border-slate-200 max-h-[42vh] md:max-h-full`}
        >
          <div className="flex-shrink-0 border-b border-slate-100 bg-slate-50/80 px-3 py-2.5">
            <h2 className="text-sm font-semibold text-slate-800">
              {chargement ? 'Chargement...' : `${annoncesAffichees.length} résultats`}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Toucher une ligne pour centrer la carte</p>
          </div>
          <div className="cartes-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable]">
            {annoncesAffichees.length === 0 && !chargement ? (
              <div className="p-8 text-center text-slate-400">
                <p className="text-4xl mb-2">🔍</p>
                <p className="text-sm">Aucune annonce dans cette zone</p>
                {zoneRing && (
                  <button type="button" onClick={effacerZone} className="mt-3 text-xs font-semibold text-emerald-800 underline decoration-emerald-800/40 underline-offset-2">
                    Effacer le filtre zone
                  </button>
                )}
              </div>
            ) : (
              annoncesAffichees.slice(0, 80).map((annonce) => {
                const estSel = selectionne?.id === annonce.id
                const col = TYPE_COLORS[annonce.type] || TYPE_COLORS.vente
                const cover = getListingCoverSrc(annonce)
                return (
                  <button
                    key={annonce.id}
                    type="button"
                    onClick={() => allerAnnonce(annonce)}
                    className={`w-full border-b border-slate-100 px-2.5 py-2 text-left transition-colors ${
                      estSel ? 'bg-emerald-50/90 ring-1 ring-inset ring-emerald-200/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200/80">
                        <img src={cover} alt="" className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-[13px] font-semibold leading-tight text-slate-800">
                            {annonce.titre}
                          </p>
                          <span className="flex-shrink-0 text-[12px] font-semibold tabular-nums" style={{ color: col.price }}>
                            {formaterPrix(annonce.prix)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">
                          {annonce.quartier}
                          {(annonce.type === 'service' || annonce.type === 'artisan') && annonce.type_service
                            ? ` · ${annonce.type_service}`
                            : ''}
                        </p>
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
          } relative min-h-0 flex-1 overflow-hidden md:block md:min-h-0`}
          ref={mapShellRef}
        >

          <div className="absolute left-2 right-2 top-2 z-20 flex max-h-[32vh] flex-col gap-1 overflow-y-auto rounded-lg border border-emerald-900/10 bg-white/92 p-1.5 shadow-sm backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setFiltresVisibles((v) => !v)}
                className="rounded-md bg-stone-100 px-2 py-1 text-[10px] font-semibold text-stone-700 hover:bg-stone-200"
              >
                {filtresVisibles ? 'Masquer' : 'Filtres'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDessinZoneActif((v) => !v)
                }}
                className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
                  dessinZoneActif ? 'bg-amber-500 text-white' : 'bg-emerald-700 text-white hover:bg-emerald-800'
                }`}
              >
                {dessinZoneActif ? 'Fin zone' : 'Zone'}
              </button>
              {zoneRing && (
                <button
                  type="button"
                  onClick={effacerZone}
                  className="rounded-md border border-stone-200 bg-white px-2 py-1 text-[10px] font-medium text-stone-600 hover:bg-stone-50"
                >
                  Effacer
                </button>
              )}
              {dessinZoneActif && (
                <span className="text-[9px] font-medium text-amber-900/75">Clics sur la carte, puis Fin zone</span>
              )}
            </div>
            <div
              className={`grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-6 ${
                filtresVisibles ? '' : 'hidden'
              }`}
            >
              <select
                value={filtresCarte.type}
                onChange={(e) => setFiltresCarte((p) => ({ ...p, type: e.target.value }))}
                className="rounded border border-stone-200 bg-white px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-emerald-400"
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
                className="rounded border border-stone-200 bg-white px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
              <input type="number" value={filtresCarte.prixMax}
                onChange={(e) => setFiltresCarte((p) => ({ ...p, prixMax: e.target.value }))}
                placeholder="Prix max"
                className="rounded border border-stone-200 bg-white px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
              <select
                value={filtresCarte.beds}
                onChange={(e) => setFiltresCarte((p) => ({ ...p, beds: e.target.value }))}
                className="rounded border border-stone-200 bg-white px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-emerald-400"
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
                className="rounded border border-stone-200 bg-white px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-emerald-400"
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
                className="rounded border border-stone-200 bg-stone-50 px-1.5 py-1 text-[10px] font-semibold text-stone-600 hover:bg-stone-100"
              >
                Réinit.
              </button>
            </div>
          </div>

          {chargement ? (
            <div className="flex h-full min-h-[12rem] w-full flex-col items-center justify-center gap-3 bg-[#F5F5F5] md:absolute md:inset-0 md:min-h-0">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
              <p className="text-sm font-semibold text-slate-700">Chargement de la carte...</p>
            </div>
          ) : erreurAffichee ? (
            <div className="flex h-full min-h-[12rem] w-full items-center justify-center bg-gray-100 px-6 md:absolute md:inset-0 md:min-h-0">
              <div className="text-center">
                <p className="text-4xl mb-3">🗺️</p>
                <p className="text-gray-600 text-sm">{erreurAffichee}</p>
              </div>
            </div>
          ) : (
            <div
              ref={mapContainerRef}
              className="h-full min-h-[16rem] w-full md:absolute md:inset-0 md:min-h-0"
            />
          )}

          {selectionne && !chargement && !erreurAffichee && (
            <div className="absolute bottom-3 left-3 right-3 z-20 rounded-xl border border-slate-200 bg-white p-3 shadow-lg md:left-auto md:right-3 md:w-[360px]">
              <div className="flex items-start gap-3">
                <img
                  src={getListingCoverSrc(selectionne)}
                  alt={selectionne.titre}
                  className="h-20 w-24 flex-shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{selectionne.titre}</p>
                  <p className="truncate text-xs text-slate-500">{selectionne.quartier}</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums" style={{ color: (TYPE_COLORS[selectionne.type] || TYPE_COLORS.vente).price }}>
                    {formaterPrix(selectionne.prix)}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-gray-500">{badgeLabel[selectionne.badge] || '🔓 Bronze'}</span>
                    <Link href={`/annonces/${selectionne.id}`}
                      className="rounded-lg bg-[#1B5E20] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#2E7D32]">
                      Détails →
                    </Link>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" onClick={allerPrecedente} disabled={selectionIndex <= 0}
                      className="text-xs bg-gray-100 text-gray-700 py-1.5 rounded-lg font-bold disabled:opacity-40">
                      ← Précédent
                    </button>
                    <button type="button" onClick={allerSuivante} disabled={selectionIndex < 0 || selectionIndex >= annoncesAffichees.length - 1}
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
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
      </div>
    }>
      <CarteGoogleMaps />
    </Suspense>
  )
}
