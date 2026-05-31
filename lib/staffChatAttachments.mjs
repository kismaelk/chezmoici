const STAFF_CHAT_PUBLIC_URL_RE = /\/storage\/v1\/object\/public\/staff-chat\/([^?#]+)/

export function extractStaffChatStoragePath(value) {
  if (!value) return null
  const raw = String(value).trim()
  if (!raw) return null

  const publicMatch = raw.match(STAFF_CHAT_PUBLIC_URL_RE)
  const candidate = publicMatch ? publicMatch[1] : raw
  if (/^https?:\/\//i.test(candidate)) return null

  const withoutQuery = candidate.split('?')[0].replace(/^\/+/, '')
  if (!withoutQuery || withoutQuery.includes('..')) return null

  try {
    return decodeURI(withoutQuery)
  } catch {
    return withoutQuery
  }
}
