import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

export const metadata = {
  title: 'Mes avis | Chez Moi CI',
  description: 'Consultez vos avis et recommandations sur Chez Moi CI.',
}

export default function AvisPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <SiteHeader />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-[#1B5E20] mb-3">Mes avis</h1>
          <p className="text-gray-600 mb-6">
            Cette section sera enrichie avec l&apos;historique des notes et commentaires recus.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="/profil"
              className="bg-[#1B5E20] text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-800"
            >
              Voir mon profil
            </a>
            <a
              href="/tableau-de-bord"
              className="border border-[#1B5E20] text-[#1B5E20] px-4 py-2 rounded-lg font-semibold hover:bg-[#E8F5E9]"
            >
              Retour au tableau de bord
            </a>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
