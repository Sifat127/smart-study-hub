import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabaseClient";

export default defineTool({
  name: "get_my_profile",
  title: "Get my profile",
  description: "Return the signed-in DIU StudyBank user's profile (name, roll number, department, batch, section, bio).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, roll_number, phone_number, section, department, batch, bio, current_semester")
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? {}, null, 2) }],
      structuredContent: { profile: data },
    };
  },
});
