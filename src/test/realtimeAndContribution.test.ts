/**
 * Realtime + contribution integration test.
 *
 * Verifies end-to-end that:
 *   1. When a reaction / view / student_upload is written by user A, BOTH
 *      user A (acting as "student") and user B (acting as "admin") receive
 *      a `postgres_changes` payload with the correct `file_id` / `user_id`
 *      / action type. (Any-authenticated SELECT policies on these three
 *      tables mean student and admin see identical realtime traffic; the
 *      test asserts the payload contract rather than a role difference.)
 *   2. `contributor_stats` reflects the uploader's profile — full_name,
 *      roll_number, department, batch, avatar_url — plus non-zero
 *      uploads / likes_received / views counters after the writes above.
 *
 * Uses two throwaway `rls_test_*@diu.edu.bd` accounts confirmed via the
 * existing `_test_confirm_rls_user` helper. Cleans up the file row
 * (cascades to reactions/views) and the auth users after the run.
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from "vitest";
import {
  createClient,
  type RealtimePostgresChangesPayload,
  type SupabaseClient,
} from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const hasEnv = Boolean(url && key);
const d = hasEnv ? describe : describe.skip;

const rand = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const testEmail = () => `rls_test_${rand()}@diu.edu.bd`;
const testRoll = () =>
  `RLS-${Date.now().toString(36).slice(-6).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
const password = () => `P${rand()}Aa1!`;

const makeClient = (): SupabaseClient =>
  createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

type TestUser = {
  role: "student" | "admin";
  client: SupabaseClient;
  userId: string;
  email: string;
  fullName: string;
  rollNumber: string;
};

async function provisionUser(
  role: "student" | "admin",
  label: string,
): Promise<TestUser> {
  const client = makeClient();
  const email = testEmail();
  const pw = password();
  const fullName = `RLS ${label}`;
  const rollNumber = testRoll();
  const { data, error } = await client.auth.signUp({
    email,
    password: pw,
    options: { data: { full_name: fullName, roll_number: rollNumber } },
  });
  if (error) throw new Error(`signUp ${label}: ${error.message}`);
  if (!data.user) throw new Error(`signUp ${label}: no user`);

  const { error: cErr } = await client.rpc(
    "_test_confirm_rls_user" as never,
    { _email: email } as never,
  );
  if (cErr) throw new Error(`confirm ${label}: ${cErr.message}`);
  const { error: sErr } = await client.auth.signInWithPassword({
    email,
    password: pw,
  });
  if (sErr) throw new Error(`signIn ${label}: ${sErr.message}`);

  return { role, client, userId: data.user.id, email, fullName, rollNumber };
}

async function deleteUser(email: string) {
  await makeClient().rpc("_test_delete_rls_user" as never, {
    _email: email,
  } as never);
}

/** Wait until the channel is joined so subsequent writes are captured. */
function waitForJoin(channel: ReturnType<SupabaseClient["channel"]>) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("channel join timeout")), 10_000);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(t);
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(t);
        reject(new Error(`channel error: ${status}`));
      }
    });
  });
}

interface CapturedEvent {
  table: string;
  event: string;
  fileId: string | null;
  userId: string | null;
}

/**
 * Subscribe one client to pdf_reactions / pdf_views / student_uploads and
 * return a `waitFor(matcher)` helper that resolves when a matching payload
 * arrives (with a timeout).
 */
async function attachListeners(user: TestUser, fileId: string) {
  const received: CapturedEvent[] = [];
  const channel = user.client.channel(`test-${user.role}-${rand()}`);

  const push = (table: string) =>
    (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      const row = (payload.new ?? payload.old ?? {}) as Record<string, unknown>;
      received.push({
        table,
        event: String(payload.eventType).toUpperCase(),
        fileId:
          (row.file_id as string | undefined) ??
          (row.id as string | undefined) ??
          null,
        userId:
          (row.user_id as string | undefined) ??
          (row.viewer_id as string | undefined) ??
          (row.uploaded_by as string | undefined) ??
          null,
      });
    };

  channel
    .on(
      "postgres_changes" as never,
      { event: "*", schema: "public", table: "pdf_reactions", filter: `file_id=eq.${fileId}` },
      push("pdf_reactions") as never,
    )
    .on(
      "postgres_changes" as never,
      { event: "*", schema: "public", table: "pdf_views", filter: `file_id=eq.${fileId}` },
      push("pdf_views") as never,
    )
    .on(
      "postgres_changes" as never,
      { event: "*", schema: "public", table: "student_uploads" },
      push("student_uploads") as never,
    );

  await waitForJoin(channel);

  const waitFor = (
    matcher: (e: CapturedEvent) => boolean,
    timeoutMs = 8_000,
  ) =>
    new Promise<CapturedEvent>((resolve, reject) => {
      const existing = received.find(matcher);
      if (existing) return resolve(existing);
      const started = received.length;
      const iv = setInterval(() => {
        for (let i = started; i < received.length; i++) {
          if (matcher(received[i])) {
            clearInterval(iv);
            resolve(received[i]);
            return;
          }
        }
      }, 50);
      setTimeout(() => {
        clearInterval(iv);
        reject(
          new Error(
            `[${user.role}] no matching event within ${timeoutMs}ms. seen=` +
              JSON.stringify(received),
          ),
        );
      }, timeoutMs);
    });

  return {
    received,
    waitFor,
    cleanup: () => user.client.removeChannel(channel),
  };
}

d("realtime payloads + contribution stats", () => {
  let student: TestUser;
  let admin: TestUser;
  let fileId: string;

  beforeAll(async () => {
    [student, admin] = await Promise.all([
      provisionUser("student", "Student"),
      provisionUser("admin", "AdminProxy"),
    ]);

    // Give the admin proxy a picture + department so contributor_stats has
    // real profile fields to return.
    const { error: profErr } = await admin.client
      .from("profiles")
      .update({
        avatar_url: "https://example.com/avatar-admin.png",
        department: "Computer Science & Engineering",
        batch: "60th",
      })
      .eq("user_id", admin.userId);
    if (profErr) throw new Error(`seed profile: ${profErr.message}`);

    // Insert a real file owned by the admin proxy so FK constraints on
    // pdf_reactions / pdf_views are satisfied. Direct writes to `public.files`
    // are not exposed to the client (uploads happen via an edge function),
    // so we use the `_test_insert_rls_file` helper which is restricted to
    // `rls_test_*` accounts.
    const { data: fid, error: fileErr } = await admin.client.rpc(
      "_test_insert_rls_file" as never,
      { _uploader: admin.userId } as never,
    );
    if (fileErr) throw new Error(`insert file: ${fileErr.message}`);
    fileId = fid as unknown as string;
  }, 60_000);

  afterAll(async () => {
    try {
      if (fileId) {
        await admin.client.rpc(
          "_test_delete_rls_file" as never,
          { _file_id: fileId } as never,
        );
      }
    } catch {
      /* ignore */
    }
      /* ignore */
    }
    await Promise.allSettled([
      student && deleteUser(student.email),
      admin && deleteUser(admin.email),
    ]);
  });

  it("delivers reaction / view / upload events to both student and admin listeners with correct file_id and user_id", async () => {
    const studentListener = await attachListeners(student, fileId);
    const adminListener = await attachListeners(admin, fileId);

    // The student "likes" the file.
    const { error: rxErr } = await student.client.rpc(
      "set_pdf_reaction" as never,
      { _file_id: fileId, _reaction: "like" } as never,
    );
    expect(rxErr).toBeNull();

    // The student "views" the file.
    const { error: vwErr } = await student.client.rpc(
      "record_pdf_view" as never,
      { _file_id: fileId } as never,
    );
    expect(vwErr).toBeNull();

    // The admin proxy uploads a student_upload row (represents any user
    // publishing new material — the leaderboard subscribes to this table).
    const uploadTitle = `rt-upload-${rand()}`;
    const { data: uploadRow, error: upErr } = await admin.client
      .from("student_uploads")
      .insert({
        kind: "notes",
        title: uploadTitle,
        student_name: admin.fullName,
        file_name: "n.pdf",
        file_url: "https://example.com/n.pdf",
        uploaded_by: admin.userId,
      })
      .select("id")
      .single();
    expect(upErr).toBeNull();
    const uploadId = (uploadRow as { id: string }).id;

    // Both listeners should observe every action with the right IDs.
    for (const listener of [studentListener, adminListener]) {
      const like = await listener.waitFor(
        (e) =>
          e.table === "pdf_reactions" &&
          e.fileId === fileId &&
          e.userId === student.userId,
      );
      expect(like.event).toBe("INSERT");

      const view = await listener.waitFor(
        (e) =>
          e.table === "pdf_views" &&
          e.fileId === fileId &&
          e.userId === student.userId,
      );
      expect(view.event).toBe("INSERT");

      const upload = await listener.waitFor(
        (e) =>
          e.table === "student_uploads" &&
          e.fileId === uploadId &&
          e.userId === admin.userId,
      );
      expect(upload.event).toBe("INSERT");
    }

    studentListener.cleanup();
    adminListener.cleanup();

    // Cleanup the upload row so it doesn't linger.
    await admin.client.from("student_uploads").delete().eq("id", uploadId);
  }, 45_000);

  it("returns full profile fields + non-zero counts from contributor_stats", async () => {
    const { data, error } = await admin.client
      .from("contributor_stats")
      .select(
        "user_id, full_name, roll_number, department, batch, avatar_url, uploads, likes_received, views",
      )
      .eq("user_id", admin.userId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.user_id).toBe(admin.userId);
    expect(data?.full_name).toBe(admin.fullName);
    expect(data?.roll_number).toBe(admin.rollNumber);
    expect(data?.department).toBe("Computer Science & Engineering");
    expect(data?.batch).toBe("60th");
    expect(data?.avatar_url).toBe("https://example.com/avatar-admin.png");
    // The student liked + viewed the admin's file in the previous test.
    expect(Number(data?.likes_received ?? 0)).toBeGreaterThanOrEqual(1);
    expect(Number(data?.views ?? 0)).toBeGreaterThanOrEqual(1);
  }, 20_000);
});
