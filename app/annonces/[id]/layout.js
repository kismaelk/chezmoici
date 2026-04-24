import { getAnnonceForMetadata } from '@/lib/firestoreServer'

export async function generateMetadata({ params }) {
  const { id } = await params
  const data = await getAnnonceForMetadata(id)

  if (!data) {
    return { title: 'Annonce — Chez Moi CI' }
  }

  const titre = data.titre || 'Annonce'
  const descSnippet = typeof data.description === 'string' ? data.description.slice(0, 150) : ''
  const prixStr = typeof data.prix === 'number' ? data.prix.toLocaleString('fr-FR') : String(data.prix ?? '')
  const description = `${descSnippet} | ${data.quartier || ''}, Abidjan | ${prixStr} FCFA`
  const photos = Array.isArray(data.photos) ? data.photos : []

  return {
    title: `${titre} — Chez Moi CI`,
    description,
    openGraph: {
      title: titre,
      description: descSnippet || undefined,
      images: photos[0] ? [{ url: photos[0] }] : [],
    },
  }
}

export default function AnnonceDetailLayout({ children }) {
  return children
}
