import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, Download, Eye, Calendar, BookOpen, Loader2, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CourseData {
  id: string;
  code: string;
  name: string;
}

interface ChapterData {
  id: string;
  title: string;
  description: string | null;
  pdf_name: string | null;
  pdf_path: string | null;
  pdf_url: string | null;
  notes_name: string | null;
  notes_path: string | null;
  notes_url: string | null;
  uploaded_at: string;
}

export default function CourseDetail() {
  const { deptId, semId, courseId } = useParams();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [courseRes, chaptersRes] = await Promise.all([
        supabase.from("courses").select("id, code, name").eq("id", courseId!).maybeSingle(),
        supabase.from("chapters").select("id, title, description, pdf_name, pdf_path, pdf_url, notes_name, notes_path, notes_url, uploaded_at").eq("course_id", courseId!).order("uploaded_at"),
      ]);
      if (courseRes.data) setCourse(courseRes.data);
      if (chaptersRes.data) setChapters(chaptersRes.data);
      setLoading(false);
    }
    if (courseId) fetchData();
  }, [courseId]);

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("pdfs").getPublicUrl(path);
    return data.publicUrl;
  };

  // Prefer external URL (Catbox); fall back to Supabase storage path
  const resolveUrl = (url: string | null, path: string | null): string | null => {
    if (url) return url;
    if (path) return getPublicUrl(path);
    return null;
  };

  const triggerSave = (href: string, fileName: string) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownload = async (url: string | null, path: string | null, fileName: string) => {
    const loadingId = toast.loading(`Preparing ${fileName}...`);
    try {
      if (url) {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const proxy = `https://${projectId}.supabase.co/functions/v1/download-file?url=${encodeURIComponent(url)}&name=${encodeURIComponent(fileName)}`;

        // Fetch via proxy so we can detect failures and show a clear toast.
        const res = await fetch(proxy);
        if (!res.ok) {
          let detail = `HTTP ${res.status}`;
          try {
            const body = await res.json();
            if (body?.error) detail = body.error;
          } catch { /* ignore */ }
          throw new Error(detail);
        }
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        triggerSave(objectUrl, fileName);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      } else if (path) {
        const { data, error } = await supabase.storage
          .from("pdfs")
          .createSignedUrl(path, 3600, { download: fileName });
        if (error || !data?.signedUrl) throw new Error(error?.message || "Could not create signed URL");
        triggerSave(data.signedUrl, fileName);
      } else {
        throw new Error("No file available");
      }
      toast.success(`Downloading ${fileName}`, { id: loadingId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error("Download failed", {
        id: loadingId,
        description: `Couldn't download ${fileName}. ${message}. Try the View button or check your connection.`,
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Course not found</h1>
          <Button className="mt-4" asChild>
            <Link to={`/departments/${deptId}/semester/${semId}`}>Back</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title={course.name}
        subtitle={`${chapters.length} chapters available`}
        badge={course.code}
        badgeIcon={<BookOpen className="h-4 w-4" />}
      >
        <div className="mt-4">
          <Button variant="ghost" size="sm" className="text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10" asChild>
            <Link to={`/departments/${deptId}/semester/${semId}`}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Semester {semId}
            </Link>
          </Button>
        </div>
      </PageHeader>

      <section className="py-16">
        <div className="container mx-auto px-4">
          {chapters.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center max-w-2xl mx-auto">
              <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-display font-semibold text-lg mb-2">No chapters yet</h3>
              <p className="text-sm text-muted-foreground">Chapters and PDFs for this course haven't been uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {chapters.map((chapter, i) => (
                <motion.div
                  key={chapter.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="glass rounded-2xl p-6 hover:border-accent/30 hover:card-shadow-hover transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-11 w-11 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-lg mb-1">{chapter.title}</h3>
                      {chapter.description && (
                        <p className="text-sm text-muted-foreground mb-3">{chapter.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                        {chapter.pdf_name && (
                          <>
                            <FileText className="h-3.5 w-3.5" />
                            <span>{chapter.pdf_name}</span>
                            <span>•</span>
                          </>
                        )}
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{new Date(chapter.uploaded_at).toLocaleDateString()}</span>
                      </div>
                      {(chapter.pdf_url || chapter.pdf_path || chapter.notes_url || chapter.notes_path) && (
                        <div className="flex flex-wrap gap-2">
                          {(chapter.pdf_url || chapter.pdf_path) && (
                            <>
                              <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90 rounded-xl" onClick={() => handleDownload(chapter.pdf_url, chapter.pdf_path, chapter.pdf_name || "file.pdf")}>
                                <Download className="h-4 w-4 mr-1.5" /> Download PDF
                              </Button>
                              <Button size="sm" variant="outline" className="rounded-xl" asChild>
                                <a href={resolveUrl(chapter.pdf_url, chapter.pdf_path)!} target="_blank" rel="noopener noreferrer">
                                  <Eye className="h-4 w-4 mr-1.5" /> View
                                </a>
                              </Button>
                            </>
                          )}
                        </div>
                      )}

                      {(chapter.notes_url || chapter.notes_path) && (
                        <div className="mt-4 rounded-xl border border-accent/30 bg-accent/5 p-4">
                          <div className="flex items-start gap-3">
                            <div className="h-9 w-9 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                              <StickyNote className="h-4 w-4 text-accent-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-display font-semibold text-sm mb-1">Chapter Notes</h4>
                              <p className="text-xs text-muted-foreground mb-3 truncate">{chapter.notes_name}</p>
                              <div className="flex flex-wrap gap-2">
                                <Button size="sm" variant="secondary" className="rounded-xl" onClick={() => handleDownload(chapter.notes_url, chapter.notes_path, chapter.notes_name || "notes")}>
                                  <Download className="h-4 w-4 mr-1.5" /> Download Notes
                                </Button>
                                <Button size="sm" variant="outline" className="rounded-xl" asChild>
                                  <a href={resolveUrl(chapter.notes_url, chapter.notes_path)!} target="_blank" rel="noopener noreferrer">
                                    <Eye className="h-4 w-4 mr-1.5" /> View Notes
                                  </a>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
