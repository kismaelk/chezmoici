/** Skeleton homogène pour cartes annonces (grille ou liste). */
export function ListingCardSkeletonGrid({ count = 6, className = '' }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm animate-pulse">
          <div className="h-56 bg-gradient-to-br from-gray-100 to-gray-200" />
          <div className="space-y-2 p-4">
            <div className="h-4 w-3/4 rounded bg-gray-200" />
            <div className="h-3 w-1/2 rounded bg-gray-100" />
            <div className="h-8 w-1/3 rounded bg-gray-200" />
          </div>
          <div className="flex gap-2 border-t border-gray-100 p-2">
            <div className="h-9 flex-1 rounded-lg bg-gray-100" />
            <div className="h-9 flex-1 rounded-lg bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ListingCardSkeletonRow({ count = 4, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 rounded-xl border border-gray-100 bg-white p-3 animate-pulse">
          <div className="h-24 w-28 shrink-0 rounded-lg bg-gray-200" />
          <div className="flex flex-1 flex-col justify-center gap-2">
            <div className="h-4 w-2/3 rounded bg-gray-200" />
            <div className="h-3 w-1/2 rounded bg-gray-100" />
            <div className="h-5 w-1/4 rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DetailAnnonceSkeleton() {
  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="h-14 animate-pulse border-b border-gray-100 bg-white" />
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
            <div className="h-80 animate-pulse rounded-xl bg-gray-200 md:h-96" />
            <div className="animate-pulse space-y-3 rounded-xl bg-white p-6">
              <div className="h-8 w-2/3 rounded bg-gray-200" />
              <div className="h-6 w-1/3 rounded bg-amber-100" />
              <div className="h-4 w-full rounded bg-gray-100" />
              <div className="h-4 w-full rounded bg-gray-100" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-64 animate-pulse rounded-xl border border-gray-100 bg-white" />
            <div className="h-40 animate-pulse rounded-xl bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  )
}
