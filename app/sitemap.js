const BASE_URL = 'https://www.chezmoici.com'
export const dynamic = 'force-static'

const ROUTES = [
  '/',
  '/a-propos',
  '/annonces',
  '/artisans',
  '/avis',
  '/badge',
  '/calculateur-pret',
  '/carte',
  '/conditions',
  '/confidentialite',
  '/connexion',
  '/contact',
  '/demandes',
  '/estimation',
  '/favoris',
  '/inscription',
  '/messages',
  '/mes-annonces',
  '/mot-de-passe-oublie',
  '/nouveau-mot-de-passe',
  '/packs',
  '/profil',
  '/publier',
  '/services',
  '/stats',
  '/tableau-de-bord',
]

export default function sitemap() {
  const now = new Date()
  return ROUTES.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: now,
    changeFrequency: route === '/' ? 'daily' : 'weekly',
    priority: route === '/' ? 1 : 0.7,
  }))
}
