import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, ArrowRight, Loader2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { departments } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";

interface CourseRow {
  id: string;
  code: string;
  name: string;
  department: string;
  semester: number;
}

export default function SemesterDetail() {
  const { deptId, semId } = useParams();
  const dept = departments.find((d) => d.id === deptId);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCourses() {
      const { data } = await supabase
        .from("courses")
        .select("id, code, name, department, semester")
        .eq("department", (deptId || "").toUpperCase())
        .eq("semester", Number(semId))
        .order("code");

      if (data) setCourses(data);
      setLoading(false);
    }
    fetchCourses();
  }, [deptId, semId]);

  if (!dept) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Not found</h1>
          <Button className="mt-4" asChild><Link to="/departments">Back</Link></Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title={`Semester ${semId}`}
        subtitle={`${courses.length} courses available in ${dept.fullName}`}
        badge={dept.name}
        badgeIcon={<GraduationCap className="h-4 w-4" />}
      >
        <div className="mt-4">
          <Button variant="ghost" size="sm" className="text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10" asChild>
            <Link to={`/departments/${deptId}`}><ArrowLeft className="h-4 w-4 mr-1" /> Back to {dept.name}</Link>
          </Button>
        </div>
      </PageHeader>

      <section className="py-16">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : courses.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center max-w-2xl mx-auto">
              <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-display font-semibold text-lg mb-2">No courses yet</h3>
              <p className="text-sm text-muted-foreground">Courses for this semester haven't been added yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {courses.map((course, i) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Link
                    to={`/departments/${deptId}/semester/${semId}/course/${course.id}`}
                    className="group block glass rounded-2xl p-6 hover:border-accent/30 hover:card-shadow-hover transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-gradient-primary transition-all">
                        <BookOpen className="h-6 w-6 text-primary group-hover:text-primary-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded-lg text-muted-foreground">{course.code}</span>
                        </div>
                        <h3 className="font-display font-semibold text-lg mb-3">{course.name}</h3>
                        <div className="flex items-center text-primary font-medium text-sm">
                          View Chapters <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
