export const STAFF_CHAT_BUCKET = 'staff-chat'
export const STAFF_CHAT_ATTACHMENT_SIGNED_URL_TTL_SECONDS = 60 * 60

const STORAGE_PATH_MARKERS = [
  `/storage/v1/object/public/${STAFF_CHAT_BUCKET}/`,
  `/storage/v1/object/sign/${STAFF_CHAT_BUCKET}/`,
]

function decodeStoragePath(path) {
  try {
    return path
      .split('/')
      .map((segment) => decodeURIComponent(segment))
      .join('/')
  } catch {
    return path
  }
}

export function normalizeStaffChatAttachmentPath(value) {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return null

  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
    return raw.replace(/^\/+/, '').replace(new RegExp(`^${STAFF_CHAT_BUCKET}/`), '') || null
  }

  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    return null
  }

  for (const marker of STORAGE_PATH_MARKERS) {
    const idx = parsed.pathname.indexOf(marker)
    if (idx !== -1) {
      const path = parsed.pathname.slice(idx + marker.length)
      return path ? decodeStoragePath(path) : null
    }
  }

  return null
}

export async function createStaffChatAttachmentSignedUrl(
  supabaseClient,
  value,
  expiresIn = STAFF_CHAT_ATTACHMENT_SIGNED_URL_TTL_SECONDS
) {
  const path = normalizeStaffChatAttachmentPath(value)
  if (!path) return null

  const { data, error } = await supabaseClient.storage
    .from(STAFF_CHAT_BUCKET)
    .createSignedUrl(path, expiresIn)
  if (error) throw error
  return data?.signedUrl || null
}
