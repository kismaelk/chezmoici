/**
 * Rôles staff : super_admin (tout) vs moderator (annonces / modération liste uniquement).
 * Legacy : is_admin === true sans admin_role → traité comme super_admin.
 */

export function adminEmailFallback() {
  return (
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ADMIN_EMAIL_FALLBACK) ||
    'contact@chezmoici.com'
  )
}

/** @returns {'super_admin' | 'moderator' | null} */
export function resolveStaffRole(profil, email) {
  const adminEmail = adminEmailFallback()
  if (email && adminEmail && email.toLowerCase() === adminEmail.toLowerCase()) {
    return 'super_admin'
  }
  if (!profil?.is_admin) return null
  if (profil.admin_role === 'moderator') return 'moderator'
  return 'super_admin'
}

export function isStaff(profil, email) {
  return resolveStaffRole(profil, email) != null
}
