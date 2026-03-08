import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, GraduationCap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
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
      <div className="container mx-auto px-4 py-12">
        <Button variant="ghost" size="sm" className="mb-6" asChild>
          <Link to="/departments"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Departments</Link>
        </Button>

        <div className="mb-10">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">{dept.fullName}</h1>
          <p className="text-muted-foreground">{dept.description}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {semesters.map((sem, i) => (
              <motion.div
                key={sem.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  to={`/departments/${deptId}/semester/${sem.id}`}
                  className="group block bg-card rounded-xl border border-border p-5 card-shadow hover:card-shadow-hover transition-all duration-300 hover:-translate-y-1 text-center"
                >
                  <div className="h-12 w-12 mx-auto rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-gradient-primary group-hover:text-primary-foreground transition-all">
                    <GraduationCap className="h-6 w-6 text-primary group-hover:text-primary-foreground" />
                  </div>
                  <h3 className="font-display font-semibold">{sem.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{sem.courseCount} courses</p>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
