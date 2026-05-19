/** Limite simple en mémoire pour routes /api/admin/* (par utilisateur). */
const buckets = new Map()

/**
 * @param {string} key ex. userId + route
 * @param {{ limit?: number, windowMs?: number }} opts
 * @returns {{ ok: true } | { ok: false, retryAfterSec: number }}
 */
export function checkAdminRateLimit(key, opts = {}) {
  const limit = opts.limit ?? 40
  const windowMs = opts.windowMs ?? 60_000
  const now = Date.now()
  let entry = buckets.get(key)
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs }
    buckets.set(key, entry)
  }
  entry.count += 1
  if (entry.count > limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) }
  }
  return { ok: true }
}

export function adminRateLimitKey(userId, routeName) {
  return `${userId || 'anon'}:${routeName}`
}
