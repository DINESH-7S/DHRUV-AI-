export default function ExploreLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 space-y-10 min-h-[90dvh] animate-in fade-in duration-200">
      {/* Search & Filter Bar Skeleton */}
      <div className="bg-[var(--navy-raised)] p-5 rounded-md border border-[var(--line)] space-y-4 shadow-[0_30px_60px_-30px_rgba(1,6,12,0.9)]">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 h-11 rounded-xl bg-[var(--ink)] border border-[var(--line)] shimmer" />
          <div className="w-24 h-11 rounded-xl bg-[var(--ink)] border border-[var(--line)] shimmer" />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <div className="h-6 w-16 rounded-full shimmer" />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-7 w-20 rounded-full shimmer" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-[var(--line)]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-12 rounded shimmer" />
              <div className="h-9 w-full rounded-xl shimmer" />
            </div>
          ))}
        </div>
      </div>

      {/* Results Count Skeleton */}
      <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
        <div className="h-4 w-32 rounded shimmer" />
      </div>

      {/* Grid Cards Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[var(--line)] bg-[var(--navy-raised)] p-6 h-64 space-y-4 shimmer"
          />
        ))}
      </div>
    </div>
  );
}
