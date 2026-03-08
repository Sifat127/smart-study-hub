import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
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
      <div className="container mx-auto px-4 py-12">
        <Button variant="ghost" size="sm" className="mb-6" asChild>
          <Link to={`/departments/${deptId}`}><ArrowLeft className="h-4 w-4 mr-1" /> Back to {dept.name}</Link>
        </Button>

        <div className="mb-10">
          <p className="text-sm text-primary font-medium mb-1">{dept.fullName}</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Semester {semId}</h1>
          <p className="text-muted-foreground">{courses.length} courses available</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center card-shadow">
            <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-display font-semibold text-lg mb-2">No courses yet</h3>
            <p className="text-sm text-muted-foreground">Courses for this semester haven't been added yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map((course, i) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Link
                  to={`/departments/${deptId}/semester/${semId}/course/${course.id}`}
                  className="group block bg-card rounded-xl border border-border p-6 card-shadow hover:card-shadow-hover transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">{course.code}</span>
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
    </Layout>
  );
}
