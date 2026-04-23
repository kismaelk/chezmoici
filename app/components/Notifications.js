'use client'

import { useEffect, useState } from 'react'
import { fetchNotifications, listenNotifications, markAllNotificationsRead } from '@/lib/firestoreApp'

export default function Notifications({ utilisateurId }) {
  const [notifications, setNotifications] = useState([])
  const [ouvert, setOuvert] = useState(false)

  useEffect(() => {
    if (!utilisateurId) return

    let unsub = () => {}
    ;(async () => {
      const initial = await fetchNotifications(utilisateurId)
      setNotifications(initial)
      try {
        unsub = listenNotifications(utilisateurId, setNotifications)
      } catch {
        /* fallback: pas de temps réel */
      }
    })()

    return () => unsub()
  }, [utilisateurId])

  const marquerToutLu = async () => {
    await markAllNotificationsRead(utilisateurId)
    setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })))
  }

  const nonLues = notifications.filter((n) => !n.lu).length

  const formaterDate = (date) => {
    const d = new Date(date)
    if (Number.isNaN(d.getTime())) return ''
    const diff = Date.now() - d.getTime()
    if (diff < 60000) return "À l'instant"
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`
    return d.toLocaleDateString('fr-FR')
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOuvert(!ouvert)}
        className="relative text-gray-600 p-2 hover:bg-gray-100 rounded-lg"
        aria-expanded={ouvert}
        aria-label="Notifications"
      >
        <span className="text-xl">🔔</span>
        {nonLues > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#F9A825] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
            {nonLues > 9 ? '9+' : nonLues}
          </span>
        )}
      </button>

      {ouvert && (
        <div className="absolute right-0 top-12 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">Notifications</h3>
            {nonLues > 0 && (
              <button
                type="button"
                onClick={marquerToutLu}
                className="text-xs text-[#1B5E20] font-bold hover:underline"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                Aucune notification
              </div>
            ) : (
              notifications.map((notif) => (
                <a
                  key={notif.id}
                  href={notif.lien || '/messages'}
                  className={`block p-4 border-b border-gray-50 hover:bg-gray-50 ${!notif.lu ? 'bg-[#E8F5E9]' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0">
                      {notif.type === 'message' ? '💬' : '🔔'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-800">{notif.titre}</p>
                      <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">
                        {notif.contenu}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        {formaterDate(notif.created_at)}
                      </p>
                    </div>
                    {!notif.lu && (
                      <div className="w-2 h-2 bg-[#1B5E20] rounded-full flex-shrink-0 mt-1" />
                    )}
                  </div>
                </a>
              ))
            )}
          </div>

          <a
            href="/messages"
            className="block p-3 text-center text-[#1B5E20] font-bold text-sm hover:bg-gray-50 border-t border-gray-100"
          >
            Voir tous les messages →
          </a>
        </div>
      )}
    </div>
  )
}
