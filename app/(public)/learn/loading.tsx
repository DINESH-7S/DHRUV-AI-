export default function LearnLoading() {
  return (
    <div className="w-full min-h-[90dvh] space-y-12 animate-in fade-in duration-200">
      {/* Header Band */}
      <header className="relative isolate overflow-hidden -mt-16 border-b border-[var(--line)] bg-[var(--ink)] pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="h-4 w-28 rounded-full shimmer" />
          <div className="h-12 w-64 rounded-lg shimmer" />
          <div className="h-5 w-80 rounded shimmer" />
        </div>
      </header>

      {/* Grade Filters & Lesson Rows */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 w-20 rounded-full shimmer" />
          ))}
        </div>

        <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="py-7 px-3 space-y-3">
              <div className="h-4 w-24 rounded shimmer" />
              <div className="h-7 w-3/4 max-w-lg rounded shimmer" />
              <div className="h-4 w-full max-w-xl rounded shimmer" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
