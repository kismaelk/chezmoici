'use client'

import { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { fetchAnnoncesList } from '@/lib/firestoreApp'
import 'leaflet/dist/leaflet.css'
import SiteHeader from '@/app/components/SiteHeader'

/** Tuiles raster sans clé API (OSM + CARTO). Politique d'usage : trafic modéré ; pour forte charge, prévoir un fournisseur payant. */
const TILE_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

function formaterPrix(p) {
  if (!p) return '—'
  if (p >= 1_000_000) return (p / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M FCFA'
  if (p >= 1000) return (p / 1000).toFixed(0) + 'K FCFA'
  return p.toLocaleString() + ' FCFA'
}

function CarteInterne() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef([])
  const [annonces, setAnnonces] = useState([])
  const [selectionne, setSelectionne] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [erreurCarte, setErreurCarte] = useState('')

  // Lire les filtres depuis l'URL
  const filtresURL = useMemo(() => ({
    type: searchParams.get('type') || '',
    quartier: searchParams.get('quartier') || '',
    prixMin: searchParams.get('prixMin') || '',
    prixMax: searchParams.get('prixMax') || '',
    nbPieces: searchParams.get('nbPieces') || '',
    nbChambres: searchParams.get('nbChambres') || '',
    meuble: searchParams.get('meuble') || '',
    badge: searchParams.get('badge') || '',
    surfaceMin: searchParams.get('surfaceMin') || '',
    recherche: searchParams.get('recherche') || '',
    typePropriete: searchParams.get('typePropriete') || '',
    typeService: searchParams.get('typeService') || '',
    disponibilite: searchParams.get('disponibilite') || '',
  }), [searchParams])

  // Lien "Voir en liste" — même filtres, vers /annonces
  const lienListe = useMemo(() => {
    const params = new URLSearchParams()
    Object.entries(filtresURL).forEach(([k, v]) => { if (v) params.set(k, v) })
    return '/annonces' + (params.toString() ? '?' + params.toString() : '')
  }, [filtresURL])

  const titreFiltres = useMemo(() => {
    const parties = []
    if (filtresURL.type) parties.push({ location: 'Location', vente: 'Vente', service: 'Services', artisan: 'Artisans' }[filtresURL.type] || filtresURL.type)
    if (filtresURL.quartier) parties.push(filtresURL.quartier)
    return parties.join(' · ') || 'Toutes les annonces'
  }, [filtresURL])

  useEffect(() => {
    async function chargerAnnonces() {
      setChargement(true)
      try {
        const data = await fetchAnnoncesList(filtresURL, 'recent')
        setAnnonces((data || []).slice(0, 100))
      } catch {
        setAnnonces([])
      }
      setChargement(false)
    }
    chargerAnnonces()
  }, [filtresURL])

  const coordonnees = useMemo(
    () => ({
      Cocody: [5.36, -3.98],
      Plateau: [5.3167, -4.0167],
      Marcory: [5.2833, -4.0],
      Yopougon: [5.3333, -4.0833],
      Bingerville: [5.35, -3.8833],
      Adjamé: [5.3667, -4.0333],
      Abobo: [5.4167, -4.0167],
      Koumassi: [5.2667, -3.9667],
      Treichville: [5.2833, -4.0167],
      'Port-Bouët': [5.25, -3.9333],
    }),
    []
  )

  useEffect(() => {
    if (chargement || !mapRef.current || mapInstance.current) return

    let cancelled = false

    function lngLatPourAnnonce(annonce) {
      if (
        annonce.longitude != null &&
        annonce.latitude != null &&
        !Number.isNaN(Number(annonce.longitude)) &&
        !Number.isNaN(Number(annonce.latitude))
      ) {
        return [Number(annonce.longitude), Number(annonce.latitude)]
      }
      const c = coordonnees[annonce.quartier]
      if (!c) return null
      return [c[1], c[0]]
    }

    async function initCarte() {
      try {
        const L = (await import('leaflet')).default
        if (cancelled || !mapRef.current) return

        const iconBase = 'https://unpkg.com/leaflet@1.9.4/dist/images/'
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: `${iconBase}marker-icon-2x.png`,
          iconUrl: `${iconBase}marker-icon.png`,
          shadowUrl: `${iconBase}marker-shadow.png`,
        })

        const map = L.map(mapRef.current, {
          scrollWheelZoom: true,
        }).setView([5.3167, -4.0167], 12)

        L.tileLayer(TILE_URL, {
          attribution: TILE_ATTRIBUTION,
          subdomains: 'abcd',
          maxZoom: 20,
        }).addTo(map)

        L.control.scale({ imperial: false, metric: true }).addTo(map)

        mapInstance.current = map

        annonces.forEach((annonce) => {
          const lngLat = lngLatPourAnnonce(annonce)
          if (!lngLat) return
          const [lng, lat] = lngLat

          const emoji =
            annonce.type === 'location'
              ? '🔑'
              : annonce.type === 'vente'
                ? '🏠'
                : '🔧'

          const icon = L.divIcon({
            className: 'chezmoici-leaflet-div-icon',
            html: `<div style="font-size:24px;line-height:1;cursor:pointer;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));text-align:center;width:36px">${emoji}</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 36],
          })

          const marker = L.marker([lat, lng], { icon }).addTo(map)
          marker.on('click', () => setSelectionne(annonce))
          markersRef.current.push(marker)
        })

        map.whenReady(() => {
          if (!cancelled && mapInstance.current) {
            mapInstance.current.invalidateSize()
          }
        })
        window.setTimeout(() => {
          if (!cancelled && mapInstance.current) {
            mapInstance.current.invalidateSize()
          }
        }, 300)
      } catch {
        if (!cancelled) {
          setErreurCarte(
            'Impossible d\'afficher la carte. Vérifiez la connexion ou réessayez plus tard.'
          )
        }
      }
    }

    initCarte()

    return () => {
      cancelled = true
      markersRef.current.forEach((m) => {
        try { m.remove() } catch { /* ignore */ }
      })
      markersRef.current = []
      if (mapInstance.current) {
        try { mapInstance.current.remove() } catch { /* ignore */ }
        mapInstance.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chargement])

  const badgeLabel = { bronze: '🔓', argent: '🥈', or: '🥇' }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <SiteHeader />

      {/* Barre de contexte : titre + bouton Liste */}
      <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center justify-between gap-3 z-[600] relative">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-bold text-gray-700 truncate">🗺️ {titreFiltres}</span>
          {!chargement && (
            <span className="text-xs text-gray-400 flex-shrink-0">
              {annonces.length} annonce{annonces.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <a
          href={lienListe}
          className="flex-shrink-0 flex items-center gap-1.5 bg-[#1B5E20] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-800 transition-colors"
        >
          ☰ Voir en liste
        </a>
      </div>

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        <div className="flex-1 relative min-h-[24rem] md:min-h-[calc(100vh-7rem)]">
          {chargement ? (
            <div className="w-full h-96 md:h-full bg-gray-200 flex items-center justify-center">
              <div className="text-[#1B5E20] font-bold">
                Chargement de la carte...
              </div>
            </div>
          ) : erreurCarte ? (
            <div className="w-full h-96 md:h-full bg-gray-100 flex items-center justify-center px-4">
              <p className="text-gray-600 text-sm text-center">{erreurCarte}</p>
            </div>
          ) : (
            <div
              ref={mapRef}
              className="w-full h-96 md:h-full md:absolute md:inset-0 z-0 [&_.leaflet-container]:h-full [&_.leaflet-container]:min-h-[24rem] md:[&_.leaflet-container]:min-h-0"
            />
          )}

          {!chargement && !erreurCarte && (
            <div className="absolute top-4 left-4 z-[500] bg-white rounded-lg px-3 py-2 shadow-md text-sm font-bold text-[#1B5E20] pointer-events-none">
              📍 {annonces.length} annonces
            </div>
          )}
        </div>

        <div className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l border-gray-100 flex flex-col max-h-[50vh] md:max-h-none relative z-[400]">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">
              {selectionne ? 'Annonce sélectionnée' : 'Cliquez sur un marqueur'}
            </h2>
          </div>

          {selectionne ? (
            <div className="p-4 overflow-y-auto">
              {selectionne.photos?.[0] && (
                <img
                  src={selectionne.photos[0]}
                  alt={selectionne.titre}
                  className="w-full h-40 object-cover rounded-xl mb-4"
                />
              )}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs bg-[#E8F5E9] text-[#1B5E20] px-2 py-1 rounded-full font-bold capitalize">
                  {selectionne.type}
                </span>
                <span>{badgeLabel[selectionne.badge] || '🔓'}</span>
              </div>
              <h3 className="font-bold text-gray-800 mb-1">{selectionne.titre}</h3>
              <p className="text-gray-400 text-sm mb-2">
                📍 {selectionne.quartier}, Abidjan
              </p>
              <p className="text-[#F9A825] font-bold text-lg mb-4">
                {formaterPrix(selectionne.prix)}
                {selectionne.type === 'location' && (
                  <span className="text-gray-400 text-sm font-normal"> / mois</span>
                )}
              </p>
              <a
                href={`/annonces/${selectionne.id}`}
                className="block w-full bg-[#1B5E20] text-white py-3 rounded-xl font-bold text-center hover:bg-green-800"
              >
                Voir l&apos;annonce complète
              </a>
              <button
                type="button"
                onClick={() => setSelectionne(null)}
                className="block w-full text-gray-400 text-sm mt-2 hover:underline text-center"
              >
                Fermer
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {annonces.length === 0 && !chargement ? (
                <div className="p-6 text-center text-gray-400 text-sm">
                  <p className="text-3xl mb-2">🔍</p>
                  <p>Aucune annonce trouvée</p>
                  <a href="/annonces" className="text-[#1B5E20] font-bold text-xs mt-2 block hover:underline">
                    Voir toutes les annonces
                  </a>
                </div>
              ) : annonces.slice(0, 20).map((annonce) => (
                <button
                  key={annonce.id}
                  type="button"
                  onClick={() => setSelectionne(annonce)}
                  className="w-full p-4 text-left border-b border-gray-50 hover:bg-gray-50 flex gap-3"
                >
                  <div className="w-14 h-12 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                    {annonce.photos?.[0] ? (
                      <img
                        src={annonce.photos[0]}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        📷
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-800 truncate">
                      {annonce.titre}
                    </p>
                    <p className="text-gray-400 text-xs">📍 {annonce.quartier}</p>
                    <p className="text-[#F9A825] font-bold text-sm">
                      {formaterPrix(annonce.prix)}
                    </p>
                  </div>
                </button>
              ))}
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
        <div className="text-[#1B5E20] font-bold">Chargement...</div>
      </div>
    }>
      <CarteInterne />
    </Suspense>
  )
}
