export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      {/* HEADER */}
      <nav className="bg-[#1B5E20] px-4 py-3 flex items-center justify-between">
        <a href="/" className="text-white font-bold text-lg">
          Chez Moi CI
        </a>
        <a
          href="/inscription"
          className="bg-[#F9A825] text-white px-3 py-1.5 rounded-lg font-bold text-sm"
        >
          S&apos;inscrire
        </a>
      </nav>

      {/* CONTENU */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-8xl mb-6">🏚️</div>
          <h1 className="text-6xl font-bold text-[#1B5E20] mb-4">404</h1>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Page introuvable
          </h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Cette page n&apos;existe pas ou a été déplacée. Retournez à
            l&apos;accueil pour trouver votre logement idéal à Abidjan.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/"
              className="bg-[#1B5E20] text-white px-6 py-3 rounded-xl font-bold hover:bg-green-800"
            >
              Retour à l&apos;accueil
            </a>
            <a
              href="/annonces"
              className="border-2 border-[#1B5E20] text-[#1B5E20] px-6 py-3 rounded-xl font-bold hover:bg-[#E8F5E9]"
            >
              Voir les annonces
            </a>
          </div>
        </div>
      </div>

      {/* FOOTER SIMPLE */}
      <div className="bg-[#1B5E20] px-4 py-4 text-center">
        <p className="text-green-200 text-sm">
          © 2026 Chez Moi CI — Abidjan, Côte d&apos;Ivoire
        </p>
      </div>
    </div>
  )
}
