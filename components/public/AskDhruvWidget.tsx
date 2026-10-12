"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { MessageSquare, X, ExternalLink } from 'lucide-react';
import { ChatMessages, ChatMessage } from '@/components/ui/chat-messages';

interface Citation {
  n: number;
  asset_id: string | null;
  title: string;
  href: string;
}

export function AskDhruvWidget() {
  const t = useTranslations('widget');
  const tAsk = useTranslations('ask');
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init-1",
      sender: "assistant",
      content: t('prompt'),
    },
  ]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const pathname = usePathname();

  const handleSendMessage = async (query: string) => {
    if (!query.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: query,
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query, locale: locale === 'hi' ? 'hi' : 'en' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        content: data.answer,
        citations: data.citations || [],
      };

      setMessages(prev => [...prev, botMsg]);
      if (data.citations) setCitations(data.citations);
    } catch (err) {
      const detail = err instanceof Error && err.message ? err.message : tAsk('error');
      setMessages(prev => [
        ...prev,
        { id: `err-${Date.now()}`, sender: 'assistant', content: detail },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // The full-screen chat page already is Ask Dhruv; a second bubble there is redundant.
  if (pathname === '/ask') return null;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Drawer Card */}
      {open && (
        <div className="mb-4 w-[min(26rem,calc(100vw-3rem))] h-[540px] relative rounded-3xl border border-[var(--line)] bg-[var(--navy)] shadow-2xl flex flex-col justify-between overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3 bg-[var(--ink)]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--glacier)] animate-pulse" />
              <span className="font-semibold text-xs text-[var(--snow)]">{t('title')}</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label={t('close')}
              className="p-1 rounded-lg text-[var(--mist)] hover:text-[var(--snow)] hover:bg-[var(--navy-raised)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <ChatMessages
            messages={messages}
            interactive={true}
            autoPlay={false}
            showReplay={false}
            onSendMessage={handleSendMessage}
            className="flex-1 rounded-none border-none shadow-none"
            placeholder={t('placeholder')}
          />

          <div className="px-4 py-2.5 border-t border-[var(--line)] bg-[var(--ink)] flex justify-between items-center text-[10px] text-[var(--mist)]">
            <span>{t('footer')}</span>
            <Link href="/ask" prefetch={true} className="text-[var(--glacier)] font-semibold hover:underline flex items-center gap-1">
              <span>{t('fullScreen')}</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? t('close') : t('open')}
        className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[var(--glacier)] p-0.5 shadow-xl shadow-[var(--glacier)]/25 hover:scale-105 active:scale-95 transition-all flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--glacier)]"
      >
        <div className="w-full h-full bg-[var(--ink)] rounded-full flex items-center justify-center hover:bg-[var(--navy-raised)] transition-colors">
          {open ? (
            <X className="w-5 h-5 text-[var(--glacier)]" />
          ) : (
            <MessageSquare className="w-5 h-5 text-[var(--glacier)]" />
          )}
        </div>
      </button>
    </div>
  );
}
