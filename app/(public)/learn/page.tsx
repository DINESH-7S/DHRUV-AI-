import { getTranslations } from 'next-intl/server';
import { PageBand } from '@/components/public/PageBand';
import LearnList from './LearnList';

/** Lesson list: the page band is rendered here (server); the filterable list is a client component. */
export default async function LearnPage() {
  const t = await getTranslations('learn');
  return (
    <>
      <PageBand band="learn" eyebrow={t('badge')} title={t('title')} subtitle={t('subtitle')} />
      <LearnList />
    </>
  );
}
