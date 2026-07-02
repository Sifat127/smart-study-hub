import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, User as UserIcon } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import ContributionStats from "@/components/ContributionStats";
import RealtimeDebugPanel from "@/components/RealtimeDebugPanel";
import PdfCard, { type PdfCardData } from "@/components/PdfCard";

interface Contributor {
  user_id: string;
  full_name: string | null;
  roll_number: string | null;
  department: string | null;
  batch: string | null;
  avatar_url: string | null;
}

export default function ContributorProfile() {
  const { userId = "" } = useParams<{ userId: string }>();
  const [contributor, setContributor] = useState<Contributor | null>(null);
  const [files, setFiles] = useState<PdfCardData[] | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    supabase
      .from("profiles")
      .select("user_id, full_name, roll_number, department, batch, avatar_url")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setContributor(data);
      });

    const loadFiles = () => {
      supabase
        .from("files_public")
        .select("id, title, original_filename, upload_date")
        .eq("uploader_id", userId)
        .order("upload_date", { ascending: false })
        .then(({ data }) => {
          if (!active) return;
          setFiles(
            (data ?? []).map((f) => ({
              id: f.id,
              title: f.title,
              original_filename: f.original_filename,
              upload_date: f.upload_date,
            })),
          );
        });
    };
    loadFiles();

    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(loadFiles, 1000);
    };

    // Only refresh the file list when this contributor's own files change
    // (new upload, deletion, visibility flip). Per-file like/view counts are
    // handled live by <MaterialStats /> inside each <PdfCard />, and the
    // aggregate strip is handled by <ContributionStats />. Reloading the
    // whole list on every global reaction would remount cards and reset
    // their subscriptions, causing visible flicker.
    const channel = supabase
      .channel(`contributor-files:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "files", filter: `uploader_id=eq.${userId}` },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      active = false;
      if (refreshTimer) clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [userId]);


  return (
    <Layout>
      <section className="container mx-auto px-4 py-8 md:py-12 max-w-5xl">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/contribution">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to leaderboard
          </Link>
        </Button>

        <div className="rounded-2xl border border-white/10 bg-card/60 backdrop-blur-sm p-6 md:p-8 mb-6">
          {contributor === null ? (
            <div className="flex items-center gap-5">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-5">
              <div className="h-20 w-20 rounded-full bg-primary/10 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                {contributor.avatar_url ? (
                  <img src={contributor.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <UserIcon className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-2xl md:text-3xl font-bold truncate">
                  {contributor.full_name || "Unnamed student"}
                </h1>
                {contributor.roll_number && (
                  <div className="text-sm text-muted-foreground mt-0.5">
                    Roll: {contributor.roll_number}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {contributor.department && (
                    <Badge variant="outline" className="border-primary/30 text-primary/90 bg-primary/10">
                      {contributor.department}
                    </Badge>
                  )}
                  {contributor.batch && (
                    <Badge variant="outline" className="border-white/10">
                      Batch {contributor.batch}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <ContributionStats userId={userId} className="mb-8" surface="ContributorProfile" />

        <h2 className="font-display text-xl md:text-2xl font-bold mb-4">Uploaded notes</h2>
        {files === null ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <Card className="p-10 text-center rounded-2xl border-white/10 bg-card/40">
            <p className="text-muted-foreground">No approved uploads yet.</p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((f) => (
              <PdfCard
                key={f.id}
                pdf={{ ...f, uploader_name: contributor?.full_name ?? undefined }}
              />
            ))}
          </div>
        )}
      </section>
      <RealtimeDebugPanel
        watching={{
          page: "ContributorProfile",
          userId,
          files: files ? String(files.length) : "loading",
          firstFileId: files?.[0]?.id ?? null,
        }}
      />
    </Layout>
  );
}
