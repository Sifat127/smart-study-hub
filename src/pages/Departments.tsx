import { Link } from "react-router-dom";
import { Monitor, Zap, Briefcase, ArrowRight, FolderOpen, Code, Database, Pill, BookText, Scale, Shirt, Building2, Radio, Plane, Apple, HeartPulse, Clapperboard } from "lucide-react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { useDepartments } from "@/hooks/useDepartments";

const deptIcons: Record<string, React.ElementType> = { Monitor, Zap, Briefcase, Code, Database, Pill, BookText, Scale, Shirt, Building2, Radio, Plane, Apple, HeartPulse, Clapperboard };


export default function Departments() {
  const departments = useDepartments();
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {departments.map((dept, i) => {
              const Icon = deptIcons[dept.icon] || Monitor;
              return (
                <div key={dept.id}>
                  <Link
                    to={`/departments/${dept.id}`}
                    className="group relative block bg-card rounded-2xl border border-border p-6 card-shadow hover:border-accent/40 hover:shadow-[0_8px_30px_-8px_hsl(var(--accent)/0.25)] overflow-hidden"
                  >
                    {/* Hover glow overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/0 via-accent/0 to-accent/0 group-hover:from-accent/5 group-hover:via-transparent group-hover:to-primary/5 rounded-2xl" />

                    <div className="relative z-10">
                      <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4">
                        <Icon className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <h2 className="font-display text-xl font-bold mb-1 group-hover:text-accent">{dept.name}</h2>
                      <p className="text-muted-foreground text-sm font-medium mb-2">{dept.fullName}</p>
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{dept.description}</p>
                      <p className="text-sm text-muted-foreground mb-4">12 semesters</p>
                      <div className="flex items-center text-primary font-semibold text-sm group-hover:text-accent">
                        Explore Department
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </Layout>
  );
}
