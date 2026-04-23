export default function PageVide({
  emoji,
  titre,
  message,
  lienRetour,
  labelRetour,
  lienAction,
  labelAction,
}) {
  return (
    <div className="bg-white rounded-xl p-12 text-center shadow-sm">
      <div className="text-6xl mb-4">{emoji || '📭'}</div>
      <h2 className="text-xl font-bold text-gray-700 mb-3">{titre}</h2>
      <p className="text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
        {message}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {lienRetour && (
          <a
            href={lienRetour}
            className="border-2 border-gray-200 text-gray-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 flex items-center justify-center gap-2"
          >
            ← {labelRetour || 'Retour'}
          </a>
        )}
        {lienAction && (
          <a
            href={lienAction}
            className="bg-[#1B5E20] text-white px-6 py-3 rounded-xl font-bold hover:bg-green-800 flex items-center justify-center gap-2"
          >
            {labelAction}
          </a>
        )}
      </div>
    </div>
  )
}
