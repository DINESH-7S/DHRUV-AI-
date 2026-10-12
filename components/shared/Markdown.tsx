import ReactMarkdown, { type Components } from 'react-markdown';

// Styled for the dark polar theme without @tailwindcss/typography. Raw HTML in the source is
// ignored by react-markdown (no rehype-raw), so AI-generated text cannot inject markup.
const components: Components = {
  h1: ({ children }) => <h1 className="text-2xl font-extrabold text-[var(--snow)] mt-6 mb-3">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-bold text-[var(--glacier)] mt-6 mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-bold text-[var(--snow)] mt-4 mb-2">{children}</h3>,
  p: ({ children }) => <p className="text-sm text-[var(--snow)] leading-relaxed my-3">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-6 my-3 space-y-1.5 text-sm text-[var(--snow)]">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-6 my-3 space-y-1.5 text-sm text-[var(--snow)]">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-[var(--snow)]">{children}</strong>,
  em: ({ children }) => <em className="text-[var(--glacier)]">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-amber-400/60 bg-amber-500/5 pl-4 py-1 my-4 text-[var(--snow)]/80">{children}</blockquote>
  ),
  a: ({ href, children }) =>
    // Ask Dhruv citation markers ("[2]" → "#src-<message>-2") render as small numbered chips.
    href?.startsWith('#src-') ? (
      <a href={href} className="cite-chip" aria-label={`Source ${String(children)}`}>
        {children}
      </a>
    ) : (
      <a href={href} className="text-[var(--glacier)] underline hover:text-[var(--glacier)]" target={href?.startsWith('/') || href?.startsWith('#') ? undefined : '_blank'} rel="noreferrer">
        {children}
      </a>
    ),
  hr: () => <hr className="my-6 border-[var(--line)]" />,
};

export default function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown components={components}>{children}</ReactMarkdown>
    </div>
  );
}
