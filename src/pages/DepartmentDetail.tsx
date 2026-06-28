import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";

import { ArrowLeft, GraduationCap, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { departments } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";

export default function DepartmentDetail() {
  const { deptId } = useParams();
  const dept = departments.find((d) => d.id === deptId);
  const [semesterCounts, setSemesterCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCounts() {
      const { data } = await supabase
        .from("courses")
        .select("semester")
        .eq("department", (deptId || "").toUpperCase());

      if (data) {
        const counts: Record<number, number> = {};
        data.forEach((row) => {
          counts[row.semester] = (counts[row.semester] || 0) + 1;
        });
        setSemesterCounts(counts);
      }
      setLoading(false);
    }
    fetchCounts();
  }, [deptId]);

  if (!dept) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Department not found</h1>
          <Button className="mt-4" asChild><Link to="/departments">Back to Departments</Link></Button>
        </div>
      </Layout>
    );
  }

  const semesters = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    name: `Semester ${i + 1}`,
    courseCount: semesterCounts[i + 1] || 0,
  }));

  return (
    <Layout>
      <PageHeader
        title={dept.fullName}
        subtitle={dept.description}
        badge={dept.name}
        badgeIcon={<Layers className="h-4 w-4" />}
      >
        <div className="mt-4">
          <Button variant="ghost" size="sm" className="text-white/90 hover:text-white hover:bg-white/10" asChild>
            <Link to="/departments"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Departments</Link>
          </Button>
        </div>
      </PageHeader>

      <section className="py-8 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-4 max-w-4xl mx-auto">
            {semesters.map((sem) => (
              <Link
                key={sem.id}
                to={`/departments/${deptId}/semester/${sem.id}`}
                className="group relative block overflow-hidden text-left min-h-[140px] bg-gradient-to-br from-card/60 to-card/20 border border-primary/20 backdrop-blur-xl rounded-2xl p-4 shadow-[0_4px_20px_-8px_hsl(var(--primary)/0.25)] active:scale-[0.97] transition-all md:text-center md:min-h-0 md:bg-transparent md:bg-none md:backdrop-blur-none md:glass md:border-border md:rounded-2xl md:p-5 md:shadow-none md:active:scale-100 hover:border-accent/40 hover:card-shadow-hover"
              >
                <span
                  aria-hidden="true"
                  className="md:hidden pointer-events-none select-none absolute -top-2 -right-1 text-7xl font-extrabold leading-none text-primary/[0.08]"
                >
                  {sem.id}
                </span>
                <div className="relative z-10 h-11 w-11 md:h-12 md:w-12 mx-0 md:mx-auto rounded-xl bg-primary/15 border border-primary/30 md:border-0 flex items-center justify-center mb-3 group-hover:bg-gradient-primary shadow-[0_0_20px_-6px_hsl(var(--primary)/0.4)] md:shadow-none">
                  <GraduationCap className="h-5 w-5 md:h-6 md:w-6 text-primary group-hover:text-primary-foreground" />
                </div>
                <h3 className="relative z-10 font-display font-bold text-base md:text-base md:font-semibold leading-tight">{sem.name}</h3>
                <p className="relative z-10 text-[11px] md:text-xs uppercase md:normal-case tracking-wider md:tracking-normal text-muted-foreground mt-1.5 min-h-[1rem]">
                  {loading ? (
                    <span className="inline-block h-3 w-14 align-middle rounded bg-muted-foreground/15 animate-pulse" />
                  ) : (
                    <>
                      <span className="md:hidden">{sem.courseCount} {sem.courseCount === 1 ? "Course" : "Courses"}</span>
                      <span className="hidden md:inline">{sem.courseCount} courses</span>
                    </>
                  )}
                </p>
              </Link>
            ))}
          </div>

        </div>
      </section>
    </Layout>
  );
}
