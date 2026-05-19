'use client'

import Link from 'next/link'
import { buildHrefCarteAnnonce, IconePinCarte } from '@/lib/listingCarteLink'

/** Boutons Carte + Détails pour une carte annonce (liste / grille). */
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
      <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-2 p-3 ${className}`}>
        <Link
          href={hrefDetail}
          className="pointer-events-auto rounded-lg bg-[#1B5E20]/95 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-md hover:bg-[#2E7D32]"
        >
          Détails
        </Link>
        <Link
          href={hrefCarte}
          title="Voir sur la carte"
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-md ring-1 ring-gray-200 hover:bg-emerald-50"
        >
          <IconePinCarte className="h-6 w-6" />
          <span className="sr-only">Carte</span>
        </Link>
      </div>
    )
  }

  if (layout === 'footer') {
    return (
      <div
        className={`flex items-stretch justify-between gap-2 border-t border-gray-100 bg-gray-50/80 px-3 py-2 text-xs font-bold ${className}`}
      >
        <Link
          href={hrefCarte}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 py-2 text-emerald-900 hover:bg-emerald-100"
        >
          <IconePinCarte className="h-5 w-5 shrink-0" />
          Carte
        </Link>
        <Link
          href={hrefDetail}
          className="flex flex-1 items-center justify-center rounded-lg bg-[#1B5E20] py-2 text-center text-white hover:bg-[#2E7D32]"
        >
          Détails →
        </Link>
      </div>
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
