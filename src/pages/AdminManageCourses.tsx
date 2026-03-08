import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ArrowLeft, Edit, Trash2, Plus, Loader2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Course {
  id: string;
  code: string;
  name: string;
  department: string;
  semester: number;
}

const emptyForm = { code: "", name: "", department: "", semester: "1" };

export default function AdminManageCourses() {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from("courses")
      .select("id, code, name, department, semester")
      .order("department")
      .order("semester");
    if (data) setCourses(data);
    if (error) toast({ title: "Error loading courses", description: error.message, variant: "destructive" });
    setLoading(false);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const filtered = courses.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: Course) => {
    setEditing(c);
    setForm({ code: c.code, name: c.name, department: c.department, semester: String(c.semester) });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.name || !form.department) {
      toast({ title: "সব ফিল্ড পূরণ করুন", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = { code: form.code, name: form.name, department: form.department, semester: Number(form.semester) };

    if (editing) {
      const { error } = await supabase.from("courses").update(payload).eq("id", editing.id);
      if (error) {
        toast({ title: "Update failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Course updated!" });
      }
    } else {
      const { error } = await supabase.from("courses").insert(payload);
      if (error) {
        toast({ title: "Insert failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Course added!" });
      }
    }

    setSaving(false);
    setDialogOpen(false);
    fetchCourses();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Course deleted!" });
      setCourses((prev) => prev.filter((c) => c.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">Manage Courses</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard</Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <Input placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add Course</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border card-shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-4 font-display font-semibold">Code</th>
                  <th className="text-left p-4 font-display font-semibold">Name</th>
                  <th className="text-left p-4 font-display font-semibold hidden sm:table-cell">Department</th>
                  <th className="text-left p-4 font-display font-semibold hidden sm:table-cell">Semester</th>
                  <th className="text-right p-4 font-display font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-mono text-primary font-medium">{c.code}</td>
                    <td className="p-4">{c.name}</td>
                    <td className="p-4 hidden sm:table-cell text-muted-foreground">{c.department}</td>
                    <td className="p-4 hidden sm:table-cell text-muted-foreground">{c.semester}</td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No courses found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Course" : "Add New Course"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Course Code</Label>
              <Input placeholder="e.g. CSE101" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div>
              <Label>Course Name</Label>
              <Input placeholder="e.g. Introduction to Programming" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Department</Label>
              <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {["CSE","EEE","BBA","SWE","CIS","PHARMACY","ENGLISH","LAW","TEXTILE","ARCH","JMC","THM","NFE","PH","MCT"].map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Semester</Label>
              <Select value={form.semester} onValueChange={(v) => setForm({ ...form, semester: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>Semester {i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                {editing ? "Update" : "Add"}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
