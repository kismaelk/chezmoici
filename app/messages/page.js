'use client'

import { observerConnexion } from '@/lib/auth'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  fetchMessagesForPair,
  sendMessageFirestore,
  listenUserConversationsSummary,
  listenPairMessages,
  fetchAllMessagesForUser,
  getProfilFirestore,
} from '@/lib/firestoreApp'
import PageVide from '@/app/components/PageVide'
import SiteHeader from '@/app/components/SiteHeader'

function timeMs(row) {
  const c = row?.created_at
  if (!c) return 0
  if (typeof c === 'string') return new Date(c).getTime()
  if (c?.seconds != null) return c.seconds * 1000
  return 0
}

export default function MessagesPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [conversations, setConversations] = useState([])
  const [selectedOtherId, setSelectedOtherId] = useState(null)
  const [selectedName, setSelectedName] = useState('')
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    const unsub = observerConnexion( (u) => {
      if (!u) router.push('/connexion')
      else setUser(u)
      setLoading(false)
    })
    return () => unsub()
  }, [router])

  useEffect(() => {
    if (!user) return

    async function enrich(rows) {
      const sorted = [...rows].sort(
        (a, b) => timeMs(b.lastMsg) - timeMs(a.lastMsg)
      )
      const out = await Promise.all(
        sorted.map(async ({ otherUserId, lastMsg }) => {
          const p = await getProfilFirestore(otherUserId)
          return {
            otherUserId,
            lastMsg,
            displayName: p?.nom || 'Utilisateur',
          }
        })
      )
      setConversations(out)
    }

    fetchAllMessagesForUser(user.uid).then(enrich)

    const unsub = listenUserConversationsSummary(user.uid, (rows) => {
      enrich(rows)
    })
    return unsub
  }, [user])

  useEffect(() => {
    if (!selectedOtherId || !user) return

    let unsubPair = () => {}

    async function boot() {
      const list = await fetchMessagesForPair(user.uid, selectedOtherId)
      setMessages(list)
      unsubPair = listenPairMessages(user.uid, selectedOtherId, setMessages)
    }

    boot()
    return () => unsubPair()
  }, [selectedOtherId, user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedOtherId || !user) return

    try {
      await sendMessageFirestore({
        sender_id: user.uid,
        receiver_id: selectedOtherId,
        content: newMessage.trim(),
      })
      setNewMessage('')
    } catch (err) {
      console.error('Erreur envoi message:', err)
    }
  }

  const openConversation = async (c) => {
    setSelectedOtherId(c.otherUserId)
    setSelectedName(c.displayName)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-xl text-gray-600">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <SiteHeader />
      <div className="flex flex-1 min-h-0 bg-white">
        <div className="w-1/3 bg-gray-50 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-[#1B5E20]">
            <h2 className="text-white text-xl font-bold">Messagerie</h2>
          </div>
          <div className="overflow-y-auto flex-1">
            {conversations.length === 0 ? (
              <div className="p-4 flex flex-1 items-center justify-center min-h-0">
                <PageVide
                  emoji="💬"
                  titre={"Aucune conversation pour l'instant"}
                  message="Vos conversations apparaîtront ici. Contactez un propriétaire depuis une annonce pour démarrer."
                  lienRetour="/tableau-de-bord"
                  labelRetour="Tableau de bord"
                  lienAction="/annonces"
                  labelAction="Parcourir les annonces"
                />
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.otherUserId}
                  onClick={() => openConversation(conv)}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition ${
                    selectedOtherId === conv.otherUserId
                      ? 'bg-blue-50 border-l-4 border-l-[#1B5E20]'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <p className="font-semibold text-gray-800">
                    {conv.displayName}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {conv.lastMsg?.content || 'Pas de contenu'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {conv.lastMsg?.created_at
                      ? new Date(conv.lastMsg.created_at).toLocaleString(
                          'fr-FR'
                        )
                      : ''}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="w-2/3 flex flex-col">
          {selectedOtherId ? (
            <>
              <div className="p-4 border-b border-gray-200 bg-white shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800">
                  {selectedName}
                </h3>
                <p className="text-sm text-gray-500">Conversation</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">
                      Aucun message. Commencez la conversation!
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === user.uid ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`px-4 py-2 rounded-lg max-w-xs ${
                          msg.sender_id === user.uid
                            ? 'bg-[#1B5E20] text-white rounded-br-none'
                            : 'bg-gray-200 text-gray-800 rounded-bl-none'
                        }`}
                      >
                        <p>{msg.content}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {msg.created_at
                            ? new Date(msg.created_at).toLocaleTimeString(
                                'fr-FR',
                                {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )
                            : ''}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSendMessage}
                className="p-4 border-t border-gray-200 bg-white"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Écrivez votre message..."
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-[#1B5E20]"
                  />
                  <button
                    type="submit"
                    className="bg-[#1B5E20] text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-800 transition"
                  >
                    Envoyer
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 text-lg">
                Sélectionnez une conversation pour commencer
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
