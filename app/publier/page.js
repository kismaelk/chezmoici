'use client'
import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import {
  getProfilFirestore,
  upsertProfilFirestore,
  uploadPhotoChemin,
  createAnnonce,
} from '@/lib/firestoreApp'
import { useRouter } from 'next/navigation'

const QUARTIERS = [
  'Cocody',
  'Plateau',
  'Marcory',
  'Yopougon',
  'Bingerville',
  'Adjamé',
  'Abobo',
  'Koumassi',
  'Port-Bouët',
  'Treichville',
  'Attécoubé',
]

export default function Publier() {
  const [utilisateur, setUtilisateur] = useState(null)
  const [chargement, setChargement] = useState(false)
  const [succes, setSucces] = useState(false)
  const [erreur, setErreur] = useState('')
  const [type, setType] = useState('')
  const [photos, setPhotos] = useState([])
  const [aperçus, setAperçus] = useState([])

  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [prix, setPrix] = useState('')
  const [quartier, setQuartier] = useState('')

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

  const router = useRouter()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
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

  const gererPhotos = (e) => {
    const fichiers = Array.from(e.target.files).slice(0, 10)
    setPhotos(fichiers)
    setAperçus(fichiers.map((f) => URL.createObjectURL(f)))
  }

  const uploaderPhotos = async () => {
    const urls = []
    for (const photo of photos) {
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

    const urlsPhotos = photos.length > 0 ? await uploaderPhotos() : []

    const donnees = {
      utilisateur_id: utilisateur.uid,
      type,
      titre,
      description,
      prix: parseInt(prix, 10),
      quartier,
      photos: urlsPhotos,
      statut: 'actif',
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
        <a href="/" className="text-white font-bold text-lg">
          Chez Moi CI
        </a>
        <a href="/tableau-de-bord" className="text-green-200 hover:text-white text-sm">
          ← Tableau de bord
        </a>
      </nav>

      <div className="max-w-2xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold text-[#1B5E20] mb-2">Publier une annonce</h1>
        <p className="text-gray-500 mb-4">Remplissez les informations selon le type de bien</p>

        {/* Conseil : compléter le profil pour plus de visibilité */}
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

        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-gray-800 mb-4">1 — Que voulez-vous publier ?</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                id: 'location',
                emoji: '🔑',
                label: 'Mettre en location',
                desc: 'Loyer mensuel, bail',
              },
              {
                id: 'vente',
                emoji: '🏠',
                label: 'Mettre en vente',
                desc: 'Prix de vente, propriété',
              },
              {
                id: 'service',
                emoji: '🔧',
                label: 'Offrir un service',
                desc: 'Prestation, tarif',
              },
              {
                id: 'artisan',
                emoji: '👷',
                label: 'Artisan / Pro',
                desc: 'Métier, zone, tarif',
              },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${type === t.id ? 'border-[#1B5E20] bg-[#E8F5E9]' : 'border-gray-200 hover:border-green-300'}`}
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
            <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
              <h2 className="font-bold text-gray-800 mb-4">2 — Informations générales</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Titre *
                  </label>
                  <input
                    type="text"
                    value={titre}
                    onChange={(e) => setTitre(e.target.value)}
                    placeholder={
                      type === 'location'
                        ? 'Ex: Appartement 3 pièces meublé à Cocody'
                        : type === 'vente'
                          ? 'Ex: Villa 4 chambres avec piscine à Marcory'
                          : type === 'service'
                            ? 'Ex: Service de nettoyage professionnel'
                            : 'Ex: Électricien certifié — Abidjan'
                    }
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Description
                  </label>
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
                      {type === 'location'
                        ? 'Loyer mensuel (FCFA) *'
                        : type === 'vente'
                          ? 'Prix de vente (FCFA) *'
                          : 'Tarif (FCFA) *'}
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
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Quartier *
                    </label>
                    <select
                      value={quartier}
                      onChange={(e) => setQuartier(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
                    >
                      <option value="">Choisir</option>
                      {QUARTIERS.map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {type === 'location' && (
              <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
                <h2 className="font-bold text-gray-800 mb-4">3 — Détails de la location</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">
                        Nb. chambres
                      </label>
                      <select
                        value={nbChambres}
                        onChange={(e) => setNbChambres(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
                      >
                        <option value="">—</option>
                        <option value="0">Studio</option>
                        <option value="1">1 chambre</option>
                        <option value="2">2 chambres</option>
                        <option value="3">3 chambres</option>
                        <option value="4">4 chambres</option>
                        <option value="5">5+</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">
                        Nb. pièces
                      </label>
                      <select
                        value={nbPieces}
                        onChange={(e) => setNbPieces(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
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
                      <label className="text-sm font-medium text-gray-700 block mb-1">
                        Surface (m²)
                      </label>
                      <input
                        type="number"
                        value={surface}
                        onChange={(e) => setSurface(e.target.value)}
                        placeholder="65"
                        className="w-full border border-gray-200 rounded-lg px-3 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">
                        Meublé ?
                      </label>
                      <select
                        value={meuble}
                        onChange={(e) => setMeuble(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
                      >
                        <option value="">—</option>
                        <option value="true">Oui, meublé</option>
                        <option value="false">Non, vide</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">
                        Disponible à partir du
                      </label>
                      <input
                        type="date"
                        value={disponibilite}
                        onChange={(e) => setDisponibilite(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Inclus dans le loyer
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Eau',
                        'Électricité',
                        'Internet',
                        'Gardien',
                        'Parking',
                        'Piscine',
                        'Climatisation',
                        'Groupe électrogène',
                      ].map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() =>
                            setInclusions((prev) =>
                              prev.includes(item)
                                ? prev.filter((i) => i !== item)
                                : [...prev, item],
                            )
                          }
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${inclusions.includes(item) ? 'bg-[#1B5E20] text-white border-[#1B5E20]' : 'border-gray-200 text-gray-600 hover:border-green-300'}`}
                        >
                          {item}
                        </button>
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
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Type de propriété
                    </label>
                    <select
                      value={typePropriete}
                      onChange={(e) => setTypePropriete(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
                    >
                      <option value="">Sélectionner</option>
                      <option value="Appartement">Appartement</option>
                      <option value="Villa">Villa</option>
                      <option value="Maison">Maison</option>
                      <option value="Duplex">Duplex</option>
                      <option value="Terrain">Terrain</option>
                      <option value="Bureau">Bureau</option>
                      <option value="Local commercial">Local commercial</option>
                      <option value="Immeuble">Immeuble</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">
                        Nb. chambres
                      </label>
                      <select
                        value={nbChambres}
                        onChange={(e) => setNbChambres(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
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
                      <label className="text-sm font-medium text-gray-700 block mb-1">
                        Surface (m²)
                      </label>
                      <input
                        type="number"
                        value={surface}
                        onChange={(e) => setSurface(e.target.value)}
                        placeholder="120"
                        className="w-full border border-gray-200 rounded-lg px-3 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">
                        Année construction
                      </label>
                      <input
                        type="number"
                        value={anneeConstruction}
                        onChange={(e) => setAnneeConstruction(e.target.value)}
                        placeholder="2020"
                        className="w-full border border-gray-200 rounded-lg px-3 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Titre foncier
                    </label>
                    <select
                      value={titreFoncier}
                      onChange={(e) => setTitreFoncier(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
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
                <h2 className="font-bold text-gray-800 mb-4">3 — Détails du service</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      {type === 'artisan' ? 'Métier / Spécialité' : 'Type de service'}
                    </label>
                    <select
                      value={typeService}
                      onChange={(e) => setTypeService(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">
                        Tarif horaire (FCFA)
                      </label>
                      <input
                        type="number"
                        value={tarifHoraire}
                        onChange={(e) => setTarifHoraire(e.target.value)}
                        placeholder="Ex: 5000"
                        className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">
                        Disponibilité
                      </label>
                      <select
                        value={disponibiliteService}
                        onChange={(e) => setDisponibiliteService(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
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
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Zone desservie
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {QUARTIERS.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() =>
                            setZoneDesservie((prev) => (prev === q ? '' : q))
                          }
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${zoneDesservie === q ? 'bg-[#1B5E20] text-white border-[#1B5E20]' : 'border-gray-200 text-gray-600 hover:border-green-300'}`}
                        >
                          {q}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setZoneDesservie((prev) =>
                            prev === 'Tout Abidjan' ? '' : 'Tout Abidjan',
                          )
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${zoneDesservie === 'Tout Abidjan' ? 'bg-[#1B5E20] text-white border-[#1B5E20]' : 'border-gray-200 text-gray-600 hover:border-green-300'}`}
                      >
                        Tout Abidjan
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
              <h2 className="font-bold text-gray-800 mb-2">4 — Photos</h2>
              <p className="text-gray-400 text-sm mb-4">
                Ajoutez jusqu&apos;à 10 photos. La première sera la principale.
              </p>
              <label className="block border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-[#1B5E20] transition-colors">
                <div className="text-3xl mb-2">📷</div>
                <div className="font-bold text-gray-700 text-sm">
                  Cliquer pour ajouter des photos
                </div>
                <div className="text-gray-400 text-xs mt-1">JPG, PNG — Max 10 photos</div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={gererPhotos}
                  className="hidden"
                />
              </label>
              {aperçus.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {aperçus.map((url, i) => (
                    <div key={url} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-20 object-cover rounded-lg" />
                      {i === 0 && (
                        <span className="absolute top-1 left-1 bg-[#1B5E20] text-white text-xs px-1 py-0.5 rounded">
                          Principale
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
