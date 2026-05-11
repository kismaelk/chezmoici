/**
 * Rôles staff : super_admin | admin | moderator | annonce_manager
 * Legacy : is_admin === true sans admin_role → super_admin.
 */

export function adminEmailFallback() {
  return (
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ADMIN_EMAIL_FALLBACK) ||
    'contact@chezmoici.com'
  )
}

/**
 * @returns {'super_admin' | 'admin' | 'moderator' | 'annonce_manager' | null}
 */
export function resolveStaffRole(profil, email) {
  const adminEmail = adminEmailFallback()
  if (email && adminEmail && email.toLowerCase() === adminEmail.toLowerCase()) {
    return 'super_admin'
  }
  if (!profil?.is_admin) return null
  const r = profil.admin_role
  if (r === 'moderator') return 'moderator'
  if (r === 'admin') return 'admin'
  if (r === 'annonce_manager') return 'annonce_manager'
  if (r === 'super_admin') return 'super_admin'
  return 'super_admin'
}

export function isStaff(profil, email) {
  return resolveStaffRole(profil, email) != null
}

/**
 * Matrice de permissions UI + API (ajuster ici pour centraliser).
 * @param {'super_admin' | 'admin' | 'moderator' | 'annonce_manager' | null} role
 */
export function staffPermissions(role) {
  const deny = {
    voirOngletDashboard: false,
    voirOngletAnnonces: false,
    voirOngletAvis: false,
    voirOngletHistoriqueModeration: false,
    voirOngletUtilisateurs: false,
    voirOngletSignalements: false,
    voirOngletBadges: false,
    voirOngletMessagerieContact: false,
    voirOngletFeatureFlags: false,
    peutExporterDonnees: false,
    selectionGroupéeAnnonces: false,
    selectionGroupéeUtilisateurs: false,
    selectionGroupéeModerationContenu: false,
    selectionGroupéeMessagerie: false,
    fusionProfils: false,
    annoncesEditBadge: false,
    annoncesDelete: false,
    annoncesEditPhotos: false,
    annoncesClearFields: false,
    utilisateursEdit: false,
    utilisateursBan: false,
    utilisateursAssignSuper: false,
    utilisateursAssignAdmin: false,
    utilisateursAssignLowerRoles: false,
    authConfirmEmail: false,
    authSendPasswordReset: false,
    featureFlagsEdit: false,
  }

  if (!role) return deny

  if (role === 'super_admin') {
    return {
      voirOngletDashboard: true,
      voirOngletAnnonces: true,
      voirOngletAvis: true,
      voirOngletHistoriqueModeration: true,
      voirOngletUtilisateurs: true,
      voirOngletSignalements: true,
      voirOngletBadges: true,
      voirOngletMessagerieContact: true,
      voirOngletFeatureFlags: true,
      peutExporterDonnees: true,
      selectionGroupéeAnnonces: true,
      selectionGroupéeUtilisateurs: true,
      selectionGroupéeModerationContenu: true,
      selectionGroupéeMessagerie: true,
      fusionProfils: true,
      annoncesEditBadge: true,
      annoncesDelete: true,
      annoncesEditPhotos: true,
      annoncesClearFields: true,
      utilisateursEdit: true,
      utilisateursBan: true,
      utilisateursAssignSuper: true,
      utilisateursAssignAdmin: true,
      utilisateursAssignLowerRoles: true,
      authConfirmEmail: true,
      authSendPasswordReset: true,
      featureFlagsEdit: true,
    }
  }

  if (role === 'admin') {
    return {
      ...deny,
      voirOngletDashboard: true,
      voirOngletAnnonces: true,
      voirOngletAvis: true,
      voirOngletHistoriqueModeration: true,
      voirOngletUtilisateurs: true,
      voirOngletSignalements: true,
      voirOngletBadges: true,
      voirOngletMessagerieContact: true,
      voirOngletFeatureFlags: false,
      peutExporterDonnees: true,
      selectionGroupéeAnnonces: true,
      selectionGroupéeUtilisateurs: true,
      selectionGroupéeModerationContenu: true,
      selectionGroupéeMessagerie: true,
      fusionProfils: false,
      annoncesEditBadge: true,
      annoncesDelete: true,
      annoncesEditPhotos: true,
      annoncesClearFields: true,
      utilisateursEdit: true,
      utilisateursBan: true,
      utilisateursAssignSuper: false,
      utilisateursAssignAdmin: true,
      utilisateursAssignLowerRoles: true,
      authConfirmEmail: false,
      authSendPasswordReset: true,
      featureFlagsEdit: false,
    }
  }

  if (role === 'moderator') {
    return {
      ...deny,
      voirOngletDashboard: true,
      voirOngletAnnonces: true,
      voirOngletAvis: true,
      voirOngletHistoriqueModeration: true,
      voirOngletSignalements: true,
      voirOngletMessagerieContact: true,
      peutExporterDonnees: true,
      selectionGroupéeAnnonces: true,
      selectionGroupéeUtilisateurs: false,
      selectionGroupéeModerationContenu: true,
      selectionGroupéeMessagerie: false,
      fusionProfils: false,
      annoncesEditBadge: false,
      annoncesDelete: false,
      annoncesEditPhotos: true,
      annoncesClearFields: true,
    }
  }

  if (role === 'annonce_manager') {
    return {
      ...deny,
      voirOngletDashboard: true,
      voirOngletAnnonces: true,
      peutExporterDonnees: true,
      selectionGroupéeAnnonces: true,
      selectionGroupéeUtilisateurs: false,
      selectionGroupéeModerationContenu: false,
      selectionGroupéeMessagerie: false,
      fusionProfils: false,
      annoncesEditBadge: true,
      annoncesDelete: false,
      annoncesEditPhotos: true,
      annoncesClearFields: true,
    }
  }

  return deny
}
