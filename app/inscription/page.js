'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { inscrireAvecEmail, connecterAvecGoogle } from '@/lib/auth'

const OBJECTIFS = [
  { value: '', label: '—' },
  { value: 'louer', label: 'Trouver une location' },
  { value: 'acheter', label: 'Acheter un bien' },
  { value: 'services', label: 'Services à domicile' },
  { value: 'artisans', label: 'Trouver un artisan' },
  { value: 'decouverte', label: 'Parcourir le site' },
]

export default function Inscription() {
  const [type, setType] = useState('')
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [quartier, setQuartier] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [numeroCni, setNumeroCni] = useState('')
  const [objectifPrincipal, setObjectifPrincipal] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')
  const router = useRouter()

  const types = [
    {
      id: 'particulier',
      emoji: '🔍',
      titre: 'Particulier',
      desc: 'Explorer le site : logements, services, artisans',
    },
    {
      id: 'proprietaire',
      emoji: '🏠',
      titre: 'Propriétaire',
      desc: 'Mettre un bien en location ou en vente',
    },
    { id: 'agence', emoji: '🏢', titre: 'Agence', desc: 'Agence immobilière' },
    {
      id: 'artisan',
      emoji: '🔧',
      titre: 'Artisan',
      desc: 'Proposer des services',
    },
  ]

  const inscrire = async () => {
    if (!type) return setErreur('Choisissez un type de compte.')
    if (!prenom.trim() || !nom.trim()) return setErreur('Le prénom et le nom sont obligatoires.')
    if (!email || !motDePasse) return setErreur('Le courriel et le mot de passe sont obligatoires.')
    if (motDePasse.length < 6) return setErreur('Le mot de passe doit avoir au moins 6 caractères.')

    setChargement(true)
    setErreur('')

    try {
      await inscrireAvecEmail(email, motDePasse, {
        prenom: prenom.trim(),
        nom: nom.trim(),
        type,
        telephone,
        quartier,
        dateNaissance,
        numeroCni,
        objectifPrincipal,
      })
      router.push('/tableau-de-bord')
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setErreur('Cette adresse courriel est déjà utilisée.')
      } else if (err.code === 'auth/invalid-email') {
        setErreur('Adresse courriel invalide.')
      } else {
        setErreur('Erreur : ' + err.message)
      }
      setChargement(false)
    }
  }

  const inscrireGoogle = async () => {
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
    <div className="min-h-screen bg-[#F5F5F5]">
      <nav className="bg-[#1B5E20] px-4 py-4">
        <a href="/" className="text-white text-xl font-bold">
          Chez Moi CI
        </a>
      </nav>

      <div className="max-w-2xl mx-auto py-12 px-6">
        <h1 className="text-3xl font-bold text-[#1B5E20] mb-2">Créer un compte</h1>
        <p className="text-gray-500 mb-2">Rejoignez Chez Moi CI gratuitement</p>
        <p className="text-sm text-gray-600 mb-8">
          <span className="font-semibold text-[#1B5E20]">*</span> champ obligatoire ·{' '}
          <span className="text-gray-500">(optionnel)</span> vous pouvez laisser vide
        </p>

        <button
          type="button"
          onClick={inscrireGoogle}
          disabled={chargement}
          className="w-full border-2 border-gray-200 bg-white text-gray-700 py-3 rounded-xl font-bold mb-6 hover:bg-gray-50 flex items-center justify-center gap-3"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" width={20} height={20} />
          Continuer avec Google
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-gray-400 text-sm">ou avec votre courriel</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-gray-800 mb-1">Type de compte *</h2>
          <p className="text-xs text-gray-500 mb-4">Choisissez le profil qui vous correspond le mieux.</p>
          <div className="grid grid-cols-2 gap-3">
            {types.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  type === t.id
                    ? 'border-[#1B5E20] bg-[#E8F5E9]'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="text-2xl mb-1">{t.emoji}</div>
                <div className="font-bold text-gray-800 text-sm">{t.titre}</div>
                <div className="text-gray-400 text-xs">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-gray-800 mb-4">Vos informations</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Prénom <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex : Ismael"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  autoComplete="given-name"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Nom <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex : Koné"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  autoComplete="family-name"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Adresse courriel <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Téléphone / WhatsApp <span className="text-gray-400 text-xs font-normal">(optionnel)</span>
              </label>
              <input
                type="tel"
                placeholder="+225 07 00 00 00 00"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                autoComplete="tel"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Quartier à Abidjan <span className="text-gray-400 text-xs font-normal">(optionnel)</span>
              </label>
              <select
                value={quartier}
                onChange={(e) => setQuartier(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
              >
                <option value="">—</option>
                {[
                  'Cocody',
                  'Plateau',
                  'Marcory',
                  'Yopougon',
                  'Bingerville',
                  'Adjamé',
                  'Abobo',
                  'Koumassi',
                  'Port-Bouët',
                  'Treichville',
                ].map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Date de naissance <span className="text-gray-400 text-xs font-normal">(optionnel)</span>
              </label>
              <input
                type="date"
                value={dateNaissance}
                onChange={(e) => setDateNaissance(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Numéro de CNI <span className="text-gray-400 text-xs font-normal">(optionnel)</span>
              </label>
              <input
                type="text"
                placeholder="Ex : CI000000000"
                value={numeroCni}
                onChange={(e) => setNumeroCni(e.target.value)}
                autoComplete="off"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Votre objectif principal <span className="text-gray-400 text-xs font-normal">(optionnel)</span>
              </label>
              <select
                value={objectifPrincipal}
                onChange={(e) => setObjectifPrincipal(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
              >
                {OBJECTIFS.map((o) => (
                  <option key={o.value || 'none'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Mot de passe <span className="text-red-600">*</span>{' '}
                <span className="text-gray-400 font-normal text-xs">(min. 6 caractères)</span>
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && inscrire()}
                autoComplete="new-password"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] text-sm"
              />
            </div>
          </div>
        </div>

        {erreur && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {erreur}
          </div>
        )}

        <button
          type="button"
          onClick={inscrire}
          disabled={chargement}
          className="w-full bg-[#1B5E20] text-white py-4 rounded-xl font-bold text-lg hover:bg-green-800 disabled:opacity-50"
        >
          {chargement ? 'Création en cours...' : 'Créer mon compte gratuitement'}
        </button>

        <p className="text-center text-gray-500 mt-4 text-sm">
          Déjà un compte ?{' '}
          <a href="/connexion" className="text-[#1B5E20] font-bold hover:underline">
            Se connecter
          </a>
        </p>
      </div>
    </div>
  )
}
