import type { Asset, AssetStatus, ContentPost, PostStatus, SocialChannel } from '../types/database';
import type { AssetAction, PostAction } from './workflow';

// Browser helpers for staff pages (/admin/*). All calls go through role-checked API routes.

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status}).`);
  return body as T;
}

export type StaffAsset = Pick<
  Asset,
  'id' | 'type' | 'title' | 'title_hi' | 'status' | 'access_level' | 'thumbnail' | 'region' | 'year' | 'ai_summary' | 'created_at' | 'published_at'
>;

export function fetchStaffAssets(statuses: AssetStatus[] = [], { unchecked = false } = {}): Promise<StaffAsset[]> {
  return request(`/api/assets?status=${statuses.join(',')}${unchecked ? '&unchecked=1' : ''}`);
}

export function setAssetStatus(assetId: string, action: AssetAction): Promise<Asset> {
  return request(`/api/assets/${assetId}`, { method: 'PATCH', body: JSON.stringify({ action }) });
}

export function fetchStaffPosts(statuses: PostStatus[] = []): Promise<ContentPost[]> {
  return request(`/api/posts?status=${statuses.join(',')}`);
}

export function generateCampaign(input: { assetId: string; channels: SocialChannel[]; languages: ('en' | 'hi')[] }): Promise<ContentPost[]> {
  return request('/api/campaign', { method: 'POST', body: JSON.stringify(input) });
}

export function updatePost(
  postId: string,
  action: PostAction,
  extra: { note?: string; body?: string; hashtags?: string[]; scheduledAt?: string } = {},
): Promise<ContentPost> {
  return request(`/api/posts/${postId}`, { method: 'PATCH', body: JSON.stringify({ action, ...extra }) });
}
