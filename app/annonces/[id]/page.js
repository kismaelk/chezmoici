import { STATIC_EXPORT_PLACEHOLDER_ID } from '@/lib/staticExportPlaceholder'
import DetailAnnonceClient from './DetailAnnonceClient'

/** Requis pour `output: 'export'` — au moins une entrée ; les vrais IDs sont chargés côté client. */
export async function generateStaticParams() {
  return [{ id: STATIC_EXPORT_PLACEHOLDER_ID }]
}

export default function Page() {
  return <DetailAnnonceClient />
}
