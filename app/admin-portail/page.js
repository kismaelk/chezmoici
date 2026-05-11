'use client'
import { useCallback, useEffect, useMemo, useState, startTransition } from 'react'
import { observerConnexion } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
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
  fetchAllAvisAdmin,
  updateAvisAdmin,
  addNotification,
  addAvisModerationLog,
  fetchAvisModerationLogsAdmin,
  fetchFeatureFlagsAdmin,
  updateFeatureFlagAdmin,
  fetchContactMessagesAdmin,
  updateContactMessageAdmin,
} from '@/lib/firestoreApp'
import { useRouter } from 'next/navigation'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'
import { resolveStaffRole, staffPermissions } from '@/lib/staffRoles'
import { telechargerCsv } from '@/lib/adminCsv'

const BADGE_LABEL = { bronze: '🔓 Bronze', argent: '🥈 Argent', or: '🥇 Or' }
const BADGE_OPTIONS = ['bronze', 'argent', 'or']

const STATUT_OPTIONS = [
  { value: 'en_verification', label: '🔍 En vérification' },
  { value: 'actif',     label: '✅ Actif' },
  { value: 'pause',     label: '⏸️ En pause' },
  { value: 'suspendu',  label: '🚫 Suspendu' },
]

const TYPE_LABEL = {
  particulier: '🔍 Particulier',
  locataire: '🔍 Particulier',
  proprietaire: '🏠 Propriétaire',
  agence: '🏢 Agence',
  artisan: '🛠️ Services & Pro',
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

const STATUT_CONTACT_OPTIONS = [
  { value: 'nouveau', label: '📥 Nouveau' },
  { value: 'en_cours', label: '🔄 En cours' },
  { value: 'traite', label: '✅ Traité' },
]

const ONGLETS = [
  { id: 'dashboard', label: '📊 Tableau de bord' },
  { id: 'annonces', label: '🏠 Annonces' },
  { id: 'avis', label: '⭐ Avis' },
  { id: 'historique_moderation', label: '🗂️ Historique modération' },
  { id: 'utilisateurs', label: '👤 Utilisateurs' },
  { id: 'signalements', label: '🚩 Signalements' },
  { id: 'demandes_badge', label: '🏅 Badges' },
  { id: 'messagerie_contact', label: '📩 Messages contact' },
  { id: 'feature_flags', label: '⚙️ Fonctionnalités' },
]

export default function AdminPortail() {
  const [onglet, setOnglet] = useState('dashboard')
  const [annonces, setAnnonces] = useState([])
  const [utilisateurs, setUtilisateurs] = useState([])
  const [signalements, setSignalements] = useState([])
  const [demandesBadge, setDemandesBadge] = useState([])
  const [avisList, setAvisList] = useState([])
  const [moderationLogs, setModerationLogs] = useState([])
  const [chargement, setChargement] = useState(true)
  const [recherche, setRecherche] = useState('')
  const [confirmAction, setConfirmAction] = useState(null) // { type, id, label }
  const [roleStaff, setRoleStaff] = useState(null)
  const [adminUid, setAdminUid] = useState(null)
  const [avisMasquageModal, setAvisMasquageModal] = useState(null) // { id, annonce_titre, annonce_id, annonce_utilisateur_id }
  const [motifMasquage, setMotifMasquage] = useState('spam')
  const [motifAutre, setMotifAutre] = useState('')
  /** Brouillons locaux avant clic « Enregistrer » (évite pertes silencieuses si l’API échoue) */
  const [profilModifs, setProfilModifs] = useState({})
  const [annonceModifs, setAnnonceModifs] = useState({})
  const [sauvegardeProfilId, setSauvegardeProfilId] = useState(null)
  const [sauvegardeAnnonceId, setSauvegardeAnnonceId] = useState(null)
  const [toasts, setToasts] = useState([])
  const [featureFlags, setFeatureFlags] = useState([])
  const [messagesContact, setMessagesContact] = useState([])
  const [notesBrouillonContact, setNotesBrouillonContact] = useState({})
  const [annonceDetailModal, setAnnonceDetailModal] = useState(null)

  const [filtreAnnonceStatut, setFiltreAnnonceStatut] = useState('')
  const [filtreAnnonceType, setFiltreAnnonceType] = useState('')
  const [filtreAnnonceBadge, setFiltreAnnonceBadge] = useState('')
  const [filtreUserType, setFiltreUserType] = useState('')
  const [filtreUserStatut, setFiltreUserStatut] = useState('')
  const [filtreUserBadge, setFiltreUserBadge] = useState('')
  const [filtreUserStaff, setFiltreUserStaff] = useState('')
  const [filtreUserEmail, setFiltreUserEmail] = useState('')
  const [filtreSignalementStatut, setFiltreSignalementStatut] = useState('')
  const [filtreDemandeBadgeStatut, setFiltreDemandeBadgeStatut] = useState('')
  const [filtreAvisVisibilite, setFiltreAvisVisibilite] = useState('')
  const [filtreContactStatut, setFiltreContactStatut] = useState('')
  const [filtreLogAction, setFiltreLogAction] = useState('')

  const [selAnnonces, setSelAnnonces] = useState(() => new Set())
  const [selUsers, setSelUsers] = useState(() => new Set())
  const [selSignalements, setSelSignalements] = useState(() => new Set())
  const [selDemandes, setSelDemandes] = useState(() => new Set())
  const [selMessagesContact, setSelMessagesContact] = useState(() => new Set())

  const [bulkAnnonceStatut, setBulkAnnonceStatut] = useState('actif')
  const [bulkAnnonceBadge, setBulkAnnonceBadge] = useState('bronze')
  const [bulkUserStatut, setBulkUserStatut] = useState('active')
  const [bulkUserBadge, setBulkUserBadge] = useState('bronze')
  const [bulkSigStatut, setBulkSigStatut] = useState('vu')
  const [bulkDemandeStatut, setBulkDemandeStatut] = useState('en_cours')
  const [bulkContactStatut, setBulkContactStatut] = useState('en_cours')

  const [mergeSource, setMergeSource] = useState('')
  const [mergeTarget, setMergeTarget] = useState('')
  const [fusionEnCours, setFusionEnCours] = useState(false)
  const [bulkEnCours, setBulkEnCours] = useState(false)

  const router = useRouter()

  const showToast = useCallback((type, msg) => {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`
    setToasts((t) => [...t, { id, type, msg }])
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 5200)
  }, [])

  const ouvrirImpressionPdfListe = useCallback((titre, entetes, lignesTextes) => {
    const esc = (s) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
    const rowsHtml = lignesTextes
      .map((row) => `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
      .join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(
      titre
    )}</title><style>body{font-family:system-ui,sans-serif;padding:16px;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #ccc;padding:6px;font-size:11px;text-align:left;}th{background:#f4f4f5;}</style></head><body><h1 style="font-size:16px;">${esc(
      titre
    )}</h1><table><thead><tr>${entetes
      .map((h) => `<th>${esc(h)}</th>`)
      .join('')}</tr></thead><tbody>${rowsHtml}</tbody></table><script>window.onload=function(){window.print();}</script></body></html>`
    const w = typeof window !== 'undefined' ? window.open('', '_blank') : null
    if (!w) {
      showToast('error', 'Autorisez les pop-ups pour imprimer ou exporter en PDF.')
      return
    }
    w.document.write(html)
    w.document.close()
  }, [showToast])

  const notifierEquipeEvent = useCallback(async (event, payload) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const r = await fetch('/api/notify-admin-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ event, ...payload }),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        console.warn('[admin] notify-admin-action', r.status, j)
      }
    } catch (e) {
      console.warn('[admin] notify-admin-action', e)
    }
  }, [])

  const permissions = useMemo(() => staffPermissions(roleStaff), [roleStaff])

  const ongletsVisibles = useMemo(() => {
    return ONGLETS.filter((o) => {
      switch (o.id) {
        case 'dashboard':
          return permissions.voirOngletDashboard
        case 'annonces':
          return permissions.voirOngletAnnonces
        case 'avis':
          return permissions.voirOngletAvis
        case 'historique_moderation':
          return permissions.voirOngletHistoriqueModeration
        case 'utilisateurs':
          return permissions.voirOngletUtilisateurs
        case 'signalements':
          return permissions.voirOngletSignalements
        case 'demandes_badge':
          return permissions.voirOngletBadges
        case 'messagerie_contact':
          return permissions.voirOngletMessagerieContact
        case 'feature_flags':
          return permissions.voirOngletFeatureFlags
        default:
          return false
      }
    })
  }, [permissions])

  const naviguerOnglet = useCallback((id) => {
    setOnglet(id)
    setRecherche('')
    setSelAnnonces(new Set())
    setSelUsers(new Set())
    setSelSignalements(new Set())
    setSelDemandes(new Set())
    setSelMessagesContact(new Set())
  }, [])

  const roleLabel = {
    super_admin: 'Super admin',
    admin: 'Administrateur',
    moderator: 'Modérateur',
    annonce_manager: 'Gestionnaire annonces',
  }[roleStaff || ''] || 'Staff'

  useEffect(() => {
    const unsub = observerConnexion(async (user) => {
      if (!user) {
        router.push('/connexion')
        return
      }
      const profil = await getProfilFirestore(user.uid)
      const role = resolveStaffRole(profil, user.email)
      if (!role) {
        router.push('/')
        return
      }
      setAdminUid(user.uid)
      setRoleStaff(role)
      setChargement(false)
    })
    return () => unsub()
  }, [router])

  useEffect(() => {
    if (!roleStaff) return
    if (ongletsVisibles.length && !ongletsVisibles.some((o) => o.id === onglet)) {
      startTransition(() => naviguerOnglet(ongletsVisibles[0].id))
    }
  }, [roleStaff, onglet, ongletsVisibles, naviguerOnglet])

  useEffect(() => {
    if (chargement || !permissions.voirOngletMessagerieContact) return
    ;(async () => {
      try {
        setMessagesContact(await fetchContactMessagesAdmin())
      } catch (e) {
        console.warn('[admin] messages contact', e)
      }
    })()
  }, [chargement, permissions.voirOngletMessagerieContact])

  useEffect(() => {
    if (chargement) return
    ;(async () => {
      if (onglet === 'dashboard') {
        try {
          const ann = await fetchAllAnnoncesAdmin()
          setAnnonces(ann)
          const tasks = []
          if (permissions.voirOngletMessagerieContact) {
            tasks.push(
              fetchContactMessagesAdmin()
                .then(setMessagesContact)
                .catch(() => {})
            )
          }
          if (permissions.voirOngletUtilisateurs) {
            tasks.push(
              fetchAllProfiles().then((list) => {
                list.sort((a, b) => {
                  const ta = a.created_at ? new Date(a.created_at).getTime() : 0
                  const tb = b.created_at ? new Date(b.created_at).getTime() : 0
                  return tb - ta
                })
                setUtilisateurs(list)
              })
            )
          }
          if (permissions.voirOngletSignalements) {
            tasks.push(fetchAllSignalementsAdmin().then(setSignalements))
          }
          if (permissions.voirOngletAvis) {
            tasks.push(fetchAllAvisAdmin().then(setAvisList))
          }
          if (permissions.voirOngletBadges) {
            tasks.push(fetchAllDemandesBadgeAdmin().then(setDemandesBadge))
          }
          if (permissions.voirOngletHistoriqueModeration) {
            tasks.push(fetchAvisModerationLogsAdmin().then(setModerationLogs))
          }
          await Promise.all(tasks)
        } catch (e) {
          showToast('error', e?.message || 'Erreur chargement tableau de bord.')
        }
      } else if (onglet === 'annonces') {
        const list = await fetchAllAnnoncesAdmin()
        setAnnonces(list)
        setAnnonceModifs({})
      } else if (onglet === 'avis') {
        setAvisList(await fetchAllAvisAdmin())
      } else if (onglet === 'historique_moderation') {
        setModerationLogs(await fetchAvisModerationLogsAdmin())
      } else if (onglet === 'utilisateurs') {
        const list = await fetchAllProfiles()
        list.sort((a, b) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0
          return tb - ta
        })
        setUtilisateurs(list)
        setProfilModifs({})
      } else if (onglet === 'signalements') {
        setSignalements(await fetchAllSignalementsAdmin())
      } else if (onglet === 'demandes_badge') {
        setDemandesBadge(await fetchAllDemandesBadgeAdmin())
      } else if (onglet === 'messagerie_contact') {
        try {
          setMessagesContact(await fetchContactMessagesAdmin())
        } catch (e) {
          showToast('error', e?.message || 'Impossible de charger les messages.')
        }
      } else if (onglet === 'feature_flags') {
        setFeatureFlags(await fetchFeatureFlagsAdmin())
      }
    })()
  }, [onglet, chargement, permissions, showToast])

  const appelerUserAuth = async (action, targetUserId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        return showToast('error', 'Session expirée.')
      }
      const r = await fetch('/api/admin/user-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action, targetUserId }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) return showToast('error', j.error || 'Action refusée')
      showToast('success', j.message || 'OK')
      if (j.action_link && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(j.action_link)
          showToast('success', 'Lien de reset copié dans le presse-papiers.')
        } catch {
          showToast('error', 'Copiez le lien affiché dans la console réseau si besoin.')
        }
      }
    } catch (e) {
      showToast('error', String(e?.message || e))
    }
  }

  const toggleFeatureFlag = async (key, value) => {
    if (!adminUid) return
    try {
      await updateFeatureFlagAdmin(key, value, adminUid)
      setFeatureFlags((prev) =>
        prev.map((f) => (f.key === key ? { ...f, value_boolean: value } : f))
      )
      showToast('success', 'Paramètre mis à jour.')
    } catch (e) {
      showToast('error', e?.message || e)
    }
  }

  // ── Actions annonces ─────────────────────────────────────────────────────────

  const supprimerAnnonceFn = async (id) => {
    try {
      await deleteAnnonce(id)
    } catch (e) {
      return showToast('error', 'Erreur : ' + (e?.message || e))
    }
    showToast('success', 'Annonce supprimée.')
    setAnnonces((prev) => prev.filter((a) => a.id !== id))
    setConfirmAction(null)
  }

  // ── Actions utilisateurs ──────────────────────────────────────────────────────

  const toggleBan = async (userId, statutActuel) => {
    const nouvelleValeur = statutActuel === 'banned' ? 'active' : 'banned'
    try {
      await updateProfileField(userId, { account_status: nouvelleValeur })
    } catch (e) {
      return showToast('error', 'Erreur : ' + (e?.message || e))
    }
    if (nouvelleValeur === 'active' && statutActuel !== 'active') {
      void notifierEquipeEvent('compte_verifie', { cibleUserId: userId })
    }
    showToast('success', nouvelleValeur === 'banned' ? 'Utilisateur banni.' : 'Statut du compte mis à jour.')
    setUtilisateurs((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, account_status: nouvelleValeur } : u
      )
    )
    setProfilModifs((prev) => {
      const next = { ...prev }
      delete next[userId]
      return next
    })
    setConfirmAction(null)
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

  const changerStatutMessageContact = async (id, statut) => {
    const fields =
      statut === 'traite'
        ? { statut, traite_le: new Date().toISOString(), traite_par: adminUid }
        : { statut, traite_le: null, traite_par: null }
    try {
      await updateContactMessageAdmin(id, fields)
    } catch (e) {
      return showToast('error', e?.message || e)
    }
    setMessagesContact((prev) => prev.map((x) => (x.id === id ? { ...x, ...fields } : x)))
  }

  const sauverNoteContact = async (id) => {
    const m = messagesContact.find((x) => x.id === id)
    const text =
      notesBrouillonContact[id] !== undefined
        ? notesBrouillonContact[id]
        : (m?.note_interne ?? '')
    try {
      await updateContactMessageAdmin(id, { note_interne: text.trim() ? text.trim() : null })
    } catch (e) {
      return showToast('error', e?.message || e)
    }
    setMessagesContact((prev) =>
      prev.map((x) =>
        x.id === id ? { ...x, note_interne: text.trim() ? text.trim() : null } : x
      )
    )
    setNotesBrouillonContact((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    showToast('success', 'Note interne enregistrée.')
  }

  const toggleMasquageAvis = async (avisItem, raisonForcee = null) => {
    const masque = Boolean(avisItem.is_hidden)
    const raison = !masque ? (raisonForcee || '').trim() : null
    if (!masque && !raison) return showToast('error', 'Motif requis')
    try {
      await updateAvisAdmin(avisItem.id, {
        is_hidden: !masque,
        hidden_at: !masque ? new Date().toISOString() : null,
        hidden_by: !masque ? adminUid : null,
        hidden_reason: !masque ? raison : null,
      })
      if (!masque && avisItem.annonce_utilisateur_id) {
        await addNotification({
          utilisateur_id: avisItem.annonce_utilisateur_id,
          type: 'moderation_avis',
          titre: 'Avis masqué par la modération',
          contenu: `Un avis sur "${avisItem.annonce_titre || 'votre annonce'}" a été masqué. Motif: ${raison}`,
          lien: '/mes-avis-moderes',
        })
      }
      await addAvisModerationLog({
        avis_id: avisItem.id,
        annonce_id: avisItem.annonce_id,
        owner_id: avisItem.annonce_utilisateur_id || null,
        moderator_id: adminUid,
        action: masque ? 'unhide' : 'hide',
        reason: masque ? null : raison,
      })
    } catch (e) {
      return showToast('error', 'Erreur : ' + (e?.message || e))
    }
    showToast('success', masque ? 'Avis à nouveau visible.' : 'Avis masqué.')
    setAvisList((prev) =>
      prev.map((a) =>
        a.id === avisItem.id
          ? {
              ...a,
              is_hidden: !masque,
              hidden_at: !masque ? new Date().toISOString() : null,
              hidden_by: !masque ? adminUid : null,
              hidden_reason: !masque ? raison : null,
            }
          : a
      )
    )
    if (!masque) {
      setAvisMasquageModal(null)
      setMotifMasquage('spam')
      setMotifAutre('')
    }
  }

  const confirmerMasquageAvis = async () => {
    if (!avisMasquageModal) return
    const raison = motifMasquage === 'autre' ? motifAutre.trim() : motifMasquage
    if (!raison) return showToast('error', 'Veuillez saisir un motif')
    await toggleMasquageAvis(avisMasquageModal, raison)
  }

  const valeurSelectRoleStaff = (u) => {
    if (!u.is_admin) return ''
    if (u.admin_role === 'moderator') return 'moderator'
    if (u.admin_role === 'admin') return 'admin'
    if (u.admin_role === 'annonce_manager') return 'annonce_manager'
    if (u.admin_role === 'super_admin') return 'super_admin'
    return 'super_admin'
  }

  const valeurBadgeAnnonce = (a) =>
    annonceModifs[a.id]?.badge !== undefined
      ? annonceModifs[a.id].badge
      : (a.badge || 'bronze')
  const valeurStatutAnnonce = (a) =>
    annonceModifs[a.id]?.statut !== undefined
      ? annonceModifs[a.id].statut
      : (a.statut || 'actif')

  const annonceADesModifs = (a) =>
    valeurBadgeAnnonce(a) !== (a.badge || 'bronze') ||
    valeurStatutAnnonce(a) !== (a.statut || 'actif')

  const setBrouillonAnnonce = (id, partial) => {
    setAnnonceModifs((prev) => ({ ...prev, [id]: { ...prev[id], ...partial } }))
  }

  const enregistrerModifsAnnonce = async (a) => {
    const badge = valeurBadgeAnnonce(a)
    const statut = valeurStatutAnnonce(a)
    const payload = {}
    if (statut !== (a.statut || 'actif')) payload.statut = statut
    if (permissions.annoncesEditBadge && badge !== (a.badge || 'bronze')) payload.badge = badge
    if (Object.keys(payload).length === 0) return
    setSauvegardeAnnonceId(a.id)
    try {
      await updateAnnonce(a.id, payload)
    } catch (e) {
      setSauvegardeAnnonceId(null)
      return showToast('error', 'Erreur : ' + (e?.message || e))
    }
    const prevStatut = a.statut || 'actif'
    if (payload.statut === 'actif' && prevStatut !== 'actif') {
      void notifierEquipeEvent('annonce_validee', { annonceId: a.id })
    }
    showToast('success', 'Annonce enregistrée.')
    setAnnonces((prev) => prev.map((x) => (x.id === a.id ? { ...x, ...payload } : x)))
    setAnnonceModifs((prev) => {
      const next = { ...prev }
      delete next[a.id]
      return next
    })
    setSauvegardeAnnonceId(null)
  }

  const valeursAfficheProfil = (u) => {
    const m = profilModifs[u.id] || {}
    const defSusp =
      u.account_suspended_until != null
        ? String(u.account_suspended_until).slice(0, 16)
        : ''
    return {
      account_status:
        m.account_status !== undefined ? m.account_status : (u.account_status || 'en_attente'),
      badge: m.badge !== undefined ? m.badge : (u.badge || 'bronze'),
      roleEquipe:
        m.roleEquipe !== undefined ? m.roleEquipe : valeurSelectRoleStaff(u),
      suspended_until:
        m.suspended_until !== undefined ? m.suspended_until : defSusp,
    }
  }

  const profilADesModifs = (u) => {
    const v = valeursAfficheProfil(u)
    const baseRole = valeurSelectRoleStaff(u)
    const baseSusp =
      u.account_suspended_until != null
        ? String(u.account_suspended_until).slice(0, 16)
        : ''
    const roleChanged = showRoleCol && v.roleEquipe !== baseRole
    const suspChanged =
      permissions.utilisateursEdit &&
      (v.suspended_until || '') !== (baseSusp || '')
    return (
      v.account_status !== (u.account_status || 'en_attente') ||
      v.badge !== (u.badge || 'bronze') ||
      roleChanged ||
      suspChanged
    )
  }

  const setBrouillonProfil = (id, partial) => {
    setProfilModifs((prev) => ({ ...prev, [id]: { ...prev[id], ...partial } }))
  }

  const enregistrerModifsProfil = async (u) => {
    const v = valeursAfficheProfil(u)
    const baseRole = valeurSelectRoleStaff(u)
    const payload = {}
    if (v.account_status !== (u.account_status || 'en_attente')) {
      payload.account_status = v.account_status
    }
    if (v.badge !== (u.badge || 'bronze')) payload.badge = v.badge

    const baseSusp =
      u.account_suspended_until != null
        ? String(u.account_suspended_until).slice(0, 16)
        : ''
    if (
      permissions.utilisateursEdit &&
      (v.suspended_until || '') !== (baseSusp || '')
    ) {
      if (!v.suspended_until) {
        payload.account_suspended_until = null
      } else {
        const d = new Date(v.suspended_until)
        payload.account_suspended_until = Number.isNaN(d.getTime())
          ? null
          : d.toISOString()
      }
    }

    if (v.roleEquipe !== baseRole) {
      if (
        baseRole === 'super_admin' &&
        v.roleEquipe !== 'super_admin' &&
        !permissions.utilisateursAssignSuper
      ) {
        return showToast('error', 'Seul un super admin peut modifier le rôle d’un super admin.')
      }
      if (v.roleEquipe === 'super_admin' && !permissions.utilisateursAssignSuper) {
        return showToast('error', 'Seul un super admin peut attribuer ce rôle.')
      }
      if (v.roleEquipe === 'admin' && !permissions.utilisateursAssignAdmin) {
        return showToast('error', 'Vous ne pouvez pas attribuer le rôle administrateur.')
      }
      if (
        ['moderator', 'annonce_manager', ''].includes(v.roleEquipe) &&
        !permissions.utilisateursAssignLowerRoles
      ) {
        return showToast('error', 'Vous ne pouvez pas modifier ces rôles.')
      }
      if (v.roleEquipe === '') {
        payload.is_admin = false
        payload.admin_role = null
      } else if (v.roleEquipe === 'moderator') {
        payload.is_admin = true
        payload.admin_role = 'moderator'
      } else if (v.roleEquipe === 'admin') {
        payload.is_admin = true
        payload.admin_role = 'admin'
      } else if (v.roleEquipe === 'annonce_manager') {
        payload.is_admin = true
        payload.admin_role = 'annonce_manager'
      } else if (v.roleEquipe === 'super_admin') {
        payload.is_admin = true
        payload.admin_role = 'super_admin'
      }
    }
    if (Object.keys(payload).length === 0) return
    setSauvegardeProfilId(u.id)
    try {
      await updateProfileField(u.id, payload)
    } catch (e) {
      setSauvegardeProfilId(null)
      return showToast('error', 'Erreur : ' + (e?.message || e))
    }
    const prevCompte = u.account_status || 'en_attente'
    if (payload.account_status === 'active' && prevCompte !== 'active') {
      void notifierEquipeEvent('compte_verifie', { cibleUserId: u.id })
    }
    showToast('success', 'Profil enregistré.')
    setUtilisateurs((prev) => prev.map((x) => (x.id === u.id ? { ...x, ...payload } : x)))
    setProfilModifs((prev) => {
      const next = { ...prev }
      delete next[u.id]
      return next
    })
    setSauvegardeProfilId(null)
  }

  // ── Filtres recherche ─────────────────────────────────────────────────────────

  const qRecherche = recherche.trim().toLowerCase()

  const annoncesFiltrees = useMemo(() => {
    return annonces.filter((a) => {
      if (filtreAnnonceStatut && (a.statut || '') !== filtreAnnonceStatut) return false
      if (filtreAnnonceType && String(a.type || '') !== filtreAnnonceType) return false
      if (filtreAnnonceBadge && (a.badge || 'bronze') !== filtreAnnonceBadge) return false
      if (!qRecherche) return true
      return (
        a.titre?.toLowerCase().includes(qRecherche) ||
        a.quartier?.toLowerCase().includes(qRecherche) ||
        a.profiles?.nom?.toLowerCase().includes(qRecherche) ||
        String(a.id).toLowerCase().includes(qRecherche)
      )
    })
  }, [annonces, qRecherche, filtreAnnonceStatut, filtreAnnonceType, filtreAnnonceBadge])

  const utilisateursFiltres = useMemo(() => {
    return utilisateurs.filter((u) => {
      if (filtreUserStatut && (u.account_status || '') !== filtreUserStatut) return false
      if (filtreUserBadge && (u.badge || 'bronze') !== filtreUserBadge) return false
      if (filtreUserType && String(u.type || '') !== filtreUserType) return false
      if (filtreUserStaff === 'staff' && !u.is_admin) return false
      if (filtreUserStaff === 'public' && u.is_admin) return false
      const em = filtreUserEmail.trim().toLowerCase()
      if (em && !(u.email || '').toLowerCase().includes(em)) return false
      if (!qRecherche) return true
      return (
        u.nom?.toLowerCase().includes(qRecherche) ||
        u.quartier?.toLowerCase().includes(qRecherche) ||
        (u.email || '').toLowerCase().includes(qRecherche) ||
        String(u.id).toLowerCase().includes(qRecherche)
      )
    })
  }, [
    utilisateurs,
    qRecherche,
    filtreUserStatut,
    filtreUserBadge,
    filtreUserType,
    filtreUserStaff,
    filtreUserEmail,
  ])

  const signalementsFiltres = useMemo(() => {
    return signalements.filter((s) => {
      if (filtreSignalementStatut && (s.statut || 'en_attente') !== filtreSignalementStatut) {
        return false
      }
      if (!qRecherche) return true
      return (
        (s.motif && s.motif.toLowerCase().includes(qRecherche)) ||
        (s.annonce_titre && s.annonce_titre.toLowerCase().includes(qRecherche)) ||
        (s.profiles?.nom && s.profiles.nom.toLowerCase().includes(qRecherche))
      )
    })
  }, [signalements, qRecherche, filtreSignalementStatut])

  const demandesBadgeFiltrees = useMemo(() => {
    return demandesBadge.filter((d) => {
      if (filtreDemandeBadgeStatut && (d.statut || 'en_attente') !== filtreDemandeBadgeStatut) {
        return false
      }
      if (!qRecherche) return true
      const qTel = recherche.trim()
      return (
        (d.nom && d.nom.toLowerCase().includes(qRecherche)) ||
        (d.telephone && qTel && d.telephone.includes(qTel)) ||
        (d.badge_demande && d.badge_demande.toLowerCase().includes(qRecherche)) ||
        (d.annonce_titre && d.annonce_titre.toLowerCase().includes(qRecherche)) ||
        (d.profiles?.nom && d.profiles.nom.toLowerCase().includes(qRecherche))
      )
    })
  }, [demandesBadge, qRecherche, filtreDemandeBadgeStatut, recherche])

  const avisFiltres = useMemo(() => {
    return avisList.filter((a) => {
      if (filtreAvisVisibilite === 'visible' && a.is_hidden) return false
      if (filtreAvisVisibilite === 'masque' && !a.is_hidden) return false
      if (!qRecherche) return true
      return (
        (a.commentaire && a.commentaire.toLowerCase().includes(qRecherche)) ||
        (a.auteur_nom && a.auteur_nom.toLowerCase().includes(qRecherche)) ||
        (a.annonce_titre && a.annonce_titre.toLowerCase().includes(qRecherche))
      )
    })
  }, [avisList, qRecherche, filtreAvisVisibilite])

  const logsFiltres = useMemo(() => {
    return moderationLogs.filter((l) => {
      if (filtreLogAction && (l.action || '') !== filtreLogAction) return false
      if (!qRecherche) return true
      return (
        (l.annonce_titre && l.annonce_titre.toLowerCase().includes(qRecherche)) ||
        (l.moderateur_nom && l.moderateur_nom.toLowerCase().includes(qRecherche)) ||
        (l.reason && l.reason.toLowerCase().includes(qRecherche))
      )
    })
  }, [moderationLogs, qRecherche, filtreLogAction])

  const featureFlagsFiltres = useMemo(() => {
    return featureFlags.filter((f) => {
      if (!qRecherche) return true
      return f.key && f.key.toLowerCase().includes(qRecherche)
    })
  }, [featureFlags, qRecherche])

  const messagesContactFiltres = useMemo(() => {
    return messagesContact.filter((m) => {
      const st = m.statut || 'nouveau'
      if (filtreContactStatut && st !== filtreContactStatut) return false
      if (!qRecherche) return true
      return (
        (m.nom && m.nom.toLowerCase().includes(qRecherche)) ||
        (m.email && m.email.toLowerCase().includes(qRecherche)) ||
        (m.sujet && m.sujet.toLowerCase().includes(qRecherche)) ||
        (m.message && m.message.toLowerCase().includes(qRecherche)) ||
        (m.note_interne && m.note_interne.toLowerCase().includes(qRecherche))
      )
    })
  }, [messagesContact, qRecherche, filtreContactStatut])

  const typesAnnonceUniques = useMemo(() => {
    const s = new Set()
    annonces.forEach((a) => {
      if (a?.type) s.add(String(a.type))
    })
    return [...s].sort()
  }, [annonces])

  const typesProfilUniques = useMemo(() => {
    const s = new Set()
    utilisateurs.forEach((u) => {
      if (u?.type) s.add(String(u.type))
    })
    return [...s].sort()
  }, [utilisateurs])

  const recentsAnnonces = useMemo(() => {
    return [...annonces]
      .sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0
        return tb - ta
      })
      .slice(0, 8)
  }, [annonces])

  const recentsUtilisateurs = useMemo(() => {
    return [...utilisateurs]
      .sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0
        return tb - ta
      })
      .slice(0, 8)
  }, [utilisateurs])

  const recentsAvis = useMemo(() => {
    return [...avisList]
      .sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0
        return tb - ta
      })
      .slice(0, 6)
  }, [avisList])

  const showRoleCol =
    permissions.utilisateursAssignSuper ||
    permissions.utilisateursAssignAdmin ||
    permissions.utilisateursAssignLowerRoles

  const fusionnerProfils = async () => {
    if (!permissions.fusionProfils) return
    if (!mergeSource || !mergeTarget || mergeSource === mergeTarget) {
      return showToast('error', 'Choisissez deux comptes distincts (source → cible).')
    }
    setFusionEnCours(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        showToast('error', 'Session expirée.')
        return
      }
      const r = await fetch('/api/admin/merge-profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ sourceUserId: mergeSource, targetUserId: mergeTarget }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) {
        showToast('error', j.error || 'Fusion refusée')
        return
      }
      showToast('success', j.message || 'Fusion effectuée.')
      setMergeSource('')
      setMergeTarget('')
      const [list, ann] = await Promise.all([fetchAllProfiles(), fetchAllAnnoncesAdmin()])
      list.sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0
        return tb - ta
      })
      setUtilisateurs(list)
      setAnnonces(ann)
    } catch (e) {
      showToast('error', e?.message || String(e))
    } finally {
      setFusionEnCours(false)
    }
  }

  const appliquerBulkAnnonces = async () => {
    if (!permissions.selectionGroupéeAnnonces) return
    if (selAnnonces.size === 0) return showToast('error', 'Sélectionnez des annonces.')
    setBulkEnCours(true)
    try {
      for (const id of selAnnonces) {
        const payload = { statut: bulkAnnonceStatut }
        if (permissions.annoncesEditBadge) payload.badge = bulkAnnonceBadge
        await updateAnnonce(id, payload)
      }
      setAnnonces((prev) =>
        prev.map((x) =>
          selAnnonces.has(x.id)
            ? {
                ...x,
                statut: bulkAnnonceStatut,
                ...(permissions.annoncesEditBadge ? { badge: bulkAnnonceBadge } : {}),
              }
            : x
        )
      )
      setSelAnnonces(new Set())
      setAnnonceModifs({})
      showToast('success', 'Annonces mises à jour en masse.')
    } catch (e) {
      showToast('error', e?.message || String(e))
    } finally {
      setBulkEnCours(false)
    }
  }

  const appliquerBulkUtilisateurs = async () => {
    if (!permissions.selectionGroupéeUtilisateurs || !permissions.utilisateursEdit) return
    if (selUsers.size === 0) return showToast('error', 'Sélectionnez des utilisateurs.')
    setBulkEnCours(true)
    try {
      for (const id of selUsers) {
        await updateProfileField(id, { account_status: bulkUserStatut, badge: bulkUserBadge })
      }
      setUtilisateurs((prev) =>
        prev.map((x) =>
          selUsers.has(x.id) ? { ...x, account_status: bulkUserStatut, badge: bulkUserBadge } : x
        )
      )
      setProfilModifs({})
      setSelUsers(new Set())
      showToast('success', 'Profils mis à jour en masse.')
    } catch (e) {
      showToast('error', e?.message || String(e))
    } finally {
      setBulkEnCours(false)
    }
  }

  const appliquerBulkSignalements = async () => {
    if (!permissions.selectionGroupéeModerationContenu) return
    if (selSignalements.size === 0) return showToast('error', 'Sélectionnez des signalements.')
    setBulkEnCours(true)
    try {
      for (const id of selSignalements) {
        await updateSignalement(id, { statut: bulkSigStatut })
      }
      setSignalements((prev) =>
        prev.map((s) => (selSignalements.has(s.id) ? { ...s, statut: bulkSigStatut } : s))
      )
      setSelSignalements(new Set())
      showToast('success', 'Statuts de signalements mis à jour.')
    } catch (e) {
      showToast('error', e?.message || String(e))
    } finally {
      setBulkEnCours(false)
    }
  }

  const appliquerBulkDemandesBadge = async () => {
    if (!permissions.selectionGroupéeModerationContenu) return
    if (selDemandes.size === 0) return showToast('error', 'Sélectionnez des demandes.')
    setBulkEnCours(true)
    try {
      for (const id of selDemandes) {
        await updateDemandeBadge(id, { statut: bulkDemandeStatut })
      }
      setDemandesBadge((prev) =>
        prev.map((d) => (selDemandes.has(d.id) ? { ...d, statut: bulkDemandeStatut } : d))
      )
      setSelDemandes(new Set())
      showToast('success', 'Statuts des demandes badge mis à jour.')
    } catch (e) {
      showToast('error', e?.message || String(e))
    } finally {
      setBulkEnCours(false)
    }
  }

  const appliquerBulkMessagesContact = async () => {
    if (!permissions.selectionGroupéeMessagerie || !adminUid) return
    if (selMessagesContact.size === 0) return showToast('error', 'Sélectionnez des messages.')
    setBulkEnCours(true)
    try {
      for (const id of selMessagesContact) {
        const fields =
          bulkContactStatut === 'traite'
            ? { statut: bulkContactStatut, traite_le: new Date().toISOString(), traite_par: adminUid }
            : { statut: bulkContactStatut, traite_le: null, traite_par: null }
        await updateContactMessageAdmin(id, fields)
      }
      setMessagesContact((prev) =>
        prev.map((x) => {
          if (!selMessagesContact.has(x.id)) return x
          if (bulkContactStatut === 'traite') {
            return {
              ...x,
              statut: bulkContactStatut,
              traite_le: new Date().toISOString(),
              traite_par: adminUid,
            }
          }
          return { ...x, statut: bulkContactStatut, traite_le: null, traite_par: null }
        })
      )
      setSelMessagesContact(new Set())
      showToast('success', 'Statuts des messages mis à jour.')
    } catch (e) {
      showToast('error', e?.message || String(e))
    } finally {
      setBulkEnCours(false)
    }
  }

  // ── Stats ────────────────────────────────────────────────────────────────────

  const statsNouveauxContact = messagesContact.filter(
    (m) => !m.statut || m.statut === 'nouveau'
  ).length

  const stats = !permissions.voirOngletUtilisateurs
    ? [
        { label: 'Annonces', valeur: annonces.length, emoji: '🏠' },
        { label: 'À valider', valeur: annonces.filter((a) => a.statut === 'en_verification').length, emoji: '🔍' },
        { label: 'Actives', valeur: annonces.filter((a) => a.statut === 'actif').length, emoji: '✅' },
        ...(permissions.voirOngletMessagerieContact
          ? [
              {
                label: 'Msg. contact (nouveaux)',
                valeur: statsNouveauxContact,
                emoji: '📩',
              },
            ]
          : []),
        ...(permissions.voirOngletSignalements
          ? [
              {
                label: 'Signalements (nouveaux)',
                valeur: signalements.filter((s) => (s.statut || 'en_attente') === 'en_attente').length,
                emoji: '🚩',
              },
            ]
          : []),
        ...(permissions.voirOngletBadges
          ? [
              {
                label: 'Demandes badge (attente)',
                valeur: demandesBadge.filter((d) => (d.statut || 'en_attente') === 'en_attente').length,
                emoji: '🏅',
              },
            ]
          : []),
      ]
    : [
        { label: 'Annonces', valeur: annonces.length, emoji: '🏠' },
        { label: 'À valider', valeur: annonces.filter((a) => a.statut === 'en_verification').length, emoji: '🔍' },
        { label: 'Actives', valeur: annonces.filter((a) => a.statut === 'actif').length, emoji: '✅' },
        { label: 'Utilisateurs', valeur: utilisateurs.length, emoji: '👤', needUsers: true },
        { label: 'Bannis', valeur: utilisateurs.filter((u) => u.account_status === 'banned').length, emoji: '🚫', needUsers: true },
        ...(permissions.voirOngletMessagerieContact
          ? [
              {
                label: 'Msg. contact (nouveaux)',
                valeur: statsNouveauxContact,
                emoji: '📩',
              },
            ]
          : []),
        { label: 'Badges Or', valeur: annonces.filter((a) => a.badge === 'or').length, emoji: '🥇' },
        ...(permissions.voirOngletSignalements
          ? [
              {
                label: 'Signalements (nouveaux)',
                valeur: signalements.filter((s) => (s.statut || 'en_attente') === 'en_attente').length,
                emoji: '🚩',
              },
            ]
          : []),
        ...(permissions.voirOngletBadges
          ? [
              {
                label: 'Demandes badge (attente)',
                valeur: demandesBadge.filter((d) => (d.statut || 'en_attente') === 'en_attente').length,
                emoji: '🏅',
              },
            ]
          : []),
      ]

  // ── Render ────────────────────────────────────────────────────────────────────

  if (chargement) return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <div className="text-[#1B5E20] font-bold text-lg">Vérification des accès…</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/90 via-slate-50 to-slate-100">
      <SiteHeader />

      <div className="bg-indigo-950 text-white px-4 py-3 flex flex-wrap items-center gap-2 border-b border-indigo-800/80 shadow-sm">
        <span className="text-cyan-300 font-bold text-sm shrink-0 tracking-tight">🛡️ PORTAIL STAFF</span>
        <span className="text-indigo-200/90 text-xs">
          Connecté en <strong className="text-white">{roleLabel}</strong>
          {' · '}
          Super admin = contrôle total · Admin = gestion étendue · Modérateur = contenu & signalements ·
          Gestionnaire = annonces
        </span>
      </div>

      <div className="flex flex-col lg:flex-row max-w-[1600px] mx-auto min-h-[calc(100vh-8rem)]">
        <aside className="hidden lg:flex w-56 shrink-0 bg-indigo-950 text-indigo-100 flex-col p-3 gap-1 border-r border-indigo-900/80">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 px-2 mb-1">Sections</p>
          {ongletsVisibles.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => naviguerOnglet(o.id)}
              className={`text-left text-sm font-semibold rounded-lg px-3 py-2 transition-colors ${
                onglet === o.id ? 'bg-teal-600 text-white shadow-md' : 'hover:bg-indigo-900/70'
              }`}
            >
              {o.label}
            </button>
          ))}
        </aside>

        <div className="flex-1 py-6 px-4 md:px-6">

        <h1 className="text-2xl font-bold text-indigo-950 mb-1">Pilotage plateforme</h1>
        <p className="text-slate-600 text-sm mb-6">
          Chez Moi CI — outils avancés réservés au personnel habilité
        </p>

        {/* STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-8">
          {stats.map(s => (
            <div key={s.label} className="bg-white/95 rounded-xl p-3 sm:p-4 shadow-sm border border-indigo-100/80 text-center min-w-0">
              <div className="text-2xl mb-1">{s.emoji}</div>
              <div className="text-2xl font-bold text-teal-700">
                {s.needUsers && !utilisateurs.length ? '—' : s.valeur}
              </div>
              <div className="text-gray-500 text-[10px] sm:text-xs leading-tight break-words px-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ONGLETS + RECHERCHE */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div className="flex lg:hidden gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 max-w-full min-w-0">
            {ongletsVisibles.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => naviguerOnglet(o.id)}
                className={`shrink-0 px-3 sm:px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                  onglet === o.id
                    ? 'bg-teal-600 text-white shadow'
                    : 'bg-white text-slate-600 border border-indigo-100 hover:bg-indigo-50/80'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {onglet !== 'dashboard' && (
            <input
              type="text"
              placeholder={
                onglet === 'annonces'
                  ? 'Rechercher une annonce…'
                  : onglet === 'avis'
                    ? 'Avis, auteur, annonce…'
                    : onglet === 'historique_moderation'
                      ? 'Annonce, modérateur, motif…'
                    : onglet === 'utilisateurs'
                      ? 'Rechercher un utilisateur…'
                      : onglet === 'signalements'
                        ? 'Motif, annonce, signalant…'
                        : onglet === 'messagerie_contact'
                          ? 'Nom, e-mail, sujet, message…'
                          : onglet === 'feature_flags'
                            ? 'Clé de paramètre…'
                            : 'Nom, téléphone, niveau, annonce…'
              }
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="border border-indigo-100 rounded-lg px-3 py-2 text-sm w-full sm:max-w-md lg:ml-auto focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 bg-white"
            />
          )}
        </div>

        {onglet === 'dashboard' && (
          <div className="space-y-6 mb-8">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white/95 rounded-xl border border-indigo-100 p-4 shadow-sm">
                <h2 className="font-bold text-indigo-950 mb-3 text-sm uppercase tracking-wide">
                  Annonces récentes
                </h2>
                <ul className="space-y-2 text-sm">
                  {recentsAnnonces.length === 0 && (
                    <li className="text-slate-400">Aucune annonce chargée.</li>
                  )}
                  {recentsAnnonces.map((a) => (
                    <li
                      key={a.id}
                      className="flex justify-between gap-2 border-b border-slate-100 pb-2"
                    >
                      <span className="truncate text-slate-800">{a.titre}</span>
                      <span className="text-xs text-slate-500 shrink-0">
                        {a.created_at
                          ? new Date(a.created_at).toLocaleDateString('fr-FR')
                          : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => naviguerOnglet('annonces')}
                  className="mt-3 text-xs font-bold text-teal-700 hover:underline"
                >
                  Voir toutes les annonces →
                </button>
              </div>
              {permissions.voirOngletUtilisateurs && (
                <div className="bg-white/95 rounded-xl border border-indigo-100 p-4 shadow-sm">
                  <h2 className="font-bold text-indigo-950 mb-3 text-sm uppercase tracking-wide">
                    Comptes récents
                  </h2>
                  <ul className="space-y-2 text-sm">
                    {recentsUtilisateurs.length === 0 && (
                      <li className="text-slate-400">Aucun profil chargé.</li>
                    )}
                    {recentsUtilisateurs.map((u) => (
                      <li
                        key={u.id}
                        className="flex justify-between gap-2 border-b border-slate-100 pb-2"
                      >
                        <span className="truncate text-slate-800">
                          {u.nom || u.email || u.id}
                        </span>
                        <span className="text-xs text-slate-500 shrink-0">
                          {u.created_at
                            ? new Date(u.created_at).toLocaleDateString('fr-FR')
                            : '—'}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => naviguerOnglet('utilisateurs')}
                    className="mt-3 text-xs font-bold text-teal-700 hover:underline"
                  >
                    Gérer les utilisateurs →
                  </button>
                </div>
              )}
            </div>
            {permissions.voirOngletAvis && recentsAvis.length > 0 && (
              <div className="bg-white/95 rounded-xl border border-indigo-100 p-4 shadow-sm">
                <h2 className="font-bold text-indigo-950 mb-3 text-sm uppercase tracking-wide">
                  Avis récents
                </h2>
                <div className="flex flex-wrap gap-2">
                  {recentsAvis.map((a) => (
                    <div
                      key={a.id}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 max-w-full"
                    >
                      <span className="font-bold text-amber-600">
                        {'★'.repeat(Math.min(5, Math.max(0, a.note || 0)))}
                      </span>
                      <span className="text-slate-600 ml-1">
                        {(a.annonce_titre || a.id || '').toString().slice(0, 48)}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => naviguerOnglet('avis')}
                  className="mt-3 text-xs font-bold text-teal-700 hover:underline"
                >
                  Modérer les avis →
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {permissions.voirOngletSignalements && (
                <button
                  type="button"
                  onClick={() => naviguerOnglet('signalements')}
                  className="text-xs font-bold px-3 py-2 rounded-lg bg-white border border-indigo-200 text-indigo-900 hover:bg-indigo-50"
                >
                  Signalements
                </button>
              )}
              {permissions.voirOngletMessagerieContact && (
                <button
                  type="button"
                  onClick={() => naviguerOnglet('messagerie_contact')}
                  className="text-xs font-bold px-3 py-2 rounded-lg bg-white border border-indigo-200 text-indigo-900 hover:bg-indigo-50"
                >
                  Messages contact
                </button>
              )}
              {permissions.voirOngletFeatureFlags && (
                <button
                  type="button"
                  onClick={() => naviguerOnglet('feature_flags')}
                  className="text-xs font-bold px-3 py-2 rounded-lg bg-white border border-indigo-200 text-indigo-900 hover:bg-indigo-50"
                >
                  Fonctionnalités (flags)
                </button>
              )}
              {permissions.voirOngletBadges && (
                <button
                  type="button"
                  onClick={() => naviguerOnglet('demandes_badge')}
                  className="text-xs font-bold px-3 py-2 rounded-lg bg-white border border-indigo-200 text-indigo-900 hover:bg-indigo-50"
                >
                  Demandes badge
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── ONGLET ANNONCES ── */}
        {onglet === 'annonces' && (
          <div className="space-y-3">
            <div className="flex flex-col gap-3 bg-white/95 border border-indigo-100 rounded-xl p-4 shadow-sm">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-bold text-slate-500 uppercase">Filtres</span>
                <select
                  value={filtreAnnonceStatut}
                  onChange={(e) => setFiltreAnnonceStatut(e.target.value)}
                  className="text-xs border rounded-lg px-2 py-1.5 border-slate-200 bg-white"
                >
                  <option value="">Statut (tous)</option>
                  {STATUT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <select
                  value={filtreAnnonceType}
                  onChange={(e) => setFiltreAnnonceType(e.target.value)}
                  className="text-xs border rounded-lg px-2 py-1.5 border-slate-200 bg-white"
                >
                  <option value="">Type (tous)</option>
                  {typesAnnonceUniques.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <select
                  value={filtreAnnonceBadge}
                  onChange={(e) => setFiltreAnnonceBadge(e.target.value)}
                  className="text-xs border rounded-lg px-2 py-1.5 border-slate-200 bg-white"
                >
                  <option value="">Badge (tous)</option>
                  {BADGE_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {BADGE_LABEL[b]}
                    </option>
                  ))}
                </select>
              </div>
              {permissions.peutExporterDonnees && (
                <div className="flex flex-wrap gap-2 items-center border-t border-slate-100 pt-3">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    Export (résultats filtrés)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      telechargerCsv(
                        'annonces_admin',
                        [
                          { key: 'id', label: 'id' },
                          { key: 'titre', label: 'titre' },
                          { key: 'statut', label: 'statut' },
                          { key: 'type', label: 'type' },
                          { key: 'badge', label: 'badge' },
                          { key: 'quartier', label: 'quartier' },
                          { key: 'prix', label: 'prix' },
                          { key: 'proprietaire', label: 'proprietaire' },
                        ],
                        annoncesFiltrees.map((a) => ({
                          id: a.id,
                          titre: a.titre,
                          statut: a.statut,
                          type: a.type,
                          badge: a.badge,
                          quartier: a.quartier,
                          prix: a.prix,
                          proprietaire: a.profiles?.nom || '',
                        }))
                      )
                    }
                    className="text-xs font-bold px-2 py-1.5 rounded-lg border border-teal-600 text-teal-700 hover:bg-teal-50"
                  >
                    CSV / Excel
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      ouvrirImpressionPdfListe(
                        'Annonces',
                        ['id', 'titre', 'statut', 'type', 'badge'],
                        annoncesFiltrees.map((a) => [
                          a.id,
                          a.titre,
                          a.statut,
                          a.type,
                          a.badge,
                        ])
                      )
                    }
                    className="text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    PDF (impression)
                  </button>
                </div>
              )}
              {permissions.selectionGroupéeAnnonces && (
                <div className="flex flex-wrap gap-2 items-end border-t border-slate-100 pt-3">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    Sélection ({selAnnonces.size})
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelAnnonces(new Set(annoncesFiltrees.map((x) => x.id)))}
                    className="text-xs font-bold px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                  >
                    Tout (filtré)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelAnnonces(new Set())}
                    className="text-xs font-bold px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                  >
                    Effacer
                  </button>
                  <select
                    value={bulkAnnonceStatut}
                    onChange={(e) => setBulkAnnonceStatut(e.target.value)}
                    className="text-xs border rounded-lg px-2 py-1 bg-white"
                  >
                    {STATUT_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  {permissions.annoncesEditBadge && (
                    <select
                      value={bulkAnnonceBadge}
                      onChange={(e) => setBulkAnnonceBadge(e.target.value)}
                      className="text-xs border rounded-lg px-2 py-1 bg-white"
                    >
                      {BADGE_OPTIONS.map((b) => (
                        <option key={b} value={b}>
                          {BADGE_LABEL[b]}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    disabled={bulkEnCours}
                    onClick={appliquerBulkAnnonces}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-teal-600 text-white disabled:opacity-50"
                  >
                    Appliquer à la sélection
                  </button>
                </div>
              )}
            </div>
            {annoncesFiltrees.length === 0 && (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-100">
                Aucune annonce trouvée.
              </div>
            )}
            {annoncesFiltrees.map(a => (
              <div key={a.id} className="bg-white rounded-xl p-4 shadow-sm border border-indigo-100/80">
                <div className="flex items-center gap-3 sm:gap-4">
                  {permissions.selectionGroupéeAnnonces && (
                    <input
                      type="checkbox"
                      checked={selAnnonces.has(a.id)}
                      onChange={() => {
                        setSelAnnonces((prev) => {
                          const n = new Set(prev)
                          if (n.has(a.id)) n.delete(a.id)
                          else n.add(a.id)
                          return n
                        })
                      }}
                      className="w-4 h-4 accent-teal-600 shrink-0"
                      aria-label={`Sélectionner annonce ${a.titre}`}
                    />
                  )}
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
                        a.statut === 'en_verification' ? 'bg-amber-100 text-amber-800' :
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
                    {permissions.annoncesEditBadge && (
                      <select
                        value={valeurBadgeAnnonce(a)}
                        onChange={(e) => setBrouillonAnnonce(a.id, { badge: e.target.value })}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1B5E20]"
                      >
                        {BADGE_OPTIONS.map((b) => (
                          <option key={b} value={b}>
                            {BADGE_LABEL[b]}
                          </option>
                        ))}
                      </select>
                    )}

                    <select
                      value={valeurStatutAnnonce(a)}
                      onChange={(e) => setBrouillonAnnonce(a.id, { statut: e.target.value })}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1B5E20]"
                    >
                      {STATUT_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={!annonceADesModifs(a) || sauvegardeAnnonceId === a.id}
                      onClick={() => enregistrerModifsAnnonce(a)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg border border-[#1B5E20] text-[#1B5E20] hover:bg-[#E8F5E9] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {sauvegardeAnnonceId === a.id ? 'Enregistrement…' : 'Enregistrer'}
                    </button>

                    <a
                      href={`/annonces/${a.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#1B5E20] text-xs font-bold border border-[#1B5E20] px-3 py-1.5 rounded-lg hover:bg-[#E8F5E9]"
                    >
                      Voir
                    </a>

                    {(permissions.annoncesEditPhotos || permissions.annoncesClearFields) && (
                      <button
                        type="button"
                        onClick={() => setAnnonceDetailModal(a)}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                      >
                        Médias & champs
                      </button>
                    )}

                    {permissions.annoncesDelete && (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmAction({ type: 'deleteAnnonce', id: a.id, label: a.titre })
                        }
                        className="text-xs font-bold px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ONGLET SIGNALEMENTS ── */}
        {onglet === 'signalements' && (
          <div className="space-y-3">
            <div className="flex flex-col gap-3 bg-white/95 border border-indigo-100 rounded-xl p-4 shadow-sm">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-bold text-slate-500 uppercase">Filtres</span>
                <select
                  value={filtreSignalementStatut}
                  onChange={(e) => setFiltreSignalementStatut(e.target.value)}
                  className="text-xs border rounded-lg px-2 py-1.5 border-slate-200 bg-white"
                >
                  <option value="">Statut (tous)</option>
                  {STATUT_SIGNALEMENT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              {permissions.peutExporterDonnees && (
                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() =>
                      telechargerCsv(
                        'signalements_admin',
                        [
                          { key: 'id', label: 'id' },
                          { key: 'motif', label: 'motif' },
                          { key: 'statut', label: 'statut' },
                          { key: 'annonce', label: 'annonce' },
                          { key: 'signalant', label: 'signalant' },
                          { key: 'created_at', label: 'cree_le' },
                        ],
                        signalementsFiltres.map((s) => ({
                          id: s.id,
                          motif: s.motif,
                          statut: s.statut,
                          annonce: s.annonce_titre || s.annonce_id,
                          signalant: s.profiles?.nom || s.signalant_uid,
                          created_at: s.created_at,
                        }))
                      )
                    }
                    className="text-xs font-bold px-2 py-1.5 rounded-lg border border-teal-600 text-teal-700 hover:bg-teal-50"
                  >
                    CSV / Excel
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      ouvrirImpressionPdfListe(
                        'Signalements',
                        ['motif', 'statut', 'annonce'],
                        signalementsFiltres.map((s) => [
                          s.motif,
                          s.statut,
                          s.annonce_titre || s.annonce_id,
                        ])
                      )
                    }
                    className="text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    PDF (impression)
                  </button>
                </div>
              )}
              {permissions.selectionGroupéeModerationContenu && (
                <div className="flex flex-wrap gap-2 items-end border-t border-slate-100 pt-3">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    Sélection ({selSignalements.size})
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelSignalements(new Set(signalementsFiltres.map((x) => x.id)))}
                    className="text-xs font-bold px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                  >
                    Tout (filtré)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelSignalements(new Set())}
                    className="text-xs font-bold px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                  >
                    Effacer
                  </button>
                  <select
                    value={bulkSigStatut}
                    onChange={(e) => setBulkSigStatut(e.target.value)}
                    className="text-xs border rounded-lg px-2 py-1 bg-white"
                  >
                    {STATUT_SIGNALEMENT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={bulkEnCours}
                    onClick={appliquerBulkSignalements}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-teal-600 text-white disabled:opacity-50"
                  >
                    Appliquer à la sélection
                  </button>
                </div>
              )}
            </div>
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
                  {permissions.selectionGroupéeModerationContenu && (
                    <input
                      type="checkbox"
                      checked={selSignalements.has(s.id)}
                      onChange={() => {
                        setSelSignalements((prev) => {
                          const n = new Set(prev)
                          if (n.has(s.id)) n.delete(s.id)
                          else n.add(s.id)
                          return n
                        })
                      }}
                      className="w-4 h-4 accent-teal-600 shrink-0 mt-1"
                      aria-label="Sélectionner signalement"
                    />
                  )}
                  <div className="min-w-0 flex-1">
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
            <div className="flex flex-col gap-3 bg-white/95 border border-indigo-100 rounded-xl p-4 shadow-sm">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-bold text-slate-500 uppercase">Filtres</span>
                <select
                  value={filtreDemandeBadgeStatut}
                  onChange={(e) => setFiltreDemandeBadgeStatut(e.target.value)}
                  className="text-xs border rounded-lg px-2 py-1.5 border-slate-200 bg-white"
                >
                  <option value="">Statut (tous)</option>
                  {STATUT_DEMANDE_BADGE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              {permissions.peutExporterDonnees && (
                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() =>
                      telechargerCsv(
                        'demandes_badge_admin',
                        [
                          { key: 'id', label: 'id' },
                          { key: 'nom', label: 'nom' },
                          { key: 'telephone', label: 'telephone' },
                          { key: 'badge_demande', label: 'badge_demande' },
                          { key: 'statut', label: 'statut' },
                          { key: 'annonce', label: 'annonce' },
                          { key: 'created_at', label: 'cree_le' },
                        ],
                        demandesBadgeFiltrees.map((d) => ({
                          id: d.id,
                          nom: d.nom,
                          telephone: d.telephone,
                          badge_demande: d.badge_demande,
                          statut: d.statut,
                          annonce: d.annonce_titre || d.annonce_id,
                          created_at: d.created_at,
                        }))
                      )
                    }
                    className="text-xs font-bold px-2 py-1.5 rounded-lg border border-teal-600 text-teal-700 hover:bg-teal-50"
                  >
                    CSV / Excel
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      ouvrirImpressionPdfListe(
                        'Demandes badge',
                        ['nom', 'telephone', 'badge', 'statut'],
                        demandesBadgeFiltrees.map((d) => [
                          d.nom,
                          d.telephone,
                          d.badge_demande,
                          d.statut,
                        ])
                      )
                    }
                    className="text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    PDF (impression)
                  </button>
                </div>
              )}
              {permissions.selectionGroupéeModerationContenu && (
                <div className="flex flex-wrap gap-2 items-end border-t border-slate-100 pt-3">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    Sélection ({selDemandes.size})
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelDemandes(new Set(demandesBadgeFiltrees.map((x) => x.id)))}
                    className="text-xs font-bold px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                  >
                    Tout (filtré)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelDemandes(new Set())}
                    className="text-xs font-bold px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                  >
                    Effacer
                  </button>
                  <select
                    value={bulkDemandeStatut}
                    onChange={(e) => setBulkDemandeStatut(e.target.value)}
                    className="text-xs border rounded-lg px-2 py-1 bg-white"
                  >
                    {STATUT_DEMANDE_BADGE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={bulkEnCours}
                    onClick={appliquerBulkDemandesBadge}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-teal-600 text-white disabled:opacity-50"
                  >
                    Appliquer à la sélection
                  </button>
                </div>
              )}
            </div>
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
                  {permissions.selectionGroupéeModerationContenu && (
                    <input
                      type="checkbox"
                      checked={selDemandes.has(d.id)}
                      onChange={() => {
                        setSelDemandes((prev) => {
                          const n = new Set(prev)
                          if (n.has(d.id)) n.delete(d.id)
                          else n.add(d.id)
                          return n
                        })
                      }}
                      className="w-4 h-4 accent-teal-600 shrink-0 mt-1"
                      aria-label="Sélectionner demande badge"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-800">
                      {d.nom} — {d.telephone}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Niveau : <span className="font-bold">{d.badge_demande}</span>
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
                    {d.notes && (
                      <p className="text-gray-600 text-sm mt-2 whitespace-pre-wrap">
                        {d.notes}
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

        {onglet === 'messagerie_contact' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
              Messages issus du formulaire <strong>/contact</strong> (support, partenariats,{' '}
              <strong>candidatures</strong> depuis /carriere). Pour répondre, utilisez votre client mail
              (bouton ci-dessous) ou copiez l’adresse. Les <strong>notifications</strong> in-app
              (cloche utilisateur) restent dans la table <code className="text-xs bg-white px-1 rounded">notifications</code>{' '}
              — elles ne sont pas listées ici.
            </p>
            <div className="flex flex-col gap-3 bg-white/95 border border-indigo-100 rounded-xl p-4 shadow-sm">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-bold text-slate-500 uppercase">Filtres</span>
                <select
                  value={filtreContactStatut}
                  onChange={(e) => setFiltreContactStatut(e.target.value)}
                  className="text-xs border rounded-lg px-2 py-1.5 border-slate-200 bg-white"
                >
                  <option value="">Statut (tous)</option>
                  {STATUT_CONTACT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              {permissions.peutExporterDonnees && (
                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() =>
                      telechargerCsv(
                        'messages_contact_admin',
                        [
                          { key: 'id', label: 'id' },
                          { key: 'statut', label: 'statut' },
                          { key: 'nom', label: 'nom' },
                          { key: 'email', label: 'email' },
                          { key: 'sujet', label: 'sujet' },
                          { key: 'created_at', label: 'cree_le' },
                        ],
                        messagesContactFiltres.map((m) => ({
                          id: m.id,
                          statut: m.statut || 'nouveau',
                          nom: m.nom,
                          email: m.email,
                          sujet: m.sujet,
                          created_at: m.created_at,
                        }))
                      )
                    }
                    className="text-xs font-bold px-2 py-1.5 rounded-lg border border-teal-600 text-teal-700 hover:bg-teal-50"
                  >
                    CSV / Excel
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      ouvrirImpressionPdfListe(
                        'Messages contact',
                        ['statut', 'nom', 'email', 'sujet'],
                        messagesContactFiltres.map((m) => [
                          m.statut || 'nouveau',
                          m.nom,
                          m.email,
                          m.sujet,
                        ])
                      )
                    }
                    className="text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    PDF (impression)
                  </button>
                </div>
              )}
              {permissions.selectionGroupéeMessagerie && (
                <div className="flex flex-wrap gap-2 items-end border-t border-slate-100 pt-3">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    Sélection ({selMessagesContact.size})
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelMessagesContact(new Set(messagesContactFiltres.map((x) => x.id)))
                    }
                    className="text-xs font-bold px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                  >
                    Tout (filtré)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelMessagesContact(new Set())}
                    className="text-xs font-bold px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                  >
                    Effacer
                  </button>
                  <select
                    value={bulkContactStatut}
                    onChange={(e) => setBulkContactStatut(e.target.value)}
                    className="text-xs border rounded-lg px-2 py-1 bg-white"
                  >
                    {STATUT_CONTACT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={bulkEnCours}
                    onClick={appliquerBulkMessagesContact}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-teal-600 text-white disabled:opacity-50"
                  >
                    Appliquer à la sélection
                  </button>
                </div>
              )}
            </div>
            {messagesContactFiltres.length === 0 && (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-100">
                Aucun message pour l’instant.
              </div>
            )}
            {messagesContactFiltres.map((m) => {
              const st = m.statut || 'nouveau'
              const mailHref = (() => {
                const sub = encodeURIComponent(`Re: Chez Moi CI — ${m.sujet || 'votre message'}`)
                const prenom = (m.nom || '').trim().split(/\s+/)[0]
                const body = encodeURIComponent(
                  `Bonjour${prenom ? ' ' + prenom : ''},\n\n\n\n—\nL’équipe Chez Moi CI`
                )
                return `mailto:${encodeURIComponent(m.email || '')}?subject=${sub}&body=${body}`
              })()
              return (
                <div
                  key={m.id}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                    {permissions.selectionGroupéeMessagerie && (
                      <input
                        type="checkbox"
                        checked={selMessagesContact.has(m.id)}
                        onChange={() => {
                          setSelMessagesContact((prev) => {
                            const n = new Set(prev)
                            if (n.has(m.id)) n.delete(m.id)
                            else n.add(m.id)
                            return n
                          })
                        }}
                        className="w-4 h-4 accent-teal-600 shrink-0 mt-1"
                        aria-label="Sélectionner message"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            st === 'nouveau'
                              ? 'bg-amber-100 text-amber-900'
                              : st === 'en_cours'
                                ? 'bg-sky-100 text-sky-900'
                                : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          {STATUT_CONTACT_OPTIONS.find((o) => o.value === st)?.label || st}
                        </span>
                        {m.sujet && (
                          <span className="font-bold text-gray-900 text-sm">{m.sujet}</span>
                        )}
                      </div>
                      <p className="text-gray-700 text-sm">
                        <span className="font-semibold">{m.nom || '—'}</span>
                        {' · '}
                        <a
                          href={`mailto:${m.email}`}
                          className="text-[#1B5E20] font-bold hover:underline break-all"
                        >
                          {m.email}
                        </a>
                      </p>
                      {m.message && (
                        <p className="text-gray-600 text-sm mt-2 whitespace-pre-wrap border-l-2 border-emerald-200 pl-3">
                          {m.message}
                        </p>
                      )}
                      <p className="text-gray-400 text-xs mt-2">
                        Reçu :{' '}
                        {m.created_at
                          ? new Date(m.created_at).toLocaleString('fr-FR')
                          : '—'}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0 lg:w-52">
                      <select
                        value={st}
                        onChange={(e) => changerStatutMessageContact(m.id, e.target.value)}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1B5E20]"
                      >
                        {STATUT_CONTACT_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {m.email && (
                        <a
                          href={mailHref}
                          className="text-center text-xs font-bold px-3 py-2 rounded-lg bg-[#1B5E20] text-white hover:bg-green-800"
                        >
                          Répondre (courriel)
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">
                      Note interne (non visible par l’utilisateur)
                    </label>
                    <textarea
                      rows={2}
                      value={
                        notesBrouillonContact[m.id] !== undefined
                          ? notesBrouillonContact[m.id]
                          : (m.note_interne ?? '')
                      }
                      onChange={(e) =>
                        setNotesBrouillonContact((prev) => ({
                          ...prev,
                          [m.id]: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#1B5E20]"
                      placeholder="Mémo équipe, suivi, lien CRM…"
                    />
                    <button
                      type="button"
                      onClick={() => sauverNoteContact(m.id)}
                      className="mt-2 text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Enregistrer la note
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {onglet === 'avis' && (
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center bg-white/95 border border-indigo-100 rounded-xl p-4 shadow-sm">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-bold text-slate-500 uppercase">Filtres</span>
                <select
                  value={filtreAvisVisibilite}
                  onChange={(e) => setFiltreAvisVisibilite(e.target.value)}
                  className="text-xs border rounded-lg px-2 py-1.5 border-slate-200 bg-white"
                >
                  <option value="">Visibilité (tous)</option>
                  <option value="visible">Visibles</option>
                  <option value="masque">Masqués</option>
                </select>
              </div>
              {permissions.peutExporterDonnees && (
                <div className="flex flex-wrap gap-2 sm:ml-auto">
                  <button
                    type="button"
                    onClick={() =>
                      telechargerCsv(
                        'avis_admin',
                        [
                          { key: 'id', label: 'id' },
                          { key: 'note', label: 'note' },
                          { key: 'auteur', label: 'auteur' },
                          { key: 'annonce', label: 'annonce' },
                          { key: 'masque', label: 'masque' },
                          { key: 'created_at', label: 'cree_le' },
                        ],
                        avisFiltres.map((a) => ({
                          id: a.id,
                          note: a.note,
                          auteur: a.auteur_nom,
                          annonce: a.annonce_titre || a.annonce_id,
                          masque: a.is_hidden ? 'oui' : 'non',
                          created_at: a.created_at,
                        }))
                      )
                    }
                    className="text-xs font-bold px-2 py-1.5 rounded-lg border border-teal-600 text-teal-700 hover:bg-teal-50"
                  >
                    CSV / Excel
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      ouvrirImpressionPdfListe(
                        'Avis',
                        ['note', 'auteur', 'annonce', 'masqué'],
                        avisFiltres.map((a) => [
                          a.note,
                          a.auteur_nom,
                          a.annonce_titre || a.annonce_id,
                          a.is_hidden ? 'oui' : 'non',
                        ])
                      )
                    }
                    className="text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    PDF (impression)
                  </button>
                </div>
              )}
            </div>
            {avisFiltres.length === 0 && (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-100">
                Aucun avis.
              </div>
            )}
            {avisFiltres.map((a) => (
              <div key={a.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800">
                      {'⭐'.repeat(Math.max(1, a.note || 0))}
                      <span className="ml-2 text-sm text-gray-500">par {a.auteur_nom || 'Utilisateur'}</span>
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Annonce : {a.annonce_titre || a.annonce_id}
                    </p>
                    {a.commentaire && (
                      <p className="text-gray-600 text-sm mt-2 whitespace-pre-wrap">{a.commentaire}</p>
                    )}
                    <p className="text-gray-400 text-xs mt-2">
                      {a.created_at ? new Date(a.created_at).toLocaleString('fr-FR') : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (a.is_hidden) return toggleMasquageAvis(a)
                      setAvisMasquageModal(a)
                    }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
                      a.is_hidden
                        ? 'border-green-300 text-green-700 hover:bg-green-50'
                        : 'border-red-300 text-red-600 hover:bg-red-50'
                    }`}
                  >
                    {a.is_hidden ? 'Afficher' : 'Masquer'}
                  </button>
                </div>
                {a.is_hidden && a.hidden_reason && (
                  <p className="mt-2 text-xs text-amber-700">
                    Motif: {a.hidden_reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {onglet === 'historique_moderation' && (
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center bg-white/95 border border-indigo-100 rounded-xl p-4 shadow-sm">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-bold text-slate-500 uppercase">Filtres</span>
                <select
                  value={filtreLogAction}
                  onChange={(e) => setFiltreLogAction(e.target.value)}
                  className="text-xs border rounded-lg px-2 py-1.5 border-slate-200 bg-white"
                >
                  <option value="">Action (toutes)</option>
                  <option value="hide">Masqué</option>
                  <option value="unhide">Affiché</option>
                </select>
              </div>
              {permissions.peutExporterDonnees && (
                <div className="flex flex-wrap gap-2 sm:ml-auto">
                  <button
                    type="button"
                    onClick={() =>
                      telechargerCsv(
                        'historique_moderation_avis',
                        [
                          { key: 'id', label: 'id' },
                          { key: 'action', label: 'action' },
                          { key: 'annonce', label: 'annonce' },
                          { key: 'moderateur', label: 'moderateur' },
                          { key: 'reason', label: 'motif' },
                          { key: 'created_at', label: 'cree_le' },
                        ],
                        logsFiltres.map((l) => ({
                          id: l.id,
                          action: l.action,
                          annonce: l.annonce_titre || l.annonce_id,
                          moderateur: l.moderateur_nom || l.moderator_id,
                          reason: l.reason,
                          created_at: l.created_at,
                        }))
                      )
                    }
                    className="text-xs font-bold px-2 py-1.5 rounded-lg border border-teal-600 text-teal-700 hover:bg-teal-50"
                  >
                    CSV / Excel
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      ouvrirImpressionPdfListe(
                        'Historique modération avis',
                        ['action', 'annonce', 'modérateur'],
                        logsFiltres.map((l) => [
                          l.action,
                          l.annonce_titre || l.annonce_id,
                          l.moderateur_nom || l.moderator_id,
                        ])
                      )
                    }
                    className="text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    PDF (impression)
                  </button>
                </div>
              )}
            </div>
            {logsFiltres.length === 0 && (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-100">
                Aucun événement de modération.
              </div>
            )}
            {logsFiltres.map((l) => (
              <div key={l.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <p className="font-bold text-gray-800">
                  {l.action === 'hide' ? '🙈 Avis masqué' : '👁️ Avis affiché'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Annonce : {l.annonce_titre || l.annonce_id} · Modérateur : {l.moderateur_nom || l.moderator_id || '—'}
                </p>
                {l.reason && <p className="text-sm text-gray-700 mt-2">Motif : {l.reason}</p>}
                <p className="text-xs text-gray-400 mt-2">
                  {l.created_at ? new Date(l.created_at).toLocaleString('fr-FR') : ''}
                </p>
              </div>
            ))}
          </div>
        )}

        {onglet === 'utilisateurs' && (
          <div className="space-y-3">
            {permissions.fusionProfils && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm shadow-sm">
                <p className="font-bold text-amber-950 mb-1">Fusion de profils (super admin)</p>
                <p className="text-amber-900/90 text-xs mb-3">
                  Transfère les annonces et les demandes badge du compte source vers la cible, supprime les
                  favoris du compte source, puis bannit le profil source. Les comptes de connexion (Auth)
                  restent distincts — supprimez l’utilisateur source dans Supabase Auth si besoin.
                </p>
                <div className="flex flex-col lg:flex-row flex-wrap gap-3 items-end">
                  <label className="text-xs font-bold text-amber-950 block flex-1 min-w-[12rem]">
                    Profil source (absorbé)
                    <select
                      value={mergeSource}
                      onChange={(e) => setMergeSource(e.target.value)}
                      className="block mt-1 w-full border border-amber-300 rounded-lg px-2 py-1.5 text-xs bg-white"
                    >
                      <option value="">— Choisir —</option>
                      {utilisateurs.map((u) => (
                        <option key={u.id} value={u.id}>
                          {(u.nom || u.email || u.id).slice(0, 48)} ({String(u.id).slice(0, 8)}…)
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-amber-950 block flex-1 min-w-[12rem]">
                    Profil cible (conservé)
                    <select
                      value={mergeTarget}
                      onChange={(e) => setMergeTarget(e.target.value)}
                      className="block mt-1 w-full border border-amber-300 rounded-lg px-2 py-1.5 text-xs bg-white"
                    >
                      <option value="">— Choisir —</option>
                      {utilisateurs.map((u) => (
                        <option key={u.id} value={u.id}>
                          {(u.nom || u.email || u.id).slice(0, 48)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={fusionEnCours}
                    onClick={fusionnerProfils}
                    className="text-xs font-bold px-4 py-2 rounded-lg bg-amber-800 text-white hover:bg-amber-900 disabled:opacity-50 shrink-0"
                  >
                    {fusionEnCours ? '…' : 'Fusionner'}
                  </button>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-3 bg-white/95 border border-indigo-100 rounded-xl p-4 shadow-sm">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-bold text-slate-500 uppercase">Filtres</span>
                <select
                  value={filtreUserStatut}
                  onChange={(e) => setFiltreUserStatut(e.target.value)}
                  className="text-xs border rounded-lg px-2 py-1.5 border-slate-200 bg-white"
                >
                  <option value="">Statut compte (tous)</option>
                  <option value="en_attente">En attente</option>
                  <option value="active">Vérifié</option>
                  <option value="suspended">Suspendu</option>
                  <option value="banned">Banni</option>
                </select>
                <select
                  value={filtreUserBadge}
                  onChange={(e) => setFiltreUserBadge(e.target.value)}
                  className="text-xs border rounded-lg px-2 py-1.5 border-slate-200 bg-white"
                >
                  <option value="">Badge (tous)</option>
                  {BADGE_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {BADGE_LABEL[b]}
                    </option>
                  ))}
                </select>
                <select
                  value={filtreUserType}
                  onChange={(e) => setFiltreUserType(e.target.value)}
                  className="text-xs border rounded-lg px-2 py-1.5 border-slate-200 bg-white"
                >
                  <option value="">Type profil (tous)</option>
                  {typesProfilUniques.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABEL[t] || t}
                    </option>
                  ))}
                </select>
                <select
                  value={filtreUserStaff}
                  onChange={(e) => setFiltreUserStaff(e.target.value)}
                  className="text-xs border rounded-lg px-2 py-1.5 border-slate-200 bg-white"
                >
                  <option value="">Staff / public (tous)</option>
                  <option value="staff">Équipe uniquement</option>
                  <option value="public">Hors équipe</option>
                </select>
                <input
                  type="text"
                  value={filtreUserEmail}
                  onChange={(e) => setFiltreUserEmail(e.target.value)}
                  placeholder="Filtre e-mail contient…"
                  className="text-xs border rounded-lg px-2 py-1.5 border-slate-200 min-w-[10rem] flex-1 max-w-xs bg-white"
                />
              </div>
              {permissions.peutExporterDonnees && (
                <div className="flex flex-wrap gap-2 items-center border-t border-slate-100 pt-3">
                  <span className="text-xs font-bold text-slate-500 uppercase">Export</span>
                  <button
                    type="button"
                    onClick={() =>
                      telechargerCsv(
                        'utilisateurs_admin',
                        [
                          { key: 'id', label: 'id' },
                          { key: 'nom', label: 'nom' },
                          { key: 'email', label: 'email' },
                          { key: 'type', label: 'type' },
                          { key: 'account_status', label: 'statut_compte' },
                          { key: 'badge', label: 'badge' },
                          { key: 'quartier', label: 'quartier' },
                          { key: 'staff', label: 'equipe' },
                        ],
                        utilisateursFiltres.map((u) => ({
                          id: u.id,
                          nom: u.nom,
                          email: u.email,
                          type: u.type,
                          account_status: u.account_status,
                          badge: u.badge,
                          quartier: u.quartier,
                          staff: u.is_admin ? 'oui' : 'non',
                        }))
                      )
                    }
                    className="text-xs font-bold px-2 py-1.5 rounded-lg border border-teal-600 text-teal-700 hover:bg-teal-50"
                  >
                    CSV / Excel
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      ouvrirImpressionPdfListe(
                        'Utilisateurs',
                        ['id', 'nom', 'email', 'statut', 'badge'],
                        utilisateursFiltres.map((u) => [
                          u.id,
                          u.nom,
                          u.email,
                          u.account_status,
                          u.badge,
                        ])
                      )
                    }
                    className="text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    PDF (impression)
                  </button>
                </div>
              )}
              {permissions.selectionGroupéeUtilisateurs && permissions.utilisateursEdit && (
                <div className="flex flex-wrap gap-2 items-end border-t border-slate-100 pt-3">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    Sélection ({selUsers.size})
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelUsers(new Set(utilisateursFiltres.map((x) => x.id)))}
                    className="text-xs font-bold px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                  >
                    Tout (filtré)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelUsers(new Set())}
                    className="text-xs font-bold px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
                  >
                    Effacer
                  </button>
                  <select
                    value={bulkUserStatut}
                    onChange={(e) => setBulkUserStatut(e.target.value)}
                    className="text-xs border rounded-lg px-2 py-1 bg-white"
                  >
                    <option value="en_attente">En attente</option>
                    <option value="active">Vérifié</option>
                    <option value="suspended">Suspendu</option>
                    <option value="banned">Banni</option>
                  </select>
                  <select
                    value={bulkUserBadge}
                    onChange={(e) => setBulkUserBadge(e.target.value)}
                    className="text-xs border rounded-lg px-2 py-1 bg-white"
                  >
                    {BADGE_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {BADGE_LABEL[b]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={bulkEnCours}
                    onClick={appliquerBulkUtilisateurs}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-teal-600 text-white disabled:opacity-50"
                  >
                    Appliquer à la sélection
                  </button>
                </div>
              )}
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-indigo-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-indigo-50/80 border-b border-indigo-100">
                <tr>
                  {permissions.selectionGroupéeUtilisateurs && (
                    <th className="px-2 py-3 w-10" aria-label="Sélection" />
                  )}
                  <th className="px-4 py-3 text-xs font-bold text-gray-600">Utilisateur</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-600 hidden md:table-cell">Type</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-600">Statut</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-600">Badge</th>
                  {showRoleCol && (
                    <th className="px-4 py-3 text-xs font-bold text-gray-600">Rôle équipe</th>
                  )}
                  <th className="px-4 py-3 text-xs font-bold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {utilisateursFiltres.length === 0 && (
                  <tr>
                    <td
                      colSpan={
                        (permissions.selectionGroupéeUtilisateurs ? 1 : 0) + (showRoleCol ? 6 : 5)
                      }
                      className="px-4 py-8 text-center text-gray-400 text-sm"
                    >
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                )}
                {utilisateursFiltres.map(u => (
                  <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${u.account_status === 'banned' ? 'bg-red-50/30' : ''}`}>
                    {permissions.selectionGroupéeUtilisateurs && (
                      <td className="px-2 py-3 align-top">
                        <input
                          type="checkbox"
                          checked={selUsers.has(u.id)}
                          onChange={() => {
                            setSelUsers((prev) => {
                              const n = new Set(prev)
                              if (n.has(u.id)) n.delete(u.id)
                              else n.add(u.id)
                              return n
                            })
                          }}
                          className="w-4 h-4 accent-teal-600 mt-1"
                          aria-label={`Sélectionner ${u.nom || u.email}`}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#E8F5E9] flex items-center justify-center text-[#1B5E20] font-bold text-sm flex-shrink-0">
                          {u.nom?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{u.nom || 'Sans nom'}</p>
                          <p className="text-gray-500 text-[10px] break-all">{u.email || '—'}</p>
                          <p className="text-gray-400 text-xs">{u.quartier || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-gray-600">{TYPE_LABEL[u.type] || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={valeursAfficheProfil(u).account_status}
                        onChange={(e) => setBrouillonProfil(u.id, { account_status: e.target.value })}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#1B5E20]"
                      >
                        <option value="en_attente">⏳ En attente</option>
                        <option value="active">✅ Vérifié</option>
                        {permissions.utilisateursEdit && (
                          <option value="suspended">⏸ Suspendu</option>
                        )}
                        {permissions.utilisateursBan && (
                          <option value="banned">🚫 Banni</option>
                        )}
                      </select>
                      {permissions.utilisateursEdit && (
                        <label className="block mt-1 text-[10px] text-gray-500">
                          Fin suspension
                          <input
                            type="datetime-local"
                            value={valeursAfficheProfil(u).suspended_until}
                            onChange={(e) =>
                              setBrouillonProfil(u.id, { suspended_until: e.target.value })
                            }
                            className="mt-0.5 w-full border border-gray-200 rounded px-1 py-0.5 text-[10px]"
                          />
                        </label>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={valeursAfficheProfil(u).badge}
                        onChange={(e) => setBrouillonProfil(u.id, { badge: e.target.value })}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#1B5E20]"
                      >
                        {BADGE_OPTIONS.map(b => <option key={b} value={b}>{BADGE_LABEL[b]}</option>)}
                      </select>
                    </td>
                    {showRoleCol && (
                      <td className="px-4 py-3">
                        <select
                          value={valeursAfficheProfil(u).roleEquipe}
                          onChange={(e) => setBrouillonProfil(u.id, { roleEquipe: e.target.value })}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#1B5E20] max-w-[11rem]"
                        >
                          <option value="">Aucun</option>
                          {permissions.utilisateursAssignLowerRoles && (
                            <>
                              <option value="moderator">Modérateur</option>
                              <option value="annonce_manager">Gestionnaire annonces</option>
                            </>
                          )}
                          {permissions.utilisateursAssignAdmin && (
                            <option value="admin">Administrateur</option>
                          )}
                          {permissions.utilisateursAssignSuper && (
                            <option value="super_admin">Super admin</option>
                          )}
                        </select>
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={!profilADesModifs(u) || sauvegardeProfilId === u.id}
                          onClick={() => enregistrerModifsProfil(u)}
                          className="text-xs font-bold px-2.5 py-1 rounded-lg border border-[#1B5E20] text-[#1B5E20] hover:bg-[#E8F5E9] disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {sauvegardeProfilId === u.id ? '…' : 'Enregistrer'}
                        </button>
                        {permissions.authConfirmEmail && (
                          <button
                            type="button"
                            onClick={() => appelerUserAuth('confirm_email', u.id)}
                            className="text-xs font-bold px-2 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                          >
                            E-mail ✓
                          </button>
                        )}
                        {permissions.authSendPasswordReset && (
                          <button
                            type="button"
                            onClick={() => appelerUserAuth('send_password_reset', u.id)}
                            className="text-xs font-bold px-2 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                          >
                            Reset MDP
                          </button>
                        )}
                        <a
                          href={`/profil/${u.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#1B5E20] text-xs font-bold border border-[#1B5E20] px-2.5 py-1 rounded-lg hover:bg-[#E8F5E9]"
                        >
                          Profil
                        </a>
                        {permissions.utilisateursBan && (
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
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        )}

        {onglet === 'feature_flags' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Activez ou désactivez des leviers produit (réservé au super admin). Les clés sont créées en base ; ajoutez-en via migration SQL si besoin.
            </p>
            {permissions.peutExporterDonnees && featureFlagsFiltres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    telechargerCsv(
                      'feature_flags_admin',
                      [
                        { key: 'key', label: 'cle' },
                        { key: 'value_boolean', label: 'actif' },
                        { key: 'updated_at', label: 'maj' },
                      ],
                      featureFlagsFiltres.map((f) => ({
                        key: f.key,
                        value_boolean: f.value_boolean ? 'oui' : 'non',
                        updated_at: f.updated_at,
                      }))
                    )
                  }
                  className="text-xs font-bold px-2 py-1.5 rounded-lg border border-teal-600 text-teal-700 hover:bg-teal-50"
                >
                  Exporter CSV / Excel
                </button>
              </div>
            )}
            {featureFlagsFiltres.length === 0 && (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-100">
                Aucun paramètre ou migration non appliquée.
              </div>
            )}
            {featureFlagsFiltres.map((f) => (
              <div
                key={f.key}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="font-mono text-sm font-bold text-gray-800">{f.key}</p>
                  <p className="text-xs text-gray-500">
                    {f.updated_at
                      ? `Maj ${new Date(f.updated_at).toLocaleString('fr-FR')}`
                      : ''}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(f.value_boolean)}
                    onChange={(e) => toggleFeatureFlag(f.key, e.target.checked)}
                    disabled={!permissions.featureFlagsEdit}
                    className="accent-[#1B5E20] w-4 h-4"
                  />
                  Activé
                </label>
              </div>
            ))}
          </div>
        )}

        </div>
      </div>

      {/* ── MODAL MÉDIAS / CHAMPS ANNONCE ── */}
      {annonceDetailModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-gray-800 text-lg mb-1">Annonce — médias & contenu</h3>
            <p className="text-xs text-gray-500 mb-4 truncate">{annonceDetailModal.titre}</p>

            {permissions.annoncesEditPhotos && (
              <div className="mb-4">
                <p className="text-sm font-bold text-gray-700 mb-2">Photos</p>
                <div className="grid grid-cols-3 gap-2">
                  {(annonceDetailModal.photos || []).map((url) => (
                    <div key={url} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-20 object-cover rounded-lg border" />
                      <button
                        type="button"
                        onClick={async () => {
                          const next = (annonceDetailModal.photos || []).filter((p) => p !== url)
                          try {
                            await updateAnnonce(annonceDetailModal.id, { photos: next })
                            setAnnonces((prev) =>
                              prev.map((x) =>
                                x.id === annonceDetailModal.id ? { ...x, photos: next } : x
                              )
                            )
                            setAnnonceDetailModal({ ...annonceDetailModal, photos: next })
                            showToast('success', 'Photo retirée.')
                          } catch (e) {
                            showToast('error', e?.message || e)
                          }
                        }}
                        className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-90 hover:opacity-100"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                {(!annonceDetailModal.photos || annonceDetailModal.photos.length === 0) && (
                  <p className="text-xs text-gray-400">Aucune photo.</p>
                )}
              </div>
            )}

            {permissions.annoncesClearFields && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-bold text-gray-700 mb-2">Vider des champs</p>
                <p className="text-xs text-gray-500 mb-2">
                  Action immédiate (sans bouton Enregistrer de la liste).
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { k: 'description', label: 'Description' },
                    { k: 'titre', label: 'Titre' },
                    { k: 'prix', label: 'Prix' },
                    { k: 'surface', label: 'Surface' },
                    { k: 'quartier', label: 'Quartier' },
                  ].map(({ k, label }) => (
                    <button
                      key={k}
                      type="button"
                      onClick={async () => {
                        const payload =
                          k === 'prix' || k === 'surface'
                            ? { [k]: null }
                            : { [k]: k === 'titre' ? '(Annonce)' : '' }
                        try {
                          await updateAnnonce(annonceDetailModal.id, payload)
                          setAnnonces((prev) =>
                            prev.map((x) =>
                              x.id === annonceDetailModal.id ? { ...x, ...payload } : x
                            )
                          )
                          setAnnonceDetailModal({ ...annonceDetailModal, ...payload })
                          showToast('success', `${label} effacé.`)
                        } catch (e) {
                          showToast('error', e?.message || e)
                        }
                      }}
                      className="text-xs font-bold px-2 py-1 rounded-lg border border-amber-300 text-amber-800 hover:bg-amber-50"
                    >
                      Effacer {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setAnnonceDetailModal(null)}
              className="mt-6 w-full border border-gray-200 py-2.5 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-50"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

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

      {avisMasquageModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="font-bold text-gray-800 text-lg mb-2">Masquer cet avis</h3>
            <p className="text-gray-500 text-sm mb-4">
              Sélectionnez un motif standard ou “Autre”.
            </p>
            <label className="block text-sm font-bold text-gray-700 mb-1">Motif</label>
            <select
              value={motifMasquage}
              onChange={(e) => setMotifMasquage(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3"
            >
              <option value="arnaque">Arnaque</option>
              <option value="insultes">Insultes</option>
              <option value="hors-sujet">Hors-sujet</option>
              <option value="spam">Spam</option>
              <option value="autre">Autre</option>
            </select>
            {motifMasquage === 'autre' && (
              <input
                type="text"
                value={motifAutre}
                onChange={(e) => setMotifAutre(e.target.value)}
                placeholder="Précisez le motif..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4"
              />
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAvisMasquageModal(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmerMasquageAvis}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-red-700"
              >
                Masquer
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-[min(100vw-2rem,22rem)] pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-xl px-4 py-3 text-sm font-medium shadow-lg border ${
              t.type === 'error'
                ? 'bg-red-50 text-red-900 border-red-200'
                : 'bg-[#E8F5E9] text-[#1B5E20] border-green-200'
            }`}
            role="status"
          >
            {t.msg}
          </div>
        ))}
      </div>

      <SiteFooter />
    </div>
  )
}
