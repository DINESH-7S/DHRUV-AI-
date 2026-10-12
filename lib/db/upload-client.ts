import type { AIJobStatus, AssetStatus } from '../types/database';
import { ARCHIVE_BUCKET } from './buckets';
import { createSupabaseBrowserClient } from './client';
import { createUploadUrl, type UploadRequest } from './uploads';

// Browser-side helpers for the admin upload page.

export type UploadMetadata = Omit<UploadRequest, 'fileName' | 'mimeType' | 'fileSize'>;
export type UploadStage = 'preparing' | 'uploading' | 'starting_ai';

export interface IngestJobStatus {
  jobId: string;
  assetId: string;
  status: AIJobStatus;
  error: string | null;
  assetStatus: AssetStatus | null;
}

/** Creates the asset, uploads the file directly to Supabase Storage, and starts AI ingestion. */
export async function uploadAndIngest(
  file: File,
  metadata: UploadMetadata,
  onStage?: (stage: UploadStage) => void,
): Promise<{ assetId: string; jobId: string }> {
  onStage?.('preparing');
  const ticket = await createUploadUrl({
    ...metadata,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    fileSize: file.size,
  });
  if (!ticket.ok) throw new Error(ticket.error);

  onStage?.('uploading');
  const { error } = await createSupabaseBrowserClient()
    .storage.from(ARCHIVE_BUCKET)
    .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type || undefined });
  if (error) throw new Error(`Upload failed: ${error.message}`);

  onStage?.('starting_ai');
  const { jobId } = await startIngestion(ticket.assetId);
  return { assetId: ticket.assetId, jobId };
}

/** Starts (or retries) AI ingestion for an existing asset. */
export async function startIngestion(assetId: string): Promise<{ jobId: string }> {
  const res = await fetch('/api/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assetId }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? 'Could not start AI processing.');
  return { jobId: body.jobId };
}

export async function fetchJobStatus(jobId: string): Promise<IngestJobStatus> {
  const res = await fetch(`/api/ingest?jobId=${encodeURIComponent(jobId)}`, { cache: 'no-store' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? 'Could not read job status.');
  return body as IngestJobStatus;
}

/** Polls until the job completes or fails. Resolves with the final status either way. */
export async function waitForIngestion(
  jobId: string,
  onUpdate?: (status: IngestJobStatus) => void,
  { intervalMs = 2000, timeoutMs = 300_000 } = {},
): Promise<IngestJobStatus> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = await fetchJobStatus(jobId);
    onUpdate?.(status);
    if (status.status === 'completed' || status.status === 'failed') return status;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error('AI processing is taking longer than expected. Check the asset later.');
}
