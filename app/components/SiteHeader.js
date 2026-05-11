'use client'

import { useSyncExternalStore, useState } from 'react'
import { deconnecter } from '@/lib/auth'
import { isStaff } from '@/lib/staffRoles'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Notifications from '@/app/components/Notifications'
import { getHeaderAuthState, subscribeHeaderAuth } from '@/lib/headerAuthStore'

/** « Carte » est le bouton à côté de Publier (évite le doublon dans la barre) */
const LIENS = [
  { href: '/annonces?type=location', label: 'Louer' },
  { href: '/annonces?type=vente', label: 'Acheter' },
  { href: '/annonces?type=prestations', label: 'Services & pros' },
  { href: '/guide', label: 'Guide' },
  { href: '/packs', label: 'Packs' },
]

const SERVER_AUTH_SNAPSHOT = Object.freeze({ user: null, profil: null })

export default function SiteHeader() {
  const { user, profil } = useSyncExternalStore(
    subscribeHeaderAuth,
    getHeaderAuthState,
    () => SERVER_AUTH_SNAPSHOT
  )
  const [ouvert, setOuvert] = useState(false)
  const [menuMobile, setMenuMobile] = useState(false)
  const router = useRouter()

  const deconnexion = async () => {
    await deconnecter()
    setOuvert(false)
    router.push('/')
    router.refresh()
  }

  const initiale = (profil?.nom || user?.email || '?')[0].toUpperCase()
  const statutCompte = profil?.account_status || 'en_attente'
  const compteBadge = statutCompte === 'active'
    ? { text: 'Compte vérifié', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
    : { text: 'Vérification en attente', cls: 'bg-amber-100 text-amber-800 border-amber-200' }
  const accountLinks = [
    { href: '/tableau-de-bord', label: 'Tableau', icon: '🏠' },
    { href: '/publier', label: 'Publier', icon: '➕' },
    { href: '/mes-annonces', label: 'Annonces', icon: '📋' },
    { href: '/mes-avis-moderes', label: 'Avis modérés', icon: '🧾' },
    { href: '/favoris', label: 'Favoris', icon: '❤️' },
    { href: '/messages', label: 'Messages', icon: '💬' },
    { href: '/profil', label: 'Profil', icon: '👤' },
  ]
  if (user && isStaff(profil, user.email)) {
    accountLinks.splice(1, 0, { href: '/admin-portail', label: 'Administration', icon: '🛡️' })
  }

  return (
    <header className="sticky top-0 z-[1000] border-b border-emerald-100 bg-white/95 backdrop-blur shadow-md min-w-0 overflow-x-clip">
      <div className="max-w-7xl mx-auto flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-2 gap-y-1.5 px-2 sm:px-4 md:px-6 min-h-16 py-2 sm:py-0 sm:h-16 min-w-0">
        <Link href="/" className="flex items-center gap-2 shrink-0 min-w-0 max-w-[55%] sm:max-w-none">
          <div className="w-9 h-9 rounded-lg bg-[color:var(--chez-green,#1B5E20)] text-white flex items-center justify-center font-bold text-lg shadow-sm">
            CI
          </div>
          <div className="hidden sm:block min-w-0">
            <div className="font-bold text-[color:var(--chez-green,#1B5E20)] leading-tight truncate">
              Chez Moi CI
            </div>
            <div className="text-[10px] text-gray-400 leading-tight -mt-0.5 line-clamp-2 sm:line-clamp-1">
              Immobilier de confiance · Côte d&apos;Ivoire
            </div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1 shrink-0 min-w-0">
          {LIENS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-[color:var(--chez-green,#1B5E20)] transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-1 sm:flex-none flex-wrap items-center justify-end gap-1 sm:gap-2 min-w-0 basis-full sm:basis-auto">
          <Link
            href="/carte"
            className="inline-flex items-center justify-center gap-1 sm:gap-1.5 shrink-0 border border-[color:var(--chez-green,#1B5E20)]/25 text-[color:var(--chez-green,#1B5E20)] px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-bold hover:bg-emerald-50 transition-colors"
          >
            <span aria-hidden>🗺️</span>
            <span className="hidden sm:inline">Carte</span>
          </Link>
          <Link
            href="/publier"
            className="hidden md:inline-flex items-center gap-1 bg-[#F9A825] text-white px-2.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold hover:bg-yellow-600 whitespace-nowrap shrink-0"
          >
            <span className="text-base leading-none">+</span> Publier
          </Link>

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
                  {profil?.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profil.photo_url}
                      alt="photo profil"
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#1B5E20] text-white flex items-center justify-center font-bold text-sm">
                      {initiale}
                    </div>
                  )}
                  <span className="hidden sm:inline text-sm font-medium text-gray-700">
                    {profil?.nom?.split(' ')[0] || 'Compte'}
                  </span>
                  <span className={`hidden md:inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${compteBadge.cls}`}>
                    {compteBadge.text}
                  </span>
                </button>
                {ouvert && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-100 shadow-lg py-1.5 text-xs"
                    onMouseLeave={() => setOuvert(false)}
                  >
                    <div className="px-3 py-2 border-b border-gray-100">
                      <div className="font-bold text-gray-800 truncate text-sm">
                        {profil?.nom || user.email}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {user.email}
                      </div>
                    </div>
                    {accountLinks.map((m) => (
                      <Link
                        key={m.href}
                        href={m.href}
                        className="flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-[#E8F5E9] hover:text-[#1B5E20]"
                        onClick={() => setOuvert(false)}
                      >
                        <span className="text-[13px] leading-none">{m.icon}</span>
                        <span className="font-semibold">{m.label}</span>
                      </Link>
                    ))}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={deconnexion}
                        className="w-full text-left px-3 py-1.5 text-red-500 hover:bg-red-50 flex items-center gap-2 font-semibold"
                      >
                        <span className="text-[13px] leading-none">↩︎</span> Déconnexion
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/connexion"
                className="hidden sm:inline-flex text-sm font-medium text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100"
              >
                Connexion
              </Link>
              <Link
                href="/inscription"
                className="inline-flex items-center justify-center bg-[#1B5E20] text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold hover:bg-green-800 whitespace-nowrap shrink-0"
              >
                S&apos;inscrire
              </Link>
            </>
          )}

          <button
            type="button"
            className="lg:hidden shrink-0 text-gray-600 p-2 rounded-lg hover:bg-gray-100"
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
            <Link
              key={l.href}
              href={l.href}
              className="block px-3 py-2 text-gray-700 hover:bg-[#E8F5E9] hover:text-[#1B5E20] rounded-lg text-sm font-medium"
              onClick={() => setMenuMobile(false)}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/calculateur-pret"
            className="block px-3 py-2 text-gray-700 hover:bg-[#E8F5E9] hover:text-[#1B5E20] rounded-lg text-sm font-medium"
            onClick={() => setMenuMobile(false)}
          >
            Calculateur de prêt
          </Link>
          <Link
            href="/estimation"
            className="block px-3 py-2 text-gray-700 hover:bg-[#E8F5E9] hover:text-[#1B5E20] rounded-lg text-sm font-medium"
            onClick={() => setMenuMobile(false)}
          >
            Estimation de bien
          </Link>
          <Link
            href="/guide"
            className="block px-3 py-2 text-gray-700 hover:bg-[#E8F5E9] hover:text-[#1B5E20] rounded-lg text-sm font-medium"
            onClick={() => setMenuMobile(false)}
          >
            Guide achat & financement
          </Link>
          {!user && (
            <Link
              href="/connexion"
              className="block px-3 py-2 text-gray-700 hover:bg-[#E8F5E9] hover:text-[#1B5E20] rounded-lg text-sm font-medium"
              onClick={() => setMenuMobile(false)}
            >
              Connexion
            </Link>
          )}
          <Link
            href="/publier"
            className="block mt-2 mx-1 bg-[#F9A825] text-white px-4 py-2 rounded-lg text-sm font-bold text-center hover:bg-yellow-600"
            onClick={() => setMenuMobile(false)}
          >
            + Publier une annonce
          </Link>
        </div>
      )}
    </header>
  )
}
