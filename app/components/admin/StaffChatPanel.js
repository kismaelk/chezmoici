'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchStaffDiscussionMessages,
  insertStaffDiscussionMessage,
  uploadStaffChatAttachment,
  listenStaffDiscussionMessages,
  updateStaffDiscussionMessage,
  softDeleteStaffDiscussionMessage,
  toggleStaffDiscussionReaction,
} from '@/lib/firestoreApp'

const REACTIONS = ['👍', '❤️', '😂', '🎉', '🔥']

const ROLE_STAFF_COURT = {
  super_admin: 'Super admin',
  admin: 'Admin',
  moderator: 'Modérateur',
  annonce_manager: 'Gestionnaire annonces',
}

export default function StaffChatPanel({ adminUid, isSuperAdmin, showToast }) {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const [pendingFile, setPendingFile] = useState(null)
  const bottomRef = useRef(null)
  const fileRef = useRef(null)

  const renderBody = (text) => {
    if (!text) return null
    const parts = String(text).split(/(@[\w.\-]+)/g)
    return parts.map((part, i) =>
      part.startsWith('@') ? (
        <span key={i} className="font-bold text-amber-200">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    )
  }

  const peutSupprimer = Boolean(isSuperAdmin)

  const refresh = useCallback(async () => {
    setMessages(await fetchStaffDiscussionMessages())
  }, [])

  useEffect(() => {
    let dispose = () => {}
    ;(async () => {
      try {
        await refresh()
        dispose = listenStaffDiscussionMessages(setMessages)
      } catch (e) {
        showToast?.('error', e?.message || 'Discussion indisponible')
      }
    })()
    return () => dispose()
  }, [refresh, showToast])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return messages
    return messages.filter(
      (m) =>
        !m.is_deleted &&
        (m.body?.toLowerCase().includes(q) ||
          m.author_nom?.toLowerCase().includes(q))
    )
  }, [messages, search])

  const envoyer = async () => {
    const t = draft.trim()
    if ((!t && !pendingFile) || sending) return
    setSending(true)
    try {
      let attachment = null
      if (pendingFile) {
        attachment = await uploadStaffChatAttachment(pendingFile)
        setPendingFile(null)
        if (fileRef.current) fileRef.current.value = ''
      }
      await insertStaffDiscussionMessage(t, attachment)
      setDraft('')
      await refresh()
    } catch (e) {
      showToast?.('error', e?.message || String(e))
    } finally {
      setSending(false)
    }
  }

  const sauverEdition = async (id) => {
    const t = editDraft.trim()
    if (!t) return
    try {
      await updateStaffDiscussionMessage(id, t)
      setEditingId(null)
      setEditDraft('')
      await refresh()
    } catch (e) {
      showToast?.('error', e?.message || 'Modification impossible')
    }
  }

  const supprimer = async (id) => {
    if (!peutSupprimer || !confirm('Masquer ce message pour toute l’équipe ?')) return
    try {
      await softDeleteStaffDiscussionMessage(id)
      await refresh()
    } catch (e) {
      showToast?.('error', e?.message || 'Suppression impossible')
    }
  }

  const reactionner = async (messageId, emoji) => {
    try {
      await toggleStaffDiscussionReaction(messageId, emoji)
      await refresh()
    } catch (e) {
      showToast?.('error', e?.message || 'Réaction impossible')
    }
  }

  return (
    <div className="flex max-h-[min(72vh,720px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
      <div className="space-y-2 border-b border-slate-200 bg-slate-900 px-4 py-3 text-slate-100">
        <p className="text-sm font-bold text-white">Discussion équipe</p>
        <p className="text-xs text-slate-400">Réactions, pièces jointes, @mentions, édition (30 min).</p>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-white"
        />
      </div>
      <div className="min-h-[280px] flex-1 space-y-3 overflow-y-auto bg-slate-100/80 p-4">
        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-slate-500">Aucun message.</p>
        )}
        {filtered.map((msg) => {
          const isMoi = msg.author_id === adminUid
          const roleCourt = ROLE_STAFF_COURT[msg.author_admin_role] || 'Staff'
          const peutEditer =
            isMoi &&
            !msg.is_deleted &&
            msg.created_at &&
            Date.now() - new Date(msg.created_at).getTime() < 30 * 60 * 1000
          if (msg.is_deleted) {
            return (
              <p key={msg.id} className="text-center text-xs italic text-slate-400">
                Message retiré
              </p>
            )
          }
          return (
            <div key={msg.id} className={`flex gap-3 ${isMoi ? 'flex-row-reverse' : ''}`}>
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isMoi ? 'bg-teal-600 text-white' : 'bg-slate-600 text-white'}`}
              >
                {(msg.author_nom || '?').charAt(0).toUpperCase()}
              </div>
              <div className={`flex max-w-[85%] min-w-0 flex-col ${isMoi ? 'items-end' : 'items-start'}`}>
                <div className="text-xs">
                  <span className="font-bold">{msg.author_nom || 'Sans nom'}</span>{' '}
                  <span className="text-slate-500">{roleCourt}</span>
                </div>
                {editingId === msg.id ? (
                  <div className="mt-1 w-full">
                    <textarea
                      rows={2}
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => void sauverEdition(msg.id)}
                      className="mt-1 text-xs font-bold text-teal-700"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <div
                    className={`mt-1 rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${isMoi ? 'bg-teal-600 text-white' : 'border bg-white text-slate-800'}`}
                  >
                    {renderBody(msg.body)}
                    {msg.attachment_url && (
                      <a
                        href={msg.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className={`mt-1 block text-xs underline ${isMoi ? 'text-teal-100' : 'text-teal-700'}`}
                      >
                        📎 {msg.attachment_name || 'Pièce jointe'}
                      </a>
                    )}
                  </div>
                )}
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => void reactionner(msg.id, emoji)}
                      className="rounded-full border px-1.5 py-0.5 text-xs"
                    >
                      {emoji}
                      {msg.reactions?.[emoji] ? ` ${msg.reactions[emoji]}` : ''}
                    </button>
                  ))}
                </div>
                {peutEditer && editingId !== msg.id && (
                  <button
                    type="button"
                    className="text-[10px] text-teal-700"
                    onClick={() => {
                      setEditingId(msg.id)
                      setEditDraft(msg.body)
                    }}
                  >
                    Modifier
                  </button>
                )}
                {peutSupprimer && (
                  <button
                    type="button"
                    className="text-[10px] text-red-600"
                    onClick={() => void supprimer(msg.id)}
                  >
                    Retirer
                  </button>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <div className="flex flex-col gap-2 border-t bg-white p-3">
        {pendingFile && (
          <p className="text-xs text-slate-600">
            📎 {pendingFile.name}{' '}
            <button type="button" className="font-bold text-red-600" onClick={() => setPendingFile(null)}>
              Retirer
            </button>
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <textarea
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void envoyer()
              }
            }}
            placeholder="Message… @nom pour mentionner"
            className="flex-1 rounded-xl border px-3 py-2 text-sm"
            disabled={sending}
          />
          <div className="flex shrink-0 gap-2">
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf,.doc,.docx"
              onChange={(e) => setPendingFile(e.target.files?.[0] || null)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={sending}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700"
            >
              📎
            </button>
            <button
              type="button"
              onClick={() => void envoyer()}
              disabled={sending || (!draft.trim() && !pendingFile)}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-45"
            >
              {sending ? '…' : 'Envoyer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
