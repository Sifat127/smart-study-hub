import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Loader2, Plus, Pencil, Trash2, Search as SearchIcon, GraduationCap,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface SemRow {
  id: string;
  number: number;
  name: string;
  description: string;
  sort_order: number;
}

const emptyForm: SemRow = { id: "", number: 1, name: "", description: "", sort_order: 10 };

export default function AdminManageSemesters() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [rows, setRows] = useState<SemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<SemRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<SemRow>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<SemRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    const { data, error } = await supabase
      .from("semesters")
      .select("id, number, name, description, sort_order")
      .order("sort_order");
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    setRows((data as SemRow[] | null) || []);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (s) => s.name.toLowerCase().includes(q) || String(s.number).includes(q)
    );
  }, [rows, search]);

  useEffect(() => { setPage(1); }, [search]);
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function openNew() {
    const nextNum = rows.length ? Math.max(...rows.map((r) => r.number)) + 1 : 1;
    setForm({ ...emptyForm, number: nextNum, name: `Semester ${nextNum}`, sort_order: nextNum * 10 });
    setIsNew(true);
    setEditing({ ...emptyForm });
  }

  function openEdit(s: SemRow) {
    setForm({ ...s });
    setIsNew(false);
    setEditing(s);
  }

  async function handleSave() {
    if (!form.name.trim() || !Number.isFinite(Number(form.number))) {
      toast({ title: "Number and name are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        number: Number(form.number),
        name: form.name.trim(),
        description: form.description.trim(),
        sort_order: Number(form.sort_order) || 0,
      };
      if (isNew) {
        const { error } = await supabase.from("semesters").insert(payload);
        if (error) throw error;
        toast({ title: "Semester added" });
      } else {
        const { error } = await supabase.from("semesters").update(payload).eq("id", editing!.id);
        if (error) throw error;
        toast({ title: "Semester updated" });
      }
      setEditing(null);
      await refresh();
      qc.invalidateQueries({ queryKey: ["semesters"] });
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
      const { error } = await supabase.from("semesters").delete().eq("id", deleting.id);
      if (error) throw error;
      toast({ title: "Semester removed" });
      setDeleting(null);
      await refresh();
      qc.invalidateQueries({ queryKey: ["semesters"] });
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
            <span className="font-display font-bold text-xl">Manage Semesters</span>
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
              <Input id="search" className="pl-9" placeholder="Search by number or name…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Semester</Button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Showing <span className="font-medium text-foreground">{visible.length}</span> of {rows.length} semesters
        </p>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : visible.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <GraduationCap className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium">No semesters found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((s) => (
              <div key={s.id} className="bg-card rounded-xl border border-border p-5 card-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="font-display font-bold text-primary">{s.number}</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display font-semibold truncate">{s.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description || "—"}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Sort #{s.sort_order}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="icon" variant="outline" onClick={() => openEdit(s)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="outline" onClick={() => setDeleting(s)} aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isNew ? "New Semester" : "Edit Semester"}</DialogTitle>
            <DialogDescription>
              {isNew ? "Add a new semester record." : "Update this semester's details."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="f-num">Number</Label>
                <Input id="f-num" type="number" value={form.number}
                  onChange={(e) => setForm({ ...form, number: Number(e.target.value) })} />
              </div>
              <div>
                <Label htmlFor="f-sort">Sort order</Label>
                <Input id="f-sort" type="number" value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label htmlFor="f-name">Name</Label>
              <Input id="f-name" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="f-desc">Description</Label>
              <Textarea id="f-desc" rows={3} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {isNew ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete semester?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <span className="font-medium">{deleting?.name}</span>. Courses already linked to this semester number will keep their number value.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteBusy}>
              {deleteBusy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
