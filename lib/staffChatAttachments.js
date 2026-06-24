export const STAFF_CHAT_BUCKET = 'staff-chat'

const STAFF_CHAT_PUBLIC_MARKER = `/storage/v1/object/public/${STAFF_CHAT_BUCKET}/`
const STAFF_CHAT_SIGNED_MARKER = `/storage/v1/object/sign/${STAFF_CHAT_BUCKET}/`

function cleanObjectPath(value) {
  const raw = String(value || '').trim()
  if (!raw) return null

  const withoutQuery = raw.split('?')[0].replace(/^\/+/, '')
  const withoutBucket = withoutQuery.startsWith(`${STAFF_CHAT_BUCKET}/`)
    ? withoutQuery.slice(STAFF_CHAT_BUCKET.length + 1)
    : withoutQuery

  let decoded = withoutBucket
  try {
    decoded = decodeURIComponent(withoutBucket)
  } catch {
    decoded = withoutBucket
  }

  const segments = decoded.split('/')
  if (!decoded || segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    return null
  }
  return decoded
}

export function normalizeStaffChatAttachmentPath(value) {
  const raw = String(value || '').trim()
  if (!raw) return null

  if (!/^https?:\/\//i.test(raw)) {
    return cleanObjectPath(raw)
  }

  let url
  try {
    url = new URL(raw)
  } catch {
    return null
  }

  const pathname = url.pathname
  const publicIndex = pathname.indexOf(STAFF_CHAT_PUBLIC_MARKER)
  if (publicIndex >= 0) {
    return cleanObjectPath(pathname.slice(publicIndex + STAFF_CHAT_PUBLIC_MARKER.length))
  }

  const signedIndex = pathname.indexOf(STAFF_CHAT_SIGNED_MARKER)
  if (signedIndex >= 0) {
    return cleanObjectPath(pathname.slice(signedIndex + STAFF_CHAT_SIGNED_MARKER.length))
  }

  return null
}
