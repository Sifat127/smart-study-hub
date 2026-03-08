import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Monitor, Zap, Briefcase, ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";
import { departments } from "@/data/mockData";

const deptIcons: Record<string, React.ElementType> = { Monitor, Zap, Briefcase };

export default function Departments() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">All Departments</h1>
          <p className="text-muted-foreground">Select a department to browse its semester-wise course materials.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {departments.map((dept, i) => {
            const Icon = deptIcons[dept.icon] || Monitor;
            return (
              <motion.div
                key={dept.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  to={`/departments/${dept.id}`}
                  className="group block bg-card rounded-xl border border-border p-8 card-shadow hover:card-shadow-hover transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="h-16 w-16 rounded-xl bg-gradient-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
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
    </Layout>
  );
}
