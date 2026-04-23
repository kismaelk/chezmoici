import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

export default function Confidentialite() {
  const sections = [
    {
      titre: '1. Responsable du traitement',
      contenu:
        "Chez Moi CI, société enregistrée en Côte d'Ivoire, est responsable du traitement de vos données personnelles. Contact : contact@chezmoici.com",
    },
    {
      titre: '2. Données collectées',
      contenu:
        "Nous collectons : votre nom et prénom, adresse courriel, numéro de téléphone, quartier de résidence, photos de profil, informations sur vos biens immobiliers publiés, messages échangés sur la plateforme, et données de navigation (adresse IP, type d'appareil).",
    },
    {
      titre: '3. Finalité du traitement',
      contenu:
        "Vos données sont utilisées pour : créer et gérer votre compte, afficher vos annonces, permettre la mise en relation entre utilisateurs, améliorer nos services, vous envoyer des notifications liées à votre activité sur la plateforme, et respecter nos obligations légales.",
    },
    {
      titre: '4. Base légale',
      contenu:
        "Le traitement de vos données est fondé sur : l'exécution du contrat (conditions d'utilisation) pour la gestion de votre compte et annonces, votre consentement pour les communications marketing, et nos obligations légales pour la conservation de certaines données.",
    },
    {
      titre: '5. Partage des données',
      contenu:
        "Vos données ne sont jamais vendues à des tiers. Elles peuvent être partagées uniquement avec : les utilisateurs de la plateforme dans le cadre normal des mises en relation, nos prestataires techniques (Google Firebase pour l’authentification, la base de données et le stockage des fichiers), et les autorités légales si requis par la loi.",
    },
    {
      titre: '6. Conservation des données',
      contenu:
        "Vos données sont conservées pendant toute la durée de votre compte actif et 3 ans après la suppression de votre compte, conformément aux obligations légales ivoiriennes.",
    },
    {
      titre: '7. Vos droits',
      contenu:
        "Conformément à la loi N°2019-577, vous avez le droit d'accéder à vos données, de les rectifier, de les supprimer, de vous opposer à leur traitement, et de les porter vers un autre service. Pour exercer ces droits, contactez : contact@chezmoici.com",
    },
    {
      titre: '8. Cookies',
      contenu:
        "Chez Moi CI utilise des cookies techniques nécessaires au fonctionnement de la plateforme (session de connexion) et des cookies analytiques anonymisés pour améliorer l'expérience utilisateur. Aucun cookie publicitaire n'est utilisé.",
    },
    {
      titre: '9. Sécurité',
      contenu:
        "Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données : chiffrement HTTPS, authentification sécurisée, accès restreint aux données, et sauvegardes régulières.",
    },
    {
      titre: '10. Contact et réclamations',
      contenu:
        "Pour toute question sur la protection de vos données : contact@chezmoici.com. Vous pouvez également adresser une réclamation à l'ARTCI (Autorité de Régulation des Télécommunications et de l'ICT de Côte d'Ivoire).",
    },
  ]

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <SiteHeader />

      <div className="max-w-3xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold text-[#1B5E20] mb-2">
          Politique de confidentialité
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          Dernière mise à jour : Avril 2026 — Conforme à la loi CI N°2019-577
        </p>

        {sections.map((section) => (
          <div
            key={section.titre}
            className="bg-white rounded-xl p-6 shadow-sm mb-4"
          >
            <h2 className="font-bold text-gray-800 text-lg mb-3">{section.titre}</h2>
            <p className="text-gray-600 leading-relaxed text-sm">{section.contenu}</p>
          </div>
        ))}
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
