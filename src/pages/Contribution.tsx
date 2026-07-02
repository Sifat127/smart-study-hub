import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Trophy, FileText, Heart, Eye, User as UserIcon } from "lucide-react";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useDepartments } from "@/hooks/useDepartments";
import { cn } from "@/lib/utils";

type SortKey = "uploads" | "likes_received" | "views";

interface Row {
  user_id: string;
  full_name: string | null;
  roll_number: string | null;
  department: string | null;
  batch: string | null;
  avatar_url: string | null;
  uploads: number;
  likes_received: number;
  views: number;
  rank: number;
}

const PAGE_SIZE = 24;

export default function Contribution() {
  const departments = useDepartments();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState<string>("all");
  const [batch, setBatch] = useState<string>("");
  const [sort, setSort] = useState<SortKey>("uploads");
  const [page, setPage] = useState(1);

  // Load the leaderboard once and then keep it fresh with a debounced
  // real-time refresh whenever reactions/views/files change anywhere.
  useEffect(() => {
    let active = true;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const load = () => {
      supabase
        .from("contributor_stats")
        .select(
          "user_id, full_name, roll_number, department, batch, avatar_url, uploads, likes_received, views, rank",
        )
        .gt("uploads", 0)
        .order(sort, { ascending: false })
        .order("likes_received", { ascending: false })
        .order("views", { ascending: false })
        .limit(500)
        .then(({ data }) => {
          if (!active) return;
          setRows(
            (data ?? []).map((r) => ({
              ...r,
              uploads: Number(r.uploads ?? 0),
              likes_received: Number(r.likes_received ?? 0),
              views: Number(r.views ?? 0),
              rank: Number(r.rank ?? 0),
            })),
          );
        });
    };

    setRows(null);
    load();

    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      // Coalesce bursts of events into a single reload to keep the UI smooth.
      refreshTimer = setTimeout(load, 1200);
    };

    const channel = supabase
      .channel("contribution-leaderboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "pdf_reactions" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "pdf_views" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "files" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "student_uploads" }, scheduleRefresh)
      .subscribe();

    return () => {
      active = false;
      if (refreshTimer) clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [sort]);


  const filtered = useMemo(() => {
    if (!rows) return null;
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (department !== "all" && (r.department ?? "") !== department) return false;
      if (batch.trim() && (r.batch ?? "").toLowerCase() !== batch.trim().toLowerCase()) return false;
      if (q) {
        const hay = `${r.full_name ?? ""} ${r.roll_number ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, department, batch]);

  const paged = useMemo(
    () => (filtered ? filtered.slice(0, page * PAGE_SIZE) : null),
    [filtered, page],
  );

  useEffect(() => {
    setPage(1);
  }, [search, department, batch, sort]);

  return (
    <Layout>
      <section className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
        <header className="mb-6 md:mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium mb-3">
            <Trophy className="h-3.5 w-3.5" /> Top contributors
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold mb-2">
            Contribution <span className="text-gradient">Leaderboard</span>
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
            Students powering DIU StudyBank — ranked by approved uploads, likes received and total
            views.
          </p>
        </header>

        <div className="grid md:grid-cols-[1fr_auto_auto_auto] gap-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or roll number"
              className="pl-9 rounded-xl"
            />
          </div>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="rounded-xl md:w-56">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.name}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            placeholder="Batch (e.g. 60th)"
            className="rounded-xl md:w-40"
          />
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="rounded-xl md:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="uploads">Most Uploads</SelectItem>
              <SelectItem value="likes_received">Most Likes</SelectItem>
              <SelectItem value="views">Most Views</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {paged === null ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
        ) : paged.length === 0 ? (
          <Card className="p-10 text-center rounded-2xl border-white/10 bg-card/40">
            <p className="text-muted-foreground">No contributors match your filters yet.</p>
          </Card>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paged.map((r) => (
                <ContributorCard key={r.user_id} row={r} />
              ))}
            </div>
            {filtered && paged.length < filtered.length && (
              <div className="flex justify-center mt-8">
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-full border border-white/10 bg-card/60 hover:bg-card px-5 py-2 text-sm font-medium"
                >
                  Show more
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </Layout>
  );
}

function ContributorCard({ row }: { row: Row }) {
  const rankTone =
    row.rank === 1
      ? "bg-amber-500/15 text-amber-400 border-amber-500/40"
      : row.rank === 2
        ? "bg-zinc-300/15 text-zinc-200 border-zinc-300/30"
        : row.rank === 3
          ? "bg-orange-500/15 text-orange-400 border-orange-500/40"
          : "bg-white/5 text-muted-foreground border-white/10";

  return (
    <Link
      to={`/contribution/${row.user_id}`}
      className="group block rounded-2xl border border-white/10 bg-card/60 backdrop-blur-sm p-5 hover:border-accent/40 hover:shadow-[0_8px_30px_-12px_hsl(var(--accent)/0.4)] transition-all"
    >
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 rounded-full bg-primary/10 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
          {row.avatar_url ? (
            <img src={row.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <UserIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-display font-semibold truncate">
                {row.full_name || "Unnamed student"}
              </div>
              {row.roll_number && (
                <div className="text-xs text-muted-foreground truncate">{row.roll_number}</div>
              )}
            </div>
            <Badge variant="outline" className={cn("shrink-0 border", rankTone)}>
              #{row.rank}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {row.department && (
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary/90 border border-primary/20">
                {row.department}
              </span>
            )}
            {row.batch && (
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground border border-white/10">
                {row.batch}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/[0.06]">
        <Stat icon={FileText} label="Uploads" value={row.uploads} tint="text-primary" />
        <Stat icon={Heart} label="Likes" value={row.likes_received} tint="text-rose-400" />
        <Stat icon={Eye} label="Views" value={row.views} tint="text-sky-400" />
      </div>
    </Link>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  tint: string;
}) {
  return (
    <div className="text-center">
      <div className={cn("inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground", tint)}>
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="font-display text-lg font-bold tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}
