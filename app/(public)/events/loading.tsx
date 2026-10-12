export default function EventsLoading() {
  return (
    <div className="w-full min-h-[90dvh] space-y-12 animate-in fade-in duration-200">
      {/* Header Band */}
      <header className="relative isolate overflow-hidden -mt-16 border-b border-[var(--line)] bg-[var(--ink)] pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="h-12 w-64 rounded-lg shimmer" />
          <div className="h-5 w-80 rounded shimmer" />
        </div>
      </header>

      {/* Events List */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[4.5rem_minmax(0,1fr)] sm:grid-cols-[6rem_minmax(0,1fr)] gap-4 sm:gap-8 py-8 border-b border-[var(--line)]"
          >
            <div className="space-y-2 text-center">
              <div className="h-10 w-12 mx-auto rounded shimmer" />
              <div className="h-3 w-10 mx-auto rounded shimmer" />
            </div>
            <div className="space-y-3">
              <div className="h-7 w-3/4 rounded shimmer" />
              <div className="h-4 w-40 rounded shimmer" />
              <div className="h-10 w-full rounded shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
