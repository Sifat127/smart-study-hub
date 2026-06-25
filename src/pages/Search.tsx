import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Search as SearchIcon, FileText, StickyNote, BookOpen, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CourseRef {
  id: string;
  code: string;
  name: string;
  department: string;
  semester: number;
}

interface ChapterHit {
  id: string;
  title: string;
  description: string | null;
  course_id: string;
  courses?: CourseRef | null;
}

interface NoteHit {
  id: string;
  title: string;
  description: string | null;
  student_name: string | null;
  batch: string;
  file_url: string;
  created_at: string;
  course_id: string;
  courses?: CourseRef | null;
}

function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const escapeLike = (s: string) => s.replace(/[%,_]/g, (m) => `\\${m}`);

export default function Search() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const initial = params.get("q") ?? "";
  const [query, setQuery] = useState(initial);
  const debounced = useDebounced(query, 300);

  const [chapters, setChapters] = useState<ChapterHit[]>([]);
  const [notes, setNotes] = useState<NoteHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/login?redirect=/search${initial ? `?q=${encodeURIComponent(initial)}` : ""}`);
    }
  }, [authLoading, user, navigate, initial]);

  useEffect(() => {
    const next = new URLSearchParams(params);
    if (debounced) next.set("q", debounced); else next.delete("q");
    setParams(next, { replace: true });
  }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const q = debounced.trim();
    if (!user || q.length < 2) {
      setChapters([]);
      setNotes([]);
      return;
    }
    let active = true;
    const like = `%${escapeLike(q)}%`;
    setLoading(true);
    (async () => {
      const [ch, nt] = await Promise.all([
        supabase
          .from("chapters")
          .select("id, title, description, course_id, courses(id, code, name, department, semester)")
          .or(`title.ilike.${like},description.ilike.${like}`)
          .limit(25),
        supabase
          .from("student_uploads")
          .select("id, title, description, student_name, batch, file_url, created_at, course_id, courses(id, code, name, department, semester)")
          .eq("kind", "notes")
          .or(`title.ilike.${like},description.ilike.${like},student_name.ilike.${like},batch.ilike.${like}`)
          .order("created_at", { ascending: false })
          .limit(25),
      ]);
      if (!active) return;
      setChapters((ch.data as any) ?? []);
      setNotes((nt.data as any) ?? []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [debounced, user]);

  const totalCount = chapters.length + notes.length;
  const hasQuery = debounced.trim().length >= 2;

  if (authLoading || !user) return null;

  return (
    <Layout>
      <PageHeader
        title="Search"
        subtitle="Find chapters across all courses and student-shared notes from your peers."
        badge="Library Search"
        badgeIcon={<SearchIcon className="h-4 w-4" />}
      />

      <section className="py-10">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-card rounded-2xl border border-border p-4 card-shadow mb-6">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search chapters or student notes…"
                className="pl-9 h-11"
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2 px-1">
              Showing public chapter descriptions and student-shared notes only. Academic materials aren't searched here.
            </p>
          </div>

          {!hasQuery ? (
            <EmptyState
              icon={<SearchIcon className="h-10 w-10 text-muted-foreground/40" />}
              title="Type at least 2 characters"
              desc="Search by chapter title, note title, batch, or contributor name."
            />
          ) : (
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All ({totalCount})</TabsTrigger>
                <TabsTrigger value="chapters">Chapters ({chapters.length})</TabsTrigger>
                <TabsTrigger value="notes">Student Notes ({notes.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-6">
                <ChapterList items={chapters} />
                <NotesList items={notes} />
                {!loading && totalCount === 0 && <NoResults q={debounced} />}
              </TabsContent>
              <TabsContent value="chapters">
                <ChapterList items={chapters} />
                {!loading && chapters.length === 0 && <NoResults q={debounced} />}
              </TabsContent>
              <TabsContent value="notes">
                <NotesList items={notes} />
                {!loading && notes.length === 0 && <NoResults q={debounced} />}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </section>
    </Layout>
  );
}

function courseHref(c: CourseRef | null | undefined, courseId: string) {
  if (!c) return "/departments";
  return `/departments/${c.department.toLowerCase()}/semester/${c.semester}/course/${courseId}`;
}

function ChapterList({ items }: { items: ChapterHit[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-accent" /> Chapters
      </h3>
      <ul className="space-y-2">
        {items.map((ch) => (
          <li key={ch.id}>
            <Link
              to={courseHref(ch.courses, ch.course_id)}
              className="flex items-start gap-3 bg-card border border-border rounded-xl p-4 hover:border-accent/40 hover:bg-accent/5 transition-colors"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{ch.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {ch.courses ? `${ch.courses.code} — ${ch.courses.name} · Sem ${ch.courses.semester}` : "Course"}
                </p>
                {ch.description && (
                  <p className="text-xs text-muted-foreground/80 line-clamp-2 mt-1">{ch.description}</p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NotesList({ items }: { items: NoteHit[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
        <StickyNote className="h-4 w-4 text-accent" /> Student Notes
      </h3>
      <ul className="space-y-2">
        {items.map((n) => (
          <li key={n.id}>
            <Link
              to={courseHref(n.courses, n.course_id)}
              className="flex items-start gap-3 bg-card border border-border rounded-xl p-4 hover:border-accent/40 hover:bg-accent/5 transition-colors"
            >
              <div className="h-9 w-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                <StickyNote className="h-4 w-4 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{n.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {n.courses ? `${n.courses.code} — ${n.courses.name}` : "Course"} · Batch {n.batch}
                  {n.student_name ? ` · ${n.student_name}` : ""}
                </p>
                {n.description && (
                  <p className="text-xs text-muted-foreground/80 line-clamp-2 mt-1">{n.description}</p>
                )}
              </div>
              <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-md bg-accent/10 text-accent border border-accent/20 shrink-0">
                Notes
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-12 text-center">
      <div className="flex justify-center mb-3">{icon}</div>
      <h3 className="font-display text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function NoResults({ q }: { q: string }) {
  return (
    <EmptyState
      icon={<SearchIcon className="h-10 w-10 text-muted-foreground/40" />}
      title={`No results for “${q}”`}
      desc="Try a different keyword, course code, batch, or contributor name."
    />
  );
}
