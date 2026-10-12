import { TrustPageView, trustMetadata } from '@/components/public/TrustPageView';

export const generateMetadata = () => trustMetadata('accessibility');

export default function Page() {
  return <TrustPageView slug="accessibility" />;
}
