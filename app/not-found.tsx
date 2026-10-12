import type { Metadata } from 'next';
import { NotFoundView } from '@/components/shared/NotFoundView';

export const metadata: Metadata = { title: '404', robots: { index: false } };

export default function RootNotFound() {
  return <NotFoundView />;
}
