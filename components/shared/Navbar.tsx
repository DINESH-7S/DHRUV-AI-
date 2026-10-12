"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Languages, ArrowUpRight } from 'lucide-react';
import { EASE } from '@/components/motion/Reveal';

const LINKS = [
  { href: '/explore', key: 'explore' },
  { href: '/expeditions', key: 'expeditions' },
  { href: '/events', key: 'activities' },
  { href: '/gallery', key: 'gallery' },
  { href: '/videos', key: 'videos' },
  { href: '/learn', key: 'learn' },
  { href: '/ask', key: 'ask' },
] as const;

export function Navbar() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { scrollY } = useScroll();

  // Solid background once scrolled; slide away while scrolling down, return on scroll up.
  useMotionValueEvent(scrollY, 'change', y => {
    const previous = scrollY.getPrevious() ?? 0;
    setScrolled(y > 12);
    setHidden(y > 160 && y > previous + 4);
    if (y < previous - 4) setHidden(false);
  });

  // Close the menu after navigating; lock page scroll while it is open.
  useEffect(() => setMobileMenuOpen(false), [pathname]);
  useEffect(() => {
    document.documentElement.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const [isPending, startTransition] = React.useTransition();

  const toggleLanguage = () => {
    document.cookie = `NEXT_LOCALE=${locale === 'hi' ? 'en' : 'hi'}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => {
      router.refresh();
    });
  };

  const languageLabel = locale === 'hi' ? 'English' : 'हिन्दी';

  return (
    <>
      <motion.header
        animate={{ y: hidden && !mobileMenuOpen ? '-100%' : '0%' }}
        transition={{ duration: 0.45, ease: EASE }}
        className="sticky top-0 z-50 w-full"
      >
        {/* Over the hero: a soft fade keeps the links readable on the photograph. Scrolled: solid canvas. */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[var(--ink)]/85 to-transparent pointer-events-none" />
        <div
          aria-hidden
          className={`absolute inset-0 border-b border-[var(--line)] bg-[var(--navy)]/92 backdrop-blur-xl transition-opacity duration-500 ${scrolled || mobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-6">
            {/* Wordmark */}
            <Link href="/" prefetch={true} className="flex items-baseline gap-2.5 rounded-md">
              <span className="font-display text-2xl font-bold tracking-[0.18em] text-[var(--snow)]">DHRUV</span>
              <span className="hidden 2xl:inline text-xs text-[var(--mist)] whitespace-nowrap">{t('tagline')}</span>
            </Link>

            {/* Desktop links with a sliding active indicator */}
            <nav aria-label="Main" className="hidden lg:flex items-center gap-0.5 xl:gap-1">
              {LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={true}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                  className={`micro-cap relative whitespace-nowrap px-2.5 xl:px-3 py-2 rounded-lg ${isActive(link.href) ? 'text-[var(--snow)]' : 'text-[var(--snow)]/75 hover:text-[var(--snow)]'}`}
                >
                  {t(link.key)}
                  {isActive(link.href) && (
                    <motion.span
                      layoutId="nav-active"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      className="absolute left-2.5 right-2.5 xl:left-3 xl:right-3 -bottom-[13px] h-0.5 bg-[var(--glacier)]"
                    />
                  )}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleLanguage}
                disabled={isPending}
                aria-label={`${t('switchLanguage')}: ${languageLabel}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--line)] text-sm whitespace-nowrap text-[var(--snow)] hover:border-[var(--glacier)]/60 transition-opacity ${isPending ? 'opacity-60 cursor-wait' : ''}`}
              >
                <Languages className={`w-4 h-4 text-[var(--glacier)] ${isPending ? 'animate-spin' : ''}`} />
                <span>{languageLabel}</span>
              </button>

              <Link
                href="/admin"
                prefetch={true}
                className="micro-cap hidden xl:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg whitespace-nowrap text-[var(--snow)]/75 hover:text-[var(--snow)]"
              >
                {t('admin')} <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>

              {/* Hamburger that morphs into an X */}
              <button
                onClick={() => setMobileMenuOpen(open => !open)}
                aria-label={t('menu')}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu"
                className="lg:hidden relative w-10 h-10 rounded-full hover:bg-white/5"
              >
                <span className={`absolute left-1/2 top-1/2 h-[1.5px] w-5 -translate-x-1/2 bg-[var(--snow)] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${mobileMenuOpen ? 'rotate-45' : '-translate-y-[4px]'}`} />
                <span className={`absolute left-1/2 top-1/2 h-[1.5px] w-5 -translate-x-1/2 bg-[var(--snow)] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${mobileMenuOpen ? '-rotate-45' : 'translate-y-[4px]'}`} />
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Full-screen mobile menu with staggered links */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.nav
            id="mobile-menu"
            aria-label="Main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="lg:hidden fixed inset-0 z-[45] glass-overlay pt-24 px-6 pb-10 flex flex-col"
          >
            <motion.ul
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } } }}
              className="space-y-1"
            >
              {[...LINKS, { href: '/admin', key: 'admin' } as const].map(link => (
                <motion.li
                  key={link.href}
                  variants={{ hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
                >
                  <Link
                    href={link.href}
                    prefetch={true}
                    aria-current={isActive(link.href) ? 'page' : undefined}
                    className={`display block py-3 text-4xl ${isActive(link.href) ? 'text-[var(--glacier)]' : 'text-[var(--snow)]'}`}
                  >
                    {t(link.key)}
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
