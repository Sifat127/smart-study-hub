import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Upload, ArrowLeft, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CourseOption {
  id: string;
  code: string;
  name: string;
  department: string;
  semester: number;
}

export default function AdminUploadPdf() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

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

  const handleUpload = async () => {
    if (!file || !title || !courseId) {
      toast({ title: "Title, Course এবং PDF ফাইল দিন", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("pdfs").upload(fileName, file);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("chapters").insert({
        course_id: courseId,
        title,
        description: description || null,
        pdf_name: file.name,
        pdf_path: fileName,
      });
      if (insertError) throw insertError;

      setUploaded(true);
      toast({ title: "PDF সফলভাবে আপলোড হয়েছে!" });
      setFile(null);
      setTitle("");
      setDescription("");
      setCourseId("");
    } catch (err: any) {
      toast({ title: "আপলোড ব্যর্থ হয়েছে", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
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
            <span className="font-display font-bold text-xl">Upload PDF</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard</Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {uploaded && (
          <div className="mb-6 bg-accent/20 border border-accent/30 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-accent-foreground" />
            <p className="text-accent-foreground font-medium">PDF সফলভাবে আপলোড হয়েছে!</p>
          </div>
        )}

        <div className="bg-card rounded-xl border border-border p-6 card-shadow space-y-5">
          <div>
            <Label htmlFor="title">Chapter Title</Label>
            <Input id="title" placeholder="e.g. Chapter 1 - Introduction" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" placeholder="Brief description of this chapter..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div>
            <Label>Course</Label>
            {loadingCourses ? (
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading courses...
              </div>
            ) : (
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.department} - Sem {c.semester} - {c.code} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label htmlFor="file">PDF File</Label>
            <div className="mt-1 border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
              <input
                id="file"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  setUploaded(false);
                }}
              />
              <label htmlFor="file" className="cursor-pointer">
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-6 w-6 text-primary" />
                    <span className="font-medium">{file.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Click to select a PDF file</p>
                  </>
                )}
              </label>
            </div>
          </div>

          <Button onClick={handleUpload} disabled={uploading} className="w-full">
            {uploading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Uploading...</> : "Upload PDF"}
          </Button>
        </div>
      </div>
    </div>
  );
}
