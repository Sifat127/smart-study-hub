import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RecentDownload, RecentUpload } from "@/components/dashboard/types";

/**
 * Loads the signed-in student's recent uploads and download history.
 * Shared by the dashboard sections so each list stays a dumb presentational component.
 */
export function useDashboardActivity(userId: string | undefined) {
  const [uploads, setUploads] = useState<RecentUpload[]>([]);
  const [downloads, setDownloads] = useState<RecentDownload[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(true);
  const [loadingDownloads, setLoadingDownloads] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      const [uploadsRes, downloadsRes] = await Promise.all([
        supabase
          .from("student_uploads")
          .select("id, title, kind, created_at, course_id, courses(code, name, department, semester)")
          .eq("uploaded_by", userId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("chapter_downloads")
          .select(
            "id, kind, file_name, downloaded_at, chapter_id, chapters(id, title, course_id, courses(code, name, department, semester))",
          )
          .eq("user_id", userId)
          .order("downloaded_at", { ascending: false })
          .limit(8),
      ]);
      if (!active) return;
      setUploads((uploadsRes.data as any) ?? []);
      setLoadingUploads(false);
      setDownloads((downloadsRes.data as any) ?? []);
      setLoadingDownloads(false);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  return { uploads, downloads, loadingUploads, loadingDownloads };
}
