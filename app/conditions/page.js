import SiteHeader from '@/app/components/SiteHeader'
import SiteFooter from '@/app/components/SiteFooter'

export default function Conditions() {
  const sections = [
    {
      titre: '1. Acceptation des conditions',
      contenu:
        "En accédant et en utilisant la plateforme Chez Moi CI (chezmoici.com), vous acceptez d'être lié par les présentes conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.",
    },
    {
      titre: '2. Description du service',
      contenu:
        "Chez Moi CI est une plateforme d'intermédiation numérique permettant la mise en relation entre propriétaires, locataires, agences immobilières, artisans et prestataires de services à Abidjan, Côte d'Ivoire. Chez Moi CI n'est pas un agent immobilier et n'intervient pas directement dans les transactions.",
    },
    {
      titre: '3. Comptes utilisateurs',
      contenu:
        "Vous êtes responsable de maintenir la confidentialité de votre mot de passe et de toutes les activités effectuées sous votre compte. Vous devez fournir des informations exactes lors de votre inscription. Chez Moi CI se réserve le droit de suspendre tout compte fournissant des informations fausses ou frauduleuses.",
    },
    {
      titre: '4. Publications et annonces',
      contenu:
        "Les utilisateurs s'engagent à ne publier que des annonces véridiques correspondant à des biens ou services réels leur appartenant ou qu'ils sont autorisés à proposer. Toute annonce frauduleuse entraînera la suppression immédiate du compte et pourra faire l'objet de poursuites légales.",
    },
    {
      titre: '5. Badge Vérifié',
      contenu:
        "Le Badge Vérifié atteste qu'un agent Chez Moi CI a effectué une vérification physique du bien à la date indiquée. Cette vérification ne constitue pas une garantie juridique de propriété. Chez Moi CI met tout en œuvre pour garantir l'exactitude des vérifications et rembourse intégralement en cas de fraude avérée malgré le badge.",
    },
    {
      titre: '6. Responsabilité',
      contenu:
        "Chez Moi CI agit en tant qu'intermédiaire et ne peut être tenu responsable des litiges survenant directement entre utilisateurs. Nous nous engageons cependant à faciliter la résolution des litiges via notre processus d'arbitrage.",
    },
    {
      titre: '7. Protection des données',
      contenu:
        "Vos données personnelles sont collectées et traitées conformément à notre Politique de confidentialité et à la loi ivoirienne N°2019-577 du 26 juin 2019 relative à la protection des données à caractère personnel.",
    },
    {
      titre: '8. Modification des conditions',
      contenu:
        "Chez Moi CI se réserve le droit de modifier ces conditions à tout moment. Les utilisateurs seront notifiés par courriel de tout changement significatif.",
    },
    {
      titre: '9. Droit applicable',
      contenu:
        "Les présentes conditions sont régies par le droit ivoirien et le droit OHADA. Tout litige sera soumis à la juridiction compétente d'Abidjan, Côte d'Ivoire.",
    },
    {
      titre: '10. Contact',
      contenu:
        'Pour toute question concernant ces conditions, contactez-nous à : contact@chezmoici.com',
    },
  ]

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <SiteHeader />

      <div className="max-w-3xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold text-[#1B5E20] mb-2">
          Conditions d&apos;utilisation
        </h1>
        <p className="text-gray-400 text-sm mb-8">Dernière mise à jour : Avril 2026</p>

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
