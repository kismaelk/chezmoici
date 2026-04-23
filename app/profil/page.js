'use client'
import { Suspense, useEffect, useState } from 'react'
import { observerConnexion } from '@/lib/auth'
import { getProfilFirestore, upsertProfilFirestore, uploadPhotoChemin } from '@/lib/firestoreApp'
import { useRouter, useSearchParams } from 'next/navigation'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

function ProfilContenu() {
  const searchParams = useSearchParams()
  const completRequis = searchParams.get('complet') === 'requis'

  const [utilisateur, setUtilisateur] = useState(null)
  const [profil, setProfil] = useState(null)
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [quartier, setQuartier] = useState('')
  const [photoFichier, setPhotoFichier] = useState(null)
  const [photoApercu, setPhotoApercu] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [sauvegarde, setSauvegarde] = useState(false)
  const [succes, setSucces] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const unsub = observerConnexion(async (user) => {
      if (!user) {
        router.push('/connexion')
        setChargement(false)
        return
      }
      setUtilisateur(user)
      const data = await getProfilFirestore(user.uid)
      if (data) {
        setProfil(data)
        setNom(data.nom || '')
        setTelephone(data.telephone || '')
        setQuartier(data.quartier || '')
      }
      setChargement(false)
    })
    return () => unsub()
  }, [router])

  const gererPhoto = (e) => {
    const fichier = e.target.files[0]
    if (!fichier) return
    setPhotoFichier(fichier)
    setPhotoApercu(URL.createObjectURL(fichier))
  }

  const sauvegarder = async () => {
    setSauvegarde(true)
    let photoUrl = profil?.photo_url

    if (photoFichier) {
      const chemin = `avatars/${utilisateur.uid}-${Date.now()}`
      try {
        photoUrl = await uploadPhotoChemin(chemin, photoFichier)
      } catch (e) {
        console.error(e)
      }
    }

    const payload = { nom, telephone, quartier, photo_url: photoUrl }

    try {
      await upsertProfilFirestore(utilisateur.uid, { ...payload, email: utilisateur.email })
      setProfil((prev) => ({ ...prev, ...payload }))
      setSucces(true)
      setTimeout(() => setSucces(false), 3000)
    } catch (error) {
      console.error('Erreur sauvegarde profil:', error)
      alert('Erreur lors de la sauvegarde : ' + error.message)
    } finally {
      setSauvegarde(false)
    }
  }

  const typeLabel = {
    particulier: '🔍 Particulier',
    locataire: '🔍 Particulier',
    proprietaire: '🏠 Propriétaire',
    agence: '🏢 Agence immobilière',
    artisan: '🔧 Artisan / Prestataire',
  }

  const badgeLabel = {
    bronze: '🔓 Bronze',
    argent: '🥈 Argent',
    or: '🥇 Or',
  }

  if (chargement) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-[#1B5E20] font-bold">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <SiteHeader />

      <div className="max-w-2xl mx-auto py-10 px-6">
        {completRequis && (
          <div className="bg-[#FFF8E1] border border-[#F9A825] rounded-xl p-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold text-gray-800">Profil incomplet</p>
              <p className="text-gray-600 text-sm">
                Vous devez compléter votre nom et votre téléphone avant de
                publier une annonce.
              </p>
            </div>
          </div>
        )}

        <h1 className="text-3xl font-bold text-[#1B5E20] mb-2">Mon profil</h1>
        <p className="text-gray-500 mb-8">
          Ces informations sont visibles par les autres utilisateurs.
        </p>

        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-gray-800 mb-4">Photo de profil</h2>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-[#E8F5E9] flex items-center justify-center flex-shrink-0">
              {photoApercu || profil?.photo_url ? (
                <img
                  src={photoApercu || profil?.photo_url}
                  alt="Photo de profil"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[#1B5E20] font-bold text-3xl">
                  {(profil?.prenom?.[0] || nom?.[0] || '?').toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <label className="cursor-pointer bg-white border-2 border-[#1B5E20] text-[#1B5E20] px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#E8F5E9] inline-block">
                Changer la photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={gererPhoto}
                  className="hidden"
                />
              </label>
              <p className="text-gray-400 text-xs mt-2">JPG ou PNG — Max 2 Mo</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-gray-800 mb-4">
            Informations personnelles
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Nom complet
              </label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Votre nom complet"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Téléphone / WhatsApp
              </label>
              <input
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+225 07 00 00 00 00"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20]"
              />
              <p className="text-gray-400 text-xs mt-1">
                Visible uniquement après qu&apos;un message soit échangé.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Quartier à Abidjan
              </label>
              <select
                value={quartier}
                onChange={(e) => setQuartier(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#1B5E20]"
              >
                <option value="">Sélectionner</option>
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
                <option>Hors de Côte d&apos;Ivoire</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Adresse courriel
              </label>
              <input
                type="email"
                value={utilisateur?.email || ''}
                disabled
                className="w-full border border-gray-100 rounded-lg px-4 py-3 bg-gray-50 text-gray-400 cursor-not-allowed"
              />
              <p className="text-gray-400 text-xs mt-1">
                L&apos;adresse courriel ne peut pas être modifiée.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-gray-800 mb-4">Statut du compte</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#F5F5F5] rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Type de compte</p>
              <p className="font-bold text-gray-800">
                {typeLabel[profil?.type] || '—'}
              </p>
            </div>
            <div className="bg-[#F5F5F5] rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Badge actuel</p>
              <p className="font-bold text-gray-800">
                {badgeLabel[profil?.badge] || '🔓 Bronze'}
              </p>
            </div>
            <div className="bg-[#F5F5F5] rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Membre depuis</p>
              <p className="font-bold text-gray-800">
                {(profil?.cree_le || profil?.created_at)
                  ? new Date(profil.cree_le || profil.created_at).toLocaleDateString('fr-FR', {
                      month: 'long',
                      year: 'numeric',
                    })
                  : '—'}
              </p>
            </div>
            <div className="bg-[#F5F5F5] rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Identifiant</p>
              <p className="font-bold text-gray-800 text-xs truncate">
                {utilisateur?.id?.slice(0, 8)}...
              </p>
            </div>
          </div>
        </div>

        {succes && (
          <div className="bg-[#E8F5E9] border border-[#1B5E20] text-[#1B5E20] px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
            <span>✅</span>
            <span className="font-bold">Profil mis à jour avec succès !</span>
          </div>
        )}

        <button
          type="button"
          onClick={sauvegarder}
          disabled={sauvegarde}
          className="w-full bg-[#1B5E20] text-white py-4 rounded-xl font-bold text-lg hover:bg-green-800 disabled:opacity-50"
        >
          {sauvegarde ? 'Sauvegarde en cours...' : 'Sauvegarder les modifications'}
        </button>
      </div>
      <SiteFooter />
    </div>
  )
}

export default function Profil() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center text-[#1B5E20] font-bold">
          Chargement...
        </div>
      }
    >
      <ProfilContenu />
    </Suspense>
  )
}
