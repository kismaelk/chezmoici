'use client'

import { useState } from 'react'
import { addContactMessage } from '@/lib/firestoreApp'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

export default function Contact() {
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [sujet, setSujet] = useState('')
  const [message, setMessage] = useState('')
  const [envoye, setEnvoye] = useState(false)
  const [chargement, setChargement] = useState(false)
  const envoyer = async () => {
    if (!nom || !email || !message) return
    setChargement(true)

    try {
      await addContactMessage({ nom, email, sujet, message })
    } catch {
      /* ignore */
    }

    setEnvoye(true)
    setChargement(false)
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <SiteHeader />

      <div className="max-w-2xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold text-[#1B5E20] mb-2">
          Nous contacter
        </h1>
        <p className="text-gray-500 mb-8">
          Une question ? Un problème ? On vous répond sous 24h.
        </p>

        {envoye ? (
          <div className="bg-white rounded-xl p-10 text-center shadow-sm">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-[#1B5E20] mb-2">
              Message envoyé !
            </h2>
            <p className="text-gray-500 mb-6">
              Nous vous répondrons à <strong>{email}</strong> sous 24 heures.
            </p>
            <a
              href="/"
              className="inline-block bg-[#1B5E20] text-white px-6 py-3 rounded-xl font-bold hover:bg-green-800"
            >
              Retour à l&apos;accueil
            </a>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Koné Ismael"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Adresse courriel *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Sujet
                </label>
                <select
                  value={sujet}
                  onChange={(e) => setSujet(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
                >
                  <option value="">Sélectionner un sujet</option>
                  <option>Question sur une annonce</option>
                  <option>Problème technique</option>
                  <option>Signaler une fraude</option>
                  <option>Demande de badge vérifié</option>
                  <option>Partenariat agence</option>
                  <option>Autre</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Message *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Décrivez votre demande..."
                  rows={5}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm resize-none"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={envoyer}
              disabled={chargement || !nom || !email || !message}
              className="w-full bg-[#1B5E20] text-white py-3 rounded-xl font-bold mt-6 hover:bg-green-800 disabled:opacity-50"
            >
              {chargement ? 'Envoi en cours...' : 'Envoyer le message'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          {[
            {
              emoji: '📧',
              titre: 'Courriel',
              valeur: 'contact@chezmoici.com',
            },
            {
              emoji: '📍',
              titre: 'Adresse',
              valeur: 'Abidjan, Côte d&apos;Ivoire',
            },
            {
              emoji: '⏰',
              titre: 'Disponibilité',
              valeur: 'Lun–Sam, 8h–20h',
            },
          ].map((info) => (
            <div
              key={info.titre}
              className="bg-white rounded-xl p-4 shadow-sm text-center"
            >
              <div className="text-3xl mb-2">{info.emoji}</div>
              <p className="font-bold text-gray-700 text-sm">{info.titre}</p>
              <p className="text-gray-500 text-xs mt-1">{info.valeur}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="bg-[#1B5E20] px-4 py-6 text-center mt-8">
        <p className="text-green-200 text-sm">
          © 2026 Chez Moi CI — Abidjan, Côte d&apos;Ivoire
        </p>
      </footer>
      <SiteFooter />
    </div>
  )
}
