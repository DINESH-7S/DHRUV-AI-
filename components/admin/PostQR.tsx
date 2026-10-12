'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download, QrCode } from 'lucide-react';
import { postCode, verifyPath } from '@/lib/posts/code';
import { resolveSiteLinks } from '@/lib/site';

interface Props {
  post: { id: string; body: string; hashtags?: string[] | null; channel: string; language: string };
  sourceTitle?: string | null;
}

const CHANNEL: Record<string, string> = {
  x: 'X', instagram: 'Instagram', linkedin: 'LinkedIn', facebook: 'Facebook', blog: 'Website', press_release: 'Press release', newsletter: 'Newsletter',
};

/**
 * The QR label of an approved post: anyone who scans it lands on /verify/post/<code> and sees
 * that DHRUV approved it, with the exact approved text. "Download card" draws a share image
 * (1080 x 1350, Instagram portrait) with the post and its QR, so the label travels with the post.
 */
export function PostQR({ post, sourceTitle }: Props) {
  const [open, setOpen] = useState(false);
  const [svg, setSvg] = useState('');
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState('');
  const code = postCode(post.id);

  useEffect(() => {
    if (!open) return;
    const link = `${window.location.origin}${verifyPath(post.id)}`;
    setUrl(link);
    QRCode.toString(link, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#03080f', light: '#ffffff' } })
      .then(setSvg)
      .catch(() => setSvg(''));
  }, [open, post.id]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked: the link is visible to copy by hand.
    }
  };

  const downloadCard = async () => {
    const qr = await QRCode.toDataURL(url, { margin: 1, width: 320, errorCorrectionLevel: 'M', color: { dark: '#03080f', light: '#ffffff' } });
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const css = getComputedStyle(document.documentElement);
    const display = css.getPropertyValue('--font-heading').trim() || 'Arial Narrow, Arial, sans-serif';
    const body = css.getPropertyValue('--font-body').trim() || 'sans-serif';
    await document.fonts.ready;

    // Background and a faint polar grid.
    ctx.fillStyle = '#03080f';
    ctx.fillRect(0, 0, 1080, 1350);
    ctx.strokeStyle = 'rgba(91,191,230,0.10)';
    ctx.lineWidth = 2;
    for (let r = 120; r < 900; r += 130) {
      ctx.beginPath();
      ctx.arc(1080, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Header.
    ctx.fillStyle = '#f2f6fa';
    ctx.font = `700 64px ${display}`;
    ctx.fillText('DHRUV', 80, 140);
    ctx.fillStyle = '#5bbfe6';
    ctx.font = `600 26px ${display}`;
    ctx.fillText(`POLAR ARCHIVE  ·  ${(CHANNEL[post.channel] ?? post.channel).toUpperCase()}`, 80, 186);

    // The approved text as plain words: Markdown marks and links removed, headings set larger.
    const text = resolveSiteLinks(post.body)
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\[[^\]]*:\s*\]/g, '')
      .replace(/\*\*|__/g, '')
      .trim();
    const headingFont = `700 46px ${display}`;
    const bodyFont = `400 40px ${body}`;
    const maxWidth = 920;
    const lines: { text: string; heading: boolean }[] = [];
    for (const raw of text.split(/\n+/)) {
      const heading = /^#{1,6}\s/.test(raw);
      const para = raw.replace(/^#{1,6}\s*/, '').trim();
      if (!para) continue;
      ctx.font = heading ? headingFont : bodyFont;
      let line = '';
      for (const word of para.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (ctx.measureText(next).width > maxWidth && line) {
          lines.push({ text: line, heading });
          line = word;
        } else {
          line = next;
        }
      }
      if (line) lines.push({ text: line, heading });
      lines.push({ text: '', heading: false });
    }
    while (lines.length && !lines[lines.length - 1].text) lines.pop();
    const maxLines = 12;
    const shown = lines.slice(0, maxLines);
    if (lines.length > maxLines) {
      while (shown.length && !shown[shown.length - 1].text) shown.pop();
      shown[shown.length - 1].text += ' …';
    }
    shown.forEach((l, i) => {
      ctx.font = l.heading ? headingFont : bodyFont;
      ctx.fillStyle = l.heading ? '#f2f6fa' : 'rgba(242,246,250,0.92)';
      ctx.fillText(l.text, 80, 290 + i * 58);
    });

    // Footer: the QR label.
    ctx.fillStyle = 'rgba(91,191,230,0.35)';
    ctx.fillRect(80, 1000, 920, 2);
    const img = new Image();
    img.src = qr;
    await img.decode();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(80, 1040, 230, 230);
    ctx.drawImage(img, 85, 1045, 220, 220);
    ctx.fillStyle = '#f2f6fa';
    ctx.font = `700 44px ${display}`;
    const hi = post.language === 'hi';
    ctx.fillText(hi ? 'स्कैन करें: क्या यह असली है?' : 'SCAN TO CHECK IT IS GENUINE', 350, 1100);
    ctx.fillStyle = '#a7b8c8';
    ctx.font = `400 30px ${body}`;
    ctx.fillText(hi ? `कोड ${code}  ·  DHRUV टीम द्वारा मंज़ूर` : `Code ${code}  ·  approved by DHRUV staff`, 350, 1152);
    if (sourceTitle) {
      const title = sourceTitle.length > 44 ? `${sourceTitle.slice(0, 43)}…` : sourceTitle;
      ctx.fillText(`${hi ? 'स्रोत' : 'Source'}: ${title}`, 350, 1198);
    }
    ctx.fillStyle = '#5bbfe6';
    ctx.fillText(new URL(url).host + verifyPath(post.id), 350, 1244);

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `dhruv-post-${code}.png`;
    a.click();
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="micro-cap inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-1.5 text-[var(--glacier)] transition-colors hover:border-[var(--glacier)]/60"
      >
        <QrCode className="h-3.5 w-3.5" aria-hidden /> QR check · {code}
      </button>
      {open && (
        <div className="flex flex-wrap items-center gap-5 rounded-md border border-[var(--line)] bg-[var(--ink)] p-4">
          <div
            role="img"
            aria-label={`QR code that opens the check page for post ${code}`}
            className="h-28 w-28 shrink-0 overflow-hidden rounded-sm bg-white [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <div className="min-w-0 flex-1 space-y-2 text-xs">
            <p className="text-[var(--snow)]/85">Anyone who scans this sees that DHRUV approved the post, with the exact approved text.</p>
            <a href={verifyPath(post.id)} target="_blank" rel="noopener noreferrer" className="block truncate font-mono text-[var(--glacier)] hover:underline">
              {url}
            </a>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" onClick={downloadCard} disabled={!url} className="chip inline-flex items-center gap-1.5 disabled:opacity-40">
                <Download className="h-3.5 w-3.5" aria-hidden /> Download card
              </button>
              <button type="button" onClick={copy} disabled={!url} className="chip inline-flex items-center gap-1.5 disabled:opacity-40">
                {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />} {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
