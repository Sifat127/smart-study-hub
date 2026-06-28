import { useParams, Link, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, Eye, Calendar, BookOpen, Loader2, StickyNote, Share2, Search, X, SlidersHorizontal, ChevronDown, Download, Lock, ArrowUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { downloadFile as downloadFileFromStorage, prefetchPreviewBytes } from "@/lib/storage";
import { readCache, writeCache } from "@/lib/listCache";
import { useLazyList } from "@/lib/useLazyList";
import Highlight from "@/components/Highlight";
import { ArrowDown, ArrowUp, ArrowDownAZ, ArrowUpAZ } from "lucide-react";

type SortValue = "newest" | "oldest" | "az" | "za";
const SORT_OPTIONS: { value: SortValue; label: string; icon: typeof ArrowDown }[] = [
  { value: "newest", label: "Newest first", icon: ArrowDown },
  { value: "oldest", label: "Oldest first", icon: ArrowUp },
  { value: "az", label: "Title A–Z", icon: ArrowDownAZ },
  { value: "za", label: "Title Z–A", icon: ArrowUpAZ },
];
const SORT_LABELS: Record<SortValue, string> = Object.fromEntries(
  SORT_OPTIONS.map((o) => [o.value, o.label])
) as Record<SortValue, string>;



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
  file_id: string | null;
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
  file_id: string | null;
  created_at: string;
}

export default function CourseDetail() {
  const { deptId, semId, courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [studentUploads, setStudentUploads] = useState<StudentUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [uploaderQuery, setUploaderQuery] = useState("");
  const [batchFilter, setBatchFilter] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "az" | "za">("newest");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const requireAuth = (action: string): boolean => {
    if (user) return true;
    toast.error("Sign in required", {
      description: `Please sign in or create an account to ${action}.`,
      action: { label: "Sign in", onClick: () => navigate("/login", { state: { from: location.pathname + location.search } }) },
    });
    navigate("/login", { state: { from: location.pathname + location.search } });
    return false;
  };

  const handleDownload = async (
    url: string | null,
    fileName: string,
    key: string,
    fileId?: string | null,
  ) => {
    if (!requireAuth("download this file")) return;
    if (downloadingId) return;

    setDownloadingId(key);
    const toastId = toast.loading(`Preparing ${fileName}...`);
    try {
      if (fileId) {
        // New R2-backed files: stream through storage-download with auth.
        await downloadFileFromStorage(fileId, fileName);
      } else if (url) {
        // Legacy path (Catbox or Supabase storage public URL).
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
      } else {
        throw new Error("File is unavailable");
      }
      toast.success("Download started", { id: toastId, description: fileName });

      // Log download history (best-effort; ignore errors so download UX isn't impacted)
      const dash = key.indexOf("-");
      const kind = key.slice(0, dash) as "pdf" | "notes";
      const chapterId = key.slice(dash + 1);
      if (user && (kind === "pdf" || kind === "notes")) {
        void supabase.from("chapter_downloads").insert({
          user_id: user.id,
          chapter_id: chapterId,
          kind,
          file_name: fileName,
        });
      }
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
    if (!courseId) return;

    // 1) Hydrate immediately from sessionStorage so revisits feel instant.
    const cacheKey = `course:${courseId}:${user ? "auth" : "anon"}`;
    const cached = readCache<{
      course: CourseData | null;
      chapters: ChapterData[];
      uploads: StudentUpload[];
    }>(cacheKey);
    if (cached) {
      if (cached.course) setCourse(cached.course);
      setChapters(cached.chapters ?? []);
      setStudentUploads(cached.uploads ?? []);
      setLoading(false);
    }

    // 2) Always revalidate in the background (stale-while-revalidate).
    async function fetchData() {
      const baseRequests: Promise<any>[] = [
        Promise.resolve(supabase.from("courses").select("id, code, name").eq("id", courseId!).maybeSingle()),
        Promise.resolve(supabase.from("chapters").select("id, title, description, pdf_name, pdf_path, pdf_url, notes_name, notes_path, notes_url, file_id, uploaded_at").eq("course_id", courseId!).order("uploaded_at")),
      ];
      // Student uploads are gated by RLS — only fetch when signed in to avoid 401 noise.
      if (user) {
        baseRequests.push(
          Promise.resolve(supabase.from("student_uploads").select("id, kind, batch, student_name, title, description, file_name, file_url, file_id, created_at").eq("course_id", courseId!).order("created_at", { ascending: false }))
        );
      }
      const [courseRes, chaptersRes, uploadsRes] = await Promise.all(baseRequests);

      const nextCourse = courseRes?.data ?? null;
      const nextChapters = (chaptersRes?.data ?? []) as ChapterData[];
      const nextUploads = (uploadsRes?.data ?? []) as StudentUpload[];

      if (nextCourse) setCourse(nextCourse);
      setChapters(nextChapters);
      if (uploadsRes?.data) setStudentUploads(nextUploads);
      else if (!user) setStudentUploads([]);
      setLoading(false);

      writeCache(cacheKey, {
        course: nextCourse,
        chapters: nextChapters,
        uploads: user ? nextUploads : [],
      });
    }
    fetchData();
  }, [courseId, user]);



  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("pdfs").getPublicUrl(path);
    return data.publicUrl;
  };

  // Derive filtered chapter + upload lists once per dependency change so the
  // lazy-render hooks below can slice from a stable array reference.
  const filteredChapters = useMemo(() => {
    const q = query.trim().toLowerCase();
    return chapters.filter(c => {
      const hasFile = activeTab === "materials"
        ? (c.pdf_url || c.pdf_path || c.file_id)
        : (c.notes_url || c.notes_path);
      if (!hasFile) return false;
      if (!q) return true;
      const haystack = [
        c.title,
        c.description ?? "",
        activeTab === "materials" ? (c.pdf_name ?? "") : (c.notes_name ?? ""),
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [chapters, activeTab, query]);

  // Comparator shared by chapters and uploads — keeps sort behavior identical.
  const cmp = useMemo(() => {
    const titleOf = (x: { title: string }) => x.title.toLowerCase();
    return <T extends { title: string }>(a: T, b: T, aTime: number, bTime: number) => {
      switch (sortBy) {
        case "oldest": return aTime - bTime;
        case "az": return titleOf(a).localeCompare(titleOf(b));
        case "za": return titleOf(b).localeCompare(titleOf(a));
        case "newest":
        default: return bTime - aTime;
      }
    };
  }, [sortBy]);

  const sortedChapters = useMemo(() => {
    const arr = [...filteredChapters];
    arr.sort((a, b) => cmp(a, b, new Date(a.uploaded_at).getTime(), new Date(b.uploaded_at).getTime()));
    return arr;
  }, [filteredChapters, cmp]);
  const tabUploads = useMemo(
    () => studentUploads.filter(u => u.kind === (activeTab === "materials" ? "material" : "notes")),
    [studentUploads, activeTab]
  );
  const batches = useMemo(
    () => Array.from(new Set(tabUploads.map(u => u.batch))).sort(),
    [tabUploads]
  );
  const filteredUploads = useMemo(() => {
    const q = query.trim().toLowerCase();
    const uq = uploaderQuery.trim().toLowerCase();
    return tabUploads.filter(u => {
      if (batchFilter !== "all" && u.batch !== batchFilter) return false;
      if (uq && !(u.student_name || "").toLowerCase().includes(uq)) return false;
      if (q) {
        const hay = [u.title, u.batch, u.file_name, u.student_name ?? "", u.description ?? ""]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tabUploads, query, uploaderQuery, batchFilter]);

  const sortedUploads = useMemo(() => {
    const arr = [...filteredUploads];
    arr.sort((a, b) => cmp(a, b, new Date(a.created_at).getTime(), new Date(b.created_at).getTime()));
    return arr;
  }, [filteredUploads, cmp]);

  // Lazy-render: only the first ~6 items render immediately; an IntersectionObserver
  // sentinel adds more as the user scrolls. Heavy descriptions/buttons stay off the
  // DOM until needed, keeping initial paint + scroll cost low on mobile.
  const { visible: visibleChapters, sentinelRef: chaptersSentinelRef, hasMore: hasMoreChapters } =
    useLazyList(sortedChapters, 6, 6);
  const { visible: visibleUploads, sentinelRef: uploadsSentinelRef, hasMore: hasMoreUploads } =
    useLazyList(sortedUploads, 6, 6);


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
          {!user && (
            <div className="max-w-3xl mx-auto mb-6 glass rounded-2xl px-4 py-3 flex items-center gap-3 border border-accent/20">
              <Lock className="h-4 w-4 text-accent flex-shrink-0" />
              <p className="text-sm text-muted-foreground flex-1">
                You can browse chapter titles and file names freely. <span className="text-foreground/90 font-medium">Sign in</span> to download PDFs or notes.
              </p>
              <Button
                size="sm"
                className="bg-gradient-primary text-primary-foreground rounded-xl font-semibold"
                onClick={() => navigate("/login", { state: { from: location.pathname + location.search } })}
              >
                Sign in
              </Button>
            </div>
          )}

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
                      <span
                        className="absolute inset-0 bg-gradient-primary rounded-xl shadow-glow"
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2"><Icon className="h-4 w-4" /> {label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Instant search — filters chapters AND student uploads as you type. */}
          {(chapters.length > 0 || tabUploads.length > 0) && (
            <div className="max-w-3xl mx-auto mb-6">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={activeTab === "materials"
                      ? "Search chapters, files, uploads..."
                      : "Search notes, files, uploads..."}
                    aria-label="Search this course"
                    className={`pl-10 pr-10 min-h-12 rounded-2xl glass border ${query ? "border-accent/60 ring-1 ring-accent/30" : "border-white/10"}`}
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      aria-label="Clear search"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 inline-flex items-center justify-center rounded-xl hover:bg-white/10 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <X aria-hidden="true" className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {/* Desktop / tablet: native-style Select */}
                <div className="hidden sm:block">
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                    <SelectTrigger
                      aria-label="Sort order"
                      className={`sm:w-48 min-h-12 rounded-2xl glass ${sortBy !== "newest" ? "border-accent/60 ring-1 ring-accent/30" : "border-white/10"}`}
                    >
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent className="glass-strong rounded-xl border-white/10">
                      <SelectItem value="newest">Newest first</SelectItem>
                      <SelectItem value="oldest">Oldest first</SelectItem>
                      <SelectItem value="az">Title A–Z</SelectItem>
                      <SelectItem value="za">Title Z–A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Mobile: bottom sheet with large touch targets */}
                <Sheet>
                  <SheetTrigger asChild>
                    <button
                      type="button"
                      aria-label="Open sort options"
                      className={`sm:hidden glass rounded-2xl min-h-12 px-4 flex items-center justify-between gap-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${sortBy !== "newest" ? "border border-accent/60 ring-1 ring-accent/30" : "border border-white/10"}`}
                    >
                      <span className="flex items-center gap-2">
                        <ArrowUpDown aria-hidden="true" className="h-4 w-4 text-accent" />
                        {SORT_LABELS[sortBy]}
                      </span>
                      <ChevronDown aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </SheetTrigger>
                  <SheetContent
                    side="bottom"
                    className="glass-strong border-t border-white/10 rounded-t-3xl p-0 pb-[env(safe-area-inset-bottom)]"
                  >
                    <div className="mx-auto mt-3 mb-1 h-1.5 w-12 rounded-full bg-white/15" aria-hidden="true" />
                    <SheetHeader className="px-5 pt-3 pb-2 text-left">
                      <SheetTitle className="text-base font-display">Sort by</SheetTitle>
                    </SheetHeader>
                    <ul role="listbox" aria-label="Sort options" className="px-2 pb-3">
                      {SORT_OPTIONS.map((opt) => {
                        const active = sortBy === opt.value;
                        return (
                          <li key={opt.value}>
                            <SheetClose asChild>
                              <button
                                type="button"
                                role="option"
                                aria-selected={active}
                                onClick={() => setSortBy(opt.value)}
                                className={`w-full min-h-14 px-4 rounded-2xl flex items-center justify-between gap-3 text-left text-base font-medium transition-colors ${
                                  active
                                    ? "bg-accent/15 text-foreground border border-accent/30"
                                    : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
                                }`}
                              >
                                <span className="flex items-center gap-3">
                                  <span className={`h-9 w-9 rounded-xl flex items-center justify-center ${active ? "bg-accent/20 text-accent" : "bg-white/5 text-muted-foreground"}`}>
                                    <opt.icon aria-hidden="true" className="h-4 w-4" />
                                  </span>
                                  {opt.label}
                                </span>
                                {active && <Check aria-hidden="true" className="h-5 w-5 text-accent" />}
                              </button>
                            </SheetClose>
                          </li>
                        );
                      })}
                    </ul>
                  </SheetContent>
                </Sheet>
              </div>
              {query && (
                <p className="mt-2 text-xs text-muted-foreground px-1" aria-live="polite" role="status">
                  {filteredChapters.length} {activeTab === "materials" ? "material" : "note"}{filteredChapters.length === 1 ? "" : "s"}
                  {" · "}
                  {filteredUploads.length} student upload{filteredUploads.length === 1 ? "" : "s"}
                </p>
              )}
            </div>
          )}

          {(() => {
            const filtered = sortedChapters;
            const uploads = sortedUploads;
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
              {filtered.length === 0 && query && (
                <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
                  No {activeTab === "materials" ? "materials" : "notes"} match
                  <span className="text-foreground/90 font-medium"> "{query}"</span>.
                  {filteredUploads.length > 0 && " Check student uploads below."}
                </div>
              )}
              {visibleChapters.map((chapter) => (
                <div
                  key={chapter.id}
                  className="glass rounded-3xl p-5 md:p-6 card-lift scroll-mt-32 md:scroll-mt-36"
                >
                  <div className="flex items-start gap-4">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 border ${activeTab === "materials" ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-accent/15 border-accent/25 text-accent"}`}>
                      {activeTab === "materials"
                        ? <FileText className="h-5 w-5" />
                        : <StickyNote className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">

                      <h3 className="font-display font-semibold text-lg mb-1 tracking-tight">
                        <Highlight text={chapter.title} query={query} />
                      </h3>
                      {chapter.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          <Highlight text={chapter.description} query={query} />
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 flex-wrap">
                        {activeTab === "materials" && chapter.pdf_name && (
                          <>
                            <FileText className="h-3.5 w-3.5" />
                            <span className="truncate max-w-full"><Highlight text={chapter.pdf_name} query={query} /></span>
                            <span>•</span>
                          </>
                        )}
                        {activeTab === "notes" && chapter.notes_name && (
                          <>
                            <StickyNote className="h-3.5 w-3.5" />
                            <span className="truncate max-w-full"><Highlight text={chapter.notes_name} query={query} /></span>
                            <span>•</span>
                          </>
                        )}
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{new Date(chapter.uploaded_at).toLocaleDateString()}</span>
                      </div>
                      {activeTab === "materials" && (chapter.pdf_url || chapter.pdf_path || chapter.file_id) && (
                        <div className="flex flex-wrap gap-2">
                          {!user ? (
                            <Button
                              size="sm"
                              variant="outline"
                              aria-disabled="true"
                              title="Sign in to download this PDF"
                              className="rounded-xl font-semibold border-white/15 bg-white/5 text-muted-foreground cursor-not-allowed hover:bg-white/5 hover:text-muted-foreground"
                              onClick={(e) => {
                                e.preventDefault();
                                navigate("/login", { state: { from: location.pathname + location.search } });
                              }}
                            >
                              <Lock className="h-4 w-4 mr-1.5" /> Sign in to download
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-gradient-primary text-primary-foreground btn-glow rounded-xl font-semibold"
                              disabled={downloadingId === `pdf-${chapter.id}`}
                              onClick={() => handleDownload(resolveUrl(chapter.pdf_url, chapter.pdf_path), chapter.pdf_name ?? `${chapter.title}.pdf`, `pdf-${chapter.id}`, chapter.file_id)}
                            >
                              {downloadingId === `pdf-${chapter.id}` ? (
                                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Downloading...</>
                              ) : (
                                <><Download className="h-4 w-4 mr-1.5" /> Download PDF</>
                              )}
                            </Button>
                          )}
                        </div>
                      )}
                      {activeTab === "notes" && (chapter.notes_url || chapter.notes_path) && (
                        <div className="flex flex-wrap gap-2">
                          {!user ? (
                            <Button
                              size="sm"
                              variant="outline"
                              aria-disabled="true"
                              title="Sign in to download these notes"
                              className="rounded-xl font-semibold border-white/15 bg-white/5 text-muted-foreground cursor-not-allowed hover:bg-white/5 hover:text-muted-foreground"
                              onClick={(e) => {
                                e.preventDefault();
                                navigate("/login", { state: { from: location.pathname + location.search } });
                              }}
                            >
                              <Lock className="h-4 w-4 mr-1.5" /> Sign in to download
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-gradient-primary text-primary-foreground btn-glow rounded-xl font-semibold"
                              disabled={downloadingId === `notes-${chapter.id}`}
                              onClick={() => handleDownload(resolveUrl(chapter.notes_url, chapter.notes_path), chapter.notes_name ?? `${chapter.title}-notes.pdf`, `notes-${chapter.id}`)}
                            >
                              {downloadingId === `notes-${chapter.id}` ? (
                                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Downloading...</>
                              ) : (
                                <><Download className="h-4 w-4 mr-1.5" /> Download Notes</>
                              )}
                            </Button>
                          )}
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              ))}
              {hasMoreChapters && (
                <div ref={chaptersSentinelRef} aria-hidden="true" className="h-8" />
              )}



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
                        className="flex-1 glass rounded-2xl px-4 min-h-11 flex items-center justify-between gap-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                        <ChevronDown aria-hidden="true" className={`h-4 w-4 ${filtersOpen ? "rotate-180" : ""}`} />
                      </button>
                      {hasActive && (
                        <button
                          type="button"
                          onClick={() => { setQuery(""); setUploaderQuery(""); setBatchFilter("all"); }}
                          aria-label="Clear all filters"
                          className="glass rounded-2xl px-3 min-h-11 text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-white/10 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-white/10 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                    {visibleUploads.map((u, i) => (
                      <div
                        key={u.id}
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
                              <h3 className="font-display font-semibold text-lg tracking-tight">
                                <Highlight text={u.title} query={query} />
                              </h3>
                              <span className="text-[10px] uppercase tracking-[0.15em] px-2.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/25 font-semibold shadow-[0_0_12px_hsl(var(--accent)/0.25)]">Batch <Highlight text={u.batch} query={query} /></span>
                            </div>
                            {u.description && (
                              <p className="text-sm text-muted-foreground mb-3">
                                <Highlight text={u.description} query={query} />
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 flex-wrap">
                              <FileText className="h-3.5 w-3.5" />
                              <span className="truncate max-w-full"><Highlight text={u.file_name} query={query || uploaderQuery} /></span>
                              <span>•</span>
                              <Calendar className="h-3.5 w-3.5" />
                              <span>{new Date(u.created_at).toLocaleDateString()}</span>
                              {u.student_name && (
                                <>
                                  <span>•</span>
                                  <span>by <span className="text-foreground/80 font-medium"><Highlight text={u.student_name} query={uploaderQuery || query} /></span></span>
                                </>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                className="bg-gradient-primary text-primary-foreground btn-glow rounded-xl font-semibold"
                                onMouseEnter={() => {
                                  // Warm the cache for this PDF plus its
                                  // immediate neighbours so opening + paging
                                  // between sibling uploads feels instant.
                                  prefetchPreviewBytes(u.file_id);
                                  prefetchPreviewBytes(uploads[i - 1]?.file_id);
                                  prefetchPreviewBytes(uploads[i + 1]?.file_id);
                                }}
                                onFocus={() => {
                                  prefetchPreviewBytes(u.file_id);
                                  prefetchPreviewBytes(uploads[i - 1]?.file_id);
                                  prefetchPreviewBytes(uploads[i + 1]?.file_id);
                                }}
                                onTouchStart={() => prefetchPreviewBytes(u.file_id)}
                                onClick={() => {
                                  if (!requireAuth("view this file")) return;
                                  if (u.file_id) {
                                    const back = location.pathname + location.search;
                                    const prev = uploads[i - 1]?.file_id ?? "";
                                    const next = uploads[i + 1]?.file_id ?? "";
                                    const params = new URLSearchParams({
                                      name: u.file_name,
                                      back,
                                    });
                                    if (prev) params.set("prev", prev);
                                    if (next) params.set("next", next);
                                    navigate(`/pdf/${u.file_id}?${params.toString()}`);
                                  } else {
                                    window.open(u.file_url, "_blank", "noopener,noreferrer");
                                  }
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1.5" /> View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl font-semibold"
                                onClick={async () => {
                                  if (!requireAuth("download this file")) return;
                                  try {
                                    if (u.file_id) {
                                      const { downloadFile } = await import("@/lib/storage");
                                      await downloadFile(u.file_id, u.file_name);
                                    } else {
                                      const a = document.createElement("a");
                                      a.href = u.file_url;
                                      a.download = u.file_name;
                                      a.target = "_blank";
                                      a.rel = "noopener noreferrer";
                                      document.body.appendChild(a);
                                      a.click();
                                      a.remove();
                                    }
                                  } catch (err) {
                                    toast.error("Couldn't download file", { description: err instanceof Error ? err.message : "Please try again." });
                                  }
                                }}
                              >
                                <Download className="h-4 w-4 mr-1.5" /> Download
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {hasMoreUploads && (
                      <div ref={uploadsSentinelRef} aria-hidden="true" className="h-8" />
                    )}
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
