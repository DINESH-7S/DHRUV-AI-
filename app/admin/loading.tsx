export default function AdminLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-200">
      {/* Header Skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-24 rounded-full shimmer" />
        <div className="h-10 w-72 rounded shimmer" />
        <div className="h-4 w-96 rounded shimmer" />
      </div>

      {/* Stats KPI Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--line)] bg-[var(--navy-raised)] p-5 space-y-2">
            <div className="h-3 w-16 rounded shimmer" />
            <div className="h-8 w-20 rounded shimmer" />
          </div>
        ))}
      </div>

      {/* Tabs & Content Table Skeleton */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--navy-raised)] p-6 space-y-6">
        <div className="flex gap-3 border-b border-[var(--line)] pb-4">
          <div className="h-8 w-28 rounded-lg shimmer" />
          <div className="h-8 w-28 rounded-lg shimmer" />
          <div className="h-8 w-28 rounded-lg shimmer" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 w-full rounded-lg shimmer" />
          ))}
        </div>
      </div>
    </div>
  );
}
