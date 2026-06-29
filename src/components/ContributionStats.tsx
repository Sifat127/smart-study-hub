import { FileText, Heart, Eye, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface ContributionStatsData {
  uploads: number;
  likes_received: number;
  views: number;
  rank: number | null;
}

interface Props {
  userId: string;
  className?: string;
}

/**
 * Compact stat strip showing a user's contribution metrics.
 * Always reads live from the `contributor_stats` view — no manual counters.
 */
export default function ContributionStats({ userId, className }: Props) {
  const [stats, setStats] = useState<ContributionStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase
      .from("contributor_stats")
      .select("uploads, likes_received, views, rank")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setStats(
          data
            ? {
                uploads: Number(data.uploads ?? 0),
                likes_received: Number(data.likes_received ?? 0),
                views: Number(data.views ?? 0),
                rank: data.rank ? Number(data.rank) : null,
              }
            : { uploads: 0, likes_received: 0, views: 0, rank: null },
        );
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

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
