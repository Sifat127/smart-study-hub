import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabaseClient";

export default defineTool({
  name: "list_departments",
  title: "List departments",
  description: "List all academic departments available in DIU StudyBank.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("departments")
      .select("id, name, full_name, description")
      .order("sort_order", { ascending: true });
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { departments: data ?? [] },
    };
  },
});
