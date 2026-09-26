import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Flag, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

type Status = "open" | "resolved" | "dismissed";
interface Report {
  id: string;
  item_name: string;
  reason: string;
  details: string | null;
  status: Status;
  created_at: string;
  file_id: string | null;
  chapter_id: string | null;
}

const REASON_LABEL: Record<string, string> = {
  broken: "Broken",
  outdated: "Outdated",
  wrong_content: "Wrong content",
  other: "Other",
};

export default function AdminReports() {
  const [tab, setTab] = useState<Status>("open");
  const [rows, setRows] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("pdf_reports")
      .select("id, item_name, reason, details, status, created_at, file_id, chapter_id")
      .eq("status", tab)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) toast.error("Could not load reports");
        setRows((data ?? []) as Report[]);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [tab]);

  const setStatus = async (id: string, status: Status) => {
    setBusy(id);
    const { error } = await supabase.from("pdf_reports").update({ status }).eq("id", id);
    setBusy(null);
    if (error) return toast.error("Could not update report");
    setRows((r) => r.filter((x) => x.id !== id));
    toast.success(status === "resolved" ? "Marked as fixed" : status === "dismissed" ? "Dismissed" : "Reopened");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-4xl">
        <Button variant="ghost" size="sm" asChild className="mb-4 h-11 px-4">
          <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Admin</Link>
        </Button>
        <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Flag className="h-6 w-6 text-destructive" /> PDF Reports
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Broken or outdated PDFs flagged by students.</p>

        <div className="flex gap-2 mt-6 mb-4 overflow-x-auto">
          {(["open", "resolved", "dismissed"] as Status[]).map((s) => (
            <Button key={s} size="sm" variant={tab === s ? "default" : "outline"} onClick={() => setTab(s)} className="h-10 capitalize">
              {s}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-border p-10 text-center text-muted-foreground">No {tab} reports.</div>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="destructive">{REASON_LABEL[r.reason] ?? r.reason}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    <p className="font-semibold mt-2 break-words">{r.item_name}</p>
                    {r.details && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">{r.details}</p>}
                    {r.file_id && (
                      <Link to={`/pdf/${r.file_id}?name=${encodeURIComponent(r.item_name)}`} className="text-xs text-primary underline mt-2 inline-block">
                        Open PDF
                      </Link>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {tab === "open" ? (
                      <>
                        <Button size="sm" className="h-10" disabled={busy === r.id} onClick={() => setStatus(r.id, "resolved")}>
                          {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />} Fixed
                        </Button>
                        <Button size="sm" variant="outline" className="h-10" disabled={busy === r.id} onClick={() => setStatus(r.id, "dismissed")}>
                          <X className="h-4 w-4 mr-1" /> Dismiss
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" className="h-10" disabled={busy === r.id} onClick={() => setStatus(r.id, "open")}>
                        Reopen
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
