import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

export default function APropos() {
  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <SiteHeader />

      <div className="bg-[#1B5E20] px-4 py-16 text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Notre histoire</h1>
        <p className="text-green-200 text-lg max-w-2xl mx-auto">
          Chez Moi CI est né d&apos;une frustration partagée par des millions
          d&apos;Ivoiriens — trouver un logement de confiance à Abidjan ne
          devrait pas être un acte de foi.
        </p>
      </div>

      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="bg-white rounded-xl p-8 shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-[#1B5E20] mb-4">
            Pourquoi Chez Moi CI ?
          </h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Fondée en 2026 par deux entrepreneurs ivoiriens basés à Ottawa,
            Canada, Chez Moi CI est née d&apos;un constat simple mais
            douloureux : le marché immobilier d&apos;Abidjan repose à 95% sur
            des canaux informels — WhatsApp, Facebook, annonces papier — où la
            fraude est endémique et la confiance inexistante.
          </p>
          <p className="text-gray-600 leading-relaxed mb-4">
            Des dépôts de garantie perdus, des appartements qui n&apos;existent
            pas, des artisans qui disparaissent après avoir été payés. Ces
            histoires, nous les avons vécues ou entendues de nos proches. Nous
            avons décidé qu&apos;il était temps de changer ça.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Notre réponse : une plateforme qui combine la technologie numérique
            et la vérification physique terrain. Pas juste un site d&apos;annonces
            de plus — un vrai système de confiance avec des agents qui se
            déplacent, vérifient, documentent et certifient chaque bien.
          </p>
        </div>

        <h2 className="text-2xl font-bold text-[#1B5E20] mb-6 text-center">
          Nos valeurs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            {
              emoji: '🛡️',
              titre: 'Confiance',
              desc: "Chaque annonce est vérifiée. Chaque badge est mérité. La confiance n'est pas un mot — c'est un processus.",
            },
            {
              emoji: '🌍',
              titre: 'Accessibilité',
              desc: "Que vous soyez à Cocody ou à Ottawa, Chez Moi CI vous donne accès au marché immobilier d'Abidjan.",
            },
            {
              emoji: '⚡',
              titre: 'Simplicité',
              desc: 'Trouver un logement, contacter un artisan, signer un bail — tout en quelques clics, en toute sécurité.',
            },
          ].map((val) => (
            <div
              key={val.titre}
              className="bg-white rounded-xl p-6 shadow-sm text-center"
            >
              <div className="text-4xl mb-3">{val.emoji}</div>
              <h3 className="font-bold text-gray-800 mb-2">{val.titre}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{val.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl p-8 shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-[#1B5E20] mb-6 text-center">
            Les fondateurs
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                initial: 'I',
                nom: 'Ismael Koné',
                role: 'Président-directeur général (CEO)',
                desc: 'Expert en technologie et développement de produits numériques. Basé à Ottawa, il supervise la vision produit et la stratégie globale de Chez Moi CI.',
              },
              {
                initial: 'M',
                nom: 'Michel Depohi',
                role: 'Directeur des opérations (COO)',
                desc: "Spécialiste des opérations et du développement commercial en Afrique de l'Ouest. Coordonne les équipes terrain à Abidjan et les partenariats avec les agences.",
              },
            ].map((f) => (
              <div key={f.nom} className="flex gap-4">
                <div className="w-16 h-16 bg-[#E8F5E9] rounded-full flex items-center justify-center text-[#1B5E20] font-bold text-2xl flex-shrink-0">
                  {f.initial}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{f.nom}</h3>
                  <p className="text-[#1B5E20] text-sm font-medium mb-2">
                    {f.role}
                  </p>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#1B5E20] rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">
            Rejoignez Chez Moi CI
          </h2>
          <p className="text-green-200 mb-6">
            Que vous cherchiez un logement, que vous ayez un bien à louer ou que
            vous soyez artisan, Chez Moi CI est fait pour vous.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/inscription"
              className="bg-[#F9A825] text-white px-6 py-3 rounded-xl font-bold hover:bg-yellow-600"
            >
              Créer un compte gratuit
            </a>
            <a
              href="/contact"
              className="border-2 border-white text-white px-6 py-3 rounded-xl font-bold hover:bg-green-800"
            >
              Nous contacter
            </a>
          </div>
        </div>
      </div>

      <footer className="bg-[#1B5E20] px-4 py-6 text-center">
        <p className="text-green-200 text-sm">
          © 2026 Chez Moi CI — Abidjan, Côte d&apos;Ivoire
        </p>
      </footer>
      <SiteFooter />
    </div>
  )
}
