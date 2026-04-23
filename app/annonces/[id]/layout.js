import { getAnnonceForMetadata } from '@/lib/firestoreServer'
import { STATIC_EXPORT_PLACEHOLDER_ID } from '@/lib/staticExportPlaceholder'

export async function generateMetadata({ params }) {
  const { id } = await params
  if (id === STATIC_EXPORT_PLACEHOLDER_ID) {
    return { title: 'Annonce — Chez Moi CI' }
  }
  const data = await getAnnonceForMetadata(id)

  if (!data) {
    return { title: 'Annonce — Chez Moi CI' }
  }

  const titre = data.titre || 'Annonce'
  const descSnippet =
    typeof data.description === 'string' ? data.description.slice(0, 150) : ''
  const prix = data.prix
  const prixStr =
    typeof prix === 'number' ? prix.toLocaleString('fr-FR') : String(prix ?? '')
  const description = `${descSnippet} | ${data.quartier || ''}, Abidjan | ${prixStr} FCFA`

  const photos = Array.isArray(data.photos) ? data.photos : []

  return {
    title: `${titre} — Chez Moi CI`,
    description,
    openGraph: {
      title: titre,
      description:
        typeof data.description === 'string'
          ? data.description.slice(0, 150)
          : undefined,
      images: photos[0] ? [{ url: photos[0] }] : [],
    },
  }
}

export default function AnnonceDetailLayout({ children }) {
  return children
}
