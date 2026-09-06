import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LayoutDashboard, BookOpen, Upload, User as UserIcon } from "lucide-react";

import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import FilterChaptersSection from "@/components/FilterChaptersSection";
import RealtimeDebugPanel from "@/components/RealtimeDebugPanel";
import QuickAction from "@/components/dashboard/QuickAction";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DepartmentGrid from "@/components/dashboard/DepartmentGrid";
import RecentDownloadsSection from "@/components/dashboard/RecentDownloadsSection";
import RecentUploadsSection from "@/components/dashboard/RecentUploadsSection";
import { useDepartments } from "@/hooks/useDepartments";
import { useDashboardActivity } from "@/hooks/useDashboardActivity";
import { useAuth } from "@/contexts/AuthContext";

const FILTER_QUERY_KEY = "dashboard:filter:query";
const FILTER_SEMESTER_KEY = "dashboard:filter:semester";

export default function UserDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const departments = useDepartments();

  const [query, setQuery] = useState(() => {
    try {
      return localStorage.getItem(FILTER_QUERY_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [semester, setSemester] = useState<string>(() => {
    try {
      return localStorage.getItem(FILTER_SEMESTER_KEY) ?? "all";
    } catch {
      return "all";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(FILTER_QUERY_KEY, query);
      localStorage.setItem(FILTER_SEMESTER_KEY, semester);
    } catch {
      // storage unavailable (private mode) — filters just won't persist
    }
  }, [query, semester]);

  const { uploads, downloads, loadingUploads, loadingDownloads } = useDashboardActivity(user?.id);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login?redirect=/dashboard");
  }, [authLoading, user, navigate]);

  const filteredDepartments = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.fullName.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q),
    );
  }, [query, departments]);

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

      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-8 md:mb-10">
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

          <DashboardFilters
            query={query}
            onQueryChange={setQuery}
            semester={semester}
            onSemesterChange={setSemester}
            semesters={allSemesters}
          />

          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl md:text-2xl font-bold">Departments</h2>
            <span className="text-xs text-muted-foreground">{filteredDepartments.length} shown</span>
          </div>

          <DepartmentGrid departments={filteredDepartments} semester={semester} query={query} />

          <FilterChaptersSection />

          <RecentDownloadsSection className="mt-10 md:mt-12" downloads={downloads} loading={loadingDownloads} />

          <RecentUploadsSection className="mt-10 md:mt-12" uploads={uploads} loading={loadingUploads} />
        </div>
      </section>
      <RealtimeDebugPanel watching={{ page: "UserDashboard", userId: user?.id ?? null }} />
    </Layout>
  );
}
