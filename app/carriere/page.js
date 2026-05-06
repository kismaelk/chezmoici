import Link from 'next/link'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

/**
 * Offres alignées sur les axes du plan d’affaires : confiance terrain, produit tech,
 * croissance B2B/partenaires, marque & acquisition.
 */
const PILIERS = [
  {
    id: 'confiance',
    titre: 'Confiance & terrain',
    desc: 'Vérifications physiques, badges certifiés, qualité du catalogue annonces.',
  },
  {
    id: 'produit',
    titre: 'Produit & technologie',
    desc: 'Plateforme web, outils internes, data, intégrations (carte, paiements, etc.).',
  },
  {
    id: 'croissance',
    titre: 'Croissance & partenariats',
    desc: 'Réseau agences, Services & Pro, services à la carte, revenus récurrents.',
  },
  {
    id: 'marque',
    titre: 'Marque & expérience',
    desc: 'Acquisition, contenu, support utilisateurs, réputation et NPS.',
  },
]

const POSTES = [
  {
    id: 'agent-verification-terrain',
    titre: 'Agent(e) terrain — vérification & badges',
    departement: 'Opérations & confiance',
    contrat: 'CDI ou CDD',
    lieu: 'Abidjan (déplacements par communes)',
    salaire: '180 000 – 320 000 FCFA / mois + petites primes de mission',
    pilierId: 'confiance',
    resumé:
      'Vous réalisez les visites de biens, la collecte de preuves (photos, documents) et contribuez au processus Badge Vérifié (Bronze, Argent, Or) selon nos critères internes.',
    missions: [
      'Planifier et effectuer des visites terrain avec check-list qualité',
      'Rédiger des comptes rendus clairs pour l’équipe produit et la modération',
      'Être l’interlocuteur de confiance entre propriétaires, agences et Chez Moi CI',
    ],
    profil:
      'Permis B, excellent relationnel, rigueur, connaissance d’Abidjan et du marché locatif / vente. Expérience immo ou contrôle qualité appréciée.',
  },
  {
    id: 'charge-relations-agences',
    titre: 'Chargé(e) de relations agences & partenariats',
    departement: 'Croissance B2B',
    contrat: 'CDI',
    lieu: 'Abidjan — déplacements possibles',
    salaire: '280 000 – 520 000 FCFA / mois + variable selon objectifs',
    pilierId: 'croissance',
    resumé:
      'Vous identifiez, contactez et accompagnez les agences et gros porteurs d’annonces : packs, visibilité, processus d’intégration et suivi de la performance.',
    missions: [
      'Prospection et qualif de partenaires (agences, promoteurs, réseaux)',
      'Négocier des offres packagées cohérentes avec notre politique commerciale',
      'Animer le suivi (reporting vues, leads, satisfaction) et remonter les besoins produit',
    ],
    profil:
      'Expérience commerciale B2B, idéalement secteur immobilier ou services. Anglais ou français bilingue professionnel. Autonomie et culture résultat.',
  },
  {
    id: 'developpeur-fullstack',
    titre: 'Développeur(e) full-stack (produit)',
    departement: 'Produit & ingénierie',
    contrat: 'CDI — temps plein (télétravail partiel possible)',
    lieu: 'Abidjan / hybride',
    salaire: '420 000 – 950 000 FCFA / mois selon expérience',
    pilierId: 'produit',
    resumé:
      'Vous concevez et maintenez l’app (Next.js, API, base de données, intégrations) en lien avec notre feuille de route : confiance, performance, accessibilité mobile money.',
    missions: [
      'Développer des features côté front et back (qualité, tests, revue de code)',
      'Participer à l’architecture (Supabase, auth, règles de sécurité, perf)',
      'Collaborer avec le design et les opérations pour itérer vite',
    ],
    profil:
      'JavaScript/TypeScript, React, expérience API REST et SQL. Autonomie, curiosité, anglais technique. Portfolio ou contributions open-source un plus.',
  },
  {
    id: 'customer-success',
    titre: 'Customer success & support (FR)',
    departement: 'Expérience client',
    contrat: 'CDI',
    lieu: 'Abidjan',
    salaire: '150 000 – 280 000 FCFA / mois + primes',
    pilierId: 'marque',
    resumé:
      'Vous aiderez utilisateurs, vendeurs et chercheurs : messages, litiges légers, aide à la publication, orientation vers les packs et la vérification.',
    missions: [
      'Traiter les demandes (email, WhatsApp, back-office) dans des délais courts',
      'Identifier les causes récurrentes et proposer des améliorations process / produit',
      'Contribuer à la base d’aide (FAQ) et à la voix de la marque (ton rassurant)',
    ],
    profil:
      'Excellente écriture, patience, esprit d’analyse. Idéalement expérience support ou immobilier. Horaires pouvant couvrir un pic en soirée.',
  },
  {
    id: 'marketing-digital',
    titre: 'Chargé(e) marketing digital & contenu',
    departement: 'Marque & acquisition',
    contrat: 'CDI ou prestation longue durée',
    lieu: 'Abidjan / hybride',
    salaire: '220 000 – 480 000 FCFA / mois selon profil',
    pilierId: 'marque',
    resumé:
      'Vous pilotez campagnes, réseaux sociaux et contenus SEO/autour de la confiance (badges, témoignages, quartiers d’Abidjan). Alignement avec notre plan de notoriété et conversion.',
    missions: [
      'Calendrier éditorial, création de formats courts et articles',
      'Suivi des KPIs (trafic, inscriptions, candidatures agences) avec outils simples',
      'Collaboration étroite avec design et commerciaux pour les lancements',
    ],
    profil:
      'Culture réseaux (Facebook, WhatsApp Business, TikTok), rédaction FR impeccable. Notions analytics ou envie de monter en compétence.',
  },
  {
    id: 'stage-analyse-immo',
    titre: 'Stage — analyse marché & données immobilières',
    departement: 'Stratégie & recherche',
    contrat: 'Stage conventionné (6 mois)',
    lieu: 'Abidjan',
    salaire: 'Gratification légale de stage + aide transport locale',
    pilierId: 'confiance',
    resumé:
      'Vous soutenez l’équipe sur les benchmarks prix/quartiers, synthèses terrain et indicateurs pour affiner notre estimation et nos arguments commerciaux.',
    missions: [
      'Collecter et structurer des données publiques et internes (quartiers, typologies)',
      'Participer à des études ponctuelles (concurrence, besoins utilisateurs)',
      'Présenter des synthèses actionnables pour la direction',
    ],
    profil:
      'École commerce, économie, géographie ou MIASHS. Maîtrise Excel / tableurs. Intérêt fort pour l’immobilier urbain abidjanais.',
  },
]

function pilierLabel(id) {
  return PILIERS.find((p) => p.id === id)?.titre || id
}

export default function CarrierePage() {
  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <SiteHeader />

      <div className="bg-gradient-to-br from-[color:var(--chez-green,#1B5E20)] to-emerald-900 px-4 py-14 text-center">
        <h1 className="text-3xl font-bold text-white sm:text-4xl mb-3">Carrières</h1>
        <p className="text-green-100 text-lg max-w-2xl mx-auto leading-relaxed">
          Rejoignez l&apos;équipe Chez Moi CI — nous construisons la référence confiance pour
          l&apos;immobilier et les services à Abidjan. Rémunérations en brut mensuel indicatif,
          alignées sur une jeune structure en croissance (à valider en entretien).
        </p>
      </div>

      <div className="max-w-5xl mx-auto py-10 px-4">
        <section className="mb-12">
          <h2 className="text-xl font-bold text-[color:var(--chez-green,#1B5E20)] mb-4 text-center">
            Alignement avec notre plan d&apos;affaires
          </h2>
          <p className="text-gray-600 text-center max-w-2xl mx-auto mb-8 text-sm leading-relaxed">
            Chaque rôle est rattaché à un pilier stratégique : les fourchettes sont volontairement
            modestes au démarrage et évoluent avec les responsabilités et les résultats.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PILIERS.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm"
              >
                <h3 className="font-bold text-gray-900 mb-2">{p.titre}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Postes ouverts</h2>
          <div className="space-y-4">
            {POSTES.map((poste) => (
              <details
                key={poste.id}
                className="group rounded-xl border border-gray-200 bg-white shadow-sm open:shadow-md transition-shadow"
              >
                <summary className="cursor-pointer list-none px-5 py-4 flex flex-wrap items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0 text-left">
                    <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-900 mb-2">
                      {pilierLabel(poste.pilierId)}
                    </span>
                    <h3 className="font-bold text-gray-900 text-lg leading-snug">{poste.titre}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {poste.departement} · {poste.contrat} · {poste.lieu}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-[color:var(--chez-coral,#ea580c)] text-sm whitespace-pre-line">
                      {poste.salaire}
                    </p>
                    <span className="mt-2 inline-block text-xs font-semibold text-[color:var(--chez-green,#1B5E20)] group-open:hidden">
                      Détails ▾
                    </span>
                    <span className="mt-2 hidden text-xs font-semibold text-[color:var(--chez-green,#1B5E20)] group-open:inline">
                      Réduire ▴
                    </span>
                  </div>
                </summary>
                <div className="border-t border-gray-100 px-5 pb-5 pt-0">
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">{poste.resumé}</p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                    Missions principales
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-700 mb-4">
                    {poste.missions.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                    Profil recherché
                  </p>
                  <p className="text-sm text-gray-700 mb-6">{poste.profil}</p>
                  <Link
                    href={`/contact?poste=${encodeURIComponent(poste.titre)}`}
                    className="inline-flex items-center justify-center rounded-xl bg-[color:var(--chez-green,#1B5E20)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-95"
                  >
                    Postuler à cette offre →
                  </Link>
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-xl border border-amber-100 bg-amber-50/80 p-6">
          <h3 className="font-bold text-gray-900 mb-2">Candidature spontanée</h3>
          <p className="text-gray-700 text-sm leading-relaxed mb-4">
            Vous ne voyez pas votre métier ? Envoyez-nous votre CV et une présentation du poste que vous
            imaginez chez Chez Moi CI — nous étudions les profils atypiques alignés avec nos piliers
            (confiance, produit, croissance, marque).
          </p>
          <Link
            href="/contact?poste=Candidature%20spontanée"
            className="inline-flex font-bold text-[color:var(--chez-coral,#ea580c)] hover:underline text-sm"
          >
            Écrire aux RH via la page contact →
          </Link>
        </section>
      </div>

      <SiteFooter />
    </div>
  )
}
