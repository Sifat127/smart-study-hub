import { BookOpen, Users, Shield, Download } from "lucide-react";
import Layout from "@/components/Layout";

const stats = [
  { icon: BookOpen, label: "Departments", value: "3" },
  { icon: Users, label: "Active Students", value: "500+" },
  { icon: Shield, label: "Secure Platform", value: "100%" },
  { icon: Download, label: "PDFs Available", value: "200+" },
];

export default function About() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">About DIU Slider</h1>
          <p className="text-muted-foreground text-lg mb-8">
            DIU Slider is a modern academic resource platform designed for Daffodil International University students. 
            Our mission is to make course materials easily accessible, organized, and downloadable — all in one smart platform.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {stats.map((s) => (
              <div key={s.label} className="bg-card rounded-xl border border-border p-5 card-shadow text-center">
                <s.icon className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="font-display text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-6 text-muted-foreground">
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground mb-2">Our Mission</h2>
              <p>To provide a centralized, well-organized digital library where students can find and download their course PDFs without hassle. We believe that easy access to study materials leads to better academic performance.</p>
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground mb-2">How It Works</h2>
              <p>Browse by department, select your semester, pick a course, and access chapter-wise PDF materials. It's that simple. Admins manage all the content to ensure materials are always up-to-date and accurate.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
