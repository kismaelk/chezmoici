'use client'
import { useEffect, useState } from 'react'
import { observerConnexion } from '@/lib/auth'
import { getProfilFirestore } from '@/lib/firestoreApp'
import { useRouter } from 'next/navigation'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

export default function TableauDeBord() {
  const [utilisateur, setUtilisateur] = useState(null)
  const [profil, setProfil] = useState(null)
  const [chargement, setChargement] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsub = observerConnexion(async (user) => {
      if (!user) {
        router.push('/connexion')
        setChargement(false)
        return
      }
      setUtilisateur(user)
      const p = await getProfilFirestore(user.uid)
      setProfil(p)
      setChargement(false)
    })
    return () => unsub()
  }, [router])

  if (chargement) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-[#1B5E20] font-bold text-lg">Chargement...</div>
      </div>
    )
  }

  const menuParticulier = [
    { emoji: "🔍", titre: "Chercher un logement", desc: "Annonces location & vente", lien: "/annonces" },
    { emoji: "🛠️", titre: "Services & artisans", desc: "Prestataires et artisans à Abidjan", lien: "/services" },
    { emoji: "💬", titre: "Mes messages", desc: "Conversations avec les propriétaires", lien: "/messages" },
    { emoji: "❤️", titre: "Mes favoris", desc: "Annonces sauvegardées", lien: "/favoris" },
    { emoji: "📋", titre: "Mes demandes", desc: "Suivi de vos demandes", lien: "/demandes" },
  ]

  const menuParType = {
    particulier: menuParticulier,
    locataire: menuParticulier,
    proprietaire: [
      { emoji: "➕", titre: "Publier une annonce", desc: "Mettre un bien en location ou en vente", lien: "/publier" },
      { emoji: "🏠", titre: "Mes annonces", desc: "Gérer mes biens publiés", lien: "/mes-annonces" },
      { emoji: "💬", titre: "Mes messages", desc: "Conversations avec les locataires", lien: "/messages" },
      { emoji: "📊", titre: "Statistiques", desc: "Vues, contacts, performance", lien: "/stats" },
      { emoji: "✅", titre: "Badge Vérifié", desc: "Faire vérifier mon bien", lien: "/badge" },
    ],
    agence: [
      { emoji: "➕", titre: "Publier une annonce", desc: "Ajouter un bien au catalogue", lien: "/publier" },
      { emoji: "🏢", titre: "Mes annonces", desc: "Gérer le catalogue de l'agence", lien: "/mes-annonces" },
      { emoji: "💬", titre: "Mes messages", desc: "Conversations avec les clients", lien: "/messages" },
      { emoji: "📊", titre: "Statistiques", desc: "Vues, contacts, performance", lien: "/stats" },
    ],
    artisan: [
      { emoji: "👤", titre: "Mon profil", desc: "Compléter mon profil prestataire", lien: "/profil" },
      { emoji: "💬", titre: "Mes messages", desc: "Demandes de clients", lien: "/messages" },
      { emoji: "⭐", titre: "Mes avis", desc: "Notes et commentaires clients", lien: "/avis" },
      { emoji: "✅", titre: "Certification", desc: "Obtenir le badge certifié", lien: "/badge" },
    ],
  }

  const typeLabel = {
    particulier: "Particulier",
    locataire: "Particulier",
    proprietaire: "Propriétaire",
    agence: "Agence immobilière",
    artisan: "Artisan / Prestataire",
  }

  const menu = menuParType[profil?.type] || menuParType.particulier

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <SiteHeader />

      <div className="max-w-4xl mx-auto py-6 sm:py-10 px-4 sm:px-6 w-full min-w-0">

        {/* BIENVENUE */}
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm mb-6 sm:mb-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1B5E20] mb-1 break-words">
              Bonjour, {profil?.prenom || profil?.nom?.split(' ')[0] || 'bienvenue'} 👋
            </h1>
            <p className="text-gray-500 text-sm sm:text-base">
              Compte {typeLabel[profil?.type] || 'utilisateur'}
            </p>
          </div>
          <div className="bg-[#E8F5E9] px-3 sm:px-4 py-2 rounded-full self-start sm:self-center shrink-0">
            <span className="text-[#1B5E20] font-bold text-xs sm:text-sm">
              Badge {profil?.badge || 'Bronze'} 🔓
            </span>
          </div>
        </div>

        {/* MENU ACTIONS */}
        <h2 className="text-base sm:text-lg font-bold text-gray-700 mb-3 sm:mb-4">Que voulez-vous faire ?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-8">
          {menu.map((item) => (
            <a
              key={item.titre}
              href={item.lien}
              className="bg-white rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md border border-gray-100 flex items-start gap-3 sm:gap-4 group min-w-0"
            >
              <div className="text-2xl sm:text-3xl shrink-0">{item.emoji}</div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-gray-800 group-hover:text-[#1B5E20] text-sm sm:text-base leading-snug break-words">
                  {item.titre}
                </h3>
                <p className="text-gray-500 text-xs sm:text-sm mt-1 leading-snug break-words">{item.desc}</p>
              </div>
            </a>
          ))}
        </div>

        {/* PROFIL INCOMPLET */}
        {(!profil?.telephone || !profil?.quartier) && (
          <div className="bg-[#FFF8E1] border border-[#F9A825] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="text-2xl shrink-0">⚠️</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-800">Profil incomplet</h3>
              <p className="text-gray-600 text-sm mt-0.5">
                Ajoutez votre téléphone et quartier pour que les autres puissent vous contacter.
              </p>
            </div>
            <a
              href="/profil"
              className="bg-[#F9A825] text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-yellow-600 text-center sm:text-left sm:shrink-0"
            >
              Compléter →
            </a>
          </div>
        )}

      </div>

      <SiteFooter />
    </div>
  )
}