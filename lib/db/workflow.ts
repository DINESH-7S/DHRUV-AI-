import type { AssetStatus, PostStatus, UserRole } from '../types/database';

// Content-post state machine. Shared by the API (enforcement) and the UI (which buttons to show).
//
//   draft ──submit──▶ in_review ──approve──▶ approved ──publish──▶ published
//     ▲                  │                     │  └──schedule──▶ scheduled ──publish──▶ published
//     └──── edit ◀── rejected ◀──reject────────┘                                      │
//                                                    approved ◀──unpublish─────────────┘

export const POST_ACTIONS = ['submit', 'approve', 'reject', 'schedule', 'publish', 'unpublish', 'edit'] as const;
export type PostAction = (typeof POST_ACTIONS)[number];

interface Transition {
  from: PostStatus[];
  /** null = status unchanged (edit). */
  to: PostStatus | null;
  roles: UserRole[];
}

export const POST_TRANSITIONS: Record<PostAction, Transition> = {
  submit: { from: ['draft', 'rejected'], to: 'in_review', roles: ['super_admin', 'outreach_officer'] },
  approve: { from: ['in_review'], to: 'approved', roles: ['super_admin', 'reviewer'] },
  reject: { from: ['in_review', 'approved', 'scheduled'], to: 'rejected', roles: ['super_admin', 'reviewer'] },
  schedule: { from: ['approved'], to: 'scheduled', roles: ['super_admin', 'outreach_officer', 'reviewer'] },
  publish: { from: ['approved', 'scheduled'], to: 'published', roles: ['super_admin', 'outreach_officer', 'reviewer'] },
  unpublish: { from: ['published'], to: 'approved', roles: ['super_admin', 'reviewer'] },
  edit: { from: ['draft', 'in_review', 'rejected'], to: null, roles: ['super_admin', 'outreach_officer'] },
};

/** Actions available for a post in `status`, optionally filtered to what `role` may do. */
export function allowedPostActions(status: PostStatus, role?: UserRole): PostAction[] {
  return POST_ACTIONS.filter((a) => {
    const t = POST_TRANSITIONS[a];
    return t.from.includes(status) && (!role || t.roles.includes(role));
  });
}

export const ASSET_ACTIONS = ['publish', 'unpublish', 'verify'] as const;
export type AssetAction = (typeof ASSET_ACTIONS)[number];

export const ASSET_TRANSITIONS: Record<AssetAction, { from: AssetStatus[]; to: AssetStatus; roles: UserRole[] }> = {
  publish: { from: ['ready'], to: 'published', roles: ['super_admin', 'reviewer'] },
  unpublish: { from: ['published'], to: 'ready', roles: ['super_admin', 'reviewer'] },
  // A reviewer checks an item that is already public (e.g. one loaded by an import script).
  verify: { from: ['published'], to: 'published', roles: ['super_admin', 'reviewer'] },
};

export const CAMPAIGN_ROLES: UserRole[] = ['super_admin', 'outreach_officer'];

export const LESSON_GENERATE_ROLES: UserRole[] = ['super_admin', 'scientist', 'outreach_officer'];
export const LESSON_PUBLISH_ROLES: UserRole[] = ['super_admin', 'reviewer'];
/** Quiz pass mark for a certificate. */
export const PASS_PERCENT = 80;
