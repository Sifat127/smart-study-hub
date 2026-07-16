import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import listDepartments from "./tools/list-departments";
import listCourses from "./tools/list-courses";
import searchFiles from "./tools/search-files";
import listMyUploads from "./tools/list-my-uploads";

// Direct Supabase issuer — never the .lovable.cloud proxy. The project ref is
// inlined at build time via Vite's import.meta.env, keeping this file
// import-safe (no runtime env read at module top level).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "diu-studybank-mcp",
  title: "DIU StudyBank",
  version: "0.1.0",
  instructions:
    "Tools for DIU StudyBank — a study-material library for Daffodil International University. " +
    "Use `get_my_profile` for the signed-in user's profile, `list_departments` and `list_courses` " +
    "to browse the catalog, `search_files` to find PDFs and notes, and `list_my_uploads` to see the " +
    "user's own contributions. All calls run as the signed-in user under database RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfile, listDepartments, listCourses, searchFiles, listMyUploads],
});
