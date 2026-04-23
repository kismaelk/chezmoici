import { STATIC_EXPORT_PLACEHOLDER_ID } from '@/lib/staticExportPlaceholder'
import ProfilPublicClient from './ProfilPublicClient'

export async function generateStaticParams() {
  return [{ id: STATIC_EXPORT_PLACEHOLDER_ID }]
}

export default function Page() {
  return <ProfilPublicClient />
}
