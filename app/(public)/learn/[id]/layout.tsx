import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { supabase, isMockMode } from '@/lib/db/supabase';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations('learn');
  if (isMockMode()) return { title: t('title') };
  const { data } = await supabase.from('lessons').select('title').eq('id', id).eq('status', 'published').maybeSingle();
  return { title: data?.title ?? t('title') };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
