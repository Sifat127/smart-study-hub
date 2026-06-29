import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Layers, FileText, Users, Upload, Settings, GraduationCap, Loader2, StickyNote, FileEdit, History, ShieldCheck } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const actions = [
  { label: "Upload PDF", icon: Upload, desc: "Add new chapter PDFs", to: "/admin/upload-pdf" },
  { label: "Manage Departments", icon: Layers, desc: "Add, edit, or remove departments", to: "/admin/manage-departments" },
  { label: "Manage Semesters", icon: GraduationCap, desc: "Add, edit, or remove semesters", to: "/admin/manage-semesters" },
  { label: "Manage Chapters", icon: FileEdit, desc: "Edit chapter info & linked PDFs", to: "/admin/manage-chapters" },
  { label: "Audit Log", icon: History, desc: "All chapter changes with timestamps", to: "/admin/audit-log" },
  { label: "Upload Student Notes", icon: StickyNote, desc: "Submit student notes & materials", to: "/upload-notes" },
  { label: "Manage Courses", icon: BookOpen, desc: "Edit course details", to: "/admin/manage-courses" },
  { label: "Manage Users", icon: Users, desc: "View registered users", to: "/admin/manage-users" },
  { label: "Settings", icon: Settings, desc: "Platform configuration", to: "/admin/settings" },
];

export default function AdminDashboard() {
  const { profile, user } = useAuth();
  const [counts, setCounts] = useState({ depts: 0, courses: 0, chapters: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const [coursesRes, chaptersRes] = await Promise.all([
        supabase.from("courses").select("department"),
        supabase.from("chapters").select("id"),
      ]);

      const uniqueDepts = new Set((coursesRes.data || []).map(c => c.department));

      setCounts({
        depts: uniqueDepts.size,
        courses: coursesRes.data?.length || 0,
        chapters: chaptersRes.data?.length || 0,
      });
      setLoading(false);
    }
    fetchStats();
  }, []);

  const stats = [
    { label: "Departments", value: String(counts.depts), icon: Layers, color: "bg-primary/10 text-primary" },
    { label: "Semesters", value: String(counts.depts * 12), icon: GraduationCap, color: "bg-cyan/10 text-cyan" },
    { label: "Courses", value: String(counts.courses), icon: BookOpen, color: "bg-accent/10 text-accent" },
    { label: "PDFs Uploaded", value: String(counts.chapters), icon: FileText, color: "bg-destructive/10 text-destructive" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Admin-only accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-accent via-primary to-accent" />
      <header className="sticky top-0 z-50 glass border-b-2 border-accent/30">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="DIU StudyBank" className="h-11 w-11 rounded-lg object-contain" />
            <div className="flex flex-col leading-tight">
              <span className="font-display font-bold text-xl flex items-center gap-2">
                Admin Console
                <Badge variant="default" className="gap-1 text-[10px] uppercase tracking-wider">
                  <ShieldCheck className="h-3 w-3" /> Admin
                </Badge>
              </span>
              <span className="text-xs text-muted-foreground">Staff-only control panel</span>
            </div>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">← Back to Site</Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Admin welcome banner */}
        <div className="mb-8 rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-primary/5 to-transparent p-6 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-accent/10 blur-3xl" aria-hidden />
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-5 w-5 text-accent" />
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">Administrator Area</span>
          </div>
          <h1 className="font-display text-3xl font-bold">
            Welcome back, {profile?.full_name || user?.email?.split("@")[0] || "Admin"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            You have elevated permissions. Changes here affect every student on the platform.
          </p>
        </div>


        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="bg-card rounded-xl border border-border p-5 card-shadow">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <p className="font-display text-2xl font-bold">{s.value}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <h2 className="font-display text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {actions.map((a) => (
            <Link
              key={a.label}
              to={a.to}
              className="bg-card rounded-xl border border-border p-6 card-shadow hover:card-shadow-hover text-left block"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <a.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display font-semibold mb-1">{a.label}</h3>
              <p className="text-sm text-muted-foreground">{a.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
