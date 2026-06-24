import { useParams, Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, Download, Eye, Calendar, BookOpen, Loader2, StickyNote, Share2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface StudentUpload {
  id: string;
  kind: "material" | "notes";
  batch: string;
  student_name: string | null;
  title: string;
  description: string | null;
  file_name: string;
  file_url: string;
  created_at: string;
}

export default function CourseDetail() {
  const { deptId, semId, courseId } = useParams();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [studentUploads, setStudentUploads] = useState<StudentUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [uploaderQuery, setUploaderQuery] = useState("");
  const [batchFilter, setBatchFilter] = useState<string>("all");
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: "materials" | "notes" = searchParams.get("tab") === "notes" ? "notes" : "materials";
  const setActiveTab = (tab: "materials" | "notes") => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next, { replace: false });
  };

  useEffect(() => {
    async function fetchData() {
      const [courseRes, chaptersRes, uploadsRes] = await Promise.all([
        supabase.from("courses").select("id, code, name").eq("id", courseId!).maybeSingle(),
        supabase.from("chapters").select("id, title, description, pdf_name, pdf_path, pdf_url, notes_name, notes_path, notes_url, uploaded_at").eq("course_id", courseId!).order("uploaded_at"),
        supabase.from("student_uploads").select("id, kind, batch, student_name, title, description, file_name, file_url, created_at").eq("course_id", courseId!).order("created_at", { ascending: false }),
      ]);
      if (courseRes.data) setCourse(courseRes.data);
      if (chaptersRes.data) setChapters(chaptersRes.data);
      if (uploadsRes.data) setStudentUploads(uploadsRes.data as StudentUpload[]);
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
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" className="text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10" asChild>
            <Link to={`/departments/${deptId}/semester/${semId}`}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Semester {semId}
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onClick={async () => {
              const url = window.location.href;
              try {
                await navigator.clipboard.writeText(url);
                toast.success("Link copied", { description: "Share this URL to open the same tab." });
              } catch {
                toast.error("Couldn't copy link", { description: url });
              }
            }}
          >
            <Share2 className="h-4 w-4 mr-1" /> Share
          </Button>
        </div>
      </PageHeader>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto mb-8 flex justify-center">
            <div className="inline-flex glass rounded-xl p-1 gap-1">
              <button
                onClick={() => setActiveTab("materials")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "materials" ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <FileText className="h-4 w-4" /> Academic Materials
              </button>
              <button
                onClick={() => setActiveTab("notes")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "notes" ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <StickyNote className="h-4 w-4" /> Notes
              </button>
            </div>
          </div>
          {(() => {
            const filtered = chapters.filter(c => activeTab === "materials" ? (c.pdf_url || c.pdf_path) : (c.notes_url || c.notes_path));
            const tabUploads = studentUploads.filter(u => u.kind === (activeTab === "materials" ? "material" : "notes"));
            const batches = Array.from(new Set(tabUploads.map(u => u.batch))).sort();
            const q = query.trim().toLowerCase();
            const uq = uploaderQuery.trim().toLowerCase();
            const uploads = tabUploads.filter(u => {
              if (batchFilter !== "all" && u.batch !== batchFilter) return false;
              if (uq && !(u.student_name || "").toLowerCase().includes(uq)) return false;
              if (q && !(
                u.title.toLowerCase().includes(q) ||
                u.batch.toLowerCase().includes(q)
              )) return false;
              return true;
            });
            if (filtered.length === 0 && tabUploads.length === 0) {
              return (
                <div className="glass rounded-2xl p-12 text-center max-w-2xl mx-auto">
                  <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="font-display font-semibold text-lg mb-2">{activeTab === "materials" ? "No materials yet" : "No notes yet"}</h3>
                  <p className="text-sm text-muted-foreground">{activeTab === "materials" ? "Academic materials for this course haven't been uploaded yet." : "Notes for this course haven't been uploaded yet."}</p>
                </div>
              );
            }
            return (
            <div className="space-y-4 max-w-3xl mx-auto">
              {filtered.map((chapter, i) => (
                <motion.div
                  key={chapter.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="glass rounded-2xl p-6 hover:border-accent/30 hover:card-shadow-hover transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${activeTab === "materials" ? "bg-destructive/10" : "bg-accent/20"}`}>
                      {activeTab === "materials"
                        ? <FileText className="h-5 w-5 text-destructive" />
                        : <StickyNote className="h-5 w-5 text-accent-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-lg mb-1">{chapter.title}</h3>
                      {chapter.description && (
                        <p className="text-sm text-muted-foreground mb-3">{chapter.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 flex-wrap">
                        {activeTab === "materials" && chapter.pdf_name && (
                          <>
                            <FileText className="h-3.5 w-3.5" />
                            <span className="truncate max-w-full">{chapter.pdf_name}</span>
                            <span>•</span>
                          </>
                        )}
                        {activeTab === "notes" && chapter.notes_name && (
                          <>
                            <StickyNote className="h-3.5 w-3.5" />
                            <span className="truncate max-w-full">{chapter.notes_name}</span>
                            <span>•</span>
                          </>
                        )}
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{new Date(chapter.uploaded_at).toLocaleDateString()}</span>
                      </div>
                      {activeTab === "materials" && (chapter.pdf_url || chapter.pdf_path) && (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90 rounded-xl" onClick={() => handleDownload(chapter.pdf_url, chapter.pdf_path, chapter.pdf_name || "file.pdf")}>
                            <Download className="h-4 w-4 mr-1.5" /> Download PDF
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-xl" asChild>
                            <a href={resolveUrl(chapter.pdf_url, chapter.pdf_path)!} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4 mr-1.5" /> View
                            </a>
                          </Button>
                        </div>
                      )}
                      {activeTab === "notes" && (chapter.notes_url || chapter.notes_path) && (
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
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {tabUploads.length > 0 && (
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">Student Uploads</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by title or batch..."
                        className="pl-9 pr-9"
                      />
                      {query && (
                        <button
                          onClick={() => setQuery("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground"
                          aria-label="Clear search"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={uploaderQuery}
                        onChange={(e) => setUploaderQuery(e.target.value)}
                        placeholder="Filter by uploader name..."
                        className="pl-9 pr-9"
                      />
                      {uploaderQuery && (
                        <button
                          onClick={() => setUploaderQuery("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground"
                          aria-label="Clear uploader filter"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <Select value={batchFilter} onValueChange={setBatchFilter}>
                      <SelectTrigger className="sm:w-48"><SelectValue placeholder="All batches" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All batches</SelectItem>
                        {batches.map(b => (
                          <SelectItem key={b} value={b}>Batch {b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {uploads.length === 0 ? (
                    <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
                      No student uploads match your search.
                    </div>
                  ) : (
                  <div className="space-y-4">
                    {uploads.map((u, i) => (
                      <motion.div
                        key={u.id}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="glass rounded-2xl p-6 hover:border-accent/30 hover:card-shadow-hover transition-all duration-300"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${activeTab === "materials" ? "bg-destructive/10" : "bg-accent/20"}`}>
                            {activeTab === "materials"
                              ? <FileText className="h-5 w-5 text-destructive" />
                              : <StickyNote className="h-5 w-5 text-accent-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 flex-wrap mb-1">
                              <h3 className="font-display font-semibold text-lg">{u.title}</h3>
                              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">Batch {u.batch}</span>
                            </div>
                            {u.description && (
                              <p className="text-sm text-muted-foreground mb-3">{u.description}</p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 flex-wrap">
                              <FileText className="h-3.5 w-3.5" />
                              <span className="truncate max-w-full">{u.file_name}</span>
                              <span>•</span>
                              <Calendar className="h-3.5 w-3.5" />
                              <span>{new Date(u.created_at).toLocaleDateString()}</span>
                              {u.student_name && (
                                <>
                                  <span>•</span>
                                  <span>by {u.student_name}</span>
                                </>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90 rounded-xl" onClick={() => handleDownload(u.file_url, null, u.file_name)}>
                                <Download className="h-4 w-4 mr-1.5" /> Download
                              </Button>
                              <Button size="sm" variant="outline" className="rounded-xl" asChild>
                                <a href={u.file_url} target="_blank" rel="noopener noreferrer">
                                  <Eye className="h-4 w-4 mr-1.5" /> View
                                </a>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  )}
                </div>
              )}
            </div>
            );
          })()}
        </div>
      </section>
    </Layout>
  );
}
