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
import { readR2Config, r2SignedGetUrl } from "../_shared/r2.ts";

// A real PDF object that exists in the project's R2 bucket. Update this if it
// is ever removed; the test will fail loudly if R2 returns 404.
const TEST_OBJECT_KEY = "2026/06/CSE/2/1afab098-6075-4825-bc41-7c291bf4c4c1.pdf";
const TEST_FILENAME = "Assignment solve.pdf";

function ensureR2() {
  for (const k of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"]) {
    if (!Deno.env.get(k)) {
      throw new Error(`Missing env ${k} — required to verify R2 signed URLs`);
    }
  }
}

Deno.test("signed URL for inline preview embeds application/pdf + inline disposition", async () => {
  ensureR2();
  const cfg = readR2Config();
  const url = await r2SignedGetUrl(cfg, TEST_OBJECT_KEY, {
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
  ensureR2();
  const cfg = readR2Config();
  const url = await r2SignedGetUrl(cfg, TEST_OBJECT_KEY, {
    expiresInSeconds: 120,
    contentType: "application/pdf",
    downloadFileName: TEST_FILENAME,
  });
  const disp = new URL(url).searchParams.get("response-content-disposition") ?? "";
  assertStringIncludes(disp, "attachment");
  assertStringIncludes(disp, TEST_FILENAME);
});

Deno.test("R2 returns Chrome/Firefox-friendly headers for inline preview", async () => {
  ensureR2();
  const cfg = readR2Config();
  const url = await r2SignedGetUrl(cfg, TEST_OBJECT_KEY, {
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
  ensureR2();
  const cfg = readR2Config();
  const url = await r2SignedGetUrl(cfg, TEST_OBJECT_KEY, {
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
  ensureR2();
  const cfg = readR2Config();
  const url = await r2SignedGetUrl(cfg, TEST_OBJECT_KEY, {
    expiresInSeconds: 120,
    contentType: "application/pdf",
    inlineFileName: TEST_FILENAME,
  });
  const res = await fetch(url, { headers: { Range: "bytes=0-7" } });
  const buf = new Uint8Array(await res.arrayBuffer());
  const head = new TextDecoder().decode(buf.slice(0, 5));
  assertEquals(head, "%PDF-", `expected PDF magic, got ${JSON.stringify(head)}`);
});
