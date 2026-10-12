export default function GalleryLoading() {
  return (
    <div className="w-full min-h-[90dvh] space-y-12 animate-in fade-in duration-200">
      {/* Header Band */}
      <header className="relative isolate overflow-hidden -mt-16 border-b border-[var(--line)] bg-[var(--ink)] pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="h-4 w-28 rounded-full shimmer" />
          <div className="h-12 w-64 rounded-lg shimmer" />
          <div className="h-5 w-80 rounded shimmer" />
        </div>
      </header>

      {/* Masonry Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 [&>*]:mb-5">
          {[64, 80, 56, 72, 60, 96].map((h, i) => (
            <div
              key={i}
              className="break-inside-avoid rounded-2xl border border-[var(--line)] bg-[var(--navy-raised)] overflow-hidden shimmer"
              style={{ height: `${h * 4}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
