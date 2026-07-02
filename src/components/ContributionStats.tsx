import { FileText, Heart, Eye, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { publishStatsSnapshot, clearStatsSnapshot } from "@/lib/statsConsistency";
import { logRealtimeEvent } from "@/lib/realtimeEventLog";

export interface ContributionStatsData {
  uploads: number;
  likes_received: number;
  dislikes_received?: number;
  views: number;
  rank: number | null;
}

interface Props {
  userId: string;
  className?: string;
  /** Surface tag used for cross-page consistency checking. */
  surface?: string;
}

/**
 * Compact stat strip showing a user's contribution metrics.
 * Always reads live from the `contributor_stats` view — no manual counters.
 */
export default function ContributionStats({ userId, className, surface }: Props) {
  const [stats, setStats] = useState<ContributionStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const load = () => {
      supabase
        .from("contributor_stats")
        .select("uploads, likes_received, dislikes_received, views, rank")
        .eq("user_id", userId)
        .maybeSingle()
        .then(({ data }) => {
          if (!active) return;
          const next = data
            ? {
                uploads: Number(data.uploads ?? 0),
                likes_received: Number(data.likes_received ?? 0),
                dislikes_received: Number(data.dislikes_received ?? 0),
                views: Number(data.views ?? 0),
                rank: data.rank ? Number(data.rank) : null,
              }
            : { uploads: 0, likes_received: 0, dislikes_received: 0, views: 0, rank: null };
          setStats(next);
          setLoading(false);
          if (surface) publishStatsSnapshot(surface, userId, next);
        });
    };


    setLoading(true);
    load();

    // Reactions / views / new uploads anywhere in the system can change this
    // user's rank, so we listen broadly and debounce refreshes.
    const scheduleRefresh = (table: string) => (payload: any) => {
      const row = payload?.new ?? payload?.old ?? {};
      const rowUser =
        row?.user_id ?? row?.uploader_id ?? row?.viewer_id ?? row?.uploaded_by ?? null;
      // Applied = this event actually contributes to the stats for `userId`.
      // Reactions/views apply when the file's uploader is `userId`, but we
      // don't have that mapping client-side, so we mark uploads directly and
      // treat reactions/views as "potentially applied" — refresh either way.
      const applied =
        table === "files" || table === "student_uploads"
          ? rowUser === userId
          : true;
      logRealtimeEvent(surface ?? "contribution-stats", table, payload, {
        applied,
        extra: `for=${userId.slice(0, 8)}`,
      });
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(load, 1000);
    };
    const channel = supabase
      .channel(`contribution-stats:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pdf_reactions" }, scheduleRefresh("pdf_reactions"))
      .on("postgres_changes", { event: "*", schema: "public", table: "pdf_views" }, scheduleRefresh("pdf_views"))
      .on("postgres_changes", { event: "*", schema: "public", table: "files" }, scheduleRefresh("files"))
      .on("postgres_changes", { event: "*", schema: "public", table: "student_uploads" }, scheduleRefresh("student_uploads"))
      .subscribe();

    return () => {
      active = false;
      if (refreshTimer) clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
      if (surface) clearStatsSnapshot(surface, userId);
    };
  }, [userId, surface]);



  if (loading) {
    return (
      <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-3", className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  const items = [
    { label: "Uploads", value: stats?.uploads ?? 0, icon: FileText, tint: "text-primary" },
    { label: "Likes", value: stats?.likes_received ?? 0, icon: Heart, tint: "text-rose-400" },
    { label: "Views", value: stats?.views ?? 0, icon: Eye, tint: "text-sky-400" },
    {
      label: "Rank",
      value: stats?.rank ? `#${stats.rank}` : "—",
      icon: Trophy,
      tint: "text-amber-400",
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-3", className)}>
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-xl border border-white/10 bg-card/50 backdrop-blur-sm p-3 md:p-4"
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <it.icon className={cn("h-3.5 w-3.5", it.tint)} />
            {it.label}
          </div>
          <div className="font-display text-xl md:text-2xl font-bold mt-1 tabular-nums">
            {typeof it.value === "number" ? it.value.toLocaleString() : it.value}
          </div>
        </div>
      ))}
    </div>
  );
}
