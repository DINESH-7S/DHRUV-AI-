import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

/** Certificates carry a learner's name: keep them out of search engines. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('certificate');
  return { title: t('certTitle'), robots: { index: false, follow: false } };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
