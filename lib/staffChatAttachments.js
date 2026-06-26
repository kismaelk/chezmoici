export const STAFF_CHAT_BUCKET = 'staff-chat'
export const STAFF_CHAT_SIGNED_URL_TTL_SECONDS = 15 * 60

export function extraireCheminPieceJointeStaffChat(value) {
  const raw = String(value || '').trim()
  if (!raw) return null

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw)
      const markers = [
        `/storage/v1/object/public/${STAFF_CHAT_BUCKET}/`,
        `/storage/v1/object/sign/${STAFF_CHAT_BUCKET}/`,
      ]
      const marker = markers.find((m) => url.pathname.includes(m))
      if (!marker) return null
      const encodedPath = url.pathname.slice(url.pathname.indexOf(marker) + marker.length)
      return decodeURIComponent(encodedPath).replace(/^\/+/, '') || null
    } catch {
      return null
    }
  }

  return raw.replace(/^\/+/, '').split('?')[0] || null
}
