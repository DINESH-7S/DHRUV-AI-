export default function PublicLoading() {
  return (
    <div className="w-full min-h-[80dvh] space-y-12 animate-in fade-in duration-200">
      {/* Top Header Placeholder */}
      <header className="relative isolate overflow-hidden -mt-16 border-b border-[var(--line)] bg-[var(--ink)] pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="h-4 w-32 rounded-full shimmer" />
          <div className="h-12 w-3/4 max-w-xl rounded-lg shimmer" />
          <div className="h-5 w-1/2 max-w-md rounded shimmer" />
        </div>
      </header>

      {/* Content Grid Placeholder */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex gap-3">
          <div className="h-8 w-24 rounded-full shimmer" />
          <div className="h-8 w-24 rounded-full shimmer" />
          <div className="h-8 w-24 rounded-full shimmer" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-[var(--line)] bg-[var(--navy-raised)] p-6 space-y-4 shimmer h-72"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
