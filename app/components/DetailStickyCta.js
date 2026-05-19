'use client'

import Link from 'next/link'
import { buildHrefCarteAnnonce } from '@/lib/listingCarteLink'

/**
 * Barre d’actions fixe en bas sur mobile (fiche annonce).
 */
export default function DetailStickyCta({
  annonce,
  estProprietaire,
  estFavori,
  hasWhatsappContact,
  onToggleFavori,
  onWhatsapp,
  onScrollContact,
}) {
  if (!annonce || estProprietaire) return null

  const lienCarte = buildHrefCarteAnnonce(annonce.id, {
    type: annonce.type,
    quartier: annonce.quartier,
  })

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 px-3 py-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-md md:hidden safe-area-pb"
      role="toolbar"
      aria-label="Actions rapides"
    >
      <div className="mx-auto flex max-w-lg items-center gap-2">
        <button
          type="button"
          onClick={onToggleFavori}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-xl"
          aria-label={estFavori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          {estFavori ? '❤️' : '🤍'}
        </button>
        <Link
          href={lienCarte}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-lg"
          aria-label="Voir sur la carte"
        >
          🗺️
        </Link>
        <button
          type="button"
          onClick={onWhatsapp}
          disabled={!hasWhatsappContact}
          className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-600 text-sm font-bold text-white disabled:opacity-50"
        >
          WhatsApp
        </button>
        <button
          type="button"
          onClick={onScrollContact}
          className="flex h-11 flex-1 items-center justify-center rounded-xl bg-[#1B5E20] text-sm font-bold text-white"
        >
          Message
        </button>
      </div>
    </div>
  )
}
