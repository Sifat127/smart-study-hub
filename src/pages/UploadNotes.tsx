import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Upload, ArrowLeft, FileText, CheckCircle2, Loader2, StickyNote } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { departments } from "@/data/mockData";

interface CourseOption {
  id: string;
  code: string;
  name: string;
  department: string;
  semester: number;
}

export default function UploadNotes() {
  const { toast } = useToast();
  const { user, profile, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState<string>("");
  const [courseId, setCourseId] = useState("");
  const [kind, setKind] = useState<"material" | "notes">("notes");
  const [batch, setBatch] = useState("");
  const [studentName, setStudentName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login?redirect=/upload-notes");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (profile?.full_name && !studentName) setStudentName(profile.full_name);
  }, [profile, studentName]);

  useEffect(() => {
    async function fetchCourses() {
      const { data } = await supabase
        .from("courses")
        .select("id, code, name, department, semester")
        .order("department")
        .order("semester")
        .order("code");
      if (data) setCourses(data);
      setLoadingCourses(false);
    }
    fetchCourses();
  }, []);

  const semestersForDept = useMemo(() => {
    const set = new Set(courses.filter(c => c.department === department).map(c => c.semester));
    return Array.from(set).sort((a, b) => a - b);
  }, [courses, department]);

  const filteredCourses = useMemo(
    () => courses.filter(c => c.department === department && String(c.semester) === semester),
    [courses, department, semester],
  );

  const uploadToCatbox = async (f: File): Promise<string> => {
    const form = new FormData();
    form.append("file", f);
    const { data, error } = await supabase.functions.invoke("upload-to-catbox", { body: form });
    if (error) throw new Error(error.message);
    if (!data?.url) throw new Error(data?.error || "Upload failed");
    return data.url as string;
  };

  const handleSubmit = async () => {
    if (!department || !semester || !courseId || !batch.trim() || !title.trim() || !file) {
      toast({ title: "Please fill every field and attach a file", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "You must be logged in", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const fileUrl = await uploadToCatbox(file);
      const { error } = await supabase.from("student_uploads").insert({
        course_id: courseId,
        kind,
        batch: batch.trim(),
        student_name: studentName.trim() || null,
        title: title.trim(),
        description: description.trim() || null,
        file_name: file.name,
        file_url: fileUrl,
        uploaded_by: user.id,
      });
      if (error) throw error;
      setDone(true);
      toast({ title: "Uploaded successfully!" });
      setTitle("");
      setDescription("");
      setFile(null);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to={isAdmin ? "/admin" : "/"} className="flex items-center gap-2">
            <img src={logo} alt="DIU StudyBank" className="h-11 w-11 rounded-lg object-contain" />
            <span className="font-display font-bold text-xl">Upload Notes</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to={isAdmin ? "/admin" : "/"}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {done && (
          <div className="mb-6 bg-accent/20 border border-accent/30 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-accent-foreground" />
            <p className="text-accent-foreground font-medium">Your upload is now live on the course page.</p>
          </div>
        )}

        <div className="bg-card rounded-xl border border-border p-6 card-shadow space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Department</Label>
              <Select value={department} onValueChange={(v) => { setDepartment(v); setSemester(""); setCourseId(""); }}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.name}>{d.name} — {d.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Semester</Label>
              <Select value={semester} onValueChange={(v) => { setSemester(v); setCourseId(""); }} disabled={!department}>
                <SelectTrigger><SelectValue placeholder={department ? "Select semester" : "Pick department first"} /></SelectTrigger>
                <SelectContent>
                  {semestersForDept.map(s => (
                    <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Course</Label>
            {loadingCourses ? (
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading courses...
              </div>
            ) : (
              <Select value={courseId} onValueChange={setCourseId} disabled={!semester}>
                <SelectTrigger><SelectValue placeholder={semester ? "Select course" : "Pick semester first"} /></SelectTrigger>
                <SelectContent>
                  {filteredCourses.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Section</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as "material" | "notes")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="material">Academic Materials</SelectItem>
                  <SelectItem value="notes">Notes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="batch">Batch (e.g. 67_I)</Label>
              <Input
                id="batch"
                placeholder="67_I"
                value={batch}
                maxLength={20}
                onChange={(e) => setBatch(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="student-name">Your name (shown with upload)</Label>
            <Input
              id="student-name"
              placeholder="Your full name"
              value={studentName}
              maxLength={100}
              onChange={(e) => setStudentName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g. Midterm Notes – Chapter 1–3"
              value={title}
              maxLength={150}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Short description..."
              value={description}
              maxLength={500}
              rows={3}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="file">File (PDF, DOC, PPT, image)</Label>
            <div className="mt-1 border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
              <input
                id="file"
                type="file"
                accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => { setFile(e.target.files?.[0] || null); setDone(false); }}
              />
              <label htmlFor="file" className="cursor-pointer">
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    {kind === "notes"
                      ? <StickyNote className="h-6 w-6 text-accent-foreground" />
                      : <FileText className="h-6 w-6 text-primary" />}
                    <span className="font-medium">{file.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Click to choose a file</p>
                  </>
                )}
              </label>
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={uploading} className="w-full">
            {uploading
              ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Uploading...</>
              : <>Upload {kind === "notes" ? "Notes" : "Material"}</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
