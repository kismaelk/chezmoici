import { STATIC_EXPORT_PLACEHOLDER_ID } from '@/lib/staticExportPlaceholder'
import ModifierAnnonceClient from './ModifierAnnonceClient'

export async function generateStaticParams() {
  return [{ id: STATIC_EXPORT_PLACEHOLDER_ID }]
}

export default function Page() {
  return <ModifierAnnonceClient />
}
