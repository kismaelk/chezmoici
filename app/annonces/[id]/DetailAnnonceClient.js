'use client'
import { useEffect, useRef, useState } from 'react'
import { observerConnexion } from '@/lib/auth'
import {
  getAnnonceById,
  incrementAnnonceVues,
  getProfilFirestore,
  findFavori,
  addFavori,
  removeFavori,
  fetchAvisForAnnonce,
  addAvis,
  sendMessageFirestore,
  addNotification,
  addSignalement,
} from '@/lib/firestoreApp'
import { useParams, useRouter } from 'next/navigation'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'
import 'mapbox-gl/dist/mapbox-gl.css'

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

function MiniCarte({ annonce }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const [erreur, setErreur] = useState(false)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!TOKEN) { setErreur(true); return }

    let coords = null
    if (annonce.longitude != null && annonce.latitude != null &&
        !isNaN(Number(annonce.longitude)) && !isNaN(Number(annonce.latitude))) {
      coords = [Number(annonce.longitude), Number(annonce.latitude)]
    } else {
      coords = COORDS_QUARTIER[annonce.quartier] || [-4.0167, 5.3167]
    }

    let cancelled = false

    async function init() {
      try {
        const mapboxgl = (await import('mapbox-gl')).default
        if (cancelled || !containerRef.current) return

        mapboxgl.accessToken = TOKEN

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: coords,
          zoom: 14,
          interactive: false,
        })

        mapRef.current = map

        map.on('load', () => {
          if (cancelled) return
          const el = document.createElement('div')
          el.textContent = annonce.type === 'vente' ? '🏠' : annonce.type === 'location' ? '🔑' : '🔧'
          el.style.cssText = 'font-size:28px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4));cursor:default'
          new mapboxgl.Marker({ element: el }).setLngLat(coords).addTo(map)
        })
      } catch {
        if (!cancelled) setErreur(true)
      }
    }

    init()

    return () => {
      cancelled = true
      if (mapRef.current) { try { mapRef.current.remove() } catch { /* ignore */ } mapRef.current = null }
    }
  }, [annonce])

  if (erreur) return null

  const lienCarte = `/carte?quartier=${encodeURIComponent(annonce.quartier || '')}&type=${encodeURIComponent(annonce.type || '')}`

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <h2 className="font-bold text-gray-800 text-lg">📍 Localisation</h2>
        <a
          href={lienCarte}
          className="text-xs text-[#1B5E20] font-bold hover:underline flex items-center gap-1"
        >
          Voir sur la carte complète →
        </a>
      </div>
      <div ref={containerRef} className="w-full h-52" />
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 flex items-center gap-1">
        <span>⚠️</span>
        <span>Localisation approximative — {annonce.quartier}, Abidjan</span>
      </div>
    </div>
  )
}

export default function DetailAnnonceClient() {
  const [annonce, setAnnonce] = useState(null)
  const [proprietaire, setProprietaire] = useState(null)
  const [utilisateur, setUtilisateur] = useState(null)
  const [estFavori, setEstFavori] = useState(false)
  const [favoriId, setFavoriId] = useState(null)
  const [photoActive, setPhotoActive] = useState(0)
  const [message, setMessage] = useState('')
  const [envoye, setEnvoye] = useState(false)
  const [avis, setAvis] = useState([])
  const [noteAvis, setNoteAvis] = useState(0)
  const [commentaireAvis, setCommentaireAvis] = useState('')
  const [avisSoumis, setAvisSoumis] = useState(false)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)
  const [modalSignalement, setModalSignalement] = useState(false)
  const [motifSignalement, setMotifSignalement] = useState('Annonce frauduleuse')
  const [detailsSignalement, setDetailsSignalement] = useState('')
  const [envoiSignalement, setEnvoiSignalement] = useState(false)
  const [signalementOk, setSignalementOk] = useState(false)

  const params = useParams()
  const router = useRouter()
  const annonceId = params?.id

  useEffect(() => {
    if (!annonceId) return
    let cancelled = false

    async function chargerAnnonce() {
      try {
        const data = await getAnnonceById(annonceId)
        if (cancelled) return
        if (!data) {
          router.push('/annonces')
          return
        }

        try { await incrementAnnonceVues(annonceId) } catch { /* visiteur non autorisé */ }

        const refreshed = await getAnnonceById(annonceId)
        const row = refreshed || data
        if (cancelled) return

        setAnnonce(row)

        const ownerId = row.utilisateur_id
        if (ownerId) {
          try {
            const prof = await getProfilFirestore(ownerId)
            if (!cancelled) setProprietaire(prof ? { id: ownerId, ...prof } : { id: ownerId })
          } catch {
            if (!cancelled) setProprietaire({ id: ownerId })
          }
        }

        try {
          const avisData = await fetchAvisForAnnonce(annonceId)
          if (!cancelled) setAvis(avisData)
        } catch {
          if (!cancelled) setAvis([])
        }

        if (!cancelled) setChargement(false)
      } catch (err) {
        console.error('[DetailAnnonce] erreur chargement:', err)
        if (!cancelled) setErreur(err?.message || 'Erreur lors du chargement')
        if (!cancelled) setChargement(false)
      }
    }

    chargerAnnonce()

    const unsub = observerConnexion(async (user) => {
      setUtilisateur(user)
      if (user && annonceId) {
        const favori = await findFavori(user.uid, annonceId)
        if (favori) {
          setEstFavori(true)
          setFavoriId(favori.id)
        } else {
          setEstFavori(false)
          setFavoriId(null)
        }
      } else {
        setEstFavori(false)
        setFavoriId(null)
      }
    })

    return () => {
      cancelled = true
      unsub()
    }
  }, [annonceId, router])

  const envoyerMessage = async () => {
    if (!utilisateur) {
      router.push('/connexion')
      return
    }
    if (!message.trim() || !proprietaire?.id || !annonce?.id) return

    await sendMessageFirestore({
      sender_id: utilisateur.uid,
      receiver_id: proprietaire.id,
      annonce_id: annonce.id,
      content: message.trim(),
    })

    await addNotification({
      utilisateur_id: proprietaire.id,
      type: 'message',
      titre: 'Nouveau message',
      contenu: message.trim(),
      lien: '/messages',
    })

    setEnvoye(true)
    setMessage('')
  }

  const toggleFavori = async () => {
    if (!utilisateur) {
      router.push('/connexion')
      return
    }
    if (estFavori && favoriId) {
      await removeFavori(favoriId)
      setEstFavori(false)
      setFavoriId(null)
    } else {
      const id = await addFavori(utilisateur.uid, annonce.id)
      setEstFavori(true)
      setFavoriId(id)
    }
  }

  const partagerWhatsApp = () => {
    const message = `🏠 *${annonce.titre}*\n📍 ${annonce.quartier}, Abidjan\n💰 ${annonce.prix?.toLocaleString()} FCFA\n\nVoir l'annonce : ${window.location.href}`
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  const estProprietaire =
    utilisateur && annonce && utilisateur.uid === annonce.utilisateur_id

  const soumettreSignalement = async () => {
    if (!utilisateur) {
      router.push('/connexion')
      return
    }
    if (estProprietaire) return
    if (!motifSignalement.trim()) return
    setEnvoiSignalement(true)
    try {
      await addSignalement({
        annonce_id: annonce.id,
        titre_annonce: annonce.titre,
        motif: motifSignalement.trim(),
        details: detailsSignalement.trim() || null,
        signalant_uid: utilisateur.uid,
      })
      setSignalementOk(true)
      setModalSignalement(false)
      setDetailsSignalement('')
    } catch {
      /* ignore */
    }
    setEnvoiSignalement(false)
  }

  const soumettreAvis = async () => {
    if (!noteAvis || !utilisateur || !annonce?.id) return

    try {
      await addAvis({
        annonce_id: annonce.id,
        auteur_id: utilisateur.uid,
        note: noteAvis,
        commentaire: commentaireAvis,
      })
      setAvisSoumis(true)
      const liste = await fetchAvisForAnnonce(annonceId)
      setAvis(liste)
    } catch {
      /* ignore */
    }
  }

  const badgeInfo = {
    bronze: { label: '🔓 Bronze', desc: 'Identité vérifiée en ligne', couleur: 'bg-gray-100 text-gray-700' },
    argent: { label: '🥈 Argent', desc: 'Visite physique effectuée, photos certifiées', couleur: 'bg-gray-100 text-gray-700' },
    or:     { label: '🥇 Or',     desc: 'Titre foncier vérifié au Cadastre', couleur: 'bg-yellow-50 text-yellow-700' },
  }

  if (chargement) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-[#1B5E20] font-bold">Chargement...</div>
      </div>
    )
  }

  if (erreur || !annonce) {
    return (
      <div className="min-h-screen bg-[#F5F5F5]">
        <SiteHeader />
        <div className="max-w-xl mx-auto py-20 px-4 text-center">
          <div className="text-5xl mb-4">😕</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Annonce introuvable</h1>
          <p className="text-gray-500 mb-6">
            {erreur || "Cette annonce n'existe pas ou a été supprimée."}
          </p>
          <a
            href="/annonces"
            className="bg-[#1B5E20] text-white px-6 py-3 rounded-xl font-bold hover:bg-green-800"
          >
            Voir toutes les annonces
          </a>
        </div>
        <SiteFooter />
      </div>
    )
  }

  const badge = badgeInfo[annonce.badge] || badgeInfo.bronze

  // Calcul mensualité pour annonces de vente
  const mensualiteEstimee = (() => {
    if (annonce.type !== 'vente' || !annonce.prix) return null
    const apport = annonce.prix * 0.2
    const montant = annonce.prix - apport
    const taux = 9.5 / 100 / 12
    const n = 15 * 12
    if (taux === 0) return montant / n
    return (montant * taux) / (1 - Math.pow(1 + taux, -n))
  })()

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <SiteHeader />

      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 text-xs text-gray-400">
          <a href="/" className="hover:text-[#1B5E20]">Accueil</a> /{' '}
          <a href="/annonces" className="hover:text-[#1B5E20]">Annonces</a> /{' '}
          <span className="text-gray-600">{annonce.titre}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* COLONNE GAUCHE — Photos + Infos */}
          <div className="md:col-span-2 space-y-6">

            {/* GALERIE PHOTOS */}
            <div className="bg-white rounded-xl overflow-hidden shadow-sm">
              {annonce.photos && annonce.photos.length > 0 ? (
                <>
                  <img
                    src={annonce.photos[photoActive]}
                    alt={annonce.titre}
                    className="w-full h-80 object-cover"
                  />
                  {annonce.photos.length > 1 && (
                    <div className="flex gap-2 p-3 overflow-x-auto">
                      {annonce.photos.map((photo, index) => (
                        <img
                          key={index}
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          onClick={() => setPhotoActive(index)}
                          className={`w-20 h-16 object-cover rounded-lg cursor-pointer flex-shrink-0 ${
                            photoActive === index
                              ? 'ring-2 ring-[#1B5E20]'
                              : 'opacity-70 hover:opacity-100'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-80 bg-gray-200 flex items-center justify-center text-gray-400 text-5xl">
                  📷
                </div>
              )}
            </div>

            {/* TITRE ET PRIX */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs bg-[#E8F5E9] text-[#1B5E20] px-2 py-1 rounded-full font-bold capitalize inline-block">
                      {annonce.type}
                    </span>
                    <button
                      type="button"
                      onClick={toggleFavori}
                      className={`text-2xl transition-transform hover:scale-110 ${estFavori ? 'opacity-100' : 'opacity-40'}`}
                      aria-label={estFavori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    >
                      ❤️
                    </button>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-800">{annonce.titre}</h1>
                  <p className="text-gray-500 mt-1">📍 {annonce.quartier}, Abidjan</p>
                </div>
                <span className={`text-sm px-3 py-1 rounded-full font-bold ${badge.couleur}`}>
                  {badge.label}
                </span>
              </div>

              <p className="text-[#F9A825] font-bold text-3xl mb-2">
                {annonce.prix?.toLocaleString()} FCFA
                {annonce.type === 'location' && (
                  <span className="text-gray-400 text-lg font-normal"> / mois</span>
                )}
              </p>

              {/* Badge info */}
              <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm mt-4 ${badge.couleur}`}>
                <span className="text-lg">{badge.label.split(' ')[0]}</span>
                <span>{badge.desc}</span>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="font-bold text-gray-800 text-lg mb-3">Description</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                {annonce.description}
              </p>
            </div>

            {/* MINI CARTE */}
            <MiniCarte annonce={annonce} />

            {/* AVIS */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="font-bold text-gray-800 text-lg mb-4">
                Avis ({avis.length})
              </h2>

              {/* Laisser un avis */}
              {utilisateur && utilisateur.uid !== annonce.utilisateur_id && (
                <div className="border border-gray-200 rounded-xl p-4 mb-6">
                  <p className="font-bold text-sm text-gray-700 mb-3">
                    Laisser un avis
                  </p>

                  {/* Étoiles */}
                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((etoile) => (
                      <button
                        key={etoile}
                        onClick={() => setNoteAvis(etoile)}
                        className={`text-2xl transition-transform hover:scale-110 ${
                          etoile <= noteAvis ? 'opacity-100' : 'opacity-30'
                        }`}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={commentaireAvis}
                    onChange={e => setCommentaireAvis(e.target.value)}
                    placeholder="Partagez votre expérience avec cette annonce..."
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B5E20] resize-none mb-3"
                  />
                  <button
                    onClick={soumettreAvis}
                    disabled={!noteAvis || avisSoumis}
                    className="bg-[#1B5E20] text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-green-800 disabled:opacity-50"
                  >
                    {avisSoumis ? '✅ Avis publié !' : 'Publier mon avis'}
                  </button>
                </div>
              )}

              {/* Liste des avis */}
              {avis.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">
                  Aucun avis pour l'instant. Soyez le premier à donner votre avis.
                </p>
              ) : (
                <div className="space-y-4">
                  {avis.map((a) => (
                    <div key={a.id} className="border-b border-gray-100 pb-4 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-[#E8F5E9] rounded-full flex items-center justify-center text-[#1B5E20] font-bold text-sm">
                            {a.profiles?.nom?.[0] || '?'}
                          </div>
                          <span className="font-bold text-sm text-gray-800">
                            {a.profiles?.nom || 'Utilisateur'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {'⭐'.repeat(a.note)}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(a.created_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                      {a.commentaire && (
                        <p className="text-gray-600 text-sm ml-10">{a.commentaire}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* COLONNE DROITE — Contact */}
          <div className="space-y-4">

            {/* PROPRIÉTAIRE */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-4">Proposé par</h2>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-[#E8F5E9] rounded-full flex items-center justify-center text-[#1B5E20] font-bold text-lg">
                  {proprietaire?.nom?.[0] || '?'}
                </div>
                <div>
                  <a
                    href={`/profil/${proprietaire?.id}`}
                    className="font-bold text-gray-800 hover:text-[#1B5E20] hover:underline"
                  >
                    {proprietaire?.nom || 'Propriétaire'}
                  </a>
                  <p className="text-gray-400 text-sm">📍 {proprietaire?.quartier || 'Abidjan'}</p>
                </div>
              </div>

              {/* Message */}
              {envoye ? (
                <div className="bg-[#E8F5E9] rounded-lg p-4 text-center">
                  <div className="text-2xl mb-1">✅</div>
                  <p className="text-[#1B5E20] font-bold text-sm">Message envoyé !</p>
                  <p className="text-gray-500 text-xs mt-1">
                    Le propriétaire vous répondra bientôt.
                  </p>
                </div>
              ) : (
                <>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={`Bonjour, je suis intéressé(e) par votre annonce "${annonce.titre}". Est-elle toujours disponible ?`}
                    rows={4}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B5E20] resize-none mb-3"
                  />
                  <button
                    onClick={envoyerMessage}
                    className="w-full bg-[#1B5E20] text-white py-3 rounded-lg font-bold text-sm hover:bg-green-800"
                  >
                    {utilisateur ? '💬 Envoyer un message' : '🔐 Connectez-vous pour contacter'}
                  </button>
                </>
              )}
            </div>

            {/* BADGE VÉRIFIÉ */}
            <div className="bg-[#E8F5E9] rounded-xl p-5">
              <h3 className="font-bold text-[#1B5E20] mb-2">✅ Badge Vérifié</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {annonce.badge === 'or'
                  ? 'Ce bien a été visité physiquement et son titre foncier a été vérifié au Cadastre d\'Abidjan.'
                  : annonce.badge === 'argent'
                  ? 'Ce bien a été visité physiquement par un agent Chez Moi CI. Les photos sont certifiées conformes.'
                  : 'L\'identité du propriétaire a été vérifiée. Pour plus de sécurité, demandez un badge Argent ou Or.'
                }
              </p>
              <a
                href="/badge"
                className="inline-block mt-3 text-[#1B5E20] text-xs font-bold hover:underline"
              >
                En savoir plus sur nos badges →
              </a>
            </div>

            {/* CALCULATEUR DE PRÊT (vente) */}
            {annonce.type === 'vente' && mensualiteEstimee && (
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-1">
                  💰 Simulation de prêt
                </h3>
                <p className="text-xs text-gray-500 mb-3">
                  Apport 20 %, durée 15 ans, taux 9,5 % (moyenne banques CI)
                </p>
                <p className="text-3xl font-bold text-[#1B5E20]">
                  {Math.round(mensualiteEstimee).toLocaleString('fr-FR')}
                  <span className="text-base text-gray-400 font-normal"> FCFA/mois</span>
                </p>
                <a
                  href="/calculateur-pret"
                  className="block mt-3 text-center bg-[#E8F5E9] text-[#1B5E20] py-2 rounded-lg font-bold text-sm hover:bg-[#d0e8d3]"
                >
                  Personnaliser ma simulation →
                </a>
              </div>
            )}

            {/* PACKS */}
            <div className="bg-[#FFF8E1] rounded-xl p-5 border border-yellow-200">
              <h3 className="font-bold text-gray-800 mb-1">
                {annonce.type === 'location' ? '🔑 Sécurisez cette location' : '🏠 Achat accompagné'}
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                {annonce.type === 'location'
                  ? 'Bail numérique conforme, dépôt escrow, agent dédié — dès 75 000 FCFA.'
                  : 'Vérification du titre foncier, négociation experte, coordination notaire — dès 150 000 FCFA.'}
              </p>
              <a
                href="/packs"
                className="block text-center bg-[#F9A825] text-white py-2 rounded-lg font-bold text-sm hover:bg-yellow-600"
              >
                Découvrir les packs →
              </a>
            </div>

            {/* SIGNALER + PARTAGE */}
            {!estProprietaire && (
              <button
                type="button"
                onClick={() => {
                  setSignalementOk(false)
                  setModalSignalement(true)
                }}
                className="w-full text-gray-400 text-sm hover:text-red-500 text-center py-2"
              >
                🚩 Signaler cette annonce
              </button>
            )}
            {signalementOk && (
              <p className="text-center text-xs text-[#1B5E20] font-bold">
                Merci : votre signalement a été transmis à la modération.
              </p>
            )}
            <button
              type="button"
              onClick={partagerWhatsApp}
              className="w-full bg-green-500 text-white py-2 rounded-lg text-sm font-bold hover:bg-green-600 flex items-center justify-center gap-2"
            >
              <span>📲</span> Partager sur WhatsApp
            </button>

          </div>
        </div>
      </div>

      {modalSignalement && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="font-bold text-gray-800 text-lg mb-2">
              Signaler cette annonce
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              Connectez-vous si besoin. Les signalements abusifs peuvent entraîner la
              suspension du compte.
            </p>
            <label className="block text-sm font-bold text-gray-700 mb-1">Motif</label>
            <select
              value={motifSignalement}
              onChange={(e) => setMotifSignalement(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mb-3 focus:outline-none focus:border-[#1B5E20]"
            >
              <option>Annonce frauduleuse</option>
              <option>Photos trompeuses ou volées</option>
              <option>Contenu inapproprié</option>
              <option>Autre</option>
            </select>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Détails (optionnel)
            </label>
            <textarea
              value={detailsSignalement}
              onChange={(e) => setDetailsSignalement(e.target.value)}
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-[#1B5E20] resize-none"
              placeholder="Expliquez brièvement le problème…"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setModalSignalement(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={envoiSignalement}
                onClick={soumettreSignalement}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-50"
              >
                {envoiSignalement ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  )
}
