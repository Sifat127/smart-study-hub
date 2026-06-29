import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Filter, GraduationCap, BookOpen, CalendarDays, FileText, Clock,
  StickyNote, X,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDepartments } from "@/hooks/useDepartments";
import { supabase } from "@/integrations/supabase/client";

interface CourseRow {
  id: string;
  code: string;
  name: string;
  department: string;
  semester: number;
}

interface ChapterRow {
  id: string;
  title: string;
  course_id: string;
  uploaded_at: string;
  pdf_url: string | null;
  pdf_path: string | null;
  notes_url: string | null;
  notes_path: string | null;
  courses: CourseRow | null;
}

const SEMESTERS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function FilterChaptersSection() {
  const departments = useDepartments();
  const [dept, setDept] = useState<string>("all");
  const [courseId, setCourseId] = useState<string>("all");
  const [sem, setSem] = useState<string>("all");
  const [chapterId, setChapterId] = useState<string>("all");

  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [chapterOptions, setChapterOptions] = useState<{ id: string; title: string }[]>([]);
  const [results, setResults] = useState<ChapterRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setCourseId("all");
    setChapterId("all");
    setChapterOptions([]);
    if (dept === "all") { setCourses([]); return; }
    (async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, code, name, department, semester")
        .eq("department", dept)
        .order("semester", { ascending: true })
        .order("code", { ascending: true });
      if (!active) return;
      setCourses((data as CourseRow[]) ?? []);
    })();
    return () => { active = false; };
  }, [dept]);

  useEffect(() => {
    let active = true;
    setChapterId("all");
    if (courseId === "all") { setChapterOptions([]); return; }
    (async () => {
      const { data } = await supabase
        .from("chapters")
        .select("id, title")
        .eq("course_id", courseId)
        .order("uploaded_at", { ascending: true });
      if (!active) return;
      setChapterOptions((data as { id: string; title: string }[]) ?? []);
    })();
    return () => { active = false; };
  }, [courseId]);

  const courseOptions = useMemo(() => {
    if (sem === "all") return courses;
    return courses.filter(c => String(c.semester) === sem);
  }, [courses, sem]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      let q = supabase
        .from("chapters")
        .select("id, title, course_id, uploaded_at, pdf_url, pdf_path, notes_url, notes_path, courses!inner(id, code, name, department, semester)")
        .order("uploaded_at", { ascending: false })
        .limit(30);
      if (chapterId !== "all") q = q.eq("id", chapterId);
      if (courseId !== "all") q = q.eq("course_id", courseId);
      if (dept !== "all") q = q.eq("courses.department", dept);
      if (sem !== "all") q = q.eq("courses.semester", Number(sem));
      const { data } = await q;
      if (!active) return;
      setResults((data as unknown as ChapterRow[]) ?? []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [dept, courseId, sem, chapterId]);

  const deptObj = departments.find(d => d.name === dept);
  const courseObj = courses.find(c => c.id === courseId);
  const chapterObj = chapterOptions.find(c => c.id === chapterId);

  const chips: { key: string; label: string; tone: string; icon: React.ReactNode; onClear: () => void }[] = [];
  if (deptObj) chips.push({ key: "d", label: deptObj.fullName, tone: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: <GraduationCap className="h-3 w-3" />, onClear: () => setDept("all") });
  if (courseObj) chips.push({ key: "c", label: `${courseObj.code} — ${courseObj.name}`, tone: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: <BookOpen className="h-3 w-3" />, onClear: () => setCourseId("all") });
  if (sem !== "all") chips.push({ key: "s", label: `Semester ${sem}`, tone: "bg-purple-500/10 text-purple-500 border-purple-500/20", icon: <CalendarDays className="h-3 w-3" />, onClear: () => setSem("all") });
  if (chapterObj) chips.push({ key: "ch", label: chapterObj.title, tone: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: <FileText className="h-3 w-3" />, onClear: () => setChapterId("all") });

  const clearAll = () => { setDept("all"); setCourseId("all"); setSem("all"); setChapterId("all"); };

  return (
    <div className="mt-12">
      <div className="bg-card rounded-2xl border border-border p-4 md:p-5 card-shadow mb-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Filter className="h-4 w-4 text-accent" />
            </div>
            <h2 className="font-display text-lg md:text-xl font-bold">Filter Chapters</h2>
          </div>
          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {chips.map(chip => (
                <button
                  key={chip.key}
                  onClick={chip.onClear}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${chip.tone} hover:opacity-80 transition-opacity max-w-[200px]`}
                  title={`Clear ${chip.label}`}
                >
                  {chip.icon}
                  <span className="truncate">{chip.label}</span>
                  <X className="h-3 w-3 opacity-70" />
                </button>
              ))}
              <button
                onClick={clearAll}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" /> Clear all {chips.length}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <FilterSelect
            icon={<GraduationCap className="h-4 w-4 text-blue-500" />}
            value={dept}
            onChange={setDept}
            placeholder="All departments"
            options={departments.map(d => ({ value: d.name, label: d.name }))}
          />
          <FilterSelect
            icon={<BookOpen className="h-4 w-4 text-emerald-500" />}
            value={courseId}
            onChange={setCourseId}
            placeholder={dept === "all" ? "Select department first" : "All courses"}
            disabled={dept === "all"}
            options={courseOptions.map(c => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
          />
          <FilterSelect
            icon={<CalendarDays className="h-4 w-4 text-purple-500" />}
            value={sem}
            onChange={setSem}
            placeholder="All semesters"
            options={SEMESTERS.map(s => ({ value: String(s), label: `Semester ${s}` }))}
          />
          <FilterSelect
            icon={<FileText className="h-4 w-4 text-amber-500" />}
            value={chapterId}
            onChange={setChapterId}
            placeholder={courseId === "all" ? "Select course first" : "All chapters"}
            disabled={courseId === "all"}
            options={chapterOptions.map(c => ({ value: c.id, label: c.title }))}
          />
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <>
            <div className="bg-card rounded-2xl border border-border p-5 animate-pulse h-24" />
            <div className="bg-card rounded-2xl border border-border p-5 animate-pulse h-24" />
          </>
        ) : results.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-10 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No chapters match these filters.</p>
          </div>
        ) : (
          results.map(r => {
            const c = r.courses;
            const deptId = c ? (departments.find(d => d.name === c.department)?.id ?? c.department.toLowerCase()) : "";
            const href = c
              ? `/departments/${deptId}/semester/${c.semester}/course/${r.course_id}?tab=materials`
              : "/departments";
            const hasPdf = !!(r.pdf_url || r.pdf_path);
            const hasNotes = !!(r.notes_url || r.notes_path);
            return (
              <Link
                key={r.id}
                to={href}
                className="group block bg-card rounded-2xl border border-border p-4 md:p-5 card-shadow hover:border-accent/40 hover:shadow-[0_8px_30px_-8px_hsl(var(--accent)/0.25)]"
              >
                <h3 className="font-display text-base md:text-lg font-bold mb-2 group-hover:text-accent transition-colors">
                  {r.title}
                </h3>
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  {c && (
                    <>
                      <Chip tone="bg-blue-500/10 text-blue-500 border-blue-500/20" icon={<GraduationCap className="h-3 w-3" />}>
                        {c.department}
                      </Chip>
                      <Chip tone="bg-amber-500/10 text-amber-500 border-amber-500/20" icon={<BookOpen className="h-3 w-3" />}>
                        {c.code}
                      </Chip>
                      <Chip tone="bg-purple-500/10 text-purple-500 border-purple-500/20" icon={<CalendarDays className="h-3 w-3" />}>
                        Semester {c.semester}
                      </Chip>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(r.uploaded_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </span>
                  {hasPdf && (
                    <span className="inline-flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" /> PDF available
                    </span>
                  )}
                  {hasNotes && (
                    <span className="inline-flex items-center gap-1.5">
                      <StickyNote className="h-3.5 w-3.5" /> Notes available
                    </span>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  icon, value, onChange, placeholder, options, disabled,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="bg-background/50 h-11">
        <span className="mr-2 shrink-0">{icon}</span>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{placeholder}</SelectItem>
        {options.map(o => (
          <SelectItem key={o.value} value={o.value} className="truncate">{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Chip({ tone, icon, children }: { tone: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border ${tone}`}>
      {icon}
      {children}
    </span>
  );
}
