'use client'
import { useState, useEffect, useRef } from 'react'
import { observerConnexion } from '@/lib/auth'
import {
  getProfilFirestore,
  upsertProfilFirestore,
  uploadPhotoChemin,
  createAnnonce,
} from '@/lib/firestoreApp'
import { useRouter } from 'next/navigation'

const QUARTIERS = [
  'Cocody', 'Plateau', 'Marcory', 'Yopougon', 'Bingerville',
  'Adjamé', 'Abobo', 'Koumassi', 'Port-Bouët', 'Treichville', 'Attécoubé', 'Riviera', 'Angré',
]

const ARRONDISSEMENTS = [
  'Abobo', 'Adjamé', 'Attécoubé', 'Cocody', 'Koumassi',
  'Marcory', 'Plateau', 'Port-Bouët', 'Treichville', 'Yopougon',
]

// ─── Composant sélecteur GPS ──────────────────────────────────────────────────

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
          <div className="text-sm font-bold text-gray-700">
            {latitude && longitude
              ? '📍 Position enregistrée — cliquer pour modifier'
              : 'Cliquer pour ouvrir le sélecteur de position'}
          </div>
          {latitude && longitude && (
            <div className="text-xs text-[#1B5E20] font-mono mt-1">
              {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}
            </div>
          )}
          <div className="text-xs text-gray-400 mt-1">Optionnel — permet un meilleur affichage sur la carte</div>
        </button>
      ) : (
        <div className="rounded-xl overflow-hidden border border-gray-200">
          <div ref={containerRef} className="w-full h-64" />
          <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500 flex items-center justify-between">
            <span>🖱️ Cliquez ou déplacez le marqueur vert pour définir la position exacte</span>
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

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Publier() {
  const [utilisateur, setUtilisateur] = useState(null)
  const [chargement, setChargement] = useState(false)
  const [succes, setSucces] = useState(false)
  const [erreur, setErreur] = useState('')
  const [type, setType] = useState('')

  // Photos — accumulation progressive
  const [photosFichiers, setPhotosFichiers] = useState([]) // File[]
  const [photosAperçus, setPhotosAperçus] = useState([])   // objectURL[]

  // Infos générales
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [prix, setPrix] = useState('')
  const [quartier, setQuartier] = useState('')

  // Localisation précise
  const [rue, setRue] = useState('')
  const [secteur, setSecteur] = useState('')
  const [arrondissement, setArrondissement] = useState('')
  const [adresseComplete, setAdresseComplete] = useState('')
  const [latitude, setLatitude] = useState(null)
  const [longitude, setLongitude] = useState(null)

  // Location
  const [nbChambres, setNbChambres] = useState('')
  const [nbPieces, setNbPieces] = useState('')
  const [surface, setSurface] = useState('')
  const [meuble, setMeuble] = useState('')
  const [disponibilite, setDisponibilite] = useState('')
  const [dureeBail, setDureeBail] = useState('')
  const [inclusions, setInclusions] = useState([])

  // Vente
  const [typePropriete, setTypePropriete] = useState('')
  const [anneeConstruction, setAnneeConstruction] = useState('')
  const [titreFoncier, setTitreFoncier] = useState('')

  // Service / Artisan
  const [typeService, setTypeService] = useState('')
  const [zoneDesservie, setZoneDesservie] = useState('')
  const [tarifHoraire, setTarifHoraire] = useState('')
  const [disponibiliteService, setDisponibiliteService] = useState('')

  const router = useRouter()

  useEffect(() => {
    const unsub = observerConnexion(async (user) => {
      if (!user) {
        router.push('/connexion')
        return
      }
      const p = await getProfilFirestore(user.uid)
      if (!p) {
        await upsertProfilFirestore(user.uid, {
          nom: user.email?.split('@')[0] || '',
          email: user.email || '',
          type: 'particulier',
          telephone: '',
          quartier: '',
          badge: 'bronze',
        })
      }
      setUtilisateur(user)
    })
    return () => unsub()
  }, [router])

  const ajouterPhotos = (e) => {
    const fichiers = Array.from(e.target.files)
    const total = photosFichiers.length + fichiers.length
    if (total > 10) {
      setErreur(`Maximum 10 photos. Vous en avez déjà ${photosFichiers.length}.`)
      return
    }
    setPhotosFichiers((prev) => [...prev, ...fichiers])
    setPhotosAperçus((prev) => [...prev, ...fichiers.map((f) => URL.createObjectURL(f))])
    setErreur('')
    // Reset l'input pour permettre de re-sélectionner les mêmes fichiers
    e.target.value = ''
  }

  const supprimerPhoto = (index) => {
    URL.revokeObjectURL(photosAperçus[index])
    setPhotosFichiers((prev) => prev.filter((_, i) => i !== index))
    setPhotosAperçus((prev) => prev.filter((_, i) => i !== index))
  }

  const uploaderPhotos = async () => {
    const urls = []
    for (const photo of photosFichiers) {
      const chemin = `annonces/${utilisateur.uid}/${Date.now()}-${photo.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const url = await uploadPhotoChemin(chemin, photo)
      urls.push(url)
    }
    return urls
  }

  const publier = async () => {
    if (!type) return setErreur("Choisissez un type d'annonce")
    if (!titre) return setErreur('Le titre est obligatoire')
    if (!prix) return setErreur('Le prix est obligatoire')
    if (!quartier) return setErreur('Le quartier est obligatoire')

    setChargement(true)
    setErreur('')

    const urlsPhotos = photosFichiers.length > 0 ? await uploaderPhotos() : []

    const donnees = {
      utilisateur_id: utilisateur.uid,
      type,
      titre,
      description,
      prix: parseInt(prix, 10),
      quartier,
      photos: urlsPhotos,
      statut: 'actif',
      rue: rue || null,
      secteur: secteur || null,
      arrondissement: arrondissement || null,
      adresse_complete: adresseComplete || null,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
    }

    if (type === 'location') {
      donnees.nb_pieces = nbPieces ? parseInt(nbPieces, 10) : null
      donnees.surface = surface ? parseInt(surface, 10) : null
      donnees.meuble = meuble === 'true' ? true : meuble === 'false' ? false : null
      donnees.nb_chambres = nbChambres !== '' ? parseInt(nbChambres, 10) : null
      if (disponibilite) donnees.disponibilite = disponibilite
      if (dureeBail) donnees.duree_bail = dureeBail
      if (inclusions.length) donnees.equipements = inclusions
    }

    if (type === 'vente') {
      donnees.nb_pieces = nbPieces ? parseInt(nbPieces, 10) : null
      donnees.surface = surface ? parseInt(surface, 10) : null
      donnees.nb_chambres = nbChambres !== '' ? parseInt(nbChambres, 10) : null
      if (typePropriete) donnees.type_propriete = typePropriete
      if (anneeConstruction) donnees.annee_construction = parseInt(anneeConstruction, 10)
      if (titreFoncier) donnees.titre_foncier_statut = titreFoncier
    }

    if (type === 'service' || type === 'artisan') {
      if (typeService) donnees.type_service = typeService
      if (zoneDesservie) donnees.zone_desservie = zoneDesservie
      if (tarifHoraire) donnees.tarif_horaire = parseInt(tarifHoraire, 10)
      if (disponibiliteService) donnees.disponibilite = disponibiliteService
    }

    try {
      await createAnnonce(donnees)
    } catch (err) {
      console.error('Erreur publication:', err)
      setErreur('Erreur lors de la publication: ' + (err.message || 'Vérifiez votre connexion et réessayez.'))
      setChargement(false)
      return
    }

    setSucces(true)
    setTimeout(() => router.push('/mes-annonces'), 2000)
  }

  if (succes)
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="bg-white rounded-xl p-10 text-center shadow-sm max-w-md">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-[#1B5E20] mb-2">Annonce publiée !</h2>
          <p className="text-gray-500">Redirection en cours...</p>
        </div>
      </div>
    )

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <nav className="bg-[#1B5E20] px-4 py-3 flex items-center justify-between">
        <a href="/" className="text-white font-bold text-lg">Chez Moi CI</a>
        <a href="/tableau-de-bord" className="text-green-200 hover:text-white text-sm">← Tableau de bord</a>
      </nav>

      <div className="max-w-2xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold text-[#1B5E20] mb-2">Publier une annonce</h1>
        <p className="text-gray-500 mb-4">Remplissez les informations selon le type de bien</p>

        <div className="bg-[#FFF8E1] border border-[#F9A825] rounded-xl p-4 mb-6 flex items-start gap-3">
          <span className="text-xl flex-shrink-0">💡</span>
          <p className="text-sm text-gray-700">
            Pour que les acheteurs puissent vous contacter,{' '}
            <a href="/profil" className="text-[#1B5E20] font-bold hover:underline">
              complétez votre profil
            </a>{' '}
            (nom + téléphone) si ce n&apos;est pas encore fait.
          </p>
        </div>

        {/* 1 — TYPE */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-gray-800 mb-4">1 — Que voulez-vous publier ?</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'location', emoji: '🔑', label: 'Mettre en location', desc: 'Loyer mensuel, bail' },
              { id: 'vente',    emoji: '🏠', label: 'Mettre en vente',    desc: 'Prix de vente, propriété' },
              { id: 'service',  emoji: '🔧', label: 'Offrir un service',  desc: 'Prestation, tarif' },
              { id: 'artisan',  emoji: '👷', label: 'Artisan / Pro',      desc: 'Métier, zone, tarif' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  type === t.id ? 'border-[#1B5E20] bg-[#E8F5E9]' : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="text-2xl mb-1">{t.emoji}</div>
                <div className="font-bold text-gray-800 text-sm">{t.label}</div>
                <div className="text-gray-400 text-xs">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {type && (
          <>
            {/* 2 — INFOS GÉNÉRALES */}
            <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
              <h2 className="font-bold text-gray-800 mb-4">2 — Informations générales</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Titre *</label>
                  <input
                    type="text"
                    value={titre}
                    onChange={(e) => setTitre(e.target.value)}
                    placeholder={
                      type === 'location' ? 'Ex: Appartement 3 pièces meublé à Cocody' :
                      type === 'vente'    ? 'Ex: Villa 4 chambres avec piscine à Marcory' :
                      type === 'service'  ? 'Ex: Service de nettoyage professionnel' :
                                           'Ex: Électricien certifié — Abidjan'
                    }
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Décrivez votre bien ou service en détail..."
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      {type === 'location' ? 'Loyer mensuel (FCFA) *' :
                       type === 'vente'    ? 'Prix de vente (FCFA) *' : 'Tarif (FCFA) *'}
                    </label>
                    <input
                      type="number"
                      value={prix}
                      onChange={(e) => setPrix(e.target.value)}
                      placeholder="Ex: 150000"
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Quartier *</label>
                    <select
                      value={quartier}
                      onChange={(e) => setQuartier(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
                    >
                      <option value="">Choisir</option>
                      {QUARTIERS.map((q) => <option key={q} value={q}>{q}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* 3 — DÉTAILS SPÉCIFIQUES AU TYPE */}
            {type === 'location' && (
              <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
                <h2 className="font-bold text-gray-800 mb-4">3 — Détails de la location</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Nb. chambres</label>
                      <select value={nbChambres} onChange={(e) => setNbChambres(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-3 focus:outline-none focus:border-[#1B5E20] text-sm">
                        <option value="">—</option>
                        <option value="0">Studio</option>
                        {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} chambre{n>1?'s':''}</option>)}
                        <option value="6">5+</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Nb. pièces</label>
                      <select value={nbPieces} onChange={(e) => setNbPieces(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-3 focus:outline-none focus:border-[#1B5E20] text-sm">
                        <option value="">—</option>
                        {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} pièce{n>1?'s':''}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Surface (m²)</label>
                      <input type="number" value={surface} onChange={(e) => setSurface(e.target.value)} placeholder="65" className="w-full border border-gray-200 rounded-lg px-3 py-3 focus:outline-none focus:border-[#1B5E20] text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Meublé ?</label>
                      <select value={meuble} onChange={(e) => setMeuble(e.target.value)} className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm">
                        <option value="">—</option>
                        <option value="true">Oui, meublé</option>
                        <option value="false">Non, vide</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Disponible à partir du</label>
                      <input type="date" value={disponibilite} onChange={(e) => setDisponibilite(e.target.value)} className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Inclus dans le loyer</label>
                    <div className="flex flex-wrap gap-2">
                      {['Eau','Électricité','Internet','Gardien','Parking','Piscine','Climatisation','Groupe électrogène'].map((item) => (
                        <button key={item} type="button"
                          onClick={() => setInclusions((prev) => prev.includes(item) ? prev.filter(i=>i!==item) : [...prev, item])}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${inclusions.includes(item) ? 'bg-[#1B5E20] text-white border-[#1B5E20]' : 'border-gray-200 text-gray-600 hover:border-green-300'}`}
                        >{item}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {type === 'vente' && (
              <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
                <h2 className="font-bold text-gray-800 mb-4">3 — Détails de la vente</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Type de propriété</label>
                    <select value={typePropriete} onChange={(e) => setTypePropriete(e.target.value)} className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm">
                      <option value="">Sélectionner</option>
                      {['Appartement','Villa','Maison','Duplex','Terrain','Bureau','Local commercial','Immeuble'].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Nb. chambres</label>
                      <select value={nbChambres} onChange={(e) => setNbChambres(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-3 focus:outline-none focus:border-[#1B5E20] text-sm">
                        <option value="">—</option>
                        {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Surface (m²)</label>
                      <input type="number" value={surface} onChange={(e) => setSurface(e.target.value)} placeholder="120" className="w-full border border-gray-200 rounded-lg px-3 py-3 focus:outline-none focus:border-[#1B5E20] text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Année construction</label>
                      <input type="number" value={anneeConstruction} onChange={(e) => setAnneeConstruction(e.target.value)} placeholder="2020" className="w-full border border-gray-200 rounded-lg px-3 py-3 focus:outline-none focus:border-[#1B5E20] text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Titre foncier</label>
                    <select value={titreFoncier} onChange={(e) => setTitreFoncier(e.target.value)} className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm">
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
                <h2 className="font-bold text-gray-800 mb-4">3 — Détails du service</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      {type === 'artisan' ? 'Métier / Spécialité' : 'Type de service'}
                    </label>
                    <select value={typeService} onChange={(e) => setTypeService(e.target.value)} className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm">
                      <option value="">Sélectionner</option>
                      {type === 'artisan' ? (
                        <>
                          <option>Électricien</option><option>Plombier</option>
                          <option>Menuisier</option><option>Carreleur</option>
                          <option>Peintre</option><option>Maçon</option>
                          <option>Climatiseur</option><option>Soudeur</option>
                          <option>Ferrailleur</option>
                        </>
                      ) : (
                        <>
                          <option>Nettoyage</option><option>Déménagement</option>
                          <option>Jardinage</option><option>Sécurité / Gardiennage</option>
                          <option>Livraison</option><option>Décoration intérieure</option>
                          <option>Photographie immobilière</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Tarif horaire (FCFA)</label>
                      <input type="number" value={tarifHoraire} onChange={(e) => setTarifHoraire(e.target.value)} placeholder="Ex: 5000" className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Disponibilité</label>
                      <select value={disponibiliteService} onChange={(e) => setDisponibiliteService(e.target.value)} className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm">
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
                        <button key={q} type="button"
                          onClick={() => setZoneDesservie((prev) => prev === q ? '' : q)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            zoneDesservie === q ? 'bg-[#1B5E20] text-white border-[#1B5E20]' : 'border-gray-200 text-gray-600 hover:border-green-300'
                          } ${q === 'Tout Abidjan' ? 'font-bold' : ''}`}
                        >{q}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4 — PHOTOS */}
            <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-gray-800">4 — Photos ({photosFichiers.length}/10)</h2>
                {photosFichiers.length > 0 && photosFichiers.length < 10 && (
                  <label className="cursor-pointer bg-[#1B5E20] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-800 transition-colors">
                    + Ajouter
                    <input type="file" multiple accept="image/*" onChange={ajouterPhotos} className="hidden" />
                  </label>
                )}
              </div>
              <p className="text-gray-400 text-xs mb-4">
                La première photo sera la principale. Cliquez ✕ pour enlever une photo.
              </p>

              {photosFichiers.length === 0 ? (
                <label className="block border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-[#1B5E20] transition-colors">
                  <div className="text-3xl mb-2">📷</div>
                  <div className="font-bold text-gray-700 text-sm">Cliquer pour ajouter des photos</div>
                  <div className="text-gray-400 text-xs mt-1">JPG, PNG — Max 10 photos</div>
                  <input type="file" multiple accept="image/*" onChange={ajouterPhotos} className="hidden" />
                </label>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {photosAperçus.map((url, i) => (
                    <div key={i} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-20 object-cover rounded-lg" />
                      {i === 0 && (
                        <span className="absolute top-1 left-1 bg-[#1B5E20] text-white text-[10px] px-1 py-0.5 rounded">
                          Principale
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => supprimerPhoto(i)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 5 — LOCALISATION PRÉCISE */}
            <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
              <h2 className="font-bold text-gray-800 mb-1">5 — Localisation précise</h2>
              <p className="text-gray-400 text-xs mb-4">
                Ces détails aident les visiteurs à vous trouver facilement.
              </p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Rue / Avenue</label>
                    <input type="text" value={rue} onChange={(e) => setRue(e.target.value)}
                      placeholder="Ex: Rue des Jardins"
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Secteur / Cité</label>
                    <input type="text" value={secteur} onChange={(e) => setSecteur(e.target.value)}
                      placeholder="Ex: Cité Sogephia, Résidence A"
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Arrondissement / Mairie</label>
                    <select value={arrondissement} onChange={(e) => setArrondissement(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
                    >
                      <option value="">— Sélectionner —</option>
                      {ARRONDISSEMENTS.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Adresse complète</label>
                    <input type="text" value={adresseComplete} onChange={(e) => setAdresseComplete(e.target.value)}
                      placeholder="Ex: 12 Rue des Cocotiers, Cocody"
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Position GPS sur la carte{' '}
                    <span className="text-gray-400 font-normal">(recommandé — cliquez sur la carte)</span>
                  </label>
                  <CarteGPS
                    latitude={latitude}
                    longitude={longitude}
                    onCoordChange={(lat, lng) => { setLatitude(lat); setLongitude(lng) }}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {erreur && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {erreur}
          </div>
        )}

        <button
          type="button"
          onClick={publier}
          disabled={chargement || !type}
          className="w-full bg-[#1B5E20] text-white py-4 rounded-xl font-bold text-lg hover:bg-green-800 disabled:opacity-50"
        >
          {chargement ? 'Publication en cours...' : "Publier l'annonce"}
        </button>

        <p className="text-center text-gray-400 text-sm mt-4">
          Votre annonce sera visible immédiatement après publication.
        </p>
      </div>
    </div>
  )
}
