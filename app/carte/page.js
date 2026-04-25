'use client'

import { useEffect, useRef, useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { fetchAnnoncesList } from '@/lib/firestoreApp'
import SiteHeader from '@/app/components/SiteHeader'

function formaterPrix(p) {
  if (!p) return '—'
  if (p >= 1_000_000) return (p / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M FCFA'
  if (p >= 1000) return (p / 1000).toFixed(0) + 'K FCFA'
  return p.toLocaleString() + ' FCFA'
}

const COORDS_QUARTIER = {
  Cocody:        [-3.98,  5.36],
  Plateau:       [-4.0167, 5.3167],
  Marcory:       [-4.0,   5.2833],
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

const TYPE_EMOJI = { location: '🔑', vente: '🏠', service: '🔧', artisan: '👷' }

function CarteMapbox() {
  const searchParams = useSearchParams()
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const popupRef = useRef(null)
  const [annonces, setAnnonces] = useState([])
  const [selectionne, setSelectionne] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')

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

  const lienListe = useMemo(() => {
    const p = new URLSearchParams()
    Object.entries(filtresURL).forEach(([k, v]) => { if (v) p.set(k, v) })
    return '/annonces' + (p.toString() ? '?' + p.toString() : '')
  }, [filtresURL])

  const titreFiltres = useMemo(() => {
    const parties = []
    if (filtresURL.type) parties.push({ location: 'Location', vente: 'Vente', service: 'Services', artisan: 'Artisans' }[filtresURL.type] || filtresURL.type)
    if (filtresURL.quartier) parties.push(filtresURL.quartier)
    return parties.join(' · ') || 'Toutes les annonces'
  }, [filtresURL])

  // Chargement des annonces
  useEffect(() => {
    async function charger() {
      setChargement(true)
      try {
        const data = await fetchAnnoncesList(filtresURL, 'recent')
        setAnnonces((data || []).slice(0, 200))
      } catch {
        setAnnonces([])
      }
      setChargement(false)
    }
    charger()
  }, [filtresURL])

  // Initialisation Mapbox
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
        await import('mapbox-gl/dist/mapbox-gl.css')
        if (cancelled || !mapContainer.current) return

        mapboxgl.accessToken = TOKEN

        const map = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [-4.0167, 5.3167], // Abidjan
          zoom: 11,
          language: 'fr',
        })

        map.addControl(new mapboxgl.NavigationControl(), 'top-right')
        map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left')

        mapRef.current = map

        map.on('load', () => {
          if (cancelled) return

          annonces.forEach((annonce) => {
            let coords = null

            if (annonce.longitude != null && annonce.latitude != null &&
                !isNaN(Number(annonce.longitude)) && !isNaN(Number(annonce.latitude))) {
              coords = [Number(annonce.longitude), Number(annonce.latitude)]
            } else {
              coords = COORDS_QUARTIER[annonce.quartier] || null
            }

            if (!coords) return

            const emoji = TYPE_EMOJI[annonce.type] || '🏠'

            const el = document.createElement('div')
            el.style.cssText = `
              font-size: 26px;
              cursor: pointer;
              filter: drop-shadow(0 2px 6px rgba(0,0,0,0.4));
              transition: transform 0.15s ease;
              width: 36px;
              text-align: center;
              line-height: 1;
            `
            el.textContent = emoji
            el.title = annonce.titre

            el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.3)' })
            el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })

            const marker = new mapboxgl.Marker({ element: el })
              .setLngLat(coords)
              .addTo(map)

            marker.getElement().addEventListener('click', () => {
              if (!cancelled) setSelectionne(annonce)
              map.flyTo({ center: coords, zoom: Math.max(map.getZoom(), 14), duration: 600 })
            })
          })
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
      if (popupRef.current) { try { popupRef.current.remove() } catch { /* ignore */ } popupRef.current = null }
      if (mapRef.current) { try { mapRef.current.remove() } catch { /* ignore */ } mapRef.current = null }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chargement])

  const badgeLabel = { bronze: '🔓 Bronze', argent: '🥈 Argent', or: '🥇 Or' }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <SiteHeader />

      {/* Barre contexte */}
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

        {/* Carte */}
        <div className="flex-1 relative min-h-[24rem] md:min-h-[calc(100vh-7rem)]">
          {chargement ? (
            <div className="w-full h-full min-h-[24rem] bg-gradient-to-br from-[#E8F5E9] to-gray-100 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-4 border-[#1B5E20] border-t-transparent rounded-full animate-spin" />
              <p className="text-[#1B5E20] font-bold text-sm">Chargement de la carte...</p>
            </div>
          ) : erreur ? (
            <div className="w-full h-full min-h-[24rem] bg-gray-100 flex items-center justify-center px-6">
              <div className="text-center">
                <p className="text-4xl mb-3">🗺️</p>
                <p className="text-gray-600 text-sm">{erreur}</p>
              </div>
            </div>
          ) : (
            <div ref={mapContainer} className="w-full h-full min-h-[24rem] md:absolute md:inset-0" />
          )}

          {!chargement && !erreur && (
            <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur rounded-xl px-3 py-2 shadow-lg text-sm font-bold text-[#1B5E20] pointer-events-none">
              📍 {annonces.length} annonces
            </div>
          )}
        </div>

        {/* Panneau latéral */}
        <div className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l border-gray-100 flex flex-col max-h-[50vh] md:max-h-none relative z-[400]">

          {selectionne ? (
            <>
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-800 text-sm">Annonce sélectionnée</h2>
                <button
                  type="button"
                  onClick={() => setSelectionne(null)}
                  className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                {selectionne.photos?.[0] ? (
                  <img
                    src={selectionne.photos[0]}
                    alt={selectionne.titre}
                    className="w-full h-44 object-cover rounded-xl mb-4"
                  />
                ) : (
                  <div className="w-full h-44 bg-gradient-to-br from-[#E8F5E9] to-gray-100 rounded-xl mb-4 flex items-center justify-center text-5xl">
                    {TYPE_EMOJI[selectionne.type] || '🏠'}
                  </div>
                )}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs bg-[#E8F5E9] text-[#1B5E20] px-2.5 py-1 rounded-full font-bold capitalize">
                    {selectionne.type}
                  </span>
                  <span className="text-xs text-gray-500">{badgeLabel[selectionne.badge] || '🔓 Bronze'}</span>
                </div>
                <h3 className="font-bold text-gray-800 mb-1 leading-snug">{selectionne.titre}</h3>
                <p className="text-gray-400 text-sm mb-3">📍 {selectionne.quartier}, Abidjan</p>
                <p className="text-[#F9A825] font-bold text-xl mb-4">
                  {formaterPrix(selectionne.prix)}
                  {selectionne.type === 'location' && (
                    <span className="text-gray-400 text-sm font-normal"> / mois</span>
                  )}
                </p>
                <div className="flex gap-2 text-xs text-gray-500 flex-wrap mb-4">
                  {selectionne.nb_chambres > 0 && <span>🛏 {selectionne.nb_chambres} ch.</span>}
                  {selectionne.nb_pieces    > 0 && <span>🚪 {selectionne.nb_pieces}p</span>}
                  {selectionne.surface           && <span>📐 {selectionne.surface} m²</span>}
                  {selectionne.meuble            && <span>🛋️ Meublé</span>}
                </div>
                <a
                  href={`/annonces/${selectionne.id}`}
                  className="block w-full bg-[#1B5E20] text-white py-3 rounded-xl font-bold text-center hover:bg-green-800 transition-colors"
                >
                  Voir l&apos;annonce complète →
                </a>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-800 text-sm">
                  {chargement ? 'Chargement...' : `${annonces.length} annonce${annonces.length > 1 ? 's' : ''} sur la carte`}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Cliquez sur un marqueur pour voir le détail</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {annonces.length === 0 && !chargement ? (
                  <div className="p-8 text-center text-gray-400">
                    <p className="text-4xl mb-2">🔍</p>
                    <p className="text-sm">Aucune annonce trouvée</p>
                    <a href="/annonces" className="text-[#1B5E20] font-bold text-xs mt-2 block hover:underline">
                      Voir toutes les annonces
                    </a>
                  </div>
                ) : (
                  annonces.slice(0, 30).map((annonce) => (
                    <button
                      key={annonce.id}
                      type="button"
                      onClick={() => {
                        setSelectionne(annonce)
                        if (mapRef.current) {
                          let coords = null
                          if (annonce.longitude != null && annonce.latitude != null) {
                            coords = [Number(annonce.longitude), Number(annonce.latitude)]
                          } else {
                            coords = COORDS_QUARTIER[annonce.quartier] || null
                          }
                          if (coords) mapRef.current.flyTo({ center: coords, zoom: 15, duration: 800 })
                        }
                      }}
                      className="w-full p-4 text-left border-b border-gray-50 hover:bg-[#F5F5F5] flex gap-3 transition-colors"
                    >
                      <div className="w-14 h-12 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                        {annonce.photos?.[0] ? (
                          <img src={annonce.photos[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">
                            {TYPE_EMOJI[annonce.type] || '🏠'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-800 truncate">{annonce.titre}</p>
                        <p className="text-gray-400 text-xs truncate">📍 {annonce.quartier}</p>
                        <p className="text-[#F9A825] font-bold text-sm mt-0.5">{formaterPrix(annonce.prix)}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
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
