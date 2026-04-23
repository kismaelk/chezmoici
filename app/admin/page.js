'use client'
import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import {
  getProfilFirestore,
  fetchAllAnnoncesAdmin,
  fetchAllProfiles,
  deleteAnnonce,
  updateAnnonce,
  updateProfileField,
  fetchAllSignalementsAdmin,
  updateSignalement,
  fetchAllDemandesBadgeAdmin,
  updateDemandeBadge,
} from '@/lib/firestoreApp'
import { useRouter } from 'next/navigation'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

// Fallback : adresse courriel autorisée si is_admin n'est pas encore en base
const ADMIN_EMAIL = 'ismael@chezmoici.com'

const BADGE_LABEL = { bronze: '🔓 Bronze', argent: '🥈 Argent', or: '🥇 Or' }
const BADGE_OPTIONS = ['bronze', 'argent', 'or']

const STATUT_OPTIONS = [
  { value: 'actif',     label: '✅ Actif' },
  { value: 'pause',     label: '⏸️ En pause' },
  { value: 'suspendu',  label: '🚫 Suspendu' },
]

const TYPE_LABEL = {
  locataire: '🔑 Locataire',
  proprietaire: '🏠 Propriétaire',
  agence: '🏢 Agence',
  artisan: '🔧 Artisan',
}

const STATUT_SIGNALEMENT_OPTIONS = [
  { value: 'en_attente', label: '📥 Nouveau' },
  { value: 'vu', label: '👁️ Vu' },
  { value: 'traite', label: '✅ Traité' },
  { value: 'classe', label: '📁 Classé' },
]

const STATUT_DEMANDE_BADGE_OPTIONS = [
  { value: 'en_attente', label: '⏳ En attente' },
  { value: 'en_cours', label: '🔄 En cours' },
  { value: 'approuve', label: '✅ Approuvé' },
  { value: 'refuse', label: '❌ Refusé' },
]

export default function Admin() {
  const [onglet, setOnglet] = useState('annonces')
  const [annonces, setAnnonces] = useState([])
  const [utilisateurs, setUtilisateurs] = useState([])
  const [signalements, setSignalements] = useState([])
  const [demandesBadge, setDemandesBadge] = useState([])
  const [chargement, setChargement] = useState(true)
  const [recherche, setRecherche] = useState('')
  const [confirmAction, setConfirmAction] = useState(null) // { type, id, label }

  const router = useRouter()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/connexion')
        return
      }
      const profil = await getProfilFirestore(user.uid)
      const estAdmin =
        profil?.is_admin === true || user.email === ADMIN_EMAIL
      if (!estAdmin) {
        router.push('/')
        return
      }
      setChargement(false)
    })
    return () => unsub()
  }, [router])

  useEffect(() => {
    if (chargement) return
    ;(async () => {
      if (onglet === 'annonces') {
        const list = await fetchAllAnnoncesAdmin()
        setAnnonces(list)
      } else if (onglet === 'utilisateurs') {
        const list = await fetchAllProfiles()
        list.sort((a, b) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0
          return tb - ta
        })
        setUtilisateurs(list)
      } else if (onglet === 'signalements') {
        setSignalements(await fetchAllSignalementsAdmin())
      } else if (onglet === 'demandes_badge') {
        setDemandesBadge(await fetchAllDemandesBadgeAdmin())
      }
    })()
  }, [onglet, chargement])

  // ── Actions annonces ─────────────────────────────────────────────────────────

  const supprimerAnnonceFn = async (id) => {
    try {
      await deleteAnnonce(id)
    } catch (e) {
      return alert('Erreur : ' + (e?.message || e))
    }
    setAnnonces((prev) => prev.filter((a) => a.id !== id))
    setConfirmAction(null)
  }

  const changerBadgeAnnonce = async (id, badge) => {
    try {
      await updateAnnonce(id, { badge })
    } catch {
      return
    }
    setAnnonces((prev) =>
      prev.map((a) => (a.id === id ? { ...a, badge } : a))
    )
  }

  const changerStatutAnnonce = async (id, statut) => {
    try {
      await updateAnnonce(id, { statut })
    } catch {
      return
    }
    setAnnonces((prev) =>
      prev.map((a) => (a.id === id ? { ...a, statut } : a))
    )
  }

  // ── Actions utilisateurs ──────────────────────────────────────────────────────

  const toggleBan = async (userId, statutActuel) => {
    const nouvelleValeur = statutActuel === 'banned' ? 'active' : 'banned'
    try {
      await updateProfileField(userId, { account_status: nouvelleValeur })
    } catch (e) {
      return alert('Erreur : ' + (e?.message || e))
    }
    setUtilisateurs((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, account_status: nouvelleValeur } : u
      )
    )
    setConfirmAction(null)
  }

  const changerBadgeUtilisateur = async (id, badge) => {
    try {
      await updateProfileField(id, { badge })
    } catch {
      return
    }
    setUtilisateurs((prev) =>
      prev.map((u) => (u.id === id ? { ...u, badge } : u))
    )
  }

  const changerStatutSignalement = async (id, statut) => {
    try {
      await updateSignalement(id, { statut })
    } catch {
      return
    }
    setSignalements((prev) =>
      prev.map((s) => (s.id === id ? { ...s, statut } : s))
    )
  }

  const changerStatutDemandeBadge = async (id, statut) => {
    try {
      await updateDemandeBadge(id, { statut })
    } catch {
      return
    }
    setDemandesBadge((prev) =>
      prev.map((d) => (d.id === id ? { ...d, statut } : d))
    )
  }

  // ── Filtres recherche ─────────────────────────────────────────────────────────

  const annoncesFiltrees = annonces.filter(a =>
    !recherche ||
    a.titre?.toLowerCase().includes(recherche.toLowerCase()) ||
    a.quartier?.toLowerCase().includes(recherche.toLowerCase()) ||
    a.profiles?.nom?.toLowerCase().includes(recherche.toLowerCase())
  )

  const utilisateursFiltres = utilisateurs.filter(u =>
    !recherche ||
    u.nom?.toLowerCase().includes(recherche.toLowerCase()) ||
    u.quartier?.toLowerCase().includes(recherche.toLowerCase())
  )

  const signalementsFiltres = signalements.filter((s) => {
    if (!recherche) return true
    const q = recherche.toLowerCase()
    return (
      (s.motif && s.motif.toLowerCase().includes(q)) ||
      (s.annonce_titre && s.annonce_titre.toLowerCase().includes(q)) ||
      (s.profiles?.nom && s.profiles.nom.toLowerCase().includes(q))
    )
  })

  const demandesBadgeFiltrees = demandesBadge.filter((d) => {
    if (!recherche) return true
    const q = recherche.toLowerCase()
    return (
      (d.nom && d.nom.toLowerCase().includes(q)) ||
      (d.telephone && d.telephone.includes(recherche)) ||
      (d.niveau && d.niveau.toLowerCase().includes(q)) ||
      (d.annonce_titre && d.annonce_titre.toLowerCase().includes(q)) ||
      (d.profiles?.nom && d.profiles.nom.toLowerCase().includes(q))
    )
  })

  // ── Stats ────────────────────────────────────────────────────────────────────

  const stats = [
    { label: 'Annonces', valeur: annonces.length, emoji: '🏠' },
    { label: 'Actives', valeur: annonces.filter(a => a.statut === 'actif').length, emoji: '✅' },
    { label: 'Utilisateurs', valeur: utilisateurs.length, emoji: '👤', needUsers: true },
    { label: 'Bannis', valeur: utilisateurs.filter(u => u.account_status === 'banned').length, emoji: '🚫', needUsers: true },
    { label: 'Badges Or', valeur: annonces.filter(a => a.badge === 'or').length, emoji: '🥇' },
  ]

  // ── Render ────────────────────────────────────────────────────────────────────

  if (chargement) return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <div className="text-[#1B5E20] font-bold text-lg">Vérification des accès…</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <SiteHeader />

      {/* Bandeau admin */}
      <div className="bg-[#1B1B1B] text-white px-4 py-2 flex items-center gap-3">
        <span className="text-red-400 font-bold text-sm">⚙️ MODE ADMIN</span>
        <span className="text-gray-500 text-xs">Accès restreint — toutes les actions sont irréversibles</span>
      </div>

      <div className="max-w-6xl mx-auto py-8 px-4 md:px-6">

        <h1 className="text-2xl font-bold text-gray-800 mb-1">Tableau de bord Admin</h1>
        <p className="text-gray-400 text-sm mb-6">Chez Moi CI — Annonces, utilisateurs, signalements et demandes badge</p>

        {/* STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm text-center">
              <div className="text-2xl mb-1">{s.emoji}</div>
              <div className="text-2xl font-bold text-[#1B5E20]">
                {s.needUsers && !utilisateurs.length ? '—' : s.valeur}
              </div>
              <div className="text-gray-500 text-xs">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ONGLETS + RECHERCHE */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div className="flex gap-2">
            {[
              { id: 'annonces', label: '🏠 Annonces' },
              { id: 'utilisateurs', label: '👤 Utilisateurs' },
              { id: 'signalements', label: '🚩 Signalements' },
              { id: 'demandes_badge', label: '🏅 Badges' },
            ].map(o => (
              <button
                key={o.id}
                type="button"
                onClick={() => { setOnglet(o.id); setRecherche('') }}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                  onglet === o.id
                    ? 'bg-[#1B5E20] text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder={
              onglet === 'annonces'
                ? 'Rechercher une annonce…'
                : onglet === 'utilisateurs'
                  ? 'Rechercher un utilisateur…'
                  : onglet === 'signalements'
                    ? 'Motif, annonce, signalant…'
                    : 'Nom, téléphone, niveau, annonce…'
            }
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full sm:w-64 focus:outline-none focus:border-[#1B5E20]"
          />
        </div>

        {/* ── ONGLET ANNONCES ── */}
        {onglet === 'annonces' && (
          <div className="space-y-3">
            {annoncesFiltrees.length === 0 && (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-100">
                Aucune annonce trouvée.
              </div>
            )}
            {annoncesFiltrees.map(a => (
              <div key={a.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                  {/* Photo */}
                  <div className="w-16 h-14 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                    {a.photos?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.photos[0]} alt={a.titre} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">🏠</div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-800 truncate">{a.titre}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        a.statut === 'actif' ? 'bg-green-100 text-green-700' :
                        a.statut === 'suspendu' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{a.statut}</span>
                    </div>
                    <p className="text-gray-400 text-xs mt-0.5">
                      📍 {a.quartier} · {a.type} · par {a.profiles?.nom || 'Inconnu'}
                    </p>
                    <p className="text-[#F9A825] font-bold text-sm">{a.prix?.toLocaleString()} FCFA</p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-shrink-0">
                    {/* Badge */}
                    <select
                      value={a.badge || 'bronze'}
                      onChange={e => changerBadgeAnnonce(a.id, e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1B5E20]"
                    >
                      {BADGE_OPTIONS.map(b => <option key={b} value={b}>{BADGE_LABEL[b]}</option>)}
                    </select>

                    {/* Statut */}
                    <select
                      value={a.statut || 'actif'}
                      onChange={e => changerStatutAnnonce(a.id, e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1B5E20]"
                    >
                      {STATUT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>

                    {/* Voir */}
                    <a
                      href={`/annonces/${a.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#1B5E20] text-xs font-bold border border-[#1B5E20] px-3 py-1.5 rounded-lg hover:bg-[#E8F5E9]"
                    >
                      Voir
                    </a>

                    {/* Supprimer */}
                    <button
                      type="button"
                      onClick={() => setConfirmAction({ type: 'deleteAnnonce', id: a.id, label: a.titre })}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ONGLET SIGNALEMENTS ── */}
        {onglet === 'signalements' && (
          <div className="space-y-3">
            {signalementsFiltres.length === 0 && (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-100">
                Aucun signalement.
              </div>
            )}
            {signalementsFiltres.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800">{s.motif}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Annonce :{' '}
                      <a
                        href={`/annonces/${s.annonce_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#1B5E20] font-bold hover:underline"
                      >
                        {s.annonce_titre || s.annonce_id}
                      </a>
                      {' · '}Signalant : {s.profiles?.nom || s.signalant_uid || '—'}
                    </p>
                    {s.details && (
                      <p className="text-gray-600 text-sm mt-2 whitespace-pre-wrap">
                        {s.details}
                      </p>
                    )}
                    <p className="text-gray-400 text-xs mt-2">
                      {s.created_at
                        ? new Date(s.created_at).toLocaleString('fr-FR')
                        : ''}
                    </p>
                  </div>
                  <select
                    value={s.statut || 'en_attente'}
                    onChange={(e) => changerStatutSignalement(s.id, e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1B5E20] flex-shrink-0"
                  >
                    {STATUT_SIGNALEMENT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        {onglet === 'demandes_badge' && (
          <div className="space-y-3">
            {demandesBadgeFiltrees.length === 0 && (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-100">
                Aucune demande badge.
              </div>
            )}
            {demandesBadgeFiltrees.map((d) => (
              <div
                key={d.id}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800">
                      {d.nom} — {d.telephone}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Niveau : <span className="font-bold">{d.niveau}</span>
                      {d.annonce_id && (
                        <>
                          {' · '}
                          <a
                            href={`/annonces/${d.annonce_id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#1B5E20] font-bold hover:underline"
                          >
                            {d.annonce_titre || d.annonce_id}
                          </a>
                        </>
                      )}
                    </p>
                    {d.commentaire && (
                      <p className="text-gray-600 text-sm mt-2 whitespace-pre-wrap">
                        {d.commentaire}
                      </p>
                    )}
                    <p className="text-gray-400 text-xs mt-2">
                      {d.created_at
                        ? new Date(d.created_at).toLocaleString('fr-FR')
                        : ''}
                    </p>
                  </div>
                  <select
                    value={d.statut || 'en_attente'}
                    onChange={(e) => changerStatutDemandeBadge(d.id, e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1B5E20] flex-shrink-0"
                  >
                    {STATUT_DEMANDE_BADGE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        {onglet === 'utilisateurs' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-gray-600">Utilisateur</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-600 hidden md:table-cell">Type</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-600">Statut</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-600">Badge</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {utilisateursFiltres.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                )}
                {utilisateursFiltres.map(u => (
                  <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${u.account_status === 'banned' ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#E8F5E9] flex items-center justify-center text-[#1B5E20] font-bold text-sm flex-shrink-0">
                          {u.nom?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{u.nom || 'Sans nom'}</p>
                          <p className="text-gray-400 text-xs">{u.quartier || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-gray-600">{TYPE_LABEL[u.type] || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        u.account_status === 'banned'
                          ? 'bg-red-100 text-red-700'
                          : u.account_status === 'suspended'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {u.account_status === 'banned' ? '🚫 Banni'
                          : u.account_status === 'suspended' ? '⏸ Suspendu'
                          : '✅ Actif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.badge || 'bronze'}
                        onChange={e => changerBadgeUtilisateur(u.id, e.target.value)}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#1B5E20]"
                      >
                        {BADGE_OPTIONS.map(b => <option key={b} value={b}>{BADGE_LABEL[b]}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/profil/${u.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#1B5E20] text-xs font-bold border border-[#1B5E20] px-2.5 py-1 rounded-lg hover:bg-[#E8F5E9]"
                        >
                          Profil
                        </a>
                        <button
                          type="button"
                          onClick={() => setConfirmAction({
                            type: 'toggleBan',
                            id: u.id,
                            statutActuel: u.account_status,
                            label: u.nom || 'cet utilisateur',
                          })}
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                            u.account_status === 'banned'
                              ? 'border-green-400 text-green-600 hover:bg-green-50'
                              : 'border-red-300 text-red-600 hover:bg-red-50'
                          }`}
                        >
                          {u.account_status === 'banned' ? 'Débannir' : 'Bannir'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ── MODAL DE CONFIRMATION ── */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="text-3xl mb-3">
              {confirmAction.type === 'deleteAnnonce' ? '🗑️' : '🚫'}
            </div>
            <h3 className="font-bold text-gray-800 text-lg mb-2">
              {confirmAction.type === 'deleteAnnonce'
                ? 'Supprimer cette annonce ?'
                : confirmAction.statutActuel === 'banned'
                  ? 'Débannir cet utilisateur ?'
                  : 'Bannir cet utilisateur ?'}
            </h3>
            <p className="text-gray-500 text-sm mb-5">
              <strong>{confirmAction.label}</strong>
              {confirmAction.type === 'deleteAnnonce'
                ? ' — Cette action est irréversible. L\'annonce sera définitivement supprimée.'
                : confirmAction.statutActuel === 'banned'
                  ? ' — L\'utilisateur pourra de nouveau accéder à la plateforme.'
                  : ' — L\'utilisateur n\'aura plus accès à la plateforme.'}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmAction.type === 'deleteAnnonce')
                    supprimerAnnonceFn(confirmAction.id)
                  if (confirmAction.type === 'toggleBan') toggleBan(confirmAction.id, confirmAction.statutActuel)
                }}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white ${
                  confirmAction.type === 'deleteAnnonce' || confirmAction.statutActuel !== 'banned'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-[#1B5E20] hover:bg-green-800'
                }`}
              >
                {confirmAction.type === 'deleteAnnonce'
                  ? 'Supprimer définitivement'
                  : confirmAction.statutActuel === 'banned'
                    ? 'Débannir'
                    : 'Bannir'}
              </button>
            </div>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  )
}
