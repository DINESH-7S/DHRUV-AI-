/**
 * Re-mounts on every public route change: a short opacity fade between pages.
 * CSS keyframes (`.page-in` in globals.css), not JavaScript, so the first page load paints
 * immediately instead of staying invisible until React hydrates.
 * Opacity only - a transform here would break `position: fixed` modals inside pages.
 */
export default function PublicTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
