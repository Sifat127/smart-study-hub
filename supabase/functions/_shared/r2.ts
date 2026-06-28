// Cloudflare R2 client using S3-compatible API + SigV4 via aws4fetch.
// Shared by storage-upload, storage-download, storage-delete edge functions.
import { AwsClient } from "npm:aws4fetch@1.0.20";

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl?: string; // optional, e.g. https://cdn.example.com
}

export function readR2Config(): R2Config {
  const accountId = Deno.env.get("R2_ACCOUNT_ID");
  const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
  const bucket = Deno.env.get("R2_BUCKET");
  const publicBaseUrl = Deno.env.get("R2_PUBLIC_BASE_URL") || undefined;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("R2 is not fully configured (missing R2_* secrets).");
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl };
}

function endpoint(cfg: R2Config, key: string) {
  // S3-compatible endpoint for R2.
  return `https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucket}/${encodeKey(key)}`;
}

function encodeKey(key: string) {
  // Encode each path segment individually so `/` separators are preserved.
  return key.split("/").map(encodeURIComponent).join("/");
}

function awsClient(cfg: R2Config) {
  return new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: "s3",
    region: "auto",
  });
}

export async function r2Upload(
  cfg: R2Config,
  key: string,
  body: ArrayBuffer | Uint8Array,
  contentType: string,
) {
  const client = awsClient(cfg);
  const res = await client.fetch(endpoint(cfg, key), {
    method: "PUT",
    body,
    headers: { "Content-Type": contentType },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`R2 upload failed (${res.status}): ${text.slice(0, 300)}`);
  }
}

export async function r2Delete(cfg: R2Config, key: string) {
  const client = awsClient(cfg);
  const res = await client.fetch(endpoint(cfg, key), { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    throw new Error(`R2 delete failed (${res.status}): ${text.slice(0, 300)}`);
  }
}

export async function r2SignedGetUrl(
  cfg: R2Config,
  key: string,
  expiresInSeconds = 300,
  downloadFileName?: string,
): Promise<string> {
  const client = awsClient(cfg);
  const url = new URL(endpoint(cfg, key));
  url.searchParams.set("X-Amz-Expires", String(expiresInSeconds));
  if (downloadFileName) {
    const safe = downloadFileName.replace(/[\r\n"]/g, "_");
    url.searchParams.set(
      "response-content-disposition",
      `attachment; filename="${safe}"`,
    );
  }
  const signed = await client.sign(
    new Request(url.toString(), { method: "GET" }),
    { aws: { signQuery: true } },
  );
  return signed.url;
}

export async function r2GetObject(cfg: R2Config, key: string): Promise<Response> {
  const client = awsClient(cfg);
  const res = await client.fetch(endpoint(cfg, key), { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`R2 download failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return res;
}

export function r2PublicUrl(cfg: R2Config, key: string): string | null {
  if (!cfg.publicBaseUrl) return null;
  const base = cfg.publicBaseUrl.replace(/\/$/, "");
  return `${base}/${encodeKey(key)}`;
}
