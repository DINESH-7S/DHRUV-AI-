export default function VideosLoading() {
  return (
    <div className="w-full min-h-[90dvh] space-y-12 animate-in fade-in duration-200">
      {/* Header Band */}
      <header className="relative isolate overflow-hidden -mt-16 border-b border-[var(--line)] bg-[var(--ink)] pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="h-12 w-64 rounded-lg shimmer" />
          <div className="h-5 w-80 rounded shimmer" />
        </div>
      </header>

      {/* Videos List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Featured Video */}
        <div className="grid gap-6 md:grid-cols-[3fr_2fr] md:items-center">
          <div className="aspect-video rounded-xl border border-[var(--line)] bg-[var(--navy-raised)] shimmer" />
          <div className="space-y-3">
            <div className="h-8 w-3/4 rounded shimmer" />
            <div className="h-4 w-1/3 rounded shimmer" />
            <div className="h-16 w-full rounded shimmer" />
          </div>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t border-[var(--line)]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-video rounded-xl border border-[var(--line)] bg-[var(--navy-raised)] shimmer" />
              <div className="h-5 w-3/4 rounded shimmer" />
              <div className="h-4 w-1/2 rounded shimmer" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
