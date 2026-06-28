import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, History, Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AuditRow {
  id: string;
  chapter_id: string | null;
  course_id: string | null;
  chapter_title: string | null;
  action: "insert" | "update" | "delete";
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
}

interface ProfileLite {
  user_id: string;
  full_name: string | null;
  roll_number: string | null;
}

const fieldLabel: Record<string, string> = {
  title: "Title",
  description: "Description",
  course_id: "Course",
  pdf_name: "PDF file name",
  pdf_url: "PDF link",
  file_id: "PDF file id",
  notes_name: "Notes file name",
  notes_url: "Notes link",
};

function actionBadge(a: AuditRow["action"]) {
  if (a === "insert") return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15"><Plus className="h-3 w-3 mr-1" /> Added</Badge>;
  if (a === "delete") return <Badge className="bg-destructive/15 text-destructive hover:bg-destructive/15"><Trash2 className="h-3 w-3 mr-1" /> Removed</Badge>;
  return <Badge className="bg-primary/15 text-primary hover:bg-primary/15"><Pencil className="h-3 w-3 mr-1" /> Edited</Badge>;
}

function truncate(s: string | null, n = 80) {
  if (!s) return "—";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export default function AdminAuditLog() {
  const { toast } = useToast();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  async function refresh() {
    setLoading(true);
    const { data, error } = await supabase
      .from("chapter_audit_log")
      .select("id, chapter_id, course_id, chapter_title, action, field_name, old_value, new_value, changed_by, changed_at")
      .order("changed_at", { ascending: false })
      .limit(500);

    if (error) {
      toast({ title: "Failed to load audit log", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const list = (data as AuditRow[] | null) || [];
    setRows(list);

    const userIds = Array.from(new Set(list.map((r) => r.changed_by).filter(Boolean) as string[]));
    if (userIds.length) {
      const { data: pdata } = await supabase
        .from("profiles")
        .select("user_id, full_name, roll_number")
        .in("user_id", userIds);
      const map: Record<string, ProfileLite> = {};
      (pdata as ProfileLite[] | null)?.forEach((p) => { map[p.user_id] = p; });
      setProfiles(map);
    } else {
      setProfiles({});
    }
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (actionFilter !== "all" && r.action !== actionFilter) return false;
      if (!q) return true;
      const actor = r.changed_by ? profiles[r.changed_by] : null;
      return (
        (r.chapter_title || "").toLowerCase().includes(q) ||
        (r.field_name || "").toLowerCase().includes(q) ||
        (r.old_value || "").toLowerCase().includes(q) ||
        (r.new_value || "").toLowerCase().includes(q) ||
        (actor?.full_name || "").toLowerCase().includes(q) ||
        (actor?.roll_number || "").toLowerCase().includes(q)
      );
    });
  }, [rows, actionFilter, search, profiles]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/admin" className="flex items-center gap-2">
            <img src={logo} alt="DIU StudyBank" className="h-11 w-11 rounded-lg object-contain" />
            <span className="font-display font-bold text-xl">Chapter Audit Log</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard</Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-end gap-3 mb-6">
          <div className="flex-1">
            <Label htmlFor="search">Search</Label>
            <Input id="search" placeholder="Search chapter, field, value, or actor…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="md:w-56">
            <Label>Action</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                <SelectItem value="insert">Added</SelectItem>
                <SelectItem value="update">Edited</SelectItem>
                <SelectItem value="delete">Removed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : visible.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <History className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium">No log entries</p>
            <p className="text-sm text-muted-foreground mt-1">Chapter changes will appear here as they happen.</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">When</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Chapter</th>
                    <th className="px-4 py-3 font-medium">Field</th>
                    <th className="px-4 py-3 font-medium">Change</th>
                    <th className="px-4 py-3 font-medium">By</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => {
                    const actor = r.changed_by ? profiles[r.changed_by] : null;
                    const when = new Date(r.changed_at);
                    return (
                      <tr key={r.id} className="border-t border-border/60 align-top">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {when.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                        </td>
                        <td className="px-4 py-3">{actionBadge(r.action)}</td>
                        <td className="px-4 py-3 max-w-[220px] truncate">{r.chapter_title || "—"}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {r.field_name ? (fieldLabel[r.field_name] || r.field_name) : "—"}
                        </td>
                        <td className="px-4 py-3 max-w-[360px]">
                          {r.action === "update" ? (
                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground">From: <span className="text-foreground">{truncate(r.old_value)}</span></div>
                              <div className="text-xs text-muted-foreground">To: <span className="text-foreground">{truncate(r.new_value)}</span></div>
                            </div>
                          ) : r.action === "insert" ? (
                            <div className="text-xs text-muted-foreground">Created with title <span className="text-foreground">{truncate(r.new_value)}</span></div>
                          ) : (
                            <div className="text-xs text-muted-foreground">Removed chapter <span className="text-foreground">{truncate(r.old_value)}</span></div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {actor ? (
                            <div>
                              <div className="font-medium">{actor.full_name || "—"}</div>
                              {actor.roll_number && <div className="text-xs text-muted-foreground">{actor.roll_number}</div>}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">System</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
