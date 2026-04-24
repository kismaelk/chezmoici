'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchAnnoncesList } from '@/lib/firestoreApp'
import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

const QUARTIERS = [
  'Cocody',
  'Plateau',
  'Marcory',
  'Yopougon',
  'Bingerville',
  'Adjamé',
  'Abobo',
  'Koumassi',
  'Port-Bouët',
  'Treichville',
  'Attécoubé',
  'Riviera',
  'Angré',
]

function formaterPrix(p) {
  if (!p) return '—'
  if (p >= 1_000_000) return (p / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M FCFA'
  if (p >= 1000) return (p / 1000).toFixed(0) + 'K FCFA'
  return p.toLocaleString() + ' FCFA'
}

function CarteAnnonce({ annonce }) {
  const badgeLabel = { bronze: '🔓 Bronze', argent: '🥈 Argent', or: '🥇 Or' }
  return (
    <a
      href={`/annonces/${annonce.id}`}
      className="group bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg hover:border-[#1B5E20]/30 transition-all block"
    >
      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {annonce.photos?.[0] ? (
          <img
            src={annonce.photos[0]}
            alt={annonce.titre}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">
            🏠
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className="bg-white/95 backdrop-blur text-[#1B5E20] text-xs font-bold px-2.5 py-1 rounded-full capitalize shadow-sm">
            {annonce.type}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <span className="bg-white/95 backdrop-blur text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
            {badgeLabel[annonce.badge] || badgeLabel.bronze}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
          <p className="text-white font-bold text-lg drop-shadow">
            {formaterPrix(annonce.prix)}
            {annonce.type === 'location' && (
              <span className="text-white/80 text-sm font-normal"> /mois</span>
            )}
          </p>
        </div>
      </div>
      <div className="p-4">
        <h4 className="font-bold text-gray-800 line-clamp-1 group-hover:text-[#1B5E20]">
          {annonce.titre}
        </h4>
        <p className="text-gray-500 text-sm mt-0.5">📍 {annonce.quartier}, Abidjan</p>
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
          {annonce.nb_pieces && (
            <span className="flex items-center gap-1">
              🛏️ {annonce.nb_pieces} pièces
            </span>
          )}
          {annonce.surface && (
            <span className="flex items-center gap-1">📐 {annonce.surface} m²</span>
          )}
        </div>
      </div>
    </a>
  )
}

function GrilleAnnonces({ type, titre, sousTitre, href, limit = 6 }) {
  const [annonces, setAnnonces] = useState([])
  const [etat, setEtat] = useState('loading')

  useEffect(() => {
    async function charger() {
      const filtres = {
        type: type || '',
        quartier: '',
        prixMin: '',
        prixMax: '',
        nbPieces: '',
        meuble: '',
        badge: '',
        surfaceMin: '',
        recherche: '',
        nbChambres: '',
        typePropriete: '',
        typeService: '',
        disponibilite: '',
      }
      const data = await fetchAnnoncesList(filtres, 'recent')
      setAnnonces((data || []).slice(0, limit))
      setEtat('done')
    }
    charger()
  }, [type, limit])

  if (etat === 'loading') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-72 bg-white rounded-xl border border-gray-100 animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (annonces.length === 0) return null

  return (
    <section className="px-4 py-10 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-800">{titre}</h3>
          {sousTitre && (
            <p className="text-gray-500 text-sm mt-1">{sousTitre}</p>
          )}
        </div>
        <a
          href={href}
          className="hidden sm:inline-flex items-center text-[#1B5E20] font-bold text-sm hover:underline"
        >
          Voir tout →
        </a>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {annonces.map((a) => (
          <CarteAnnonce key={a.id} annonce={a} />
        ))}
      </div>
    </section>
  )
}

export default function Accueil() {
  const [mode, setMode] = useState('location')
  const [quartier, setQuartier] = useState('')
  const [prixMax, setPrixMax] = useState('')
  const [nbPieces, setNbPieces] = useState('')
  const router = useRouter()

  const rechercher = () => {
    const params = new URLSearchParams()
    if (mode) params.set('type', mode)
    if (quartier) params.set('quartier', quartier)
    if (prixMax) params.set('prixMax', prixMax)
    if (nbPieces) params.set('nbPieces', nbPieces)
    router.push('/carte?' + params.toString())
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5]">
      <SiteHeader />

      {/* HERO */}
      <section className="relative bg-gradient-to-br from-[#0F3F12] via-[#1B5E20] to-[#2E7D32] overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'><path d=\'M0 20h40M20 0v40\' stroke=\'white\' stroke-width=\'0.5\'/></svg>")',
          }}
        />
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white text-xs font-bold px-4 py-2 rounded-full border border-white/20 mb-6">
            <span>✅</span>
            <span>Annonces vérifiées physiquement — 0 fraude tolérée</span>
          </div>
          <h1 className="text-white text-3xl md:text-5xl font-bold mb-4 leading-tight">
            Trouvez votre chez-vous.
            <br />
            <span className="text-[#F9A825]">En toute confiance.</span>
          </h1>
          <p className="text-green-100 text-base md:text-lg mb-10 max-w-2xl mx-auto">
            La 1ʳᵉ plateforme immobilière de Côte d&apos;Ivoire avec vérification
            terrain, dépôt sécurisé et bail numérique légal.
          </p>

          {/* BARRE DE RECHERCHE */}
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl mx-auto p-2 md:p-3">
            <div className="flex gap-1 p-1 mb-2 bg-gray-100 rounded-xl w-fit mx-auto">
              {[
                { id: 'location', label: '🔑 Louer' },
                { id: 'vente', label: '🏠 Acheter' },
                { id: 'service', label: '🔧 Services' },
                { id: 'artisan', label: '👷 Artisans' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`px-4 py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all ${
                    mode === m.id
                      ? 'bg-white text-[#1B5E20] shadow'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr_1fr_auto] gap-2">
              <select
                value={quartier}
                onChange={(e) => setQuartier(e.target.value)}
                className="border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 focus:outline-none focus:border-[#1B5E20]"
              >
                <option value="">📍 Quartier (tous)</option>
                {QUARTIERS.map((q) => (
                  <option key={q}>{q}</option>
                ))}
              </select>
              <select
                value={nbPieces}
                onChange={(e) => setNbPieces(e.target.value)}
                className="border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 focus:outline-none focus:border-[#1B5E20]"
              >
                <option value="">🛏️ Pièces</option>
                <option value="1">Studio / 1 pièce</option>
                <option value="2">2 pièces</option>
                <option value="3">3 pièces</option>
                <option value="4">4 pièces</option>
                <option value="5">5 pièces et +</option>
              </select>
              <input
                type="number"
                placeholder="💰 Budget max (FCFA)"
                value={prixMax}
                onChange={(e) => setPrixMax(e.target.value)}
                className="border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 focus:outline-none focus:border-[#1B5E20]"
              />
              <button
                type="button"
                onClick={rechercher}
                className="bg-[#F9A825] text-white px-6 py-3 rounded-lg font-bold text-sm hover:bg-yellow-600 flex items-center justify-center gap-2"
              >
                <span>🔍</span> Rechercher
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 px-2 text-xs text-gray-500">
              <span className="font-medium">Tendances :</span>
              {['Cocody 3 pièces', 'Plateau bureaux', 'Marcory villa', 'Yopougon studio'].map(
                (t) => (
                  <a
                    key={t}
                    href={`/annonces?quartier=${t.split(' ')[0]}`}
                    className="text-[#1B5E20] hover:underline"
                  >
                    {t}
                  </a>
                )
              )}
            </div>
          </div>

          {/* TRUST METRICS */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-3xl mx-auto mt-10 text-white px-1">
            {[
              { v: '300+', l: 'Annonces vérifiées' },
              { v: '80+', l: 'Artisans certifiés' },
              { v: '100%', l: 'Dépôt escrow sécurisé' },
            ].map((s) => (
              <div key={s.l} className="text-center min-w-0 px-0.5">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-[#F9A825]">
                  {s.v}
                </div>
                <div className="text-[10px] sm:text-xs md:text-sm text-green-100 leading-tight break-words">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4 PILIERS */}
      <section className="px-4 py-12 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Tout sous un même toit
          </h2>
          <p className="text-gray-500">
            4 services intégrés pour gérer votre logement et votre quotidien
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              emoji: '🏠',
              titre: 'Acheter',
              desc: 'Biens vérifiés, titre foncier contrôlé au Cadastre',
              filtre: 'vente',
              couleur: 'from-green-50 to-white',
            },
            {
              emoji: '🔑',
              titre: 'Louer',
              desc: 'Dépôt escrow sécurisé, bail numérique conforme',
              filtre: 'location',
              couleur: 'from-blue-50 to-white',
            },
            {
              emoji: '🔧',
              titre: 'Services',
              desc: 'Nettoyage, sécurité, jardinage — prestataires certifiés',
              filtre: 'service',
              couleur: 'from-yellow-50 to-white',
            },
            {
              emoji: '👷',
              titre: 'Artisans',
              desc: 'Électriciens, plombiers, peintres — diplômés vérifiés',
              filtre: 'artisan',
              couleur: 'from-orange-50 to-white',
            },
          ].map((pilier) => (
            <a
              key={pilier.titre}
              href={`/annonces?type=${pilier.filtre}`}
              className={`bg-gradient-to-br ${pilier.couleur} rounded-2xl p-4 sm:p-6 text-center shadow-sm hover:shadow-lg border border-gray-100 block hover:border-[#1B5E20] transition-all group min-w-0`}
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                {pilier.emoji}
              </div>
              <h3 className="text-lg font-bold text-[#1B5E20] mb-1">
                {pilier.titre}
              </h3>
              <p className="text-gray-600 text-xs leading-snug">{pilier.desc}</p>
              <span className="inline-flex items-center gap-1 mt-4 text-[#1B5E20] text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                Explorer →
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* ANNONCES RÉCENTES */}
      <GrilleAnnonces
        titre="Annonces récentes"
        sousTitre="Les derniers biens publiés sur la plateforme"
        href="/annonces"
      />

      {/* LOCATIONS MISE EN AVANT */}
      <GrilleAnnonces
        type="location"
        titre="Top locations à Abidjan"
        sousTitre="Logements à louer soigneusement sélectionnés"
        href="/annonces?type=location"
      />

      {/* BADGE VÉRIFIÉ — SECTION TRUST */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 bg-[#E8F5E9] text-[#1B5E20] text-xs font-bold px-3 py-1.5 rounded-full mb-4">
              Notre différence
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
              Badge Vérifié <span className="text-[#F9A825]">✅</span>
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Nous envoyons de vraies personnes visiter chaque bien, photographier
              et vérifier les documents. 3 niveaux de certification — vous
              choisissez votre niveau de confiance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                badge: '🔓',
                nom: 'Bronze',
                prix: 'Gratuit',
                items: [
                  'Identité propriétaire vérifiée',
                  'Email et téléphone confirmés',
                  'Photos déposées en ligne',
                ],
                bg: 'bg-gray-50',
                border: 'border-gray-200',
              },
              {
                badge: '🥈',
                nom: 'Argent',
                prix: '15 000 FCFA',
                featured: false,
                items: [
                  'Visite physique du bien',
                  'Photos certifiées par agent',
                  'Rapport terrain signé',
                  'GPS confirmé',
                ],
                bg: 'bg-white',
                border: 'border-gray-300',
              },
              {
                badge: '🥇',
                nom: 'Or',
                prix: '50 000 FCFA',
                featured: true,
                items: [
                  'Tout le Badge Argent',
                  'Titre foncier vérifié au Cadastre',
                  'Absence de litiges confirmée',
                  'Visite virtuelle 360°',
                  'Garantie remboursement',
                ],
                bg: 'bg-gradient-to-br from-yellow-50 to-white',
                border: 'border-[#F9A825]',
              },
            ].map((b) => (
              <div
                key={b.nom}
                className={`${b.bg} rounded-2xl p-6 border-2 ${b.border} ${b.featured ? 'shadow-xl md:scale-105' : 'shadow-sm'} relative`}
              >
                {b.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#F9A825] text-white text-xs font-bold px-3 py-1 rounded-full">
                    Recommandé vente
                  </span>
                )}
                <div className="text-4xl mb-2">{b.badge}</div>
                <h3 className="text-2xl font-bold text-gray-800">Badge {b.nom}</h3>
                <p className="text-[#1B5E20] font-bold text-lg mt-1">{b.prix}</p>
                <ul className="mt-5 space-y-2 text-sm text-gray-600">
                  {b.items.map((i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#1B5E20] mt-0.5">✓</span> {i}
                    </li>
                  ))}
                </ul>
                <a
                  href="/badge"
                  className={`block mt-6 text-center py-2.5 rounded-lg font-bold text-sm ${
                    b.featured
                      ? 'bg-[#1B5E20] text-white hover:bg-green-800'
                      : 'border-2 border-[#1B5E20] text-[#1B5E20] hover:bg-[#E8F5E9]'
                  }`}
                >
                  Demander {b.nom}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PACKS PREMIUM */}
      <section className="bg-[#F5F5F5] py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Packs d&apos;accompagnement
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Un expert Chez Moi CI vous accompagne de A à Z — parfait pour la
              diaspora et les achats sensibles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                emoji: '🔑',
                titre: 'Location sécurisée',
                prix: '75 000 FCFA',
                bullets: [
                  'Agent dédié',
                  'Visite accompagnée',
                  'Bail numérique conforme',
                  'Dépôt escrow',
                ],
              },
              {
                emoji: '🏠',
                titre: 'Achat accompagné',
                prix: '150 000 FCFA',
                bullets: [
                  'Vérification titre foncier',
                  'Négociation experte',
                  'Coordination notaire',
                  'Zéro litige',
                ],
              },
              {
                emoji: '🌍',
                titre: 'Diaspora Premium',
                prix: '220 000 FCFA',
                bullets: [
                  'Gestion 100% à distance',
                  'Rapports vidéo hebdo',
                  'Procuration numérique',
                  'Suivi 3 mois',
                ],
                featured: true,
              },
              {
                emoji: '👷',
                titre: 'Artisan Pro',
                prix: '35 000 FCFA',
                bullets: [
                  'Certification complète',
                  'Profil premium',
                  'Badge certifié',
                  'Leads prioritaires',
                ],
              },
            ].map((p) => (
              <a
                key={p.titre}
                href="/packs"
                className={`bg-white rounded-2xl p-6 border-2 ${
                  p.featured ? 'border-[#F9A825] shadow-lg' : 'border-gray-100 hover:border-[#1B5E20]'
                } hover:shadow-lg transition-all block`}
              >
                <div className="text-3xl mb-3">{p.emoji}</div>
                <h3 className="font-bold text-gray-800">{p.titre}</h3>
                <p className="text-[#1B5E20] font-bold text-xl mt-1">{p.prix}</p>
                <ul className="mt-4 space-y-1.5 text-xs text-gray-600">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-1.5">
                      <span className="text-[#1B5E20]">✓</span> {b}
                    </li>
                  ))}
                </ul>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* DIASPORA CTA */}
      <section className="py-16 px-4 bg-gradient-to-r from-[#1B5E20] to-[#2E7D32]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="inline-block bg-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/20 mb-4">
              🌍 Pour la diaspora
            </span>
            <h2 className="text-white text-3xl md:text-4xl font-bold mb-4">
              Investissez à Abidjan depuis Ottawa, Paris, Bruxelles ou Washington.
            </h2>
            <p className="text-green-100 mb-6">
              Notre équipe terrain visite, vérifie, négocie et sécurise à votre
              place. Rapports vidéo, procuration numérique, escrow bancaire.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="/packs"
                className="bg-[#F9A825] text-white px-6 py-3 rounded-lg font-bold hover:bg-yellow-600"
              >
                Pack Diaspora Premium →
              </a>
              <a
                href="/contact"
                className="border-2 border-white/30 text-white px-6 py-3 rounded-lg font-bold hover:bg-white/10"
              >
                Parler à un conseiller
              </a>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-white">
            {[
              { i: '🎥', t: 'Visites vidéo HD', d: 'Toutes les pièces filmées' },
              { i: '📝', t: 'Procuration numérique', d: 'Pas besoin de venir' },
              { i: '🏦', t: 'Escrow bancaire', d: 'Fonds sécurisés' },
              { i: '🛡️', t: 'Titre foncier vérifié', d: 'Zéro surprise' },
            ].map((x) => (
              <div
                key={x.t}
                className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-4 min-w-0"
              >
                <div className="text-2xl mb-1">{x.i}</div>
                <div className="font-bold text-sm break-words">{x.t}</div>
                <div className="text-xs text-green-100 break-words">{x.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OUTILS */}
      <section className="px-4 py-16 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Outils intelligents
          </h2>
          <p className="text-gray-500">Décidez en confiance, sans jargon</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              emoji: '💰',
              titre: 'Calculateur de prêt',
              desc: 'Mensualité, intérêts, durée — simulez votre crédit immobilier en 30 secondes.',
              cta: 'Calculer →',
              href: '/calculateur-pret',
            },
            {
              emoji: '📊',
              titre: 'Estimation de bien',
              desc: 'Quartier, type, surface — découvrez une fourchette de prix juste basée sur le marché.',
              cta: 'Estimer →',
              href: '/estimation',
            },
            {
              emoji: '🗺️',
              titre: 'Carte interactive',
              desc: 'Toutes les annonces géolocalisées sur Abidjan. Cherchez par quartier et comparez.',
              cta: 'Explorer →',
              href: '/carte',
            },
          ].map((o) => (
            <a
              key={o.titre}
              href={o.href}
              className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-[#1B5E20] hover:shadow-lg transition-all block"
            >
              <div className="text-4xl mb-3">{o.emoji}</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{o.titre}</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">
                {o.desc}
              </p>
              <span className="text-[#1B5E20] font-bold text-sm">{o.cta}</span>
            </a>
          ))}
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Comment ça marche
            </h2>
            <p className="text-gray-500">
              Simple, rapide et sécurisé — pour locataires, acheteurs et diaspora
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                n: '1',
                t: 'Cherchez',
                d: 'Parcourez les annonces filtrées par quartier, budget et type.',
              },
              {
                n: '2',
                t: 'Vérifiez',
                d: 'Le badge affiche le niveau de vérification terrain du bien.',
              },
              {
                n: '3',
                t: 'Contactez',
                d: 'Discutez directement avec le propriétaire via la messagerie sécurisée.',
              },
              {
                n: '4',
                t: 'Emménagez',
                d: 'Bail numérique signé, dépôt escrow, état des lieux certifié.',
              },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div className="w-14 h-14 bg-[#1B5E20] text-white rounded-2xl mx-auto flex items-center justify-center font-bold text-xl mb-4">
                  {s.n}
                </div>
                <h3 className="font-bold text-gray-800">{s.t}</h3>
                <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                  {s.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-[#F5F5F5] py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-3">
            Vous avez un bien à louer ou à vendre ?
          </h2>
          <p className="text-gray-500 mb-8">
            Publiez gratuitement et touchez des milliers d&apos;Ivoiriens et la
            diaspora. Badge Vérifié sur demande.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="/publier"
              className="bg-[#1B5E20] text-white px-8 py-4 rounded-xl font-bold hover:bg-green-800"
            >
              📢 Publier gratuitement
            </a>
            <a
              href="/badge"
              className="bg-white border-2 border-[#1B5E20] text-[#1B5E20] px-8 py-4 rounded-xl font-bold hover:bg-[#E8F5E9]"
            >
              ✅ Demander un badge
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
