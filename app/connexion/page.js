'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { connecterAvecEmail, connecterAvecGoogle } from '@/lib/auth'

export default function Connexion() {
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')
  const router = useRouter()

  const connecter = async () => {
    if (!email || !motDePasse) return setErreur('Remplissez tous les champs')
    setChargement(true)
    setErreur('')
    try {
      await connecterAvecEmail(email, motDePasse)
      router.push('/tableau-de-bord')
    } catch {
      setErreur('Courriel ou mot de passe incorrect')
      setChargement(false)
    }
  }

  const connecterGoogle = async () => {
    setChargement(true)
    setErreur('')
    try {
      await connecterAvecGoogle()
      router.push('/tableau-de-bord')
    } catch (err) {
      setErreur('Erreur Google : ' + err.message)
      setChargement(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <nav className="bg-[#1B5E20] px-4 py-4">
        <a href="/" className="text-white text-xl font-bold">
          Chez Moi CI
        </a>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-[#1B5E20] mb-1">Connexion</h1>
          <p className="text-gray-500 mb-6 text-sm">Bienvenue sur Chez Moi CI</p>

          <button
            type="button"
            onClick={connecterGoogle}
            disabled={chargement}
            className="w-full border-2 border-gray-200 bg-white text-gray-700 py-3 rounded-xl font-bold mb-5 hover:bg-gray-50 flex items-center justify-center gap-3"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" width={20} height={20} />
            Continuer avec Google
          </button>

          <div className="flex items-center gap-4 mb-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-sm">ou</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Adresse courriel</label>
              <input
                type="email"
                placeholder="votre@email.com"
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
