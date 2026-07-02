import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Download,
  FileText,
  Loader2,
  Lock,
  StickyNote,
} from "lucide-react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { downloadFile as downloadFileFromStorage } from "@/lib/storage";
import MaterialStats from "@/components/MaterialStats";


interface ChapterRow {
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
  notes_file_id: string | null;
  uploaded_at: string;

  course_id: string;
}

interface CourseRow {
  id: string;
  code: string;
  name: string;
}

type FileItem = {
  key: string;
  kind: "material" | "notes";
  name: string;
  url: string | null;
  path: string | null;
  fileId: string | null;
};

export default function ChapterDetail() {
  const { deptId, semId, courseId, chapterId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [chapter, setChapter] = useState<ChapterRow | null>(null);
  const [course, setCourse] = useState<CourseRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!chapterId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const chapterTable = user ? "chapters" : "chapters_public";
      const cols = user
        ? "id, title, description, pdf_name, pdf_path, pdf_url, notes_name, notes_path, notes_url, file_id, notes_file_id, uploaded_at, course_id"
        : "id, title, description, pdf_name, notes_name, uploaded_at, course_id";

      const [chapterRes, courseRes] = await Promise.all([
        (supabase.from(chapterTable as any) as any).select(cols).eq("id", chapterId).maybeSingle(),
        courseId
          ? supabase.from("courses").select("id, code, name").eq("id", courseId).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      if (cancelled) return;
      setChapter((chapterRes?.data ?? null) as unknown as ChapterRow | null);
      setCourse((courseRes?.data ?? null) as unknown as CourseRow | null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [chapterId, courseId, user]);

  const resolveUrl = (url: string | null, path: string | null): string | null => {
    if (url) return url;
    if (path) return supabase.storage.from("pdfs").getPublicUrl(path).data.publicUrl;
    return null;
  };

  const files: FileItem[] = [];
  if (chapter) {
    if (chapter.pdf_url || chapter.pdf_path || chapter.file_id || chapter.pdf_name) {
      files.push({
        key: `pdf-${chapter.id}`,
        kind: "material",
        name: chapter.pdf_name ?? `${chapter.title}.pdf`,
        url: chapter.pdf_url ?? null,
        path: chapter.pdf_path ?? null,
        fileId: chapter.file_id ?? null,
      });
    }
    if (chapter.notes_url || chapter.notes_path || chapter.notes_name) {
      files.push({
        key: `notes-${chapter.id}`,
        kind: "notes",
        name: chapter.notes_name ?? `${chapter.title}-notes.pdf`,
        url: chapter.notes_url ?? null,
        path: chapter.notes_path ?? null,
        fileId: chapter.notes_file_id ?? null,
      });

    }
  }

  const handleDownload = async (item: FileItem) => {
    if (!user) {
      toast.error("Sign in required", { description: "Please sign in to download this file." });
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    if (downloadingKey) return;
    setDownloadingKey(item.key);
    const toastId = toast.loading(`Preparing ${item.name}...`);
    try {
      if (item.fileId) {
        await downloadFileFromStorage(item.fileId, item.name);
      } else {
        const url = resolveUrl(item.url, item.path);
        if (!url) throw new Error("File is unavailable");
        const isCatbox = url.startsWith("https://files.catbox.moe/");
        const fetchUrl = isCatbox
          ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-file?url=${encodeURIComponent(url)}&name=${encodeURIComponent(item.name)}`
          : url;
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      }
      toast.success("Download started", { id: toastId, description: item.name });
      if (chapter) {
        void supabase.from("chapter_downloads").insert({
          user_id: user.id,
          chapter_id: chapter.id,
          kind: item.kind === "material" ? "pdf" : "notes",
          file_name: item.name,
        });
      }
    } catch (err) {
      toast.error("Download failed", {
        id: toastId,
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setDownloadingKey(null);
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

  if (!chapter) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Chapter not found</h1>
          <Button className="mt-4" asChild>
            <Link to={`/departments/${deptId}/semester/${semId}/course/${courseId}`}>Back to course</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title={chapter.title}
        subtitle={course ? `${course.code} · ${course.name}` : undefined}
        badge="Chapter"
        badgeIcon={<BookOpen className="h-4 w-4" />}
      >
        <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            className="h-11 px-4 md:h-9 md:px-3 text-white/90 hover:text-white hover:bg-white/10 rounded-xl border border-white/10"
            asChild
          >
            <Link to={`/departments/${deptId}/semester/${semId}/course/${courseId}`}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to {course?.code ?? "course"}
            </Link>
          </Button>
        </div>
      </PageHeader>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="glass-strong rounded-3xl p-6 md:p-8 mb-6">
            <h2 className="font-display font-semibold text-lg mb-3 tracking-tight">Description</h2>
            {chapter.description ? (
              <p className="text-sm md:text-base text-muted-foreground whitespace-pre-line leading-relaxed">
                {chapter.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No description has been added for this chapter yet.
              </p>
            )}
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>Uploaded {new Date(chapter.uploaded_at).toLocaleDateString()}</span>
            </div>
          </div>

          {!user && (
            <div className="mb-6 glass rounded-2xl px-4 py-3 flex items-center gap-3 border border-accent/20">
              <Lock className="h-4 w-4 text-accent flex-shrink-0" />
              <p className="text-sm text-muted-foreground flex-1">
                <span className="text-foreground/90 font-medium">Sign in</span> to download the PDFs for this chapter.
              </p>
              <Button
                size="sm"
                className="bg-gradient-primary text-primary-foreground rounded-xl font-semibold"
                onClick={() => navigate("/login", { state: { from: location.pathname } })}
              >
                Sign in
              </Button>
            </div>
          )}

          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display font-semibold text-lg tracking-tight">PDFs</h2>
            <span className="text-xs text-muted-foreground">
              {files.length} file{files.length === 1 ? "" : "s"}
            </span>
          </div>

          {files.length === 0 ? (
            <div className="glass-strong rounded-3xl p-10 text-center card-lift">
              <div className="inline-flex h-14 w-14 rounded-2xl bg-accent/10 border border-accent/20 items-center justify-center mb-5 shadow-glow">
                <FileText className="h-7 w-7 text-accent" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">No PDFs yet</h3>
              <p className="text-sm text-muted-foreground">
                No materials or notes have been attached to this chapter.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {files.map((item) => {
                const isMaterial = item.kind === "material";
                const Icon = isMaterial ? FileText : StickyNote;
                const label = isMaterial ? "Academic Material" : "Notes";
                const isDownloading = downloadingKey === item.key;
                return (
                  <li
                    key={item.key}
                    className="glass rounded-2xl p-4 md:p-5 card-lift"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
                          isMaterial
                            ? "bg-destructive/10 border-destructive/20 text-destructive"
                            : "bg-accent/15 border-accent/25 text-accent"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground mb-0.5">
                          {label}
                        </div>
                        <div className="font-semibold text-sm md:text-base truncate">{item.name}</div>
                      </div>
                      {!user ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl font-semibold border-white/15 bg-white/5 text-muted-foreground hover:bg-white/5 hover:text-muted-foreground"
                          onClick={() => navigate("/login", { state: { from: location.pathname } })}
                        >
                          <Lock className="h-4 w-4 mr-1.5" /> Sign in
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-gradient-primary text-primary-foreground btn-glow rounded-xl font-semibold"
                          disabled={isDownloading}
                          onClick={() => handleDownload(item)}
                        >
                          {isDownloading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Downloading...
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-1.5" /> Download
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    <div className="mt-3 pl-16">
                      <MaterialStats fileId={item.fileId} size="sm" />
                    </div>
                  </li>

                );
              })}
            </ul>
          )}
        </div>
      </section>
    </Layout>
  );
}
