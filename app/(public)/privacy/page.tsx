import { TrustPageView, trustMetadata } from '@/components/public/TrustPageView';

export const generateMetadata = () => trustMetadata('privacy');

export default function Page() {
  return <TrustPageView slug="privacy" />;
}
