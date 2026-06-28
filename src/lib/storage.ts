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

async function getAuthHeader(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("You must be signed in to upload files.");
  return `Bearer ${token}`;
}

/**
 * Upload a file to R2 via the `storage-upload` edge function.
 * Returns the persisted `files` row. Reports progress (0–100) when `onProgress` is provided.
 */
export function uploadFile(file: File, opts: UploadOptions = {}): Promise<StorageFile> {
  return new Promise(async (resolve, reject) => {
    try {
      const auth = await getAuthHeader();
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
  const auth = await getAuthHeader().catch(() => null);
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

/** Trigger a browser download for the given file id. */
export async function downloadFile(fileId: string, fileName: string): Promise<void> {
  const signed = await getDownloadUrl(fileId, true);
  const res = await fetch(signed);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

/** Delete a file (R2 object + DB row). Only the uploader or an admin may delete. */
export async function deleteFile(fileId: string): Promise<void> {
  const auth = await getAuthHeader();
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
