import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, Download, Eye, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { getCourse } from "@/data/mockData";

export default function CourseDetail() {
  const { deptId, semId, courseId } = useParams();
  const course = getCourse(courseId || "");

  if (!course) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Course not found</h1>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <Button variant="ghost" size="sm" className="mb-6" asChild>
          <Link to={`/departments/${deptId}/semester/${semId}`}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Semester {semId}
          </Link>
        </Button>

        <div className="mb-10">
          <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">{course.code}</span>
          <h1 className="font-display text-3xl md:text-4xl font-bold mt-2 mb-2">{course.name}</h1>
          <p className="text-muted-foreground">{course.description}</p>
        </div>

        <div className="space-y-4 max-w-3xl">
          {course.chapters.map((chapter, i) => (
            <motion.div
              key={chapter.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-card rounded-xl border border-border p-6 card-shadow hover:card-shadow-hover transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-lg mb-1">{chapter.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{chapter.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                    <FileText className="h-3.5 w-3.5" />
                    <span>{chapter.pdfName}</span>
                    <span>•</span>
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{chapter.uploadedAt}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                      <Download className="h-4 w-4 mr-1.5" /> Download PDF
                    </Button>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-1.5" /> View PDF
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
