// Frontend storage client: uploads to / downloads from Cloudflare R2 via edge functions.
// All file traffic goes through Lovable Cloud edge functions; the only metadata stored in
// the database is the `files` table row returned here.
import { supabase } from "@/integrations/supabase/client";

export interface StorageFile {
  id: string;
  title: string;
  original_filename: string;
  unique_filename: string;
  object_key: string;
  storage_provider: string;
  bucket_name: string;
  file_size: number;
  file_type: string;
  sha256: string | null;
  uploader_id: string | null;
  subject: string | null;
  department: string | null;
  semester: string | null;
  course_code: string | null;
  course_id: string | null;
  year: string | null;
  tags: string[];
  visibility: "public" | "authenticated" | "private";
  download_count: number;
  public_url: string | null;
  upload_date: string;
  last_updated: string;
}

export interface UploadMetadata {
  title?: string;
  subject?: string;
  department?: string;
  semester?: string;
  course_code?: string;
  course_id?: string;
  year?: string;
  tags?: string[];
  visibility?: "public" | "authenticated" | "private";
  requireAdmin?: boolean;
}

export interface UploadOptions extends UploadMetadata {
  onProgress?: (pct: number) => void;
  signal?: AbortSignal;
}

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function getAuthHeader(action = "continue"): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error(`You must be signed in to ${action}.`);
  return `Bearer ${token}`;
}

/**
 * Upload a file to R2 via the `storage-upload` edge function.
 * Returns the persisted `files` row. Reports progress (0–100) when `onProgress` is provided.
 */
export function uploadFile(file: File, opts: UploadOptions = {}): Promise<StorageFile> {
  return new Promise(async (resolve, reject) => {
    try {
      const auth = await getAuthHeader("upload files");
      const form = new FormData();
      form.append("file", file);
      if (opts.title) form.append("title", opts.title);
      if (opts.subject) form.append("subject", opts.subject);
      if (opts.department) form.append("department", opts.department);
      if (opts.semester) form.append("semester", opts.semester);
      if (opts.course_code) form.append("course_code", opts.course_code);
      if (opts.course_id) form.append("course_id", opts.course_id);
      if (opts.year) form.append("year", opts.year);
      if (opts.tags?.length) form.append("tags", opts.tags.join(","));
      if (opts.visibility) form.append("visibility", opts.visibility);
      if (opts.requireAdmin) form.append("require_admin", "true");

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${FUNCTIONS_BASE}/storage-upload`);
      xhr.setRequestHeader("Authorization", auth);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && opts.onProgress) {
          opts.onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        try {
          const body = JSON.parse(xhr.responseText || "{}");
          if (xhr.status >= 200 && xhr.status < 300 && body.file) resolve(body.file);
          else reject(new Error(typeof body.error === "string" ? body.error : `Upload failed (${xhr.status})`));
        } catch (err) {
          reject(new Error((err as Error).message || "Invalid server response"));
        }
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.onabort = () => reject(new Error("Upload cancelled"));

      opts.signal?.addEventListener("abort", () => xhr.abort());
      xhr.send(form);
    } catch (err) {
      reject(err);
    }
  });
}

/** Returns a short-lived signed URL for the file. */
export async function getDownloadUrl(fileId: string, asAttachment = false): Promise<string> {
  const auth = await getAuthHeader("download files").catch(() => null);
  const url = new URL(`${FUNCTIONS_BASE}/storage-download`);
  url.searchParams.set("file_id", fileId);
  url.searchParams.set("json", "1");
  if (asAttachment) url.searchParams.set("disposition", "attachment");
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: auth ? { Authorization: auth } : {},
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.url) {
    throw new Error(body.error || `Download failed (${res.status})`);
  }
  return body.url as string;
}

/** Fetches the file through the edge function and returns a same-origin blob URL for inline preview. */
export async function getPreviewObjectUrl(fileId: string): Promise<string> {
  const auth = await getAuthHeader("preview files");
  const url = new URL(`${FUNCTIONS_BASE}/storage-download`);
  url.searchParams.set("file_id", fileId);
  url.searchParams.set("preview", "1");
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Authorization: auth },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Preview failed (${res.status})`);
  }
  const blob = await res.blob();
  if (!blob.size) throw new Error("Preview file is empty.");
  return URL.createObjectURL(blob.type === "application/pdf" ? blob : blob.slice(0, blob.size, "application/pdf"));
}

/**
 * Fetches the raw PDF bytes through the edge function. Use this when feeding
 * the file to a JS renderer (e.g. pdf.js) so the browser is never given a
 * chance to hand the file off to its native PDF viewer.
 *
 * Bytes are cached in-memory per `fileId` for the lifetime of the page so
 * navigating back into the same document is instant. An LRU bound keeps the
 * cache from growing without limit.
 */
const PREVIEW_CACHE = new Map<string, Uint8Array>();
const PREVIEW_CACHE_MAX = 6;
const PREVIEW_INFLIGHT = new Map<string, Promise<Uint8Array>>();

export function getCachedPreviewBytes(fileId: string): Uint8Array | undefined {
  return PREVIEW_CACHE.get(fileId);
}

export async function getPreviewBytes(fileId: string): Promise<Uint8Array> {
  const cached = PREVIEW_CACHE.get(fileId);
  if (cached) {
    // Refresh LRU order.
    PREVIEW_CACHE.delete(fileId);
    PREVIEW_CACHE.set(fileId, cached);
    return cached;
  }
  const inflight = PREVIEW_INFLIGHT.get(fileId);
  if (inflight) return inflight;

  const task = (async () => {
    const auth = await getAuthHeader("preview files");
    const url = new URL(`${FUNCTIONS_BASE}/storage-download`);
    url.searchParams.set("file_id", fileId);
    url.searchParams.set("preview", "1");
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Authorization: auth },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Preview failed (${res.status})`);
    }
    const buf = await res.arrayBuffer();
    if (!buf.byteLength) throw new Error("Preview file is empty.");
    const bytes = new Uint8Array(buf);
    PREVIEW_CACHE.set(fileId, bytes);
    while (PREVIEW_CACHE.size > PREVIEW_CACHE_MAX) {
      const oldest = PREVIEW_CACHE.keys().next().value;
      if (oldest === undefined) break;
      PREVIEW_CACHE.delete(oldest);
    }
    return bytes;
  })();

  PREVIEW_INFLIGHT.set(fileId, task);
  try {
    return await task;
  } finally {
    PREVIEW_INFLIGHT.delete(fileId);
  }
}

/**
 * Warm the preview cache for a file id without blocking the caller. Safe to
 * call repeatedly: cached/in-flight fetches are deduped, and any error is
 * swallowed because prefetch failure must never affect the UI.
 */
export function prefetchPreviewBytes(fileId: string | null | undefined): void {
  if (!fileId) return;
  if (PREVIEW_CACHE.has(fileId) || PREVIEW_INFLIGHT.has(fileId)) return;
  void getPreviewBytes(fileId).catch(() => {
    /* prefetch is best-effort */
  });
}




/** Trigger a browser download for the given file id. */
export async function downloadFile(fileId: string, fileName: string): Promise<void> {
  const signed = await getDownloadUrl(fileId, true);
  const a = document.createElement("a");
  a.href = signed;
  a.download = fileName;
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Delete a file (R2 object + DB row). Only the uploader or an admin may delete. */
export async function deleteFile(fileId: string): Promise<void> {
  const auth = await getAuthHeader("delete files");
  const res = await fetch(`${FUNCTIONS_BASE}/storage-delete`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.ok) throw new Error(body.error || `Delete failed (${res.status})`);
}

/** Replace a file: upload new, swap the file_id on the owning row, delete the old. */
export async function replaceFile(
  oldFileId: string | null,
  newFile: File,
  opts: UploadOptions = {},
): Promise<StorageFile> {
  const uploaded = await uploadFile(newFile, opts);
  if (oldFileId && oldFileId !== uploaded.id) {
    try {
      await deleteFile(oldFileId);
    } catch (_) {
      /* leave janitor to clean up */
    }
  }
  return uploaded;
}
