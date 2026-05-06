'use client'

import { useEffect, useState } from 'react'

export default function BackToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 350)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-5 right-5 z-[1001] rounded-full bg-[#1B5E20] px-3 py-2 text-white shadow-lg hover:bg-green-800"
      aria-label="Retour en haut"
      title="Retour en haut"
    >
      ↑ Haut
    </button>
  )
}

