export default function ExpeditionsLoading() {
  return (
    <div className="w-full min-h-[90dvh] space-y-12 animate-in fade-in duration-200">
      {/* Header Band */}
      <header className="relative isolate overflow-hidden -mt-16 border-b border-[var(--line)] bg-[var(--ink)] pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="h-4 w-28 rounded-full shimmer" />
          <div className="h-12 w-64 rounded-lg shimmer" />
          <div className="h-5 w-96 rounded shimmer" />
          <div className="flex gap-2 pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 w-20 rounded-full shimmer" />
            ))}
          </div>
        </div>
      </header>

      {/* Expeditions List */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-[var(--line)] bg-[var(--navy-raised)] p-6 space-y-4 shimmer h-80"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
