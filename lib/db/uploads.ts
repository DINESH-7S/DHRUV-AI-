'use server';

import { randomUUID } from 'crypto';
import * as z from 'zod/v4';
import { isDbConfigured } from '../env';
import { supabaseAdmin } from './admin';
import { AuthError, requireRole, UPLOAD_ROLES } from './auth';
import { isLookOnly, LOOK_ONLY_MESSAGE } from '../demo';
import { ARCHIVE_BUCKET, LICENSES, MAX_UPLOAD_BYTES, uploadProblem } from './buckets';

const UploadRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().max(255),
  fileSize: z.number().int().positive().max(MAX_UPLOAD_BYTES, 'Files must be 50 MB or smaller.'),
  type: z.enum(['report', 'publication', 'dataset', 'photo', 'video', 'event', 'news']),
  title: z.string().trim().min(3, 'Title must be at least 3 characters.').max(300),
  titleHi: z.string().trim().max(300).optional(),
  description: z.string().trim().max(5000).default(''),
  region: z.enum(['antarctic', 'arctic', 'himalaya', 'southern_ocean']),
  year: z.number().int().min(1981).max(2100),
  /** Station/expedition UUIDs from the database. Unknown ids are rejected. */
  stationId: z.string().optional(),
  expeditionId: z.string().optional(),
  disciplines: z.array(z.string()).default([]),
  authors: z.array(z.string()).default([]),
  accessLevel: z.enum(['public', 'restricted']).default('public'),
  doi: z.string().trim().max(200).optional(),
  license: z.enum(LICENSES, 'Choose the licence this item is published under.'),
}).superRefine((value, ctx) => {
  const problem = uploadProblem(value.fileName, value.mimeType);
  if (problem) ctx.addIssue({ code: 'custom', path: ['fileName'], message: problem });
});

export type UploadRequest = z.input<typeof UploadRequestSchema>;

export type UploadTicket =
  | { ok: true; assetId: string; path: string; token: string }
  | { ok: false; error: string };

/**
 * Step 1 of an upload: checks the role, creates the asset row (status 'draft') and returns a
 * signed URL so the browser uploads the file straight to Supabase Storage (never through Next.js).
 * Step 2 is POST /api/ingest { assetId }. Use uploadAndIngest() in lib/db/upload-client.ts.
 */
export async function createUploadUrl(request: UploadRequest): Promise<UploadTicket> {
  try {
    const user = await requireRole(UPLOAD_ROLES);
    if (isLookOnly(user.email)) return { ok: false, error: LOOK_ONLY_MESSAGE };
    if (!isDbConfigured()) {
      return { ok: false, error: 'Supabase is not configured yet. Add your Supabase keys to .env.local.' };
    }

    const parsed = UploadRequestSchema.safeParse(request);
    if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => i.message).join(' ') };
    const input = parsed.data;

    const db = supabaseAdmin();
    const [stationId, expeditionId] = await Promise.all([
      resolveReference('stations', input.stationId),
      resolveReference('expeditions', input.expeditionId),
    ]);

    const assetId = randomUUID();
    const path = `${input.type}/${assetId}/${safeFileName(input.fileName)}`;

    const { error: insertError } = await db.from('assets').insert({
      id: assetId,
      type: input.type,
      title: input.title,
      title_hi: input.titleHi || null,
      description: input.description,
      file_path: path,
      mime_type: input.mimeType || null,
      file_size: input.fileSize,
      station_id: stationId,
      expedition_id: expeditionId,
      region: input.region,
      year: input.year,
      discipline: input.disciplines.map(normalizeDiscipline).filter(Boolean),
      authors: input.authors.map((a) => a.trim()).filter(Boolean),
      access_level: input.accessLevel,
      doi: input.doi || null,
      license: input.license,
      status: 'draft',
      created_by: user.id,
    });
    if (insertError) return { ok: false, error: `Could not create the asset: ${insertError.message}` };

    const { data, error } = await db.storage.from(ARCHIVE_BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      await db.from('assets').delete().eq('id', assetId);
      return { ok: false, error: `Could not prepare the upload: ${error?.message ?? 'unknown error'}` };
    }

    return { ok: true, assetId, path: data.path, token: data.token };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    console.error('[createUploadUrl]', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Upload preparation failed.' };
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveReference(table: 'stations' | 'expeditions', id: string | undefined): Promise<string | null> {
  if (!id) return null;
  if (!UUID.test(id)) {
    throw new Error(`Unknown ${table.slice(0, -1)} "${id}". Load the options from the database, not mock data.`);
  }
  const { data } = await supabaseAdmin().from(table).select('id').eq('id', id).maybeSingle();
  if (!data) throw new Error(`The selected ${table.slice(0, -1)} no longer exists.`);
  return id;
}

function safeFileName(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = (dot > 0 ? name.slice(0, dot) : name).replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 80) || 'file';
  const ext = dot > 0 ? name.slice(dot + 1).replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toLowerCase() : '';
  return ext ? `${base}.${ext}` : base;
}

/** "Climate Science" -> "climate_science", matching the AI discipline vocabulary. */
function normalizeDiscipline(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}
