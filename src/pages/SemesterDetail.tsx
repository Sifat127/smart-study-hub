import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { departments, getSemesters } from "@/data/mockData";

export default function SemesterDetail() {
  const { deptId, semId } = useParams();
  const dept = departments.find((d) => d.id === deptId);
  const semesters = getSemesters(deptId || "cse");
  const semester = semesters.find((s) => s.id === Number(semId));

  if (!dept || !semester) {
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
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">{semester.name}</h1>
          <p className="text-muted-foreground">{semester.courses.length} courses available</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {semester.courses.map((course, i) => (
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
                    <h3 className="font-display font-semibold text-lg mb-2">{course.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{course.description}</p>
                    <div className="flex items-center text-primary font-medium text-sm">
                      View Chapters <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
