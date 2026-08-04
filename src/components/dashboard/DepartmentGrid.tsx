import { Link } from "react-router-dom";
import {
  Monitor, Zap, Briefcase, Code, Database, Pill, BookText, Scale,
  Shirt, Building2, Radio, Plane, Apple, HeartPulse, Clapperboard, ArrowRight,
} from "lucide-react";

const deptIcons: Record<string, React.ElementType> = {
  Monitor, Zap, Briefcase, Code, Database, Pill, BookText, Scale,
  Shirt, Building2, Radio, Plane, Apple, HeartPulse, Clapperboard,
};

export interface DepartmentCardData {
  id: string;
  name: string;
  fullName: string;
  description: string;
  icon: string;
  totalCourses: number;
}

interface DepartmentGridProps {
  departments: DepartmentCardData[];
  semester: string;
  query: string;
}

export default function DepartmentGrid({ departments, semester, query }: DepartmentGridProps) {
  if (departments.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-10 text-center text-muted-foreground">
        No departments match “{query}”.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {departments.map((dept) => {
        const Icon = deptIcons[dept.icon] || Monitor;
        const target =
          semester === "all"
            ? `/departments/${dept.id}`
            : `/departments/${dept.id}/semester/${semester}`;
        return (
          <div key={dept.id}>
            <Link
              to={target}
              className="group relative block bg-card rounded-2xl border border-border p-4 md:p-5 card-shadow hover:border-accent/40 hover:shadow-[0_8px_30px_-8px_hsl(var(--accent)/0.25)] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-accent/0 via-transparent to-primary/0 group-hover:from-accent/5 group-hover:to-primary/5 rounded-2xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-11 w-11 rounded-xl bg-gradient-primary flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent" />
                </div>
                <h3 className="font-display text-lg font-bold mb-0.5 group-hover:text-accent transition-colors">
                  {dept.name}
                </h3>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{dept.fullName}</p>
                <p className="text-xs text-muted-foreground/80 line-clamp-2">{dept.description}</p>
                <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>{dept.totalCourses} courses</span>
                  {semester !== "all" && <span>• Semester {semester}</span>}
                </div>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
