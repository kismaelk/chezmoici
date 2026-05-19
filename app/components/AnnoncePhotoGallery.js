'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Galerie photos avec vignettes et visionneuse plein écran.
 */
export default function AnnoncePhotoGallery({ photos = [], titre = 'Annonce' }) {
  const [active, setActive] = useState(0)
  const [lightbox, setLightbox] = useState(false)

  const list = Array.isArray(photos) ? photos.filter(Boolean) : []
  const count = list.length

  const go = useCallback(
    (delta) => {
      if (count <= 1) return
      setActive((i) => (i + delta + count) % count)
    },
    [count]
  )

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(false)
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, go])

  if (count === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center bg-gray-200 text-5xl text-gray-400 sm:h-80">
        📷
      </div>
    )
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="block w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5E20]"
          aria-label="Agrandir la photo"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={list[active]}
            alt={titre}
            className="max-h-[min(70vh,24rem)] w-full bg-black/5 object-contain sm:max-h-[28rem] md:h-96 md:max-h-none md:object-cover"
          />
        </button>
        {count > 1 && (
          <div className="flex gap-2 overflow-x-auto p-3" role="tablist" aria-label="Photos de l’annonce">
            {list.map((photo, index) => (
              <button
                key={index}
                type="button"
                role="tab"
                aria-selected={active === index}
                onClick={() => setActive(index)}
                className={`h-20 w-24 flex-shrink-0 cursor-pointer rounded-lg object-cover sm:h-24 sm:w-28 ${
                  active === index ? 'ring-2 ring-[#1B5E20]' : 'opacity-75 hover:opacity-100'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="" className="h-full w-full rounded-lg object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[70] flex flex-col bg-black/95"
          role="dialog"
          aria-modal="true"
          aria-label="Visionneuse photos"
          onClick={() => setLightbox(false)}
        >
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="text-sm font-medium">
              {active + 1} / {count}
            </span>
            <button
              type="button"
              onClick={() => setLightbox(false)}
              className="rounded-lg px-3 py-1.5 text-sm font-bold hover:bg-white/10"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
          <div
            className="relative flex flex-1 items-center justify-center px-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            {count > 1 && (
              <button
                type="button"
                onClick={() => go(-1)}
                className="absolute left-2 z-10 rounded-full bg-white/15 px-3 py-4 text-2xl text-white hover:bg-white/25 md:left-6"
                aria-label="Photo précédente"
              >
                ‹
              </button>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={list[active]}
              alt={`${titre} — photo ${active + 1}`}
              className="max-h-[85vh] max-w-full object-contain"
            />
            {count > 1 && (
              <button
                type="button"
                onClick={() => go(1)}
                className="absolute right-2 z-10 rounded-full bg-white/15 px-3 py-4 text-2xl text-white hover:bg-white/25 md:right-6"
                aria-label="Photo suivante"
              >
                ›
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
