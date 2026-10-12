import { TrustPageView, trustMetadata } from '@/components/public/TrustPageView';

export const generateMetadata = () => trustMetadata('ai-policy');

export default function Page() {
  return <TrustPageView slug="ai-policy" />;
}
