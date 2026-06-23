export const STAFF_CHAT_BUCKET = 'staff-chat'
export const STAFF_CHAT_SIGNED_URL_EXPIRES_IN = 10 * 60

function cleanStoragePath(value) {
  const raw = String(value || '').trim()
  if (!raw) return null
  const withoutLeadingSlash = raw.replace(/^\/+/, '')
  const withoutBucket = withoutLeadingSlash.startsWith(`${STAFF_CHAT_BUCKET}/`)
    ? withoutLeadingSlash.slice(STAFF_CHAT_BUCKET.length + 1)
    : withoutLeadingSlash
  return withoutBucket || null
}

export function normalizeStaffChatAttachmentPath(value) {
  const raw = String(value || '').trim()
  if (!raw) return null

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw)
      const [, storagePart] = url.pathname.split('/storage/v1/object/')
      if (!storagePart) return null
      const parts = storagePart.split('/')
      const mode = parts.shift()
      const bucket = parts.shift()
      if (!['public', 'sign'].includes(mode) || bucket !== STAFF_CHAT_BUCKET) {
        return null
      }
      return cleanStoragePath(decodeURIComponent(parts.join('/')))
    } catch {
      return null
    }
  }

  return cleanStoragePath(raw)
}
