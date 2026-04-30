'use client'

import { useState, useEffect, useRef } from 'react'
import { observerConnexion } from '@/lib/auth'
import { getAnnonceById, updateAnnonce, uploadPhotoChemin } from '@/lib/firestoreApp'
import { useRouter, useParams } from 'next/navigation'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

const QUARTIERS = [
  'Cocody', 'Plateau', 'Marcory', 'Yopougon', 'Bingerville',
  'Adjamé', 'Abobo', 'Koumassi', 'Port-Bouët', 'Treichville', 'Attécoubé', 'Riviera', 'Angré',
]

const ARRONDISSEMENTS = [
  'Abobo', 'Adjamé', 'Attécoubé', 'Cocody', 'Koumassi',
  'Marcory', 'Plateau', 'Port-Bouët', 'Treichville', 'Yopougon',
]

// ─── Composant sélecteur de localisation GPS ──────────────────────────────────

function CarteGPS({ latitude, longitude, onCoordChange }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const [actif, setActif] = useState(false)

  useEffect(() => {
    if (!actif || !containerRef.current || mapRef.current) return

    const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!TOKEN) return

    let cancelled = false

    async function init() {
      const mapboxgl = (await import('mapbox-gl')).default
      if (cancelled || !containerRef.current) return

      mapboxgl.accessToken = TOKEN

      const center = (longitude && latitude)
        ? [Number(longitude), Number(latitude)]
        : [-4.0167, 5.3167]

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center,
        zoom: 14,
      })
      mapRef.current = map

      map.on('load', () => {
        if (cancelled) return
        const marker = new mapboxgl.Marker({ draggable: true, color: '#1B5E20' })
          .setLngLat(center)
          .addTo(map)
        markerRef.current = marker

        marker.on('dragend', () => {
          const { lat, lng } = marker.getLngLat()
          onCoordChange(lat, lng)
        })

        map.on('click', (e) => {
          marker.setLngLat([e.lngLat.lng, e.lngLat.lat])
          onCoordChange(e.lngLat.lat, e.lngLat.lng)
        })
      })
    }

    init()
    return () => {
      cancelled = true
      if (mapRef.current) { try { mapRef.current.remove() } catch { /* ignore */ } mapRef.current = null }
    }
  }, [actif, latitude, longitude, onCoordChange])

  return (
    <div>
      {!actif ? (
        <button
          type="button"
          onClick={() => setActif(true)}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-[#1B5E20] transition-colors"
        >
          <div className="text-2xl mb-1">🗺️</div>
          <div className="text-sm font-bold text-gray-700">Cliquer pour ouvrir le sélecteur de position</div>
          <div className="text-xs text-gray-400 mt-1">
            {latitude && longitude
              ? `📍 Position enregistrée : ${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`
              : 'Aucune position définie — cliquez sur la carte pour la définir'}
          </div>
        </button>
      ) : (
        <div className="rounded-xl overflow-hidden border border-gray-200">
          <div ref={containerRef} className="w-full h-64" />
          <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500 flex items-center justify-between">
            <span>🖱️ Cliquez ou déplacez le marqueur pour changer la position</span>
            {latitude && longitude && (
              <span className="font-mono text-[#1B5E20] font-bold">
                {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ModifierAnnonceClient() {
  const [chargement, setChargement] = useState(true)
  const [sauvegarde, setSauvegarde] = useState(false)
  const [succes, setSucces] = useState(false)
  const [erreur, setErreur] = useState('')
  const [utilisateur, setUtilisateur] = useState(null)

  // Champs de base
  const [type, setType] = useState('location')
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [prix, setPrix] = useState('')
  const [quartier, setQuartier] = useState('')
  const [statut, setStatut] = useState('actif')

  // Localisation précise
  const [rue, setRue] = useState('')
  const [secteur, setSecteur] = useState('')
  const [arrondissement, setArrondissement] = useState('')
  const [adresseComplete, setAdresseComplete] = useState('')
  const [latitude, setLatitude] = useState(null)
  const [longitude, setLongitude] = useState(null)

  // Photos
  const [photosExistantes, setPhotosExistantes] = useState([]) // URLs déjà en base
  const [nouvellesFichiers, setNouvellesFichiers] = useState([]) // File[] à uploader
  const [nouvellesAperçus, setNouvellesAperçus] = useState([]) // objectURLs preview

  const router = useRouter()
  const params = useParams()
  const id = params?.id

  useEffect(() => {
    if (!id) {
      router.replace('/mes-annonces')
      return
    }
    const unsub = observerConnexion(async (user) => {
      if (!user) {
        router.push('/connexion')
        return
      }
      setUtilisateur(user)

      const data = await getAnnonceById(id)
      if (!data || data.utilisateur_id !== user.uid) {
        router.push('/mes-annonces')
        return
      }

      setType(data.type || 'location')
      setTitre(data.titre || '')
      setDescription(data.description || '')
      setPrix(data.prix?.toString() || '')
      setQuartier(data.quartier || '')
      setStatut(data.statut || 'actif')
      setPhotosExistantes(data.photos || [])
      setRue(data.rue || '')
      setSecteur(data.secteur || '')
      setArrondissement(data.arrondissement || '')
      setAdresseComplete(data.adresse_complete || '')
      setLatitude(data.latitude ?? null)
      setLongitude(data.longitude ?? null)
      setChargement(false)
    })
    return () => unsub()
  }, [id, router])

  const ajouterPhotos = (e) => {
    const fichiers = Array.from(e.target.files)
    const total = photosExistantes.length + nouvellesFichiers.length + fichiers.length
    if (total > 10) {
      setErreur(`Maximum 10 photos. Vous en avez déjà ${photosExistantes.length + nouvellesFichiers.length}.`)
      return
    }
    setNouvellesFichiers((prev) => [...prev, ...fichiers])
    setNouvellesAperçus((prev) => [...prev, ...fichiers.map((f) => URL.createObjectURL(f))])
    setErreur('')
  }

  const supprimerPhotoExistante = (index) => {
    setPhotosExistantes((prev) => prev.filter((_, i) => i !== index))
  }

  const supprimerNouvellePhoto = (index) => {
    URL.revokeObjectURL(nouvellesAperçus[index])
    setNouvellesFichiers((prev) => prev.filter((_, i) => i !== index))
    setNouvellesAperçus((prev) => prev.filter((_, i) => i !== index))
  }

  const sauvegarder = async () => {
    if (!titre) return setErreur('Le titre est obligatoire')
    if (!prix) return setErreur('Le prix est obligatoire')
    if (!quartier) return setErreur('Le quartier est obligatoire')

    setSauvegarde(true)
    setErreur('')

    // Upload des nouvelles photos
    let urlsNouveaux = []
    if (nouvellesFichiers.length > 0 && utilisateur) {
      for (const photo of nouvellesFichiers) {
        const chemin = `annonces/${utilisateur.uid}/${Date.now()}-${photo.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const url = await uploadPhotoChemin(chemin, photo)
        urlsNouveaux.push(url)
      }
    }

    const photosFinales = [...photosExistantes, ...urlsNouveaux]

    try {
      await updateAnnonce(id, {
        type,
        titre,
        description,
        prix: parseInt(prix, 10),
        quartier,
        statut,
        photos: photosFinales,
        rue: rue || null,
        secteur: secteur || null,
        arrondissement: arrondissement || null,
        adresse_complete: adresseComplete || null,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
      })
    } catch {
      setErreur('Erreur lors de la sauvegarde')
      setSauvegarde(false)
      return
    }

    setSucces(true)
    setTimeout(() => router.push('/mes-annonces'), 2000)
  }

  if (chargement) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-[#1B5E20] font-bold">Chargement...</div>
      </div>
    )
  }

  if (succes) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="bg-white rounded-xl p-10 text-center shadow-sm max-w-md">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-[#1B5E20] mb-2">Annonce modifiée !</h2>
          <p className="text-gray-500">Redirection en cours...</p>
        </div>
      </div>
    )
  }

  const totalPhotos = photosExistantes.length + nouvellesFichiers.length

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <SiteHeader />

      <div className="max-w-2xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold text-[#1B5E20] mb-2">Modifier l&apos;annonce</h1>
        <p className="text-gray-500 mb-8">Mettez à jour les informations de votre bien</p>

        {/* TYPE */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-gray-800 mb-4">Type d&apos;annonce</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'location', emoji: '🔑', label: 'Location' },
              { id: 'vente', emoji: '🏠', label: 'Vente' },
              { id: 'service', emoji: '🔧', label: 'Service' },
              { id: 'artisan', emoji: '👷', label: 'Artisan' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`p-3 rounded-lg border-2 font-bold text-sm transition-all ${
                  type === t.id
                    ? 'border-[#1B5E20] bg-[#E8F5E9] text-[#1B5E20]'
                    : 'border-gray-200 text-gray-600 hover:border-green-300'
                }`}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* INFORMATIONS */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-gray-800 mb-4">Informations du bien</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Titre *</label>
              <input
                type="text"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Prix (FCFA) *</label>
                <input
                  type="number"
                  value={prix}
                  onChange={(e) => setPrix(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Quartier *</label>
                <select
                  value={quartier}
                  onChange={(e) => setQuartier(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20]"
                >
                  <option value="">Choisir</option>
                  {QUARTIERS.map((q) => <option key={q}>{q}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Statut</label>
              <select
                value={statut}
                onChange={(e) => setStatut(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20]"
              >
                <option value="actif">✅ Actif — visible par tous</option>
                <option value="inactif">⏸️ Inactif — masqué temporairement</option>
              </select>
            </div>
          </div>
        </div>

        {/* PHOTOS */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-gray-800">Photos ({totalPhotos}/10)</h2>
            {totalPhotos < 10 && (
              <label className="cursor-pointer bg-[#1B5E20] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-800 transition-colors">
                + Ajouter
                <input type="file" multiple accept="image/*" onChange={ajouterPhotos} className="hidden" />
              </label>
            )}
          </div>
          <p className="text-gray-400 text-xs mb-4">
            Cliquez sur ✕ pour supprimer une photo. La première photo sera la principale.
          </p>

          {totalPhotos === 0 ? (
            <label className="block border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-[#1B5E20] transition-colors">
              <div className="text-3xl mb-2">📷</div>
              <div className="font-bold text-gray-700 text-sm">Cliquer pour ajouter des photos</div>
              <div className="text-gray-400 text-xs mt-1">JPG, PNG — Max 10 photos</div>
              <input type="file" multiple accept="image/*" onChange={ajouterPhotos} className="hidden" />
            </label>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {/* Photos existantes */}
              {photosExistantes.map((url, i) => (
                <div key={`ex-${i}`} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-20 object-cover rounded-lg" />
                  {i === 0 && photosExistantes.length > 0 && (
                    <span className="absolute top-1 left-1 bg-[#1B5E20] text-white text-xs px-1 py-0.5 rounded text-[10px]">
                      Principale
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => supprimerPhotoExistante(i)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {/* Nouvelles photos */}
              {nouvellesAperçus.map((url, i) => (
                <div key={`new-${i}`} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-20 object-cover rounded-lg border-2 border-blue-300" />
                  <span className="absolute top-1 left-1 bg-blue-500 text-white text-[10px] px-1 py-0.5 rounded">
                    Nouveau
                  </span>
                  <button
                    type="button"
                    onClick={() => supprimerNouvellePhoto(i)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* LOCALISATION PRÉCISE */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-gray-800 mb-1">Localisation précise</h2>
          <p className="text-gray-400 text-xs mb-4">
            Ces informations permettent une meilleure visibilité sur la carte.
          </p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Rue / Avenue</label>
                <input
                  type="text"
                  value={rue}
                  onChange={(e) => setRue(e.target.value)}
                  placeholder="Ex: Rue des Jardins"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Secteur / Cité</label>
                <input
                  type="text"
                  value={secteur}
                  onChange={(e) => setSecteur(e.target.value)}
                  placeholder="Ex: Cité Sogephia, Résidence A"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Arrondissement / Mairie</label>
                <select
                  value={arrondissement}
                  onChange={(e) => setArrondissement(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
                >
                  <option value="">— Sélectionner —</option>
                  {ARRONDISSEMENTS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Adresse complète</label>
                <input
                  type="text"
                  value={adresseComplete}
                  onChange={(e) => setAdresseComplete(e.target.value)}
                  placeholder="Ex: 12 Rue des Cocotiers, Cocody"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Position GPS sur la carte{' '}
                <span className="text-gray-400 font-normal">(optionnel — cliquez sur la carte pour définir)</span>
              </label>
              <CarteGPS
                latitude={latitude}
                longitude={longitude}
                onCoordChange={(lat, lng) => { setLatitude(lat); setLongitude(lng) }}
              />
            </div>
          </div>
        </div>

        {erreur && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {erreur}
          </div>
        )}

        <div className="flex gap-3">
          <a
            href="/mes-annonces"
            className="flex-1 border-2 border-gray-300 text-gray-600 py-4 rounded-xl font-bold text-center hover:bg-gray-50"
          >
            Annuler
          </a>
          <button
            type="button"
            onClick={sauvegarder}
            disabled={sauvegarde}
            className="flex-1 bg-[#1B5E20] text-white py-4 rounded-xl font-bold hover:bg-green-800 disabled:opacity-50"
          >
            {sauvegarde ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
          </button>
        </div>
      </div>
      <SiteFooter />
    </div>
  )
}
