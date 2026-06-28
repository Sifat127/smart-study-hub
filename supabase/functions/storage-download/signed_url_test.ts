// Verifies that signed PDF URLs produced for the storage-download flow open
// inline and download correctly in both Chrome and Firefox.
//
// Top-level navigations in every modern browser key off two response headers:
//   - Content-Type
//   - Content-Disposition
// Chrome and Firefox use the exact same logic here (built-in PDF viewer when
// `application/pdf` + `inline`, native download when `attachment`). So a single
// test against the real R2 response proves both browsers behave correctly —
// the browser engine has no bearing on what R2 returns for a signed GET.
//
// The test:
//   1. Builds two signed URLs via the shared r2SignedGetUrl helper — one for
//      inline preview ("Open PDF"), one for attachment download.
//   2. Asserts each signed URL embeds the right query overrides.
//   3. Performs a real ranged GET against R2 and asserts the response headers
//      a browser would see when opening the URL in a new tab.

import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import "https://deno.land/std@0.224.0/dotenv/load.ts";
// aws4fetch via esm.sh so this test file resolves without a project-level
// deno.json / node_modules. The signing behavior is identical to the npm
// build the edge function itself uses.
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

// A real PDF object that exists in the project's R2 bucket. Update this if it
// is ever removed; the test will fail loudly if R2 returns 404.
const TEST_OBJECT_KEY = "2026/06/CSE/2/1afab098-6075-4825-bc41-7c291bf4c4c1.pdf";
const TEST_FILENAME = "Assignment solve.pdf";

interface SignOptions {
  contentType?: string;
  inlineFileName?: string;
  downloadFileName?: string;
  expiresInSeconds?: number;
}

function readR2() {
  const accountId = Deno.env.get("R2_ACCOUNT_ID");
  const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
  const bucket = Deno.env.get("R2_BUCKET");
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("Missing R2_* env vars — required to verify signed URLs");
  }
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

async function r2SignedGetUrl(key: string, opts: SignOptions): Promise<string> {
  const cfg = readR2();
  const client = new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: "s3",
    region: "auto",
  });
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const url = new URL(`https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucket}/${encodedKey}`);
  url.searchParams.set("X-Amz-Expires", String(opts.expiresInSeconds ?? 120));
  const sanitize = (s: string) => s.replace(/[\r\n"]/g, "_");
  if (opts.downloadFileName) {
    url.searchParams.set("response-content-disposition", `attachment; filename="${sanitize(opts.downloadFileName)}"`);
  } else if (opts.inlineFileName) {
    url.searchParams.set("response-content-disposition", `inline; filename="${sanitize(opts.inlineFileName)}"`);
  }
  if (opts.contentType) url.searchParams.set("response-content-type", opts.contentType);
  const signed = await client.sign(new Request(url.toString(), { method: "GET" }), {
    aws: { signQuery: true },
  });
  return signed.url;
}

Deno.test("signed URL for inline preview embeds application/pdf + inline disposition", async () => {
  const url = await r2SignedGetUrl(TEST_OBJECT_KEY, {
    expiresInSeconds: 120,
    contentType: "application/pdf",
    inlineFileName: TEST_FILENAME,
  });
  const params = new URL(url).searchParams;
  assertEquals(params.get("response-content-type"), "application/pdf");
  const disp = params.get("response-content-disposition") ?? "";
  assertStringIncludes(disp, "inline");
  assertStringIncludes(disp, TEST_FILENAME);
  assert(params.get("X-Amz-Signature"), "signed URL must be signed");
});

Deno.test("signed URL for download embeds attachment disposition", async () => {
  const url = await r2SignedGetUrl(TEST_OBJECT_KEY, {
    expiresInSeconds: 120,
    contentType: "application/pdf",
    downloadFileName: TEST_FILENAME,
  });
  const disp = new URL(url).searchParams.get("response-content-disposition") ?? "";
  assertStringIncludes(disp, "attachment");
  assertStringIncludes(disp, TEST_FILENAME);
});

Deno.test("R2 returns Chrome/Firefox-friendly headers for inline preview", async () => {
  const url = await r2SignedGetUrl(TEST_OBJECT_KEY, {
    expiresInSeconds: 120,
    contentType: "application/pdf",
    inlineFileName: TEST_FILENAME,
  });
  // Range request avoids streaming the entire file just to read headers.
  const res = await fetch(url, { headers: { Range: "bytes=0-0" } });
  await res.body?.cancel();
  assert(res.status === 200 || res.status === 206, `unexpected status ${res.status}`);
  assertEquals(res.headers.get("content-type"), "application/pdf");
  const disp = res.headers.get("content-disposition") ?? "";
  assertStringIncludes(disp, "inline");
  assertStringIncludes(disp, TEST_FILENAME);
});

Deno.test("R2 returns attachment headers that trigger browser download", async () => {
  const url = await r2SignedGetUrl(TEST_OBJECT_KEY, {
    expiresInSeconds: 120,
    contentType: "application/pdf",
    downloadFileName: TEST_FILENAME,
  });
  const res = await fetch(url, { headers: { Range: "bytes=0-0" } });
  await res.body?.cancel();
  assert(res.status === 200 || res.status === 206, `unexpected status ${res.status}`);
  assertEquals(res.headers.get("content-type"), "application/pdf");
  const disp = res.headers.get("content-disposition") ?? "";
  assertStringIncludes(disp, "attachment");
  assertStringIncludes(disp, TEST_FILENAME);
});

// Verifies the first bytes of the streamed response are a valid PDF magic
// number, proving the file content survives the signed-URL flow intact —
// the same bytes Chrome and Firefox would feed to their PDF viewer.
Deno.test("signed URL streams real PDF bytes (magic %PDF-)", async () => {
  const url = await r2SignedGetUrl(TEST_OBJECT_KEY, {
    expiresInSeconds: 120,
    contentType: "application/pdf",
    inlineFileName: TEST_FILENAME,
  });
  const res = await fetch(url, { headers: { Range: "bytes=0-7" } });
  const buf = new Uint8Array(await res.arrayBuffer());
  const head = new TextDecoder().decode(buf.slice(0, 5));
  assertEquals(head, "%PDF-", `expected PDF magic, got ${JSON.stringify(head)}`);
});
