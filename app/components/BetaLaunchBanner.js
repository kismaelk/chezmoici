'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const DISMISS_KEY = 'chezmoici_beta_banner_v1'

export default function BetaLaunchBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) !== '1') setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  return (
    <div
      role="status"
      className="relative z-[60] border-b border-amber-200 bg-gradient-to-r from-amber-50 to-[#E8F5E9] px-4 py-2.5 text-center text-sm text-amber-950"
    >
      <p className="mx-auto max-w-4xl leading-snug">
        <span className="font-bold">Bêta Abidjan</span>
        {' — '}
        Annonces en ligne, visites terrain certifiées dès le mois prochain.{' '}
        <Link href="/contact" className="font-semibold text-[#1B5E20] underline hover:no-underline">
          Nous écrire
        </Link>
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100"
        aria-label="Masquer l’annonce bêta"
      >
        ✕
      </button>
    </div>
  )
}
