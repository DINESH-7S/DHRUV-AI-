"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Printer, ShieldCheck, Globe, ArrowLeft } from 'lucide-react';
import QRCode from 'qrcode';
import { siteUrl } from '@/lib/site';

interface CertificateData {
  certificate_id: string;
  user_name: string;
  school: string;
  lesson_title: string;
  grade_band: string;
  score: number;
  total: number;
  issued_at: string;
}

export default function CertificatePage() {
  const t = useTranslations('certificate');
  const params = useParams();
  const certId = params?.certId as string;

  const [cert, setCert] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCert() {
      if (!certId) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/education/certificate/${certId}`);
        if (res.ok) {
          const data = await res.json();
          setCert(data);
        } else {
          throw new Error(t('notFound'));
        }
      } catch (err: any) {
        setError(err.message || t('notFound'));
      } finally {
        setLoading(false);
      }
    }
    loadCert();
  }, [certId, t]);

  // QR code of the verify link, so a printed certificate can be checked with a phone camera.
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  useEffect(() => {
    if (!cert) return;
    const url = `${window.location.origin}/verify/${cert.certificate_id}`;
    QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0b1220', light: '#ffffff' } })
      .then(setQrSvg)
      .catch(() => setQrSvg(null));
  }, [cert]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent animate-spin rounded-full mx-auto" />
        <p className="text-xs text-slate-400">{t('loading')}</p>
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-rose-400 text-sm font-semibold">{error || t('notFound')}</p>
        <Link href="/learn" className="text-xs text-cyan-400 hover:underline">{t('back')}</Link>
      </div>
    );
  }

  const percent = Math.round((cert.score / cert.total) * 100);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Action Header - Hidden when printing */}
      <div className="flex items-center justify-between print:hidden">
        <Link href="/learn" className="inline-flex items-center space-x-2 text-xs font-semibold text-cyan-400 hover:underline">
          <ArrowLeft className="w-4 h-4" />
          <span>{t('back')}</span>
        </Link>

        <button
          onClick={handlePrint}
          className="px-5 py-2.5 rounded-full btn-solid text-slate-950 font-bold text-xs flex items-center space-x-2 transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>{t('print')}</span>
        </button>
      </div>

      {/* Printable A4 Certificate Frame */}
      <div className="bg-slate-950 p-8 sm:p-14 rounded-3xl border-8 border-amber-400/40 shadow-2xl relative text-center space-y-8 print:p-8 print:border-4 print:text-black print:bg-white text-slate-100">
        {/* Decorative Corner Seals */}
        <div className="absolute top-4 left-4 text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest print:text-slate-700">
          {t('badge')}
        </div>
        <div className="absolute top-4 right-4 text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest print:text-slate-700">
          ID: {cert.certificate_id}
        </div>

        {/* National Emblem & Title Header */}
        <div className="space-y-3 pt-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-teal-400 p-0.5 mx-auto">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center print:bg-white">
              <Globe className="w-9 h-9 text-amber-400" />
            </div>
          </div>

          <h3 className="text-xs uppercase font-extrabold tracking-widest text-amber-400 print:text-slate-800">
            {t('govtHeader')}
          </h3>
          <p className="text-xs text-slate-400 font-semibold print:text-slate-600">
            {t('ncporHeader')}
          </p>
          <p className="text-xs text-amber-300/90 font-medium print:text-slate-700">
            {t('sihPrototype')}
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-100 print:text-black pt-2 aurora-gradient-text">
            {t('certTitle')}
          </h1>
        </div>

        {/* Awardee Details */}
        <div className="space-y-4 py-4 max-w-2xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-slate-400 print:text-slate-600 font-semibold">
            {t('certifyText')}
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-amber-300 print:text-slate-900 border-b-2 border-amber-400/30 pb-2 inline-block px-8">
            {cert.user_name}
          </h2>
          {cert.school && (
            <p className="text-xs text-slate-300 print:text-slate-700 font-medium">
              {t('ofText')} <strong className="text-slate-100 print:text-black">{cert.school}</strong>
            </p>
          )}
          <p className="text-xs sm:text-sm text-slate-300 print:text-slate-800 leading-relaxed pt-2">
            {t('scoreText', { score: cert.score, total: cert.total, percent })}
          </p>
          <p className="text-base sm:text-lg font-bold text-cyan-300 print:text-slate-900">
            "{cert.lesson_title}" (Class {cert.grade_band})
          </p>
        </div>

        {/* Certificate Verification Footer */}
        <div className="pt-8 border-t border-slate-800 print:border-slate-300 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 print:text-slate-600 gap-4">
          <div className="text-left space-y-1">
            <p className="text-[10px] font-bold uppercase text-amber-400 print:text-slate-800">{t('issuedOn')}</p>
            <p className="font-mono text-slate-200 print:text-black">{new Date(cert.issued_at).toLocaleDateString()}</p>
          </div>

          <div className="text-center space-y-1 flex flex-col items-center">
            {qrSvg && (
              <div
                role="img"
                aria-label={t('qrLabel')}
                className="w-24 h-24 rounded-lg bg-white p-1 mb-1 [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            )}
            <Link href={`/verify/${cert.certificate_id}`} className="text-cyan-400 print:text-slate-800 hover:underline font-mono text-[11px] block font-bold">
              {t('verifyLink')}
            </Link>
            <p className="text-[10px] text-slate-500">{siteUrl()}/verify/{cert.certificate_id}</p>
          </div>

          <div className="text-right space-y-1">
            <ShieldCheck className="w-6 h-6 text-emerald-400 ml-auto" />
            <p className="text-[10px] font-bold uppercase text-emerald-400 print:text-slate-800">{t('verifiedBadge')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

