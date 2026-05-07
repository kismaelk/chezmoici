'use client'

import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

const ETAPES_ACHAT = [
  {
    titre: '1) Vérifier le statut juridique du bien',
    points: [
      'Demander les pièces clés (ACD, titre foncier, identité du vendeur, mandat si intermédiaire).',
      'Faire confirmer la situation au Guichet Unique du Foncier et de l’Habitat / services compétents.',
      'Éviter tout paiement important avant vérification documentaire.',
    ],
  },
  {
    titre: '2) Encadrer la transaction',
    points: [
      'Formaliser les engagements (offre, promesse, conditions suspensives).',
      'Privilégier un passage notarial pour sécuriser la mutation.',
      'Conserver toutes les preuves de paiement et échanges.',
    ],
  },
  {
    titre: '3) Anticiper les frais et délais',
    points: [
      'Prévoir les frais de formalisation (notaire, enregistrement, formalités foncières selon le dossier).',
      'Vérifier les délais administratifs avant de planifier travaux et déménagement.',
    ],
  },
]

const ETAPES_FINANCEMENT = [
  'Comparer plusieurs offres (taux nominal, TAEG/TEG, durée, assurance, frais de dossier).',
  'Tester votre capacité avec le calculateur, puis demander une simulation bancaire formelle.',
  'Vérifier le coût total du crédit (mensualités + assurance + frais).',
  'Toujours demander les conditions écrites avant signature.',
]

const SOURCES = [
  {
    label: 'Ministère de la Construction, du Logement et de l’Urbanisme (CI)',
    url: 'https://construction.gouv.ci/',
  },
  {
    label: 'Service Public CI — démarches foncières / habitat',
    url: 'https://servicepublic.gouv.ci/accueil/demarcheparticulier/3/27/8',
  },
  {
    label: 'BCEAO — conditions de banque',
    url: 'https://www.bceao.int/fr/documents/conditions-de-banque',
  },
  {
    label: 'BCEAO — financement bancaire de l’habitat (UEMOA)',
    url: 'https://www.bceao.int/fr/publications/note-danalyse-sur-les-conditions-de-financement-bancaire-de-lhabitat-dans-les-pays-de',
  },
  {
    label: 'BCEAO — avis taux de l’usure (UMOA)',
    url: 'https://www.bceao.int/fr/reglementations/avis-no007-12-2025-aux-etablissements-de-credit-et-aux-institutions-de',
  },
]

export default function GuideFinancementAchatPage() {
  return (
    <main className="min-h-screen bg-[#F5F5F5]">
      <SiteHeader />

      <section className="bg-gradient-to-br from-[#0F3F12] to-[#1B5E20] py-14 px-4 text-center">
        <span className="inline-block bg-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/20 mb-4">
          📘 Guide pratique
        </span>
        <h1 className="text-white text-3xl md:text-5xl font-bold mb-3">
          Financer et acheter un bien en Côte d’Ivoire
        </h1>
        <p className="text-green-100 max-w-3xl mx-auto">
          Référentiel interne Chez Moi CI pour aligner nos conseils, notre estimateur
          et notre accompagnement terrain.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-10 space-y-6">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-sm text-blue-900">
          <p className="font-bold mb-1">Mise à jour</p>
          <p>
            Cette page est un guide opérationnel et non un conseil juridique. Les règles et
            coûts peuvent évoluer ; validez toujours avec les institutions et professionnels
            habilités avant engagement.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <article className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Achat maison / terrain</h2>
            <div className="space-y-4">
              {ETAPES_ACHAT.map((e) => (
                <div key={e.titre}>
                  <h3 className="font-bold text-gray-800 mb-2">{e.titre}</h3>
                  <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                    {e.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </article>

          <article className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Financement bancaire</h2>
            <ul className="list-disc pl-5 text-sm text-gray-600 space-y-2">
              {ETAPES_FINANCEMENT.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>

            <div className="mt-5 rounded-xl bg-[#E8F5E9] border border-green-100 p-4 text-sm text-[#1B5E20]">
              <p className="font-bold">Alignement avec nos outils</p>
              <p className="mt-1">
                Le calculateur de prêt sert à préqualifier un budget, puis l’accompagnement
                Chez Moi CI transforme la simulation en dossier réel (banque, notaire, vérifications).
              </p>
            </div>
          </article>
        </div>

        <article className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Sources officielles et de référence</h2>
          <ul className="space-y-2 text-sm">
            {SOURCES.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#1B5E20] hover:underline font-semibold"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </article>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <a
            href="/calculateur-pret"
            className="bg-white border border-gray-200 rounded-xl p-4 hover:border-[#1B5E20] transition-colors"
          >
            <div className="font-bold text-gray-800">Calculateur de prêt</div>
            <div className="text-xs text-gray-500 mt-1">Simuler la mensualité et le coût total</div>
          </a>
          <a
            href="/estimation"
            className="bg-white border border-gray-200 rounded-xl p-4 hover:border-[#1B5E20] transition-colors"
          >
            <div className="font-bold text-gray-800">Estimateur de bien</div>
            <div className="text-xs text-gray-500 mt-1">Estimer une fourchette de prix locale</div>
          </a>
          <a
            href="/packs"
            className="bg-white border border-gray-200 rounded-xl p-4 hover:border-[#1B5E20] transition-colors"
          >
            <div className="font-bold text-gray-800">Accompagnement Chez Moi CI</div>
            <div className="text-xs text-gray-500 mt-1">Sécuriser l’achat et le financement</div>
          </a>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
