import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseClient";

export default defineTool({
  name: "search_files",
  title: "Search study materials",
  description: "Search DIU StudyBank PDFs and notes by title, subject, or course code. Returns files the signed-in user is allowed to see under RLS.",
  inputSchema: {
    query: z.string().min(1).describe("Free-text query matched against title, subject, and course_code."),
    department: z.string().optional().describe("Optional department filter (e.g. 'cse')."),
    semester: z.string().optional().describe("Optional semester filter (e.g. '3')."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, department, semester, limit }, ctx) => {
    const supabase = supabaseForUser(ctx);
    const like = `%${query.replace(/[%_]/g, (m) => "\\" + m)}%`;
    let q = supabase
      .from("files")
      .select("id, title, subject, department, semester, course_code, file_type, download_count, upload_date")
      .or(`title.ilike.${like},subject.ilike.${like},course_code.ilike.${like}`)
      .order("upload_date", { ascending: false })
      .limit(limit ?? 20);
    if (department) q = q.eq("department", department);
    if (semester) q = q.eq("semester", semester);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { files: data ?? [] },
    };
  },
});
