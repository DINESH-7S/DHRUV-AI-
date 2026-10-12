/**
 * Public site address. Stored content never contains an absolute URL: generated posts use
 * SITE_LINK_TOKEN (e.g. "{{site}}/asset/<id>"), which is resolved when the post is shown or
 * published. Moving the site (localhost → preview → production) never breaks old posts.
 */
export const SITE_LINK_TOKEN = '{{site}}';

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

/** Replaces the site token with the current public address. */
export function resolveSiteLinks(text: string): string {
  return text.split(SITE_LINK_TOKEN).join(siteUrl());
}

/** Link to an asset, as stored in generated content. */
export function assetLinkToken(assetId: string): string {
  return `${SITE_LINK_TOKEN}/asset/${assetId}`;
}
