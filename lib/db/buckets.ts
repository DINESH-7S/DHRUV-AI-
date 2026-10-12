/** Private bucket for every original upload. Served only through signed URLs. */
export const ARCHIVE_BUCKET = 'archive';
/** Public CDN bucket for thumbnails and published media. */
export const PUBLIC_BUCKET = 'public-media';

/** Supabase free-tier global file size limit. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/**
 * File types the archive accepts (reports, datasets, photos, videos). Enforced three times:
 * the upload form's `accept`, the server action (uploads.ts) and the storage bucket itself.
 */
export const ARCHIVE_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
  'text/csv',
  'text/tab-separated-values',
  'text/plain',
  'application/json',
  'application/x-netcdf',
  'application/netcdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  // Browsers report NetCDF and some CSVs as octet-stream; the extension check below decides.
  'application/octet-stream',
] as const;

export const ARCHIVE_EXTENSIONS = [
  'pdf', 'jpg', 'jpeg', 'png', 'webp', 'tif', 'tiff', 'csv', 'tsv', 'txt', 'json', 'nc', 'cdf', 'xls', 'xlsx', 'mp4', 'webm', 'mov',
] as const;

/** Thumbnails and derived media only. */
export const PUBLIC_MIME_TYPES = ['image/webp', 'image/jpeg', 'image/png'] as const;
export const PUBLIC_MAX_BYTES = 10 * 1024 * 1024;

/** Returns a problem description, or null when the file may be uploaded. */
export function uploadProblem(fileName: string, mimeType: string): string | null {
  const ext = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : '';
  if (!(ARCHIVE_EXTENSIONS as readonly string[]).includes(ext)) {
    return `.${ext || '?'} files are not accepted. Allowed: ${ARCHIVE_EXTENSIONS.join(', ')}.`;
  }
  const mime = mimeType || 'application/octet-stream';
  if (!(ARCHIVE_MIME_TYPES as readonly string[]).includes(mime)) return `File type ${mime} is not accepted.`;
  return null;
}

/**
 * Licences an uploader can choose. There is deliberately no default: stating the licence is
 * the uploader's responsibility, and an assumed open licence could be a false claim.
 */
export const LICENSES = [
  'CC-BY-4.0',
  'CC-BY-SA-4.0',
  'CC0-1.0',
  'Public domain',
  'GODL-India',
  '© NCPOR, all rights reserved',
  '© Rights holder, used with permission',
] as const;
