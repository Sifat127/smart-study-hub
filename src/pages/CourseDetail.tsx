import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, FileText, Download, Eye, Calendar, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";

interface CourseData {
  id: string;
  code: string;
  name: string;
}

interface ChapterData {
  id: string;
  title: string;
  description: string | null;
  pdf_name: string | null;
  pdf_path: string | null;
  uploaded_at: string;
}

export default function CourseDetail() {
  const { deptId, semId, courseId } = useParams();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [courseRes, chaptersRes] = await Promise.all([
        supabase.from("courses").select("id, code, name").eq("id", courseId!).maybeSingle(),
        supabase.from("chapters").select("id, title, description, pdf_name, pdf_path, uploaded_at").eq("course_id", courseId!).order("uploaded_at"),
      ]);
      if (courseRes.data) setCourse(courseRes.data);
      if (chaptersRes.data) setChapters(chaptersRes.data);
      setLoading(false);
    }
    if (courseId) fetchData();
  }, [courseId]);

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("pdfs").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleDownload = async (path: string, fileName: string) => {
    const { data } = await supabase.storage.from("pdfs").createSignedUrl(path, 3600);
    if (data?.signedUrl) {
      const response = await fetch(data.signedUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Course not found</h1>
          <Button className="mt-4" asChild>
            <Link to={`/departments/${deptId}/semester/${semId}`}>Back</Link>
          </Button>
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
        </div>

        {chapters.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center card-shadow max-w-3xl">
            <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-display font-semibold text-lg mb-2">No chapters yet</h3>
            <p className="text-sm text-muted-foreground">Chapters and PDFs for this course haven't been uploaded yet.</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl">
            {chapters.map((chapter, i) => (
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
                    {chapter.description && (
                      <p className="text-sm text-muted-foreground mb-3">{chapter.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                      {chapter.pdf_name && (
                        <>
                          <FileText className="h-3.5 w-3.5" />
                          <span>{chapter.pdf_name}</span>
                          <span>•</span>
                        </>
                      )}
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(chapter.uploaded_at).toLocaleDateString()}</span>
                    </div>
                    {chapter.pdf_path && (
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90" onClick={() => handleDownload(chapter.pdf_path!, chapter.pdf_name || "file.pdf")}>
                          <Download className="h-4 w-4 mr-1.5" /> Download PDF
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <a href={getPublicUrl(chapter.pdf_path)} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4 mr-1.5" /> View PDF
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
