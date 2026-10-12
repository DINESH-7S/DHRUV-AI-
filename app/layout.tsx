import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_Devanagari, Rajdhani } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { MotionProvider } from "@/components/motion/MotionProvider";
import "./globals.css";

// All three families cover Devanagari (or are only used for Latin IDs), so Hindi pages match English ones.
// Display face (DESIGN.md): Rajdhani, a squared DIN-like sans with Latin and Devanagari.
const heading = Rajdhani({ subsets: ["latin", "devanagari"], weight: ["500", "600", "700"], variable: "--font-heading", display: "swap" });
const body = IBM_Plex_Sans_Devanagari({
  subsets: ["latin", "devanagari"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});
const code = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-code", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "DHRUV: Polar Knowledge & Outreach Platform (SIH26063)", template: "%s · DHRUV" },
  description: "Polar science knowledge repository, interactive station globe, and public science portal for the National Centre for Polar and Ocean Research (NCPOR), Goa.",
  openGraph: {
    title: "DHRUV: Polar Knowledge & Outreach Platform",
    description: "National polar science knowledge repository, interactive research stations, and bilingual educational archive.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Locale comes from the NEXT_LOCALE cookie (i18n/request.ts); the navbar toggle sets it.
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`dark ${heading.variable} ${body.variable} ${code.variable}`}>
      <body className="font-sans antialiased min-h-dvh bg-[#060e18] text-[#f2f6fa]">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <MotionProvider>{children}</MotionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
