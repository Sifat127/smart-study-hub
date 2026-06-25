import { useParams, Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, Eye, Calendar, BookOpen, Loader2, StickyNote, Share2, Search, X, SlidersHorizontal, ChevronDown, Download } from "lucide-react";
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (url: string, fileName: string, key: string) => {
    if (downloadingId) return;
    setDownloadingId(key);
    const toastId = toast.loading(`Preparing ${fileName}...`);
    try {
      // Catbox URLs don't send CORS headers, so proxy them through our edge function.
      const isCatbox = url.startsWith("https://files.catbox.moe/");
      const fetchUrl = isCatbox
        ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-file?url=${encodeURIComponent(url)}&name=${encodeURIComponent(fileName)}`
        : url;

      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      toast.success("Download started", { id: toastId, description: fileName });
    } catch (err) {
      toast.error("Download failed", {
        id: toastId,
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setDownloadingId(null);
    }
  };
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
        <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl border border-white/10" asChild>
            <Link to={`/departments/${deptId}/semester/${semId}`}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Semester {semId}
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl border border-white/10"
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
            <Share2 className="h-4 w-4 mr-1.5" /> Share
          </Button>
        </div>
      </PageHeader>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto mb-8 flex justify-center">
            <div className="relative inline-flex glass-strong rounded-2xl p-1.5 gap-1 shadow-elevated">
              {(["materials", "notes"] as const).map((tab) => {
                const isActive = activeTab === tab;
                const Icon = tab === "materials" ? FileText : StickyNote;
                const label = tab === "materials" ? "Academic Materials" : "Notes";
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative px-4 md:px-5 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${
                      isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="tab-pill"
                        className="absolute inset-0 bg-gradient-primary rounded-xl shadow-glow"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2"><Icon className="h-4 w-4" /> {label}</span>
                  </button>
                );
              })}
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
                <div className="glass-strong rounded-3xl p-12 text-center max-w-2xl mx-auto card-lift">
                  <div className="inline-flex h-14 w-14 rounded-2xl bg-accent/10 border border-accent/20 items-center justify-center mb-5 shadow-glow">
                    <BookOpen className="h-7 w-7 text-accent" />
                  </div>
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
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="glass rounded-3xl p-5 md:p-6 card-lift scroll-mt-32 md:scroll-mt-36"
                >
                  <div className="flex items-start gap-4">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 border ${activeTab === "materials" ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-accent/15 border-accent/25 text-accent"}`}>
                      {activeTab === "materials"
                        ? <FileText className="h-5 w-5" />
                        : <StickyNote className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-lg mb-1 tracking-tight">{chapter.title}</h3>
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
                          <Button
                            size="sm"
                            className="bg-gradient-primary text-primary-foreground btn-glow rounded-xl font-semibold"
                            disabled={downloadingId === `pdf-${chapter.id}`}
                            onClick={() => handleDownload(resolveUrl(chapter.pdf_url, chapter.pdf_path)!, chapter.pdf_name ?? `${chapter.title}.pdf`, `pdf-${chapter.id}`)}
                          >
                            {downloadingId === `pdf-${chapter.id}` ? (
                              <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Downloading...</>
                            ) : (
                              <><Download className="h-4 w-4 mr-1.5" /> Download PDF</>
                            )}
                          </Button>
                        </div>
                      )}
                      {activeTab === "notes" && (chapter.notes_url || chapter.notes_path) && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            className="bg-gradient-primary text-primary-foreground btn-glow rounded-xl font-semibold"
                            disabled={downloadingId === `notes-${chapter.id}`}
                            onClick={() => handleDownload(resolveUrl(chapter.notes_url, chapter.notes_path)!, chapter.notes_name ?? `${chapter.title}-notes.pdf`, `notes-${chapter.id}`)}
                          >
                            {downloadingId === `notes-${chapter.id}` ? (
                              <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Downloading...</>
                            ) : (
                              <><Download className="h-4 w-4 mr-1.5" /> Download Notes</>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {tabUploads.length > 0 && (
                <div className="pt-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                    <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground glass px-3 py-1 rounded-full">Student Uploads</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                  </div>
                  {(() => {
                    const activeCount = (query ? 1 : 0) + (uploaderQuery ? 1 : 0) + (batchFilter !== "all" ? 1 : 0);
                    const hasActive = activeCount > 0;
                    return (
                  <div className="sticky top-14 md:top-16 z-30 -mx-1 px-1 py-2 mb-5 bg-background/70 backdrop-blur-md supports-[backdrop-filter]:bg-background/50 rounded-2xl">
                    <div className="sm:hidden flex items-center gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setFiltersOpen(o => !o)}
                        aria-expanded={filtersOpen}
                        aria-controls="uploads-filter-panel"
                        className="flex-1 glass rounded-2xl px-4 min-h-11 flex items-center justify-between gap-2 text-sm font-semibold active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="flex items-center gap-2">
                          <SlidersHorizontal aria-hidden="true" className="h-4 w-4 text-accent" />
                          Filters
                          {hasActive && (
                            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold" aria-label={`${activeCount} active`}>
                              {activeCount}
                            </span>
                          )}
                        </span>
                        <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
                      </button>
                      {hasActive && (
                        <button
                          type="button"
                          onClick={() => { setQuery(""); setUploaderQuery(""); setBatchFilter("all"); }}
                          aria-label="Clear all filters"
                          className="glass rounded-2xl px-3 min-h-11 text-sm font-semibold text-muted-foreground hover:text-foreground active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <form
                      id="uploads-filter-panel"
                      role="search"
                      aria-label="Filter student uploads"
                      onSubmit={(e) => e.preventDefault()}
                      className={`glass rounded-2xl p-3 flex-col sm:flex-row gap-2 ${filtersOpen ? "flex" : "hidden"} sm:flex`}
                    >
                      <div className="relative flex-1">
                        <label htmlFor="uploads-title-search" className="sr-only">Search uploads by title or batch</label>
                        <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="uploads-title-search"
                          type="search"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search by title or batch..."
                          aria-label="Search by title or batch"
                          className={`pl-9 pr-10 min-h-11 bg-background/40 rounded-xl ${query ? "border-accent/60 ring-1 ring-accent/30" : "border-white/10"}`}
                        />
                        {query && (
                          <button
                            type="button"
                            onClick={() => setQuery("")}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-white/10 active:scale-95 transition-transform text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label="Clear title search"
                          >
                            <X aria-hidden="true" className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="relative flex-1">
                        <label htmlFor="uploads-uploader-search" className="sr-only">Filter by uploader name</label>
                        <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="uploads-uploader-search"
                          type="search"
                          value={uploaderQuery}
                          onChange={(e) => setUploaderQuery(e.target.value)}
                          placeholder="Filter by uploader name..."
                          aria-label="Filter by uploader name"
                          className={`pl-9 pr-10 min-h-11 bg-background/40 rounded-xl ${uploaderQuery ? "border-accent/60 ring-1 ring-accent/30" : "border-white/10"}`}
                        />
                        {uploaderQuery && (
                          <button
                            type="button"
                            onClick={() => setUploaderQuery("")}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-white/10 active:scale-95 transition-transform text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label="Clear uploader filter"
                          >
                            <X aria-hidden="true" className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <label htmlFor="uploads-batch-filter" className="sr-only">Filter by batch</label>
                      <Select value={batchFilter} onValueChange={setBatchFilter}>
                        <SelectTrigger
                          id="uploads-batch-filter"
                          aria-label="Filter by batch"
                          className={`sm:w-48 min-h-11 bg-background/40 rounded-xl ${batchFilter !== "all" ? "border-accent/60 ring-1 ring-accent/30" : "border-white/10"}`}
                        >
                          <SelectValue placeholder="All batches" />
                        </SelectTrigger>
                        <SelectContent className="glass-strong rounded-xl border-white/10">
                          <SelectItem value="all">All batches</SelectItem>
                          {batches.map(b => (
                            <SelectItem key={b} value={b}>Batch {b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {hasActive && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => { setQuery(""); setUploaderQuery(""); setBatchFilter("all"); }}
                          className="hidden sm:inline-flex rounded-xl border-white/10 glass min-h-11"
                          aria-label="Clear all filters"
                        >
                          <X aria-hidden="true" className="h-4 w-4 mr-1.5" /> Clear
                        </Button>
                      )}
                    </form>
                  </div>
                    );
                  })()}
                  <p className="sr-only" aria-live="polite" role="status">
                    {uploads.length} {uploads.length === 1 ? "upload" : "uploads"} shown
                  </p>
                  {uploads.length === 0 ? (
                    <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
                      No student uploads match your search.
                    </div>
                  ) : (
                  <div className="space-y-4">
                    {uploads.map((u, i) => (
                      <motion.div
                        key={u.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="glass rounded-3xl p-5 md:p-6 card-lift"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 border ${activeTab === "materials" ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-accent/15 border-accent/25 text-accent"}`}>
                            {activeTab === "materials"
                              ? <FileText className="h-5 w-5" />
                              : <StickyNote className="h-5 w-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 flex-wrap mb-1.5">
                              <h3 className="font-display font-semibold text-lg tracking-tight">{u.title}</h3>
                              <span className="text-[10px] uppercase tracking-[0.15em] px-2.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/25 font-semibold shadow-[0_0_12px_hsl(var(--accent)/0.25)]">Batch {u.batch}</span>
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
                                  <span>by <span className="text-foreground/80 font-medium">{u.student_name}</span></span>
                                </>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" className="bg-gradient-primary text-primary-foreground btn-glow rounded-xl font-semibold" asChild>
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
