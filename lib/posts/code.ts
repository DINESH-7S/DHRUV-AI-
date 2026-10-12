import type { PostStatus } from '../types/database';

// Every approved post carries a QR code that opens /verify/post/<code>, so anyone who sees the post
// can check it was approved and that its text was not changed. The code is the first 8 characters
// of the post's id: short enough to type from a screenshot.

export const POST_CODE = /^[0-9A-F]{8}$/i;

/** Statuses a post has only after a second person approved it. */
export const VERIFIABLE_STATUSES: PostStatus[] = ['approved', 'scheduled', 'published'];

export function postCode(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

export function verifyPath(id: string): string {
  return `/verify/post/${postCode(id)}`;
}
