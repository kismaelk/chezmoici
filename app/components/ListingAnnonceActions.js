'use client'

import Link from 'next/link'
import { buildHrefCarteAnnonce, IconePinCarte } from '@/lib/listingCarteLink'

/** Boutons Carte + Détails pour une carte annonce (liste compacte). */
export default function ListingAnnonceActions({
  annonceId,
  filtresPourCarte = {},
  layout = 'row',
  className = '',
}) {
  const hrefDetail = `/annonces/${annonceId}`
  const hrefCarte = buildHrefCarteAnnonce(annonceId, filtresPourCarte)

  if (layout === 'overlay') {
    return (
      <Link
        href={hrefCarte}
        title="Voir sur la carte"
        className={`absolute bottom-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-md ring-1 ring-gray-200 hover:bg-emerald-50 ${className}`}
      >
        <IconePinCarte className="h-6 w-6" />
        <span className="sr-only">Carte</span>
      </Link>
    )
  }

  return (
    <div className={`flex shrink-0 flex-col gap-1 ${className}`}>
      <Link
        href={hrefCarte}
        title="Voir sur la carte"
        className="flex flex-col items-center justify-center gap-0.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[10px] font-bold uppercase text-emerald-900 hover:bg-emerald-100"
      >
        <IconePinCarte className="h-6 w-6" />
        Carte
      </Link>
      <Link
        href={hrefDetail}
        className="rounded-lg bg-[#1B5E20] px-2 py-1.5 text-center text-[10px] font-bold text-white hover:bg-[#2E7D32]"
      >
        Détails
      </Link>
    </div>
  )
}
