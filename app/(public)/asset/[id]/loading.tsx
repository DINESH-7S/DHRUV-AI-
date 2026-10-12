export default function AssetDetailLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-24 space-y-10 min-h-[90dvh] animate-in fade-in duration-200">
      {/* Back Link Placeholder */}
      <div className="h-4 w-32 rounded shimmer" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Header, Summary, Preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="rounded-md border border-[var(--line)] bg-[var(--navy-raised)] p-6 sm:p-7 space-y-4">
            <div className="flex gap-2">
              <div className="h-4 w-16 rounded shimmer" />
              <div className="h-4 w-12 rounded shimmer" />
              <div className="h-4 w-20 rounded shimmer" />
            </div>
            <div className="h-10 w-4/5 rounded shimmer" />
            <div className="h-5 w-2/3 rounded shimmer" />
            <div className="h-4 w-1/2 rounded shimmer pt-2" />
          </div>

          {/* AI Summary Tabs Skeleton */}
          <div className="rounded-md border border-[var(--line)] bg-[var(--navy-raised)] p-6 sm:p-7 space-y-4">
            <div className="flex gap-2 border-b border-[var(--line)] pb-3">
              <div className="h-8 w-24 rounded-lg shimmer" />
              <div className="h-8 w-24 rounded-lg shimmer" />
              <div className="h-8 w-24 rounded-lg shimmer" />
            </div>
            <div className="h-28 w-full rounded-xl shimmer" />
          </div>

          {/* Preview Box Skeleton */}
          <div className="rounded-md border border-[var(--line)] bg-[var(--navy-raised)] p-6 sm:p-7 space-y-4">
            <div className="h-4 w-20 rounded shimmer" />
            <div className="h-80 w-full rounded-xl shimmer" />
          </div>
        </div>

        {/* Right Column: Actions & Metadata */}
        <div className="space-y-6">
          {/* Action Box */}
          <div className="rounded-md border border-[var(--line)] bg-[var(--navy-raised)] p-6 sm:p-7 space-y-4">
            <div className="h-4 w-16 rounded shimmer" />
            <div className="h-11 w-full rounded-full shimmer" />
            <div className="h-11 w-full rounded-xl shimmer" />
            <div className="flex justify-between pt-2 border-t border-[var(--line)]">
              <div className="h-4 w-16 rounded shimmer" />
              <div className="h-4 w-16 rounded shimmer" />
            </div>
          </div>

          {/* Technical Metadata */}
          <div className="rounded-md border border-[var(--line)] bg-[var(--navy-raised)] p-6 sm:p-7 space-y-3">
            <div className="h-4 w-20 rounded shimmer" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between py-1 border-b border-[var(--line)]">
                <div className="h-3 w-16 rounded shimmer" />
                <div className="h-3 w-24 rounded shimmer" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
