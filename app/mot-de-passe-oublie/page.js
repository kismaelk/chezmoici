'use client'

import { useState } from 'react'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

export default function MotDePasseOublie() {
  const [email, setEmail] = useState('')
  const [envoye, setEnvoye] = useState(false)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')

  const envoyer = async () => {
    if (!email) return setErreur('Entre ton adresse courriel')
    setChargement(true)
    setErreur('')

    try {
      const origin =
        typeof window !== 'undefined' ? window.location.origin : ''
      await sendPasswordResetEmail(auth, email, {
        url: `${origin}/nouveau-mot-de-passe`,
        handleCodeInApp: false,
      })
      setEnvoye(true)
    } catch {
      setErreur("Erreur lors de l'envoi. Vérifie ton adresse courriel.")
    }
    setChargement(false)
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <SiteHeader />

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 w-full max-w-md">
          {envoye ? (
            <div className="text-center">
              <div className="text-6xl mb-4">📧</div>
              <h1 className="text-2xl font-bold text-[#1B5E20] mb-3">
                Courriel envoyé !
              </h1>
              <p className="text-gray-500 mb-6">
                Un lien de réinitialisation a été envoyé à <strong>{email}</strong>.
                Vérifie ta boîte de réception.
              </p>
              <a
                href="/connexion"
                className="block w-full bg-[#1B5E20] text-white py-3 rounded-xl font-bold hover:bg-green-800 text-center"
              >
                Retour à la connexion
              </a>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-[#1B5E20] mb-1">
                Mot de passe oublié ?
              </h1>
              <p className="text-gray-500 mb-6 text-sm">
                Entre ton adresse courriel et on t&apos;envoie un lien pour
                réinitialiser ton mot de passe.
              </p>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Adresse courriel
                </label>
                <input
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && envoyer()}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm mb-4"
                />
              </div>
              {erreur && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                  {erreur}
                </div>
              )}
              <button
                type="button"
                onClick={envoyer}
                disabled={chargement}
                className="w-full bg-[#1B5E20] text-white py-3 rounded-xl font-bold hover:bg-green-800 disabled:opacity-50"
              >
                {chargement ? 'Envoi en cours...' : 'Envoyer le lien'}
              </button>
              <a
                href="/connexion"
                className="block text-center text-gray-500 mt-4 text-sm hover:underline"
              >
                ← Retour à la connexion
              </a>
            </>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  )
}
