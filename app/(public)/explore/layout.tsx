import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageBand } from '@/components/public/PageBand';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('explore');
  return { title: t('title'), description: t('subtitle') };
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('explore');
  return (
    <>
      <PageBand band="explore" title={t('title')} subtitle={t('subtitle')} />
      {children}
    </>
  );
}
