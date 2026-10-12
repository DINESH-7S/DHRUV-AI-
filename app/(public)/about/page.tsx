import { TrustPageView, trustMetadata } from '@/components/public/TrustPageView';

export const generateMetadata = () => trustMetadata('about');

export default function Page() {
  return <TrustPageView slug="about" />;
}
