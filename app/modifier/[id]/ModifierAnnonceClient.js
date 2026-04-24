'use client'

import { useState, useEffect } from 'react'
import { observerConnexion } from '@/lib/auth'
import { getAnnonceById, updateAnnonce } from '@/lib/firestoreApp'
import { useRouter, useParams } from 'next/navigation'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

export default function ModifierAnnonceClient() {
  const [chargement, setChargement] = useState(true)
  const [sauvegarde, setSauvegarde] = useState(false)
  const [succes, setSucces] = useState(false)
  const [erreur, setErreur] = useState('')
  const [type, setType] = useState('location')
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [prix, setPrix] = useState('')
  const [quartier, setQuartier] = useState('')
  const [statut, setStatut] = useState('actif')
  const router = useRouter()
  const params = useParams()
  const id = params?.id

  useEffect(() => {
    if (!id) {
      router.replace('/mes-annonces')
      return
    }
    const unsub = observerConnexion(async (user) => {
      if (!user) {
        router.push('/connexion')
        return
      }

      const data = await getAnnonceById(id)
      if (!data || data.utilisateur_id !== user.uid) {
        router.push('/mes-annonces')
        return
      }

      setType(data.type || 'location')
      setTitre(data.titre || '')
      setDescription(data.description || '')
      setPrix(data.prix?.toString() || '')
      setQuartier(data.quartier || '')
      setStatut(data.statut || 'actif')
      setChargement(false)
    })
    return () => unsub()
  }, [id, router])

  const sauvegarder = async () => {
    if (!titre) return setErreur('Le titre est obligatoire')
    if (!prix) return setErreur('Le prix est obligatoire')
    if (!quartier) return setErreur('Le quartier est obligatoire')

    setSauvegarde(true)
    setErreur('')

    try {
      await updateAnnonce(id, {
        type,
        titre,
        description,
        prix: parseInt(prix, 10),
        quartier,
        statut,
      })
    } catch {
      setErreur('Erreur lors de la sauvegarde')
      setSauvegarde(false)
      return
    }

    setSucces(true)
    setTimeout(() => router.push('/mes-annonces'), 2000)
  }

  if (chargement) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-[#1B5E20] font-bold">Chargement...</div>
      </div>
    )
  }

  if (succes) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="bg-white rounded-xl p-10 text-center shadow-sm max-w-md">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-[#1B5E20] mb-2">
            Annonce modifiée !
          </h2>
          <p className="text-gray-500">Redirection en cours...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <SiteHeader />

      <div className="max-w-2xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold text-[#1B5E20] mb-2">
          Modifier l&apos;annonce
        </h1>
        <p className="text-gray-500 mb-8">
          Mettez à jour les informations de votre bien
        </p>

        {/* TYPE */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-gray-800 mb-4">Type d&apos;annonce</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'location', emoji: '🔑', label: 'Location' },
              { id: 'vente', emoji: '🏠', label: 'Vente' },
              { id: 'service', emoji: '🔧', label: 'Service' },
              { id: 'artisan', emoji: '👷', label: 'Artisan' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`p-3 rounded-lg border-2 font-bold text-sm transition-all ${
                  type === t.id
                    ? 'border-[#1B5E20] bg-[#E8F5E9] text-[#1B5E20]'
                    : 'border-gray-200 text-gray-600 hover:border-green-300'
                }`}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* INFORMATIONS */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-gray-800 mb-4">Informations du bien</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Titre *
              </label>
              <input
                type="text"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20] resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Prix (FCFA) *
                </label>
                <input
                  type="number"
                  value={prix}
                  onChange={(e) => setPrix(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Quartier *
                </label>
                <select
                  value={quartier}
                  onChange={(e) => setQuartier(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20]"
                >
                  <option value="">Choisir</option>
                  <option>Cocody</option>
                  <option>Plateau</option>
                  <option>Marcory</option>
                  <option>Yopougon</option>
                  <option>Bingerville</option>
                  <option>Adjamé</option>
                  <option>Abobo</option>
                  <option>Koumassi</option>
                  <option>Port-Bouët</option>
                  <option>Treichville</option>
                  <option>Attécoubé</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Statut
              </label>
              <select
                value={statut}
                onChange={(e) => setStatut(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20]"
              >
                <option value="actif">✅ Actif — visible par tous</option>
                <option value="inactif">⏸️ Inactif — masqué temporairement</option>
              </select>
            </div>
          </div>
        </div>

        {erreur && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {erreur}
          </div>
        )}

        <div className="flex gap-3">
          <a
            href="/mes-annonces"
            className="flex-1 border-2 border-gray-300 text-gray-600 py-4 rounded-xl font-bold text-center hover:bg-gray-50"
          >
            Annuler
          </a>
          <button
            type="button"
            onClick={sauvegarder}
            disabled={sauvegarde}
            className="flex-1 bg-[#1B5E20] text-white py-4 rounded-xl font-bold hover:bg-green-800 disabled:opacity-50"
          >
            {sauvegarde ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
          </button>
        </div>
      </div>
      <SiteFooter />
    </div>
  )
}
