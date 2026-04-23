export default function SiteFooter() {
  const annee = new Date().getFullYear()
  return (
    <footer className="bg-[#0F3F12] text-white mt-12">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8">
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-white text-[#1B5E20] flex items-center justify-center font-bold">
                CI
              </div>
              <div className="font-bold text-lg">Chez Moi CI</div>
            </div>
            <p className="text-green-200 text-sm leading-relaxed max-w-sm">
              La plateforme de confiance pour l&apos;immobilier et les services
              à domicile en Côte d&apos;Ivoire. Annonces vérifiées physiquement,
              dépôt de garantie sécurisé, bail numérique légal.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-green-300">
              <span className="bg-green-800 px-2 py-1 rounded-full">
                ✅ Badge Vérifié
              </span>
              <span className="bg-green-800 px-2 py-1 rounded-full">
                🔒 Paiement sécurisé
              </span>
              <span className="bg-green-800 px-2 py-1 rounded-full">
                📱 Mobile Money
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-sm mb-3">Explorer</h4>
            <ul className="space-y-2 text-green-200 text-sm">
              <li>
                <a href="/annonces?type=location" className="hover:text-white">
                  Location
                </a>
              </li>
              <li>
                <a href="/annonces?type=vente" className="hover:text-white">
                  Vente
                </a>
              </li>
              <li>
                <a href="/services" className="hover:text-white">
                  Services
                </a>
              </li>
              <li>
                <a href="/artisans" className="hover:text-white">
                  Artisans
                </a>
              </li>
              <li>
                <a href="/carte" className="hover:text-white">
                  Carte interactive
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm mb-3">Outils</h4>
            <ul className="space-y-2 text-green-200 text-sm">
              <li>
                <a href="/calculateur-pret" className="hover:text-white">
                  Calculateur de prêt
                </a>
              </li>
              <li>
                <a href="/estimation" className="hover:text-white">
                  Estimation de bien
                </a>
              </li>
              <li>
                <a href="/packs" className="hover:text-white">
                  Packs accompagnement
                </a>
              </li>
              <li>
                <a href="/badge" className="hover:text-white">
                  Badge Vérifié
                </a>
              </li>
              <li>
                <a href="/publier" className="hover:text-white">
                  Publier une annonce
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm mb-3">Entreprise</h4>
            <ul className="space-y-2 text-green-200 text-sm">
              <li>
                <a href="/a-propos" className="hover:text-white">
                  À propos
                </a>
              </li>
              <li>
                <a href="/contact" className="hover:text-white">
                  Contact
                </a>
              </li>
              <li>
                <a href="/conditions" className="hover:text-white">
                  Conditions d&apos;utilisation
                </a>
              </li>
              <li>
                <a href="/confidentialite" className="hover:text-white">
                  Confidentialité
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white"
                >
                  Support WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-green-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs text-green-300">
          <div className="max-w-full break-words">
            © {annee} Chez Moi CI SARL — Abidjan, Côte d&apos;Ivoire · Tous
            droits réservés
          </div>
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-x-4 sm:gap-y-1 max-w-full text-green-300/90">
            <span className="break-words">Conforme loi N°2019-577 (données personnelles)</span>
            <span className="hidden sm:inline">·</span>
            <span>Déclaré ARTCI</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
