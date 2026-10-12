import React from 'react';
import { getTranslations } from 'next-intl/server';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { AskDhruvWidget } from '@/components/public/AskDhruvWidget';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('common');
  return (
    <div className="flex flex-col min-h-dvh">
      <a href="#main" className="skip-link">{t('skipToContent')}</a>
      <Navbar />
      <main id="main" tabIndex={-1} className="flex-grow outline-none">{children}</main>
      <Footer />
      <AskDhruvWidget />
    </div>
  );
}
