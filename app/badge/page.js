'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import {
  addDemandeBadge,
  fetchMesAnnonces,
  fetchMesDemandesBadge,
  getProfilFirestore,
} from '@/lib/firestoreApp'
import { useRouter } from 'next/navigation'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

const NIVEAUX = [
  {
    id: 'bronze',
    emoji: '🔓',
    nom: 'Bronze',
    prix: 'Gratuit',
    badge: 'Identité vérifiée',
    couleur: 'border-gray-200',
    items: [
      'E-mail et téléphone vérifiés par SMS',
      'Pièce d’identité téléversée et validée',
      'Photos déposées en ligne par le propriétaire',
      'Signalement anti-fraude activé',
    ],
  },
  {
    id: 'argent',
    emoji: '🥈',
    nom: 'Argent',
    prix: '15 000 FCFA',
    badge: 'Visite terrain',
    couleur: 'border-gray-300',
    items: [
      'Visite physique par un agent Chez Moi CI',
      '20 photos standardisées du bien',
      'Vidéo 360° et coordonnées GPS confirmées',
      'Rapport signé disponible en PDF',
      'Renouvellement annuel',
    ],
  },
  {
    id: 'or',
    emoji: '🥇',
    nom: 'Or',
    prix: '50 000 FCFA',
    badge: 'Titre foncier certifié',
    couleur: 'border-[#F9A825]',
    items: [
      'Tout ce qui est inclus dans l’Argent',
      'Vérification du titre foncier au Cadastre',
      'Consultation greffe du Tribunal (absence de litiges)',
      'Rapport juridique complet 10 pages',
      'Garantie de remboursement en cas d’anomalie',
    ],
    featured: true,
  },
]

const STATUT_DEMANDE_LABEL = {
  en_attente: '⏳ En attente',
  en_cours: '🔄 En cours',
  approuve: '✅ Approuvée',
  refuse: '❌ Refusée',
}

function libelleNiveau(id) {
  return NIVEAUX.find((n) => n.id === id)?.nom || id
}

export default function Badge() {
  const [user, setUser] = useState(null)
  const [annoncesUtilisateur, setAnnoncesUtilisateur] = useState([])
  const [mesDemandes, setMesDemandes] = useState([])
  const [niveauChoisi, setNiveauChoisi] = useState('argent')
  const [annonceId, setAnnonceId] = useState('')
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [commentaire, setCommentaire] = useState('')
  const [envoye, setEnvoye] = useState(false)
  const [erreur, setErreur] = useState('')
  const router = useRouter()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (!u) {
        setMesDemandes([])
        return
      }
      const profil = await getProfilFirestore(u.uid)
      if (profil) {
        setNom(profil.nom || '')
        setTelephone(profil.telephone || '')
      }
      const annonces = await fetchMesAnnonces(u.uid)
      setAnnoncesUtilisateur(
        annonces.map((a) => ({ id: a.id, titre: a.titre }))
      )
      setMesDemandes(await fetchMesDemandesBadge(u.uid))
    })
    return () => unsub()
  }, [])

  const soumettre = async (e) => {
    e.preventDefault()
    setErreur('')

    if (!user) {
      router.push('/connexion?redirect=/badge')
      return
    }
    if (!nom || !telephone) {
      setErreur('Nom et téléphone obligatoires.')
      return
    }

    try {
      await addDemandeBadge({
        utilisateur_id: user.uid,
        annonce_id: annonceId || null,
        niveau: niveauChoisi,
        nom,
        telephone,
        commentaire,
      })
      setEnvoye(true)
      setMesDemandes(await fetchMesDemandesBadge(user.uid))
    } catch {
      setErreur(
        "Nous n'avons pas pu enregistrer votre demande. Un conseiller vous contactera sous 24 h."
      )
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5]">
      <SiteHeader />

      <section className="bg-gradient-to-br from-[#0F3F12] to-[#1B5E20] py-14 px-4 text-center">
        <span className="inline-block bg-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/20 mb-4">
          Badge Vérifié ✅
        </span>
        <h1 className="text-white text-3xl md:text-5xl font-bold mb-3">
          La confiance, certifiée par des humains
        </h1>
        <p className="text-green-100 max-w-2xl mx-auto">
          3 niveaux de vérification progressive. Nos agents terrain visitent
          physiquement, photographient, et vérifient les documents juridiques.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {NIVEAUX.map((n) => (
            <div
              key={n.id}
              className={`bg-white rounded-2xl p-6 border-2 ${n.couleur} ${n.featured ? 'shadow-xl md:scale-105' : 'shadow-sm'} relative`}
            >
              {n.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#F9A825] text-white text-xs font-bold px-3 py-1 rounded-full">
                  Recommandé
                </span>
              )}
              <div className="text-4xl mb-2">{n.emoji}</div>
              <h3 className="text-2xl font-bold text-gray-800">Badge {n.nom}</h3>
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                {n.badge}
              </p>
              <p className="text-[#1B5E20] font-bold text-xl mt-3">{n.prix}</p>
              <ul className="mt-5 space-y-2 text-sm text-gray-700">
                {n.items.map((i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#1B5E20] font-bold mt-0.5">✓</span>
                    {i}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  setNiveauChoisi(n.id)
                  const formSection = document.getElementById('demande-badge')
                  if (formSection)
                    formSection.scrollIntoView({ behavior: 'smooth' })
                }}
                className={`mt-6 w-full py-3 rounded-lg font-bold text-sm ${
                  n.featured
                    ? 'bg-[#1B5E20] text-white hover:bg-green-800'
                    : 'border-2 border-[#1B5E20] text-[#1B5E20] hover:bg-[#E8F5E9]'
                }`}
              >
                Demander {n.nom}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* PROCESSUS */}
      <section className="bg-white py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-10">
            Comment fonctionne un badge — étape par étape
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
            {[
              { n: '1', t: 'Demande', d: 'Vous soumettez votre demande en ligne.' },
              { n: '2', t: 'Validation docs', d: 'Notre modérateur vérifie l’authenticité des documents.' },
              { n: '3', t: 'Assignation', d: 'Un agent terrain est assigné selon le quartier.' },
              { n: '4', t: 'Visite terrain', d: '20 photos, vidéo 360°, rapport signé.' },
              { n: '5', t: 'Badge attribué', d: 'Badge affiché sur l’annonce, email envoyé.' },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div className="w-11 h-11 bg-[#1B5E20] text-white rounded-full mx-auto flex items-center justify-center font-bold mb-3">
                  {s.n}
                </div>
                <h3 className="font-bold text-gray-800 text-sm">{s.t}</h3>
                <p className="text-gray-500 text-xs mt-1">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {user && (
        <section className="py-10 px-4 bg-white border-y border-gray-100">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-1">
              Suivi de vos demandes
            </h2>
            <p className="text-gray-500 text-sm mb-4">
              Statut mis à jour par l&apos;équipe modération (sous 24–48 h ouvrées en
              général).
            </p>
            {mesDemandes.length === 0 ? (
              <p className="text-gray-400 text-sm">
                Aucune demande enregistrée pour le moment.
              </p>
            ) : (
              <ul className="space-y-3">
                {mesDemandes.map((d) => (
                  <li
                    key={d.id}
                    className="border border-gray-100 rounded-xl p-4 bg-[#F5F5F5]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-gray-800 text-sm">
                        {libelleNiveau(d.niveau)}
                      </span>
                      <span className="text-xs font-bold text-[#1B5E20] bg-[#E8F5E9] px-2 py-1 rounded-full">
                        {STATUT_DEMANDE_LABEL[d.statut] ||
                          STATUT_DEMANDE_LABEL.en_attente}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs mt-2">
                      {d.created_at
                        ? new Date(d.created_at).toLocaleString('fr-FR')
                        : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* FORMULAIRE DEMANDE */}
      <section id="demande-badge" className="py-12 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl p-7 border border-gray-100 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Demander un Badge Vérifié
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Notre équipe vous contacte sous 24 h ouvrables pour planifier la
            visite.
          </p>

          {envoye ? (
            <div className="bg-[#E8F5E9] rounded-xl p-6 text-center">
              <div className="text-4xl mb-2">✅</div>
              <h3 className="text-lg font-bold text-[#1B5E20]">
                Demande enregistrée
              </h3>
              <p className="text-gray-600 text-sm mt-2">
                Un conseiller vous appellera sous 24 h au {telephone}.
              </p>
              <a
                href="/tableau-de-bord"
                className="inline-block mt-5 bg-[#1B5E20] text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-green-800"
              >
                Retour au tableau de bord
              </a>
            </div>
          ) : (
            <form onSubmit={soumettre} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Niveau souhaité
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {NIVEAUX.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => setNiveauChoisi(n.id)}
                      className={`border-2 rounded-lg p-3 text-sm font-bold transition-colors ${
                        niveauChoisi === n.id
                          ? 'border-[#1B5E20] bg-[#E8F5E9] text-[#1B5E20]'
                          : 'border-gray-200 text-gray-600 hover:border-[#1B5E20]'
                      }`}
                    >
                      <div className="text-lg">{n.emoji}</div>
                      <div>{n.nom}</div>
                      <div className="text-xs font-normal">{n.prix}</div>
                    </button>
                  ))}
                </div>
              </div>

              {user && annoncesUtilisateur.length > 0 && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Annonce concernée (optionnel)
                  </label>
                  <select
                    value={annonceId}
                    onChange={(e) => setAnnonceId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B5E20]"
                  >
                    <option value="">Aucune annonce liée</option>
                    {annoncesUtilisateur.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.titre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Nom complet *
                  </label>
                  <input
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B5E20]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Téléphone (WhatsApp) *
                  </label>
                  <input
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    placeholder="+225 XX XX XX XX"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B5E20]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Commentaire (optionnel)
                </label>
                <textarea
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  rows={3}
                  placeholder="Ex : adresse du bien, disponibilité pour la visite…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B5E20] resize-none"
                />
              </div>

              {erreur && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {erreur}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-[#1B5E20] text-white py-3 rounded-xl font-bold hover:bg-green-800"
              >
                Envoyer la demande
              </button>
              {!user && (
                <p className="text-xs text-gray-400 text-center">
                  Vous serez invité à vous connecter pour finaliser.
                </p>
              )}
            </form>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
