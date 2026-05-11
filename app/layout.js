import './globals.css'
import BackToTopButton from '@/app/components/BackToTopButton'
import AuthStaleSessionCleaner from '@/app/components/AuthStaleSessionCleaner'
import AccountSuspensionListener from '@/app/components/AccountSuspensionListener'
import HeaderAuthSubscriber from '@/app/components/HeaderAuthSubscriber'

export const metadata = {
  title: 'Chez Moi CI — Immobilier de confiance à Abidjan',
  description:
    'Trouvez votre logement idéal à Abidjan en toute sécurité. Annonces vérifiées physiquement, dépôt de garantie sécurisé, bail numérique légal. Badge Vérifié ✅',
  keywords:
    "immobilier Côte d'Ivoire, location appartement, vente maison, services et pro, Badge Vérifié",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Chez Moi CI',
  },
  openGraph: {
    title: 'Chez Moi CI — Immobilier de confiance à Abidjan',
    description:
      'Annonces vérifiées physiquement, dépôt de garantie sécurisé, bail numérique légal.',
    url: 'https://www.chezmoici.com',
    siteName: 'Chez Moi CI',
    locale: 'fr_CI',
    type: 'website',
    images: [
      {
        url: 'https://www.chezmoici.com/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'Chez Moi CI — Immobilier Abidjan',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chez Moi CI — Immobilier de confiance à Abidjan',
    description:
      'Annonces vérifiées physiquement, dépôt sécurisé, bail numérique légal.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://www.chezmoici.com',
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: '/icon-192.png',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1B5E20',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased" style={{ fontFamily: 'Arial, sans-serif' }}>
        <AuthStaleSessionCleaner />
        <AccountSuspensionListener />
        <HeaderAuthSubscriber />
        {children}
        <BackToTopButton />
      </body>
    </html>
  )
}
