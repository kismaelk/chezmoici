/** Profil suspendu si `account_suspended_until` est une date future. */
export function estCompteSuspenduJusqua(accountSuspendedUntil) {
  if (accountSuspendedUntil == null || accountSuspendedUntil === '') return false
  const t = new Date(accountSuspendedUntil).getTime()
  if (Number.isNaN(t)) return false
  return t > Date.now()
}

export function libelleFinSuspension(accountSuspendedUntil) {
  try {
    return new Date(accountSuspendedUntil).toLocaleString('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return String(accountSuspendedUntil)
  }
}
