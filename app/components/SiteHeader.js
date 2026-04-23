'use client'

import { useEffect, useState } from 'react'
import { observerConnexion, deconnecter } from '@/lib/auth'
import { getProfilFirestore } from '@/lib/firestoreApp'
import { useRouter } from 'next/navigation'
import Notifications from '@/app/components/Notifications'

const LIENS = [
  { href: '/annonces?type=location', label: 'Louer' },
  { href: '/annonces?type=vente', label: 'Acheter' },
  { href: '/services', label: 'Services' },
  { href: '/artisans', label: 'Artisans' },
  { href: '/carte', label: 'Carte' },
  { href: '/packs', label: 'Packs' },
]

export default function SiteHeader({ variant = 'default' }) {
  const [user, setUser] = useState(null)
  const [profil, setProfil] = useState(null)
  const [ouvert, setOuvert] = useState(false)
  const [menuMobile, setMenuMobile] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const unsub = observerConnexion(async (u) => {
      setUser(u)
      if (u) {
        const p = await getProfilFirestore(u.uid)
        setProfil(p)
      } else {
        setProfil(null)
      }
    })
    return () => unsub()
  }, [])

  const deconnexion = async () => {
    await deconnecter()
    setOuvert(false)
    router.push('/')
    router.refresh()
  }

  const initiale = (profil?.nom || user?.email || '?')[0].toUpperCase()

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-6 h-16">
        <a href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-9 h-9 rounded-lg bg-[#1B5E20] text-white flex items-center justify-center font-bold text-lg">
            CI
          </div>
          <div className="hidden sm:block">
            <div className="font-bold text-[#1B5E20] leading-tight">
              Chez Moi CI
            </div>
            <div className="text-[10px] text-gray-400 leading-tight -mt-0.5">
              Immobilier de confiance · Abidjan
            </div>
          </div>
        </a>

        <nav className="hidden lg:flex items-center gap-1">
          {LIENS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-[#E8F5E9] hover:text-[#1B5E20] transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="/publier"
            className="hidden md:inline-flex items-center gap-1 bg-[#F9A825] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-yellow-600"
          >
            <span className="text-base leading-none">+</span> Publier
          </a>

          {user ? (
            <>
              <Notifications utilisateurId={user.uid} />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOuvert((v) => !v)}
                  className="flex items-center gap-2 border border-gray-200 rounded-full pl-2 pr-3 py-1.5 hover:border-[#1B5E20] hover:bg-[#E8F5E9] transition-colors"
                  aria-label="Menu du compte"
                >
                  <div className="w-7 h-7 rounded-full bg-[#1B5E20] text-white flex items-center justify-center font-bold text-sm">
                    {initiale}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium text-gray-700">
                    {profil?.nom?.split(' ')[0] || 'Compte'}
                  </span>
                </button>
                {ouvert && (
                  <div
                    className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-gray-100 shadow-lg py-2 text-sm"
                    onMouseLeave={() => setOuvert(false)}
                  >
                    <div className="px-4 py-2 border-b border-gray-100">
                      <div className="font-bold text-gray-800 truncate">
                        {profil?.nom || user.email}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {user.email}
                      </div>
                    </div>
                    {[
                      { href: '/tableau-de-bord', label: 'Tableau de bord', icon: '🏠' },
                      { href: '/publier', label: 'Publier une annonce', icon: '➕' },
                      { href: '/mes-annonces', label: 'Mes annonces', icon: '📋' },
                      { href: '/favoris', label: 'Mes favoris', icon: '❤️' },
                      { href: '/messages', label: 'Mes messages', icon: '💬' },
                      { href: '/demandes', label: 'Mes demandes', icon: '📬' },
                      { href: '/profil', label: 'Mon profil', icon: '👤' },
                      { href: '/badge', label: 'Badge Vérifié', icon: '✅' },
                    ].map((m) => (
                      <a
                        key={m.href}
                        href={m.href}
                        className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-[#E8F5E9] hover:text-[#1B5E20]"
                      >
                        <span>{m.icon}</span>
                        <span>{m.label}</span>
                      </a>
                    ))}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={deconnexion}
                        className="w-full text-left px-4 py-2 text-red-500 hover:bg-red-50 flex items-center gap-3"
                      >
                        <span>↩︎</span> Se déconnecter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <a
                href="/connexion"
                className="hidden sm:inline-flex text-sm font-medium text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100"
              >
                Connexion
              </a>
              <a
                href="/inscription"
                className="inline-flex bg-[#1B5E20] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-800"
              >
                S&apos;inscrire
              </a>
            </>
          )}

          <button
            type="button"
            className="lg:hidden ml-1 text-gray-600 p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setMenuMobile((v) => !v)}
            aria-label="Menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuMobile ? (
                <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
              ) : (
                <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuMobile && (
        <div className="lg:hidden bg-white border-t border-gray-100 px-2 py-2">
          {LIENS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="block px-3 py-2 text-gray-700 hover:bg-[#E8F5E9] hover:text-[#1B5E20] rounded-lg text-sm font-medium"
            >
              {l.label}
            </a>
          ))}
          <a
            href="/calculateur-pret"
            className="block px-3 py-2 text-gray-700 hover:bg-[#E8F5E9] hover:text-[#1B5E20] rounded-lg text-sm font-medium"
          >
            Calculateur de prêt
          </a>
          <a
            href="/estimation"
            className="block px-3 py-2 text-gray-700 hover:bg-[#E8F5E9] hover:text-[#1B5E20] rounded-lg text-sm font-medium"
          >
            Estimation de bien
          </a>
          {!user && (
            <a
              href="/connexion"
              className="block px-3 py-2 text-gray-700 hover:bg-[#E8F5E9] hover:text-[#1B5E20] rounded-lg text-sm font-medium"
            >
              Connexion
            </a>
          )}
          <a
            href="/publier"
            className="block mt-2 mx-1 bg-[#F9A825] text-white px-4 py-2 rounded-lg text-sm font-bold text-center hover:bg-yellow-600"
          >
            + Publier une annonce
          </a>
        </div>
      )}
    </header>
  )
}
