import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  LayoutDashboard, Monitor, Zap, Briefcase, Code, Database, Pill,
  BookText, Scale, Shirt, Building2, Radio, Plane, Apple, HeartPulse,
  Clapperboard, ArrowRight, Search, StickyNote, BookOpen, GraduationCap,
  Upload, User as UserIcon, FileText, Clock, Download, History,
  Filter, CalendarDays, X,
} from "lucide-react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDepartments } from "@/hooks/useDepartments";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import FilterChaptersSection from "@/components/FilterChaptersSection";

const deptIcons: Record<string, React.ElementType> = {
  Monitor, Zap, Briefcase, Code, Database, Pill, BookText, Scale,
  Shirt, Building2, Radio, Plane, Apple, HeartPulse, Clapperboard,
};

interface RecentUpload {
  id: string;
  title: string;
  kind: string;
  created_at: string;
  course_id: string;
  courses?: { code: string; name: string; department: string; semester: number } | null;
}

interface RecentDownload {
  id: string;
  kind: "pdf" | "notes";
  file_name: string | null;
  downloaded_at: string;
  chapter_id: string;
  chapters?: {
    id: string;
    title: string;
    course_id: string;
    courses?: { code: string; name: string; department: string; semester: number } | null;
  } | null;
}

export default function UserDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const departments = useDepartments();

  const [query, setQuery] = useState("");
  const [semester, setSemester] = useState<string>("all");
  const [recent, setRecent] = useState<RecentUpload[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [downloads, setDownloads] = useState<RecentDownload[]>([]);
  const [loadingDownloads, setLoadingDownloads] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login?redirect=/dashboard");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const [uploadsRes, downloadsRes] = await Promise.all([
        supabase
          .from("student_uploads")
          .select("id, title, kind, created_at, course_id, courses(code, name, department, semester)")
          .eq("uploaded_by", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("chapter_downloads")
          .select("id, kind, file_name, downloaded_at, chapter_id, chapters(id, title, course_id, courses(code, name, department, semester))")
          .eq("user_id", user.id)
          .order("downloaded_at", { ascending: false })
          .limit(8),
      ]);
      if (!active) return;
      setRecent((uploadsRes.data as any) ?? []);
      setLoadingRecent(false);
      setDownloads((downloadsRes.data as any) ?? []);
      setLoadingDownloads(false);
    })();
    return () => { active = false; };
  }, [user]);

  const filteredDepartments = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.fullName.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q),
    );
  }, [query]);

  const allSemesters = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);

  if (authLoading || !user) return null;

  const firstName = profile?.full_name?.split(" ")[0] || user.email?.split("@")[0] || "Student";

  return (
    <Layout>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle="Jump into your departments, filter by semester, and share notes with your batch."
        badge="Dashboard"
        badgeIcon={<LayoutDashboard className="h-4 w-4" />}
      />

      <section className="py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <QuickAction
              to="/departments"
              icon={<BookOpen className="h-5 w-5" />}
              title="Browse Departments"
              desc="Find courses and chapter PDFs"
            />
            <QuickAction
              to="/upload-notes"
              icon={<Upload className="h-5 w-5" />}
              title="Upload Student Notes"
              desc="Share your notes with your batch"
            />
            <QuickAction
              to="/profile"
              icon={<UserIcon className="h-5 w-5" />}
              title="Your Profile"
              desc="View and edit your details"
            />
          </div>

          {/* Filters */}
          <div className="bg-card rounded-2xl border border-border p-4 md:p-5 card-shadow mb-6 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search departments…"
                className="pl-9"
              />
            </div>
            <div className="md:w-56">
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger>
                  <GraduationCap className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All semesters</SelectItem>
                  {allSemesters.map(s => (
                    <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Departments grid */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl md:text-2xl font-bold">Departments</h2>
            <span className="text-xs text-muted-foreground">{filteredDepartments.length} shown</span>
          </div>

          {filteredDepartments.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-10 text-center text-muted-foreground">
              No departments match “{query}”.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDepartments.map((dept, i) => {
                const Icon = deptIcons[dept.icon] || Monitor;
                const target = semester === "all"
                  ? `/departments/${dept.id}`
                  : `/departments/${dept.id}/semester/${semester}`;
                return (
                  <div key={dept.id}>
                    <Link
                      to={target}
                      className="group relative block bg-card rounded-2xl border border-border p-5 card-shadow hover:border-accent/40 hover:shadow-[0_8px_30px_-8px_hsl(var(--accent)/0.25)] overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-accent/0 via-transparent to-primary/0 group-hover:from-accent/5 group-hover:to-primary/5 rounded-2xl" />
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                          <div className="h-11 w-11 rounded-xl bg-gradient-primary flex items-center justify-center">
                            <Icon className="h-5 w-5 text-primary-foreground" />
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent" />
                        </div>
                        <h3 className="font-display text-lg font-bold mb-0.5 group-hover:text-accent transition-colors">
                          {dept.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{dept.fullName}</p>
                        <p className="text-xs text-muted-foreground/80 line-clamp-2">{dept.description}</p>
                        <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span>{dept.totalCourses} courses</span>
                          {semester !== "all" && <span>• Semester {semester}</span>}
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

          {/* Filter Chapters */}
          <FilterChaptersSection />

          {/* Download history */}
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl md:text-2xl font-bold flex items-center gap-2">
                <History className="h-5 w-5 text-accent" /> Recent Downloads
              </h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/departments"><BookOpen className="h-4 w-4 mr-1.5" /> Browse</Link>
              </Button>
            </div>
            <div className="bg-card rounded-2xl border border-border card-shadow overflow-hidden">
              {loadingDownloads ? (
                <div className="p-6 text-sm text-muted-foreground">Loading…</div>
              ) : downloads.length === 0 ? (
                <div className="p-8 text-center">
                  <Download className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">No downloads yet — open a chapter and grab its PDF or notes.</p>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/departments"><BookOpen className="h-4 w-4 mr-1.5" /> Browse departments</Link>
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {downloads.map(d => {
                    const ch = d.chapters;
                    const c = ch?.courses;
                    const href = ch && c
                      ? `/departments/${c.department.toLowerCase()}/semester/${c.semester}/course/${ch.course_id}?tab=${d.kind === "pdf" ? "materials" : "notes"}`
                      : "/departments";
                    return (
                      <li key={d.id}>
                        <Link to={href} className="flex items-center gap-3 p-4 hover:bg-accent/5 transition-colors">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <Download className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {d.file_name || ch?.title || "Chapter file"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {ch?.title || "Chapter"}
                              {c ? ` · ${c.code} · Sem ${c.semester}` : ""}
                              {" · "}
                              {new Date(d.downloaded_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                            </p>
                          </div>
                          <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
                            {d.kind === "pdf" ? "PDF" : "Notes"}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Recent uploads */}
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl md:text-2xl font-bold flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent" /> Your Recent Uploads
              </h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/upload-notes"><Upload className="h-4 w-4 mr-1.5" /> Upload</Link>
              </Button>
            </div>
            <div className="bg-card rounded-2xl border border-border card-shadow overflow-hidden">
              {loadingRecent ? (
                <div className="p-6 text-sm text-muted-foreground">Loading…</div>
              ) : recent.length === 0 ? (
                <div className="p-8 text-center">
                  <StickyNote className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">You haven't uploaded any notes yet.</p>
                  <Button asChild size="sm">
                    <Link to="/upload-notes"><Upload className="h-4 w-4 mr-1.5" /> Upload your first note</Link>
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {recent.map(item => {
                    const c = item.courses;
                    const href = c
                      ? `/departments/${c.department.toLowerCase()}/semester/${c.semester}/course/${item.course_id}`
                      : "/departments";
                    return (
                      <li key={item.id}>
                        <Link to={href} className="flex items-center gap-3 p-4 hover:bg-accent/5 transition-colors">
                          <div className="h-9 w-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4 text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {c ? `${c.code} — ${c.name}` : "Course"} • {new Date(item.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-md bg-accent/10 text-accent border border-accent/20">
                            {item.kind === "notes" ? "Notes" : "Material"}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}

function QuickAction({ to, icon, title, desc }: { to: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="group relative block bg-card rounded-2xl border border-border p-5 card-shadow hover:border-accent/40 hover:shadow-[0_8px_30px_-8px_hsl(var(--accent)/0.25)]"
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center text-primary-foreground shrink-0">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm md:text-base group-hover:text-accent transition-colors">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent" />
      </div>
    </Link>
  );
}

