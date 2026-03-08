import { Link } from "react-router-dom";
import { BookOpen, Layers, FileText, Users, Upload, Settings, BarChart3, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

const stats = [
  { label: "Departments", value: "3", icon: Layers, color: "bg-primary/10 text-primary" },
  { label: "Semesters", value: "36", icon: GraduationCap, color: "bg-cyan/10 text-cyan" },
  { label: "Courses", value: "155", icon: BookOpen, color: "bg-accent/10 text-accent" },
  { label: "PDFs Uploaded", value: "620", icon: FileText, color: "bg-destructive/10 text-destructive" },
];

const actions = [
  { label: "Upload PDF", icon: Upload, desc: "Add new chapter PDFs", to: "/admin/upload-pdf" },
  { label: "Manage Courses", icon: BookOpen, desc: "Edit course details", to: "/admin/manage-courses" },
  { label: "Manage Users", icon: Users, desc: "View registered users", to: "/admin/manage-users" },
  { label: "Settings", icon: Settings, desc: "Platform configuration", to: "/admin/settings" },
];

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">Admin Dashboard</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">← Back to Site</Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-2xl font-bold mb-6">Dashboard Overview</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="bg-card rounded-xl border border-border p-5 card-shadow">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <h2 className="font-display text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {actions.map((a) => (
            <Link
              key={a.label}
              to={a.to}
              className="bg-card rounded-xl border border-border p-6 card-shadow hover:card-shadow-hover transition-all duration-300 hover:-translate-y-1 text-left block"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <a.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display font-semibold mb-1">{a.label}</h3>
              <p className="text-sm text-muted-foreground">{a.desc}</p>
            </Link>
          ))}
        </div>

        {/* Placeholder for more admin features */}
        <div className="mt-8 bg-card rounded-xl border border-border p-8 card-shadow text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display font-semibold text-lg mb-2">Full Admin Features Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Connect a backend to enable PDF uploads, user management, course editing, and more.
          </p>
        </div>
      </div>
    </div>
  );
}
