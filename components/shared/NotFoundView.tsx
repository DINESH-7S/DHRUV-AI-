import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import { PolarGraticule } from '@/components/graphics/PolarGraticule';

/** Branded, bilingual 404 used by both the root and the public-site not-found pages. */
export async function NotFoundView() {
  const t = await getTranslations('common');
  return (
    <div className="relative isolate overflow-hidden min-h-[80dvh] flex items-center justify-center px-4 py-20">
      {/* Off the map: the polar grid, with the stations still on it. */}
      <div aria-hidden className="absolute left-1/2 top-1/2 -z-10 w-[44rem] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-45">
        <PolarGraticule className="w-full h-auto" />
      </div>
      <div className="max-w-lg space-y-5 text-center">
        <p aria-hidden data-text="404" className="ghost-text font-display text-[9rem] font-bold leading-none tabular text-[var(--snow)]/10" />
        <h1 className="text-5xl sm:text-6xl text-[var(--snow)]">{t('notFoundTitle')}</h1>
        <p className="text-lg text-[var(--mist)] leading-relaxed">{t('notFoundText')}</p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link href="/" className="btn-ghost">
            {t('goHome')}
          </Link>
          <Link href="/explore" className="group inline-flex items-center gap-1.5 text-[var(--glacier)] font-medium">
            {t('searchArchive')} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
