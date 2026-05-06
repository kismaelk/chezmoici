'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { observerConnexion } from '@/lib/auth'
import { getAnnonceById, updateAnnonce, uploadPhotoChemin, getProfilFirestore } from '@/lib/firestoreApp'
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

/** Snapshot stable pour détecter les changements (confirmation sauvegarde) */
function serialiserEtatEdition(v) {
  return JSON.stringify({
    type: v.type || '',
    titre: (v.titre || '').trim(),
    description: (v.description || '').trim(),
    prix: String(v.prix ?? ''),
    quartier: v.quartier || '',
    statut: v.statut || '',
    photos: (v.photos || []).join('|'),
    nbNouvellesPhotos: v.nbNouvellesPhotos ?? 0,
    rue: (v.rue || '').trim(),
    secteur: (v.secteur || '').trim(),
    arrondissement: v.arrondissement || '',
    adresseComplete: (v.adresseComplete || '').trim(),
    lat: v.latitude != null ? String(v.latitude) : '',
    lng: v.longitude != null ? String(v.longitude) : '',
    nbChambres: String(v.nbChambres ?? ''),
    nbPieces: String(v.nbPieces ?? ''),
    surface: String(v.surface ?? ''),
    meuble: String(v.meuble ?? ''),
    disponibilite: String(v.disponibilite ?? ''),
    dureeBail: String(v.dureeBail ?? ''),
    inclusions: (v.inclusions || []).slice().sort().join(','),
    typePropriete: String(v.typePropriete ?? ''),
    anneeConstruction: String(v.anneeConstruction ?? ''),
    titreFoncier: String(v.titreFoncier ?? ''),
    typeService: String(v.typeService ?? ''),
    zoneDesservie: String(v.zoneDesservie ?? ''),
    tarifHoraire: String(v.tarifHoraire ?? ''),
    disponibiliteService: String(v.disponibiliteService ?? ''),
  })
}

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
  const [profil, setProfil] = useState(null)

  const [nbChambres, setNbChambres] = useState('')
  const [nbPieces, setNbPieces] = useState('')
  const [surface, setSurface] = useState('')
  const [meuble, setMeuble] = useState('')
  const [disponibilite, setDisponibilite] = useState('')
  const [dureeBail, setDureeBail] = useState('')
  const [inclusions, setInclusions] = useState([])

  const [typePropriete, setTypePropriete] = useState('')
  const [anneeConstruction, setAnneeConstruction] = useState('')
  const [titreFoncier, setTitreFoncier] = useState('')

  const [typeService, setTypeService] = useState('')
  const [zoneDesservie, setZoneDesservie] = useState('')
  const [tarifHoraire, setTarifHoraire] = useState('')
  const [disponibiliteService, setDisponibiliteService] = useState('')

  const [baselineSerialise, setBaselineSerialise] = useState('')

  const router = useRouter()
  const params = useParams()
  const id = params?.id

  const etatActuelSerialise = useMemo(
    () =>
      serialiserEtatEdition({
        type,
        titre,
        description,
        prix,
        quartier,
        statut,
        photos: photosExistantes,
        nbNouvellesPhotos: nouvellesFichiers.length,
        rue,
        secteur,
        arrondissement,
        adresseComplete,
        latitude,
        longitude,
        nbChambres,
        nbPieces,
        surface,
        meuble,
        disponibilite,
        dureeBail,
        inclusions,
        typePropriete,
        anneeConstruction,
        titreFoncier,
        typeService,
        zoneDesservie,
        tarifHoraire,
        disponibiliteService,
      }),
    [
      type,
      titre,
      description,
      prix,
      quartier,
      statut,
      photosExistantes,
      nouvellesFichiers.length,
      rue,
      secteur,
      arrondissement,
      adresseComplete,
      latitude,
      longitude,
      nbChambres,
      nbPieces,
      surface,
      meuble,
      disponibilite,
      dureeBail,
      inclusions,
      typePropriete,
      anneeConstruction,
      titreFoncier,
      typeService,
      zoneDesservie,
      tarifHoraire,
      disponibiliteService,
    ],
  )

  const isDirty =
    baselineSerialise !== '' && baselineSerialise !== etatActuelSerialise

  useEffect(() => {
    const fn = (e) => {
      if (!isDirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', fn)
    return () => window.removeEventListener('beforeunload', fn)
  }, [isDirty])

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

      try {
        const p = await getProfilFirestore(user.uid)
        setProfil(p)
      } catch {
        setProfil(null)
      }

      setType(data.type || 'location')
      setTitre(data.titre || '')
      setDescription(data.description || '')
      setPrix(data.prix?.toString() || '')
      setQuartier(data.quartier || '')
      setStatut(data.statut || 'actif')
      setPhotosExistantes(Array.isArray(data.photos) ? data.photos : [])
      setRue(data.rue || '')
      setSecteur(data.secteur || '')
      setArrondissement(data.arrondissement || '')
      setAdresseComplete(data.adresse_complete || '')
      setLatitude(data.latitude ?? null)
      setLongitude(data.longitude ?? null)

      setNbChambres(data.nb_chambres != null ? String(data.nb_chambres) : '')
      setNbPieces(data.nb_pieces != null ? String(data.nb_pieces) : '')
      setSurface(data.surface != null ? String(data.surface) : '')
      setMeuble(data.meuble === true ? 'true' : data.meuble === false ? 'false' : '')
      setDureeBail(data.duree_bail || '')
      setInclusions(Array.isArray(data.equipements) ? data.equipements : [])

      setTypePropriete(data.type_propriete || '')
      setAnneeConstruction(data.annee_construction != null ? String(data.annee_construction) : '')
      setTitreFoncier(data.titre_foncier_statut || '')

      setTypeService(data.type_service || '')
      setZoneDesservie(data.zone_desservie || '')
      setTarifHoraire(data.tarif_horaire != null ? String(data.tarif_horaire) : '')
      if (data.type === 'service' || data.type === 'artisan') {
        setDisponibilite('')
        setDisponibiliteService(data.disponibilite || '')
      } else if (data.type === 'location') {
        setDisponibilite(data.disponibilite || '')
        setDisponibiliteService('')
      } else {
        setDisponibilite('')
        setDisponibiliteService('')
      }

      queueMicrotask(() => {
        setBaselineSerialise(
          serialiserEtatEdition({
            type: data.type || 'location',
            titre: data.titre || '',
            description: data.description || '',
            prix: data.prix?.toString() || '',
            quartier: data.quartier || '',
            statut: data.statut || 'actif',
            photos: Array.isArray(data.photos) ? data.photos : [],
            nbNouvellesPhotos: 0,
            rue: data.rue || '',
            secteur: data.secteur || '',
            arrondissement: data.arrondissement || '',
            adresseComplete: data.adresse_complete || '',
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
            nbChambres: data.nb_chambres != null ? String(data.nb_chambres) : '',
            nbPieces: data.nb_pieces != null ? String(data.nb_pieces) : '',
            surface: data.surface != null ? String(data.surface) : '',
            meuble: data.meuble === true ? 'true' : data.meuble === false ? 'false' : '',
            disponibilite: data.type === 'location' ? (data.disponibilite || '') : '',
            dureeBail: data.duree_bail || '',
            inclusions: Array.isArray(data.equipements) ? data.equipements : [],
            typePropriete: data.type_propriete || '',
            anneeConstruction: data.annee_construction != null ? String(data.annee_construction) : '',
            titreFoncier: data.titre_foncier_statut || '',
            typeService: data.type_service || '',
            zoneDesservie: data.zone_desservie || '',
            tarifHoraire: data.tarif_horaire != null ? String(data.tarif_horaire) : '',
            disponibiliteService:
              data.type === 'service' || data.type === 'artisan' ? (data.disponibilite || '') : '',
          }),
        )
      })

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

  const mettrePhotoEnCouverture = (index) => {
    if (index <= 0) return
    setPhotosExistantes((prev) => {
      const next = [...prev]
      const [item] = next.splice(index, 1)
      next.unshift(item)
      return next
    })
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
    if (photosExistantes.length + nouvellesFichiers.length === 0) {
      return setErreur('Au moins une photo est obligatoire.')
    }

    if (isDirty) {
      const ok = window.confirm(
        'Confirmer l’enregistrement de vos modifications sur le serveur ?\n\nLes visiteurs verront la version mise à jour.',
      )
      if (!ok) return
    }

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

    const payload = {
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
    }

    if (type === 'location') {
      payload.nb_pieces = nbPieces ? parseInt(nbPieces, 10) : null
      payload.surface = surface ? parseInt(surface, 10) : null
      payload.meuble = meuble === 'true' ? true : meuble === 'false' ? false : null
      payload.nb_chambres = nbChambres !== '' ? parseInt(nbChambres, 10) : null
      if (disponibilite) payload.disponibilite = disponibilite
      if (dureeBail) payload.duree_bail = dureeBail
      if (inclusions.length) payload.equipements = inclusions
    }

    if (type === 'vente') {
      payload.nb_pieces = nbPieces ? parseInt(nbPieces, 10) : null
      payload.surface = surface ? parseInt(surface, 10) : null
      payload.nb_chambres = nbChambres !== '' ? parseInt(nbChambres, 10) : null
      if (typePropriete) payload.type_propriete = typePropriete
      if (anneeConstruction) payload.annee_construction = parseInt(anneeConstruction, 10)
      if (titreFoncier) payload.titre_foncier_statut = titreFoncier
    }

    if (type === 'service' || type === 'artisan') {
      if (typeService) payload.type_service = typeService
      if (zoneDesservie) payload.zone_desservie = zoneDesservie
      if (tarifHoraire) payload.tarif_horaire = parseInt(tarifHoraire, 10)
      if (disponibiliteService) payload.disponibilite = disponibiliteService
    }

    try {
      await updateAnnonce(id, payload)
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

      <div className="max-w-3xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold text-[#1B5E20] mb-2">Modifier l&apos;annonce</h1>
        <p className="text-gray-500 mb-4">Mettez à jour les informations de votre bien</p>

        {isDirty && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <strong>Modifications non enregistrées.</strong> Pensez à sauvegarder avant de quitter la page.
          </div>
        )}

        <div className="mb-6 rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800 mb-2">Contact affiché sur l&apos;annonce</h2>
          <p className="text-xs text-gray-500 mb-3">
            Le numéro visible par les acheteurs est celui de votre{' '}
            <Link href="/profil" className="font-bold text-[#1B5E20] underline">
              profil
            </Link>
            . Complétez-le pour WhatsApp et appels.
          </p>
          {profil?.telephone ? (
            <a
              href={`tel:${String(profil.telephone).replace(/\s/g, '')}`}
              className="inline-flex items-center gap-2 rounded-lg bg-[#E8F5E9] px-4 py-2 text-base font-bold text-[#1B5E20] hover:bg-emerald-100"
            >
              <span aria-hidden>📞</span>
              {profil.telephone}
            </a>
          ) : (
            <p className="text-sm text-amber-800">
              Aucun téléphone enregistré —{' '}
              <Link href="/profil" className="font-bold underline">
                ajoutez-le dans Mon profil
              </Link>
            </p>
          )}
        </div>

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

        {type === 'location' && (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
            <h2 className="font-bold text-gray-800 mb-4">Détails de la location</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Nb. chambres</label>
                  <select
                    value={nbChambres}
                    onChange={(e) => setNbChambres(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-[#1B5E20]"
                  >
                    <option value="">—</option>
                    <option value="0">Studio</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} chambre{n > 1 ? 's' : ''}
                      </option>
                    ))}
                    <option value="6">5+</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Nb. pièces</label>
                  <select
                    value={nbPieces}
                    onChange={(e) => setNbPieces(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-[#1B5E20]"
                  >
                    <option value="">—</option>
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n} pièce{n > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Surface (m²)</label>
                  <input
                    type="number"
                    value={surface}
                    onChange={(e) => setSurface(e.target.value)}
                    placeholder="65"
                    className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-[#1B5E20]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Meublé ?</label>
                  <select
                    value={meuble}
                    onChange={(e) => setMeuble(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1B5E20]"
                  >
                    <option value="">—</option>
                    <option value="true">Oui, meublé</option>
                    <option value="false">Non, vide</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Disponible à partir du</label>
                  <input
                    type="date"
                    value={disponibilite}
                    onChange={(e) => setDisponibilite(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1B5E20]"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Durée du bail (optionnel)</label>
                <input
                  type="text"
                  value={dureeBail}
                  onChange={(e) => setDureeBail(e.target.value)}
                  placeholder="Ex. 12 mois, 2 ans renouvelable"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1B5E20]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Inclus dans le loyer</label>
                <div className="flex flex-wrap gap-2">
                  {['Eau', 'Électricité', 'Internet', 'Gardien', 'Parking', 'Piscine', 'Climatisation', 'Groupe électrogène'].map(
                    (item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() =>
                          setInclusions((prev) =>
                            prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
                          )
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                          inclusions.includes(item)
                            ? 'border-[#1B5E20] bg-[#1B5E20] text-white'
                            : 'border-gray-200 text-gray-600 hover:border-green-300'
                        }`}
                      >
                        {item}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {type === 'vente' && (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
            <h2 className="font-bold text-gray-800 mb-4">Détails de la vente</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Type de propriété</label>
                <select
                  value={typePropriete}
                  onChange={(e) => setTypePropriete(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1B5E20]"
                >
                  <option value="">Sélectionner</option>
                  {['Appartement', 'Villa', 'Maison', 'Duplex', 'Terrain', 'Bureau', 'Local commercial', 'Immeuble'].map(
                    (v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Nb. chambres</label>
                  <select
                    value={nbChambres}
                    onChange={(e) => setNbChambres(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-[#1B5E20]"
                  >
                    <option value="">—</option>
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Nb. pièces</label>
                  <select
                    value={nbPieces}
                    onChange={(e) => setNbPieces(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-[#1B5E20]"
                  >
                    <option value="">—</option>
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Surface (m²)</label>
                  <input
                    type="number"
                    value={surface}
                    onChange={(e) => setSurface(e.target.value)}
                    placeholder="120"
                    className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:border-[#1B5E20]"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Année de construction</label>
                <input
                  type="number"
                  value={anneeConstruction}
                  onChange={(e) => setAnneeConstruction(e.target.value)}
                  placeholder="2020"
                  className="w-full max-w-xs border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1B5E20]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Titre foncier</label>
                <select
                  value={titreFoncier}
                  onChange={(e) => setTitreFoncier(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1B5E20]"
                >
                  <option value="">—</option>
                  <option value="oui">Oui — titre foncier disponible</option>
                  <option value="non">Non — en cours d&apos;obtention</option>
                  <option value="attente">En attente de régularisation</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {(type === 'service' || type === 'artisan') && (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
            <h2 className="font-bold text-gray-800 mb-4">Détails du service</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  {type === 'artisan' ? 'Métier / spécialité' : 'Type de service'}
                </label>
                <select
                  value={typeService}
                  onChange={(e) => setTypeService(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1B5E20]"
                >
                  <option value="">Sélectionner</option>
                  {type === 'artisan' ? (
                    <>
                      <option>Électricien</option>
                      <option>Plombier</option>
                      <option>Menuisier</option>
                      <option>Carreleur</option>
                      <option>Peintre</option>
                      <option>Maçon</option>
                      <option>Climatiseur</option>
                      <option>Soudeur</option>
                      <option>Ferrailleur</option>
                    </>
                  ) : (
                    <>
                      <option>Nettoyage</option>
                      <option>Déménagement</option>
                      <option>Jardinage</option>
                      <option>Sécurité / Gardiennage</option>
                      <option>Livraison</option>
                      <option>Décoration intérieure</option>
                      <option>Photographie immobilière</option>
                    </>
                  )}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Tarif horaire (FCFA)</label>
                  <input
                    type="number"
                    value={tarifHoraire}
                    onChange={(e) => setTarifHoraire(e.target.value)}
                    placeholder="5000"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1B5E20]"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Disponibilité</label>
                  <select
                    value={disponibiliteService}
                    onChange={(e) => setDisponibiliteService(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1B5E20]"
                  >
                    <option value="">—</option>
                    <option>Disponible maintenant</option>
                    <option>Lun – Ven</option>
                    <option>7j/7</option>
                    <option>Sur rendez-vous</option>
                    <option>Week-end uniquement</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Zone desservie</label>
                <div className="flex flex-wrap gap-2">
                  {[...QUARTIERS, 'Tout Abidjan'].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setZoneDesservie((prev) => (prev === q ? '' : q))}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                        zoneDesservie === q ? 'border-[#1B5E20] bg-[#1B5E20] text-white' : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

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
            Aperçu en grand : la <strong>première</strong> image est la couverture sur le site. Utilisez « Couverture » pour
            remonter une photo. Sur mobile, les boutons ✕ et Couverture restent visibles.
          </p>

          {totalPhotos === 0 ? (
            <label className="block border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-[#1B5E20] transition-colors">
              <div className="text-4xl mb-2">📷</div>
              <div className="font-bold text-gray-700">Ajouter des photos</div>
              <div className="text-gray-400 text-xs mt-1">JPG, PNG — max 10 photos</div>
              <input type="file" multiple accept="image/*" onChange={ajouterPhotos} className="hidden" />
            </label>
          ) : (
            <>
              <div className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photosExistantes[0] || nouvellesAperçus[0]}
                  alt="Aperçu couverture"
                  className="mx-auto max-h-[min(70vh,28rem)] w-full object-contain sm:max-h-96"
                />
                <p className="border-t border-gray-200 bg-white px-3 py-2 text-center text-xs text-gray-500">
                  Couverture actuelle — ordre modifiable ci-dessous
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {photosExistantes.map((url, i) => (
                  <div key={`ex-${url}-${i}`} className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="aspect-square w-full object-cover" />
                    {i === 0 && (
                      <span className="absolute left-2 top-2 rounded bg-[#1B5E20] px-2 py-0.5 text-[10px] font-bold text-white">
                        Couverture
                      </span>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 flex gap-1 bg-black/55 p-1.5">
                      {i > 0 && (
                        <button
                          type="button"
                          onClick={() => mettrePhotoEnCouverture(i)}
                          className="flex-1 rounded bg-white/95 px-1 py-1 text-[10px] font-bold text-[#1B5E20] hover:bg-white"
                        >
                          Couverture
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => supprimerPhotoExistante(i)}
                        className="rounded bg-red-600 px-2 py-1 text-xs font-bold text-white hover:bg-red-700 md:opacity-90"
                        aria-label="Supprimer la photo"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                {nouvellesAperçus.map((url, i) => (
                  <div key={`new-${i}`} className="relative overflow-hidden rounded-xl border-2 border-blue-400 bg-gray-50 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="aspect-square w-full object-cover" />
                    <span className="absolute left-2 top-2 rounded bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      Nouveau
                    </span>
                    <div className="absolute bottom-0 left-0 right-0 flex justify-end bg-black/55 p-1.5">
                      <button
                        type="button"
                        onClick={() => supprimerNouvellePhoto(i)}
                        className="rounded bg-red-600 px-2 py-1 text-xs font-bold text-white hover:bg-red-700"
                        aria-label="Retirer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
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

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/mes-annonces"
            onClick={(e) => {
              if (isDirty && !window.confirm('Quitter sans enregistrer les modifications ?')) {
                e.preventDefault()
              }
            }}
            className="flex-1 border-2 border-gray-300 text-gray-600 py-4 rounded-xl font-bold text-center hover:bg-gray-50"
          >
            Retour sans sauvegarder
          </Link>
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
