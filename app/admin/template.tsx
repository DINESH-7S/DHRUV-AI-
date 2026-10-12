/** Route change fade for the staff pages (same CSS as the public site). */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
