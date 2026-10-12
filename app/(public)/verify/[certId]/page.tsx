"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CheckCircle, XCircle, Award, ArrowLeft } from 'lucide-react';

interface CertificateVerification {
  certificate_id: string;
  user_name: string;
  school: string;
  lesson_title: string;
  grade_band: string;
  score: number;
  total: number;
  issued_at: string;
}

export default function VerifyCertificatePage() {
  const t = useTranslations('verifyCert');
  const params = useParams();
  const certId = params?.certId as string;

  const [cert, setCert] = useState<CertificateVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyCert() {
      if (!certId) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/education/certificate/${certId}`);
        if (res.ok) {
          const data = await res.json();
          setCert(data);
        } else {
          throw new Error(t('invalidText'));
        }
      } catch (err: any) {
        setError(err.message || t('invalidText'));
      } finally {
        setLoading(false);
      }
    }
    verifyCert();
  }, [certId, t]);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
      <Link href="/learn" className="micro-cap inline-flex items-center gap-2 text-[var(--glacier)] hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        <span>{t('back')}</span>
      </Link>

      <div className="rise relative overflow-hidden rounded-md border border-[var(--line)] bg-[var(--navy)] p-8 text-center space-y-6">
        {loading ? (
          <div className="py-12 space-y-3">
            <div className="w-10 h-10 border-2 border-[var(--glacier)] border-t-transparent animate-spin rounded-full mx-auto" />
            <p className="text-xs text-[var(--mist)]">{t('verifying')}</p>
          </div>
        ) : cert ? (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-400/10 border border-emerald-400/40 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-300" aria-hidden />
            </div>

            <div className="space-y-1">
              <span className="micro-cap rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-emerald-300">
                {t('verifiedBadge')}
              </span>
              <h1 className="pt-3 text-4xl sm:text-5xl text-[var(--snow)]">
                {t('title')}
              </h1>
              <p className="text-xs font-mono text-[var(--glacier)]">ID: {cert.certificate_id}</p>
            </div>

            <div className="p-6 rounded-md bg-[var(--navy-raised)] border border-[var(--line)] text-left space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-[var(--line)]">
                <span className="text-[var(--mist)]">{t('awardedTo')}</span>
                <span className="font-bold text-[var(--snow)]">{cert.user_name}</span>
              </div>
              {cert.school && (
                <div className="flex justify-between py-1 border-b border-[var(--line)]">
                  <span className="text-[var(--mist)]">{t('school')}</span>
                  <span className="font-semibold text-[var(--snow)]">{cert.school}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-[var(--line)]">
                <span className="text-[var(--mist)]">{t('module')}</span>
                <span className="font-semibold text-[var(--glacier)] text-right">{cert.lesson_title} (Class {cert.grade_band})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--line)]">
                <span className="text-[var(--mist)]">{t('score')}</span>
                <span className="font-bold text-amber-300">{cert.score} / {cert.total} ({Math.round((cert.score / cert.total) * 100)}%)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[var(--mist)]">{t('issued')}</span>
                <span className="font-mono text-[var(--snow)]/80">{new Date(cert.issued_at).toLocaleDateString()}</span>
              </div>
            </div>

            <Link
              href={`/certificate/${cert.certificate_id}`}
              className="btn-solid inline-flex items-center gap-2 px-6 py-3 text-sm active:scale-[0.98] transition-transform"
            >
              <Award className="w-4 h-4" />
              <span>{t('viewCert')}</span>
            </Link>
            <p className="text-xs text-[var(--mist)] max-w-sm mx-auto">{t('note')}</p>
          </div>
        ) : (
          <div className="space-y-4 py-8">
            <XCircle className="w-12 h-12 text-rose-300 mx-auto" aria-hidden />
            <h1 className="text-4xl text-[var(--snow)]">{t('invalidTitle')}</h1>
            <p className="text-xs text-[var(--mist)] max-w-sm mx-auto">
              {error || t('invalidText')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

