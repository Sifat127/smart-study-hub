import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, FileText, Pencil, Trash2, Upload, Search as SearchIcon, BookOpen } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile } from "@/lib/storage";

interface CourseOption {
  id: string;
  code: string;
  name: string;
  department: string;
  semester: number;
}

interface ChapterRow {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  pdf_name: string | null;
  pdf_url: string | null;
  file_id: string | null;
  notes_name: string | null;
  notes_url: string | null;
  uploaded_at: string;
}

export default function AdminManageChapters() {
  const { toast } = useToast();
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [editing, setEditing] = useState<ChapterRow | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCourseId, setEditCourseId] = useState("");
  const [replacePdf, setReplacePdf] = useState<File | null>(null);
  const [replaceNotes, setReplaceNotes] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<ChapterRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    const [coursesRes, chaptersRes] = await Promise.all([
      supabase.from("courses").select("id, code, name, department, semester").order("department").order("semester").order("code"),
      supabase.from("chapters").select("id, course_id, title, description, pdf_name, pdf_url, file_id, notes_name, notes_url, uploaded_at").order("uploaded_at", { ascending: false }),
    ]);
    if (coursesRes.data) setCourses(coursesRes.data);
    if (chaptersRes.data) setChapters(chaptersRes.data);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  const courseById = useMemo(() => {
    const m = new Map<string, CourseOption>();
    courses.forEach((c) => m.set(c.id, c));
    return m;
  }, [courses]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return chapters.filter((ch) => {
      if (courseFilter !== "all" && ch.course_id !== courseFilter) return false;
      if (!q) return true;
      const c = courseById.get(ch.course_id);
      return (
        ch.title.toLowerCase().includes(q) ||
        (ch.description || "").toLowerCase().includes(q) ||
        (ch.pdf_name || "").toLowerCase().includes(q) ||
        (c?.code || "").toLowerCase().includes(q) ||
        (c?.name || "").toLowerCase().includes(q)
      );
    });
  }, [chapters, courseFilter, search, courseById]);

  function openEdit(ch: ChapterRow) {
    setEditing(ch);
    setEditTitle(ch.title);
    setEditDescription(ch.description || "");
    setEditCourseId(ch.course_id);
    setReplacePdf(null);
    setReplaceNotes(null);
  }

  async function handleSave() {
    if (!editing) return;
    if (!editTitle.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const course = courseById.get(editCourseId);
      const updates: Partial<ChapterRow> = {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        course_id: editCourseId,
      };

      if (replacePdf) {
        const pdf = await uploadFile(replacePdf, {
          title: editTitle.trim(),
          course_id: editCourseId,
          course_code: course?.code,
          department: course?.department,
          semester: course ? String(course.semester) : undefined,
          visibility: "authenticated",
          requireAdmin: true,
        });
        updates.pdf_name = pdf.original_filename;
        updates.pdf_url = pdf.public_url;
        updates.file_id = pdf.id;
      }

      if (replaceNotes) {
        const notes = await uploadFile(replaceNotes, {
          title: `${editTitle.trim()} – Notes`,
          course_id: editCourseId,
          course_code: course?.code,
          department: course?.department,
          semester: course ? String(course.semester) : undefined,
          visibility: "authenticated",
          requireAdmin: true,
        });
        updates.notes_name = notes.original_filename;
        updates.notes_url = notes.public_url;
      }

      const { error } = await supabase.from("chapters").update(updates).eq("id", editing.id);
      if (error) throw error;

      toast({ title: "Chapter updated" });
      setEditing(null);
      await refresh();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const { error } = await supabase.from("chapters").delete().eq("id", deleting.id);
      if (error) throw error;
      toast({ title: "Chapter removed" });
      setDeleting(null);
      await refresh();
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
            <span className="font-display font-bold text-xl">Manage Chapters</span>
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
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="search" className="pl-9" placeholder="Search by chapter, course, code, file name…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="md:w-72">
            <Label>Filter by Course</Label>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.department} · Sem {c.semester} · {c.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button asChild>
            <Link to="/admin/upload-pdf"><Upload className="h-4 w-4 mr-1" /> New Chapter</Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : visible.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium">No chapters found</p>
            <p className="text-sm text-muted-foreground mt-1">Try a different search or upload a new chapter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visible.map((ch) => {
              const c = courseById.get(ch.course_id);
              return (
                <div key={ch.id} className="bg-card rounded-xl border border-border p-5 card-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground mb-1">
                        {c ? `${c.department} · Sem ${c.semester} · ${c.code}` : "Unknown course"}
                      </div>
                      <h3 className="font-display font-semibold truncate">{ch.title}</h3>
                      {ch.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ch.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="icon" variant="outline" onClick={() => openEdit(ch)} aria-label="Edit chapter">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="outline" onClick={() => setDeleting(ch)} aria-label="Delete chapter">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      {ch.pdf_url ? (
                        <a href={ch.pdf_url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">
                          {ch.pdf_name || "Chapter PDF"}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">No PDF linked</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-accent shrink-0" />
                      {ch.notes_url ? (
                        <a href={ch.notes_url} target="_blank" rel="noreferrer" className="text-accent hover:underline truncate">
                          {ch.notes_name || "Notes"}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">No notes linked</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Chapter</DialogTitle>
            <DialogDescription>Update the description or replace the linked files.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea id="edit-desc" rows={3} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
            <div>
              <Label>Course</Label>
              <Select value={editCourseId} onValueChange={setEditCourseId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.department} · Sem {c.semester} · {c.code} {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="replace-pdf">Replace PDF (optional)</Label>
              <Input id="replace-pdf" type="file" accept=".pdf" onChange={(e) => setReplacePdf(e.target.files?.[0] || null)} />
              {editing?.pdf_name && !replacePdf && (
                <p className="text-xs text-muted-foreground mt-1">Current: {editing.pdf_name}</p>
              )}
            </div>
            <div>
              <Label htmlFor="replace-notes">Replace Notes (optional)</Label>
              <Input id="replace-notes" type="file" accept=".pdf,.doc,.docx,.txt,.ppt,.pptx" onChange={(e) => setReplaceNotes(e.target.files?.[0] || null)} />
              {editing?.notes_name && !replaceNotes && (
                <p className="text-xs text-muted-foreground mt-1">Current: {editing.notes_name}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Saving…</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove chapter?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes "{deleting?.title}" from the catalog. The underlying PDF file is not deleted from storage.
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
