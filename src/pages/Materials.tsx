import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search as SearchIcon, Library, Loader2, X } from "lucide-react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import PdfCard, { type PdfCardData } from "@/components/PdfCard";
import { supabase } from "@/integrations/supabase/client";

interface FileRow extends PdfCardData {
  department: string | null;
  semester: string | null;
  course_code: string | null;
  chapter?: string | null;
}

const ALL = "all";
const PAGE_SIZE = 24;

function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/** Public-ish browse page: every uploaded file, filterable by department and semester. */
export default function Materials() {
  const [params, setParams] = useSearchParams();

  const [query, setQuery] = useState(params.get("q") ?? "");
  const [dept, setDept] = useState(params.get("dept") ?? ALL);
  const [sem, setSem] = useState(params.get("sem") ?? ALL);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const debounced = useDebounced(query, 300);

  const [chapter, setChapter] = useState(params.get("chapter") ?? ALL);
  const [files, setFiles] = useState<FileRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next = new URLSearchParams();
    if (debounced.trim()) next.set("q", debounced.trim());
    if (dept !== ALL) next.set("dept", dept);
    if (sem !== ALL) next.set("sem", sem);
    if (chapter !== ALL) next.set("chapter", chapter);
    setParams(next, { replace: true });
    setVisible(PAGE_SIZE);
  }, [debounced, dept, sem, chapter]); // eslint-disable-line react-hooks/exhaustive-deps

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      const [filesRes, chaptersRes] = await Promise.all([
        supabase
          .from("files_public")
          .select("id, title, original_filename, upload_date, department, semester, course_code, subject, uploader_name")
          .order("upload_date", { ascending: false })
          .limit(500),
        supabase.from("chapters").select("title, file_id, notes_file_id"),
      ]);
      if (cancelled) return;
      if (filesRes.error) {
        setError("Sign in to browse study materials.");
        setFiles([]);
        return;
      }
      const chapterByFile = new Map<string, string>();
      for (const c of (chaptersRes.data ?? []) as { title: string; file_id: string | null; notes_file_id: string | null }[]) {
        if (c.file_id) chapterByFile.set(c.file_id, c.title);
        if (c.notes_file_id) chapterByFile.set(c.notes_file_id, c.title);
      }
      setFiles(((filesRes.data ?? []) as (FileRow & { subject?: string | null })[]).map((f) => ({
        ...f,
        chapter: chapterByFile.get(f.id) ?? f.subject ?? null,
      })));
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);


  // New uploads (from the dashboard/upload page) show up here instantly.
  useEffect(() => {
    const channel = supabase
      .channel("materials-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "files" }, () =>
        setReloadKey((k) => k + 1),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "chapters" }, () =>
        setReloadKey((k) => k + 1),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);


  const departments = useMemo(
    () => Array.from(new Set((files ?? []).map((f) => f.department).filter(Boolean) as string[])).sort(),
    [files],
  );
  const semesters = useMemo(
    () => Array.from(new Set((files ?? []).map((f) => f.semester).filter(Boolean) as string[]))
      .sort((a, b) => Number(a) - Number(b) || a.localeCompare(b)),
    [files],
  );

  const chapters = useMemo(
    () => Array.from(new Set((files ?? [])
      .filter((f) => (dept === ALL || f.department === dept) && (sem === ALL || f.semester === sem))
      .map((f) => f.chapter).filter(Boolean) as string[])).sort(),
    [files, dept, sem],
  );

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    return (files ?? []).filter((f) => {
      if (dept !== ALL && f.department !== dept) return false;
      if (sem !== ALL && f.semester !== sem) return false;
      if (chapter !== ALL && f.chapter !== chapter) return false;
      if (!q) return true;
      return [f.title, f.original_filename, f.course_code, f.department, f.chapter]
        .some((v) => v?.toLowerCase().includes(q));
    });
  }, [files, debounced, dept, sem, chapter]);

  const hasFilters = dept !== ALL || sem !== ALL || chapter !== ALL || !!debounced.trim();

  return (
    <Layout>
      <PageHeader
        title="All study materials"
        subtitle="Browse every uploaded PDF by department and semester — no need to open each dashboard."
      />

      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="glass-strong rounded-2xl p-4 md:p-5 mb-6 space-y-3">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, file name or course code"
                aria-label="Search materials"
                className="h-11 pl-9 rounded-xl bg-background/60 text-base"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Select value={dept} onValueChange={(v) => { setDept(v); setChapter(ALL); }}>
                <SelectTrigger className="h-11 rounded-xl" aria-label="Filter by department">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All departments</SelectItem>
                  {departments.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                </SelectContent>
              </Select>

              <Select value={sem} onValueChange={(v) => { setSem(v); setChapter(ALL); }}>
                <SelectTrigger className="h-11 rounded-xl" aria-label="Filter by semester">
                  <SelectValue placeholder="Semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All semesters</SelectItem>
                  {semesters.map((s) => (<SelectItem key={s} value={s}>Semester {s}</SelectItem>))}
                </SelectContent>
              </Select>

              <Select value={chapter} onValueChange={setChapter}>
                <SelectTrigger className="h-11 rounded-xl" aria-label="Filter by chapter">
                  <SelectValue placeholder="Chapter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All chapters</SelectItem>
                  {chapters.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                className="h-11 rounded-xl"
                disabled={!hasFilters}
                onClick={() => { setQuery(""); setDept(ALL); setSem(ALL); setChapter(ALL); }}
              >
                <X className="h-4 w-4 mr-1.5" /> Clear filters
              </Button>
            </div>
          </div>

          {files === null ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-2xl" />
              ))}
            </div>
          ) : error ? (
            <p className="text-center text-muted-foreground py-12">{error}</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Library className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No materials match your filters yet.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-3">
                {filtered.length} material{filtered.length === 1 ? "" : "s"}
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.slice(0, visible).map((f) => (
                  <div key={f.id} className="space-y-2">
                    <PdfCard pdf={f} />
                    <div className="flex flex-wrap gap-1.5 px-1">
                      {[f.department, f.semester ? `Semester ${f.semester}` : null, f.course_code, f.chapter]
                        .filter(Boolean)
                        .map((tag) => (
                          <span key={tag as string} className="text-[11px] rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-muted-foreground">
                            {tag}
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
              {visible < filtered.length && (
                <div className="text-center mt-8">
                  <Button
                    variant="outline"
                    className="h-11 px-6 rounded-xl"
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  >
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </Layout>
  );
}
