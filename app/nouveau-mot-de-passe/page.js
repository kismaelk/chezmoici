'use client'

import { Suspense, useEffect, useState } from 'react'
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth'
import { useRouter, useSearchParams } from 'next/navigation'
import { auth } from '@/lib/firebase'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

function NouveauMotDePasseContenu() {
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [chargement, setChargement] = useState(false)
  const [succes, setSucces] = useState(false)
  const [erreur, setErreur] = useState('')
  const [sessionPrete, setSessionPrete] = useState(false)
  const [verification, setVerification] = useState(true)

  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const mode = searchParams.get('mode')
    const code = searchParams.get('oobCode')
    if (mode !== 'resetPassword' || !code) {
      setVerification(false)
      setSessionPrete(false)
      setErreur('')
      return
    }
    verifyPasswordResetCode(auth, code)
      .then(() => {
        setSessionPrete(true)
        setVerification(false)
      })
      .catch(() => {
        setSessionPrete(false)
        setVerification(false)
        setErreur('Lien invalide ou expiré. Demandez un nouveau courriel.')
      })
  }, [searchParams])

  const mettreAJour = async () => {
    const code = searchParams.get('oobCode')
    if (!sessionPrete || !code) {
      return setErreur(
        'Session de récupération non établie. Vérifiez le lien reçu par courriel.'
      )
    }
    if (!motDePasse) return setErreur('Entre un nouveau mot de passe')
    if (motDePasse.length < 6)
      return setErreur('Le mot de passe doit avoir au moins 6 caractères')
    if (motDePasse !== confirmation)
      return setErreur('Les deux mots de passe ne correspondent pas')

    setChargement(true)
    setErreur('')

    try {
      await confirmPasswordReset(auth, code, motDePasse)
      setSucces(true)
      setTimeout(() => router.push('/tableau-de-bord'), 2500)
    } catch (e) {
      setErreur(
        e?.message
          ? `Erreur : ${e.message}`
          : 'Impossible de mettre à jour le mot de passe.'
      )
    }
    setChargement(false)
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <SiteHeader />

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 w-full max-w-md">
          {succes ? (
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h1 className="text-2xl font-bold text-[#1B5E20] mb-2">
                Mot de passe mis à jour !
              </h1>
              <p className="text-gray-500">
                Redirection vers votre tableau de bord…
              </p>
            </div>
          ) : verification ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4 animate-pulse">🔐</div>
              <h1 className="text-xl font-bold text-gray-700 mb-2">
                Vérification du lien…
              </h1>
              <p className="text-gray-400 text-sm">
                Si cette page reste bloquée, le lien a peut-être expiré.{' '}
                <a
                  href="/mot-de-passe-oublie"
                  className="text-[#1B5E20] font-bold hover:underline"
                >
                  Demander un nouveau lien →
                </a>
              </p>
            </div>
          ) : !sessionPrete ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-4">🔐</div>
              <h1 className="text-xl font-bold text-gray-700 mb-2">
                Lien non valide
              </h1>
              {erreur && (
                <p className="text-red-600 text-sm mb-4">{erreur}</p>
              )}
              <a
                href="/mot-de-passe-oublie"
                className="text-[#1B5E20] font-bold text-sm hover:underline"
              >
                Demander un nouveau lien →
              </a>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-[#1B5E20] mb-1">
                Nouveau mot de passe
              </h1>
              <p className="text-gray-500 mb-6 text-sm">
                Choisissez un nouveau mot de passe sécurisé (min. 6 caractères).
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && mettreAJour()}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && mettreAJour()}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
                  />
                </div>
              </div>

              {erreur && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mt-4 text-sm">
                  {erreur}
                </div>
              )}

              <button
                type="button"
                onClick={mettreAJour}
                disabled={chargement}
                className="w-full bg-[#1B5E20] text-white py-3 rounded-xl font-bold mt-6 hover:bg-green-800 disabled:opacity-50 transition-colors"
              >
                {chargement ? 'Mise à jour en cours…' : 'Mettre à jour le mot de passe'}
              </button>

              <a
                href="/connexion"
                className="block text-center text-gray-400 mt-4 text-sm hover:underline"
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

export default function NouveauMotDePasse() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
          <SiteHeader />
          <div className="flex-1 flex items-center justify-center px-4 py-8">
            <div className="text-[#1B5E20] font-bold">Chargement…</div>
          </div>
          <SiteFooter />
        </div>
      }
    >
      <NouveauMotDePasseContenu />
    </Suspense>
  )
}
