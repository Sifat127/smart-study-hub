import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Monitor, Zap, Briefcase, ArrowRight, FolderOpen, Code, Database, Pill, BookText, Scale, Shirt, Building2, Radio, Plane, Apple, HeartPulse, Clapperboard } from "lucide-react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { departments } from "@/data/mockData";

const deptIcons: Record<string, React.ElementType> = { Monitor, Zap, Briefcase, Code, Database, Pill, BookText, Scale, Shirt, Building2, Radio, Plane, Apple, HeartPulse, Clapperboard };

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function Departments() {
  return (
    <Layout>
      <PageHeader
        title="All Departments"
        subtitle="Select a department to browse its semester-wise course materials and chapter PDFs."
        badge="Browse"
        badgeIcon={<FolderOpen className="h-4 w-4" />}
      />

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {departments.map((dept, i) => {
              const Icon = deptIcons[dept.icon] || Monitor;
              return (
                <motion.div
                  key={dept.id}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                >
                  <Link
                    to={`/departments/${dept.id}`}
                    className="group block bg-card rounded-2xl border border-border p-8 card-shadow hover:card-shadow-hover transition-all duration-300 hover:-translate-y-1 hover:border-accent/30"
                  >
                    <div className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                      <Icon className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <h2 className="font-display text-2xl font-bold mb-1">{dept.name}</h2>
                    <p className="text-muted-foreground font-medium mb-2">{dept.fullName}</p>
                    <p className="text-sm text-muted-foreground mb-4">{dept.description}</p>
                    <p className="text-sm text-muted-foreground mb-4">{dept.totalCourses} courses • 12 semesters</p>
                    <div className="flex items-center text-primary font-semibold">
                      Explore Department <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </Layout>
  );
}
