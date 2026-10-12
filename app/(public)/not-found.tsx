import { NotFoundView } from '@/components/shared/NotFoundView';

/** notFound() inside a public page: the 404 keeps the site navigation and footer. */
export default function PublicNotFound() {
  return <NotFoundView />;
}
