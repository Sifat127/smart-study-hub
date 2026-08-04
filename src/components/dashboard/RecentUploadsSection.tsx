import { Link } from "react-router-dom";
import { Clock, FileText, StickyNote, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardSection from "./DashboardSection";
import type { RecentUpload } from "./types";

interface Props {
  uploads: RecentUpload[];
  loading: boolean;
  className?: string;
}

export default function RecentUploadsSection({ uploads, loading, className }: Props) {
  return (
    <DashboardSection
      className={className}
      title={
        <>
          <Clock className="h-5 w-5 text-accent shrink-0" /> Your Recent Uploads
        </>
      }
      action={
        <Button variant="ghost" size="sm" asChild>
          <Link to="/upload-notes">
            <Upload className="h-4 w-4 mr-1.5" /> Upload
          </Link>
        </Button>
      }
    >
      {loading ? (
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      ) : uploads.length === 0 ? (
        <div className="p-8 text-center">
          <StickyNote className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground mb-4">You haven't uploaded any notes yet.</p>
          <Button asChild size="sm">
            <Link to="/upload-notes">
              <Upload className="h-4 w-4 mr-1.5" /> Upload your first note
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {uploads.map((item) => {
            const c = item.courses;
            const href = c
              ? `/departments/${c.department.toLowerCase()}/semester/${c.semester}/course/${item.course_id}`
              : "/departments";
            return (
              <li key={item.id}>
                <Link to={href} className="flex items-center gap-3 p-4 hover:bg-accent/5 transition-colors">
                  <div className="h-9 w-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c ? `${c.code} — ${c.name}` : "Course"} • {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-md bg-accent/10 text-accent border border-accent/20 shrink-0">
                    {item.kind === "notes" ? "Notes" : "Material"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardSection>
  );
}
