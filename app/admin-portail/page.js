'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
  const [onglet, setOnglet] = useState('annonces')
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
      setOnglet(ongletsVisibles[0].id)
    }
  }, [roleStaff, onglet, ongletsVisibles])

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
      if (onglet === 'annonces') {
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
  }, [onglet, chargement])

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
      (d.badge_demande && d.badge_demande.toLowerCase().includes(q)) ||
      (d.annonce_titre && d.annonce_titre.toLowerCase().includes(q)) ||
      (d.profiles?.nom && d.profiles.nom.toLowerCase().includes(q))
    )
  })

  const avisFiltres = avisList.filter((a) => {
    if (!recherche) return true
    const q = recherche.toLowerCase()
    return (
      (a.commentaire && a.commentaire.toLowerCase().includes(q)) ||
      (a.auteur_nom && a.auteur_nom.toLowerCase().includes(q)) ||
      (a.annonce_titre && a.annonce_titre.toLowerCase().includes(q))
    )
  })
  const logsFiltres = moderationLogs.filter((l) => {
    if (!recherche) return true
    const q = recherche.toLowerCase()
    return (
      (l.annonce_titre && l.annonce_titre.toLowerCase().includes(q)) ||
      (l.moderateur_nom && l.moderateur_nom.toLowerCase().includes(q)) ||
      (l.reason && l.reason.toLowerCase().includes(q))
    )
  })

  const featureFlagsFiltres = featureFlags.filter((f) => {
    if (!recherche) return true
    return (f.key && f.key.toLowerCase().includes(recherche.toLowerCase()))
  })

  const messagesContactFiltres = messagesContact.filter((m) => {
    if (!recherche) return true
    const q = recherche.toLowerCase()
    return (
      (m.nom && m.nom.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q)) ||
      (m.sujet && m.sujet.toLowerCase().includes(q)) ||
      (m.message && m.message.toLowerCase().includes(q)) ||
      (m.note_interne && m.note_interne.toLowerCase().includes(q))
    )
  })

  const showRoleCol =
    permissions.utilisateursAssignSuper ||
    permissions.utilisateursAssignAdmin ||
    permissions.utilisateursAssignLowerRoles

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
      ]

  // ── Render ────────────────────────────────────────────────────────────────────

  if (chargement) return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <div className="text-[#1B5E20] font-bold text-lg">Vérification des accès…</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-100">
      <SiteHeader />

      <div className="bg-[#0f172a] text-white px-4 py-3 flex flex-wrap items-center gap-2 border-b border-slate-700">
        <span className="text-amber-400 font-bold text-sm shrink-0">🛡️ PORTAIL STAFF</span>
        <span className="text-slate-400 text-xs">
          Connecté en <strong className="text-white">{roleLabel}</strong>
          {' · '}
          Super admin = contrôle total · Admin = gestion étendue · Modérateur = contenu & signalements ·
          Gestionnaire = annonces
        </span>
      </div>

      <div className="flex flex-col lg:flex-row max-w-[1600px] mx-auto min-h-[calc(100vh-8rem)]">
        <aside className="hidden lg:flex w-56 shrink-0 bg-slate-900 text-slate-200 flex-col p-3 gap-1 border-r border-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 mb-1">Sections</p>
          {ongletsVisibles.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => { setOnglet(o.id); setRecherche('') }}
              className={`text-left text-sm font-semibold rounded-lg px-3 py-2 transition-colors ${
                onglet === o.id ? 'bg-[#1B5E20] text-white' : 'hover:bg-slate-800'
              }`}
            >
              {o.label}
            </button>
          ))}
        </aside>

        <div className="flex-1 py-6 px-4 md:px-6">

        <h1 className="text-2xl font-bold text-gray-800 mb-1">Pilotage plateforme</h1>
        <p className="text-gray-500 text-sm mb-6">
          Chez Moi CI — outils avancés réservés au personnel habilité
        </p>

        {/* STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-8">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-xl p-3 sm:p-4 shadow-sm text-center min-w-0">
              <div className="text-2xl mb-1">{s.emoji}</div>
              <div className="text-2xl font-bold text-[#1B5E20]">
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
                onClick={() => { setOnglet(o.id); setRecherche('') }}
                className={`shrink-0 px-3 sm:px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
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
            onChange={e => setRecherche(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full sm:w-64 lg:ml-auto focus:outline-none focus:border-[#1B5E20]"
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
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
                    <td colSpan={showRoleCol ? 6 : 5} className="px-4 py-8 text-center text-gray-400 text-sm">
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
        )}

        {onglet === 'feature_flags' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Activez ou désactivez des leviers produit (réservé au super admin). Les clés sont créées en base ; ajoutez-en via migration SQL si besoin.
            </p>
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
