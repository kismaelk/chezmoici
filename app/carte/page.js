'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchAnnoncesList } from '@/lib/firestoreApp'
import 'mapbox-gl/dist/mapbox-gl.css'
import SiteHeader from '@/app/components/SiteHeader'

export default function Carte() {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef([])
  const [annonces, setAnnonces] = useState([])
  const [selectionne, setSelectionne] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [erreurCarte, setErreurCarte] = useState('')
  useEffect(() => {
    async function chargerAnnonces() {
      const filtres = {
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
      const data = await fetchAnnoncesList(filtres, 'recent')
      setAnnonces((data || []).slice(0, 50))
      setChargement(false)
    }
    chargerAnnonces()
  }, [])

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
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) {
      setErreurCarte(
        'Ajoutez NEXT_PUBLIC_MAPBOX_TOKEN dans .env.local (compte Mapbox → Tokens).'
      )
      return
    }

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
      const mapboxgl = (await import('mapbox-gl')).default
      if (cancelled || !mapRef.current) return

      mapboxgl.accessToken = token

      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-4.0167, 5.3167],
        zoom: 11,
      })

      map.addControl(new mapboxgl.NavigationControl(), 'top-right')
      mapInstance.current = map

      annonces.forEach((annonce) => {
        const lngLat = lngLatPourAnnonce(annonce)
        if (!lngLat) return

        const el = document.createElement('div')
        el.innerHTML =
          annonce.type === 'location'
            ? '🔑'
            : annonce.type === 'vente'
              ? '🏠'
              : '🔧'
        el.style.fontSize = '24px'
        el.style.cursor = 'pointer'
        el.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'

        el.addEventListener('click', () => setSelectionne(annonce))

        const marker = new mapboxgl.Marker(el).setLngLat(lngLat).addTo(map)
        markersRef.current.push(marker)
      })
    }

    initCarte()

    return () => {
      cancelled = true
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
    // annonces et coordonnees sont figés au moment où chargement devient false (un seul rendu utile)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chargement])

  const badgeLabel = { bronze: '🔓', argent: '🥈', or: '🥇' }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <SiteHeader />

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        <div className="flex-1 relative min-h-[24rem] md:min-h-[calc(100vh-3.5rem)]">
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
            <div ref={mapRef} className="w-full h-96 md:h-full md:absolute md:inset-0" />
          )}

          {!chargement && !erreurCarte && (
            <div className="absolute top-4 left-4 bg-white rounded-lg px-3 py-2 shadow-md text-sm font-bold text-[#1B5E20]">
              📍 {annonces.length} annonces
            </div>
          )}
        </div>

        <div className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l border-gray-100 flex flex-col max-h-[50vh] md:max-h-none">
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
                {selectionne.prix?.toLocaleString()} FCFA
                {selectionne.type === 'location' && (
                  <span className="text-gray-400 text-sm font-normal">
                    {' '}
                    / mois
                  </span>
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
              {annonces.slice(0, 10).map((annonce) => (
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
                      {annonce.prix?.toLocaleString()} FCFA
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
