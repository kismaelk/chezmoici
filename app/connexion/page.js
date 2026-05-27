'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SiteHeader from '@/app/components/SiteHeader'
import { libelleFinSuspension } from '@/lib/accountSuspension'
import { ErreurCompteSuspendu, connecterAvecEmail } from '@/lib/auth'

function destinationApresConnexion() {
  if (typeof window === 'undefined') return '/tableau-de-bord'
  const p = new URLSearchParams(window.location.search).get('redirect')
  if (p && p.startsWith('/') && !p.startsWith('//')) return p
  return '/tableau-de-bord'
}

export default function Connexion() {
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (new URLSearchParams(window.location.search).get('suspendu') === '1') {
      setErreur(
        'Votre compte est temporairement suspendu. Réessayez après la date indiquée par l’équipe ou contactez le support.'
      )
    }
  }, [])

  const connecter = async () => {
    if (!email || !motDePasse) return setErreur('Remplissez tous les champs')
    setChargement(true)
    setErreur('')
    try {
      await connecterAvecEmail(email, motDePasse)
      router.push(destinationApresConnexion())
      router.refresh()
    } catch (err) {
      if (err instanceof ErreurCompteSuspendu) {
        setErreur(
          err.suspendedUntil
            ? `Ce compte est suspendu jusqu’au ${libelleFinSuspension(err.suspendedUntil)}. Contactez le support si besoin.`
            : 'Ce compte est suspendu ou banni. Contactez le support si besoin.'
        )
      } else {
        setErreur('Courriel ou mot de passe incorrect')
      }
      setChargement(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <SiteHeader />

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-[#1B5E20] mb-1">Connexion</h1>
          <p className="text-gray-500 mb-6 text-sm">Bienvenue sur Chez Moi CI</p>
          <p className="text-[11px] text-gray-500 mb-5">
            Connectez-vous avec votre adresse courriel et votre mot de passe.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Adresse courriel</label>
              <input
                type="email"
                placeholder="compte.exemple@mail.ci"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && connecter()}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Mot de passe</label>
              <input
                type="password"
                placeholder="••••••••"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && connecter()}
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
            onClick={connecter}
            disabled={chargement}
            className="w-full bg-[#1B5E20] text-white py-3 rounded-xl font-bold mt-6 hover:bg-green-800 disabled:opacity-50"
          >
            {chargement ? 'Connexion...' : 'Se connecter'}
          </button>

          <a href="/mot-de-passe-oublie" className="block text-center text-gray-400 mt-3 text-sm hover:underline">
            Mot de passe oublié ?
          </a>

          <p className="text-center text-gray-500 mt-4 text-sm">
            Pas encore de compte ?{' '}
            <a href="/inscription" className="text-[#1B5E20] font-bold hover:underline">
              Créer un compte gratuit
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
