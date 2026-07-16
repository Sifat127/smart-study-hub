import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseClient";

export default defineTool({
  name: "list_courses",
  title: "List courses",
  description: "List courses, optionally filtered by department id and/or semester number.",
  inputSchema: {
    department: z.string().optional().describe("Department id (e.g. 'cse')."),
    semester: z.number().int().min(1).max(12).optional().describe("Semester number 1-12."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows (default 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ department, semester, limit }, ctx) => {
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("courses")
      .select("id, code, name, department, semester")
      .order("semester", { ascending: true })
      .order("code", { ascending: true })
      .limit(limit ?? 100);
    if (department) q = q.eq("department", department);
    if (semester) q = q.eq("semester", semester);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { courses: data ?? [] },
    };
  },
});
