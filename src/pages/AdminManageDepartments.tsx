import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Loader2, Plus, Pencil, Trash2, Search as SearchIcon,
  Monitor, Zap, Briefcase, Code, Database, Pill, BookText, Scale,
  Shirt, Building2, Radio, Plane, Apple, HeartPulse, Clapperboard, Layers,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";

const PAGE_SIZE = 12;

interface DeptRow {
  id: string;
  name: string;
  full_name: string;
  description: string;
  icon: string;
  sort_order: number;
}

const iconChoices = [
  "Monitor", "Zap", "Briefcase", "Code", "Database", "Pill", "BookText", "Scale",
  "Shirt", "Building2", "Radio", "Plane", "Apple", "HeartPulse", "Clapperboard", "Layers",
] as const;

const iconMap: Record<string, React.ElementType> = {
  Monitor, Zap, Briefcase, Code, Database, Pill, BookText, Scale,
  Shirt, Building2, Radio, Plane, Apple, HeartPulse, Clapperboard, Layers,
};

const emptyForm: DeptRow = { id: "", name: "", full_name: "", description: "", icon: "Layers", sort_order: 0 };

export default function AdminManageDepartments() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [rows, setRows] = useState<DeptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [iconFilter, setIconFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"sort_asc" | "sort_desc" | "name_asc" | "name_desc">("sort_asc");
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<DeptRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<DeptRow>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<DeptRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    const { data, error } = await supabase
      .from("departments")
      .select("id, name, full_name, description, icon, sort_order")
      .order("sort_order");
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    }
    setRows((data as DeptRow[] | null) || []);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows.filter((d) => {
      if (iconFilter !== "all" && d.icon !== iconFilter) return false;
      if (!q) return true;
      return (
        d.id.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.full_name.toLowerCase().includes(q)
      );
    });
    const sorted = [...list].sort((a, b) => {
      switch (sortBy) {
        case "sort_desc": return b.sort_order - a.sort_order;
        case "name_asc": return a.name.localeCompare(b.name);
        case "name_desc": return b.name.localeCompare(a.name);
        default: return a.sort_order - b.sort_order;
      }
    });
    return sorted;
  }, [rows, search, iconFilter, sortBy]);

  function openNew() {
    const nextOrder = rows.length ? Math.max(...rows.map((r) => r.sort_order)) + 10 : 10;
    setForm({ ...emptyForm, sort_order: nextOrder });
    setIsNew(true);
    setEditing({ ...emptyForm });
  }

  function openEdit(d: DeptRow) {
    setForm({ ...d });
    setIsNew(false);
    setEditing(d);
  }

  async function handleSave() {
    const id = form.id.trim().toLowerCase();
    if (!id || !/^[a-z0-9-]{2,30}$/.test(id)) {
      toast({ title: "Invalid ID", description: "Use 2–30 lowercase letters, digits, or dashes (e.g. cse, swe).", variant: "destructive" });
      return;
    }
    if (!form.name.trim() || !form.full_name.trim()) {
      toast({ title: "Name and full name are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        id,
        name: form.name.trim(),
        full_name: form.full_name.trim(),
        description: form.description.trim(),
        icon: form.icon || "Layers",
        sort_order: Number(form.sort_order) || 0,
      };
      if (isNew) {
        const { error } = await supabase.from("departments").insert(payload);
        if (error) throw error;
        toast({ title: "Department added" });
      } else {
        const { error } = await supabase
          .from("departments")
          .update({
            name: payload.name,
            full_name: payload.full_name,
            description: payload.description,
            icon: payload.icon,
            sort_order: payload.sort_order,
          })
          .eq("id", editing!.id);
        if (error) throw error;
        toast({ title: "Department updated" });
      }
      setEditing(null);
      await refresh();
      qc.invalidateQueries({ queryKey: ["departments"] });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const { error } = await supabase.from("departments").delete().eq("id", deleting.id);
      if (error) throw error;
      toast({ title: "Department removed" });
      setDeleting(null);
      await refresh();
      qc.invalidateQueries({ queryKey: ["departments"] });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/admin" className="flex items-center gap-2">
            <img src={logo} alt="DIU StudyBank" className="h-11 w-11 rounded-lg object-contain" />
            <span className="font-display font-bold text-xl">Manage Departments</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard</Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-end gap-3 mb-4">
          <div className="flex-1">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="search" className="pl-9" placeholder="Search by ID, short name, or full name…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="w-full md:w-44">
            <Label>Icon</Label>
            <Select value={iconFilter} onValueChange={setIconFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All icons</SelectItem>
                {iconChoices.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-52">
            <Label>Sort by</Label>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sort_asc">Sort order ↑</SelectItem>
                <SelectItem value="sort_desc">Sort order ↓</SelectItem>
                <SelectItem value="name_asc">Name A → Z</SelectItem>
                <SelectItem value="name_desc">Name Z → A</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Department</Button>
        </div>

        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{visible.length}</span> of {rows.length} departments
            {(search || iconFilter !== "all") && (
              <button
                onClick={() => { setSearch(""); setIconFilter("all"); }}
                className="ml-3 text-primary hover:underline"
              >Clear filters</button>
            )}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : visible.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <Layers className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium">No departments found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((d) => {
              const Icon = iconMap[d.icon] || Layers;
              return (
                <div key={d.id} className="bg-card rounded-xl border border-border p-5 card-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-semibold truncate">{d.name}</h3>
                          <span className="text-xs font-mono text-muted-foreground">#{d.id}</span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{d.full_name}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.description || "—"}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Sort #{d.sort_order}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="icon" variant="outline" onClick={() => openEdit(d)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="outline" onClick={() => setDeleting(d)} aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? "New Department" : "Edit Department"}</DialogTitle>
            <DialogDescription>
              {isNew ? "Add a new department to the catalog." : "Update this department's details."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="f-id">ID (URL slug)</Label>
              <Input
                id="f-id"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                placeholder="e.g. cse"
                disabled={!isNew}
              />
              {!isNew && <p className="text-xs text-muted-foreground mt-1">ID can't be changed after creation.</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="f-name">Short name</Label>
                <Input id="f-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="CSE" />
              </div>
              <div>
                <Label htmlFor="f-sort">Sort order</Label>
                <Input id="f-sort" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label htmlFor="f-full">Full name</Label>
              <Input id="f-full" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Computer Science & Engineering" />
            </div>
            <div>
              <Label htmlFor="f-desc">Description</Label>
              <Textarea id="f-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Icon</Label>
              <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {iconChoices.map((name) => {
                    const I = iconMap[name];
                    return (
                      <SelectItem key={name} value={name}>
                        <span className="inline-flex items-center gap-2"><I className="h-4 w-4" /> {name}</span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Saving…</> : (isNew ? "Create" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this department?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.full_name}" will be removed from the catalog. Existing courses tagged with this department code stay in the database but won't have a matching department record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteBusy}>
              {deleteBusy ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Removing…</> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
