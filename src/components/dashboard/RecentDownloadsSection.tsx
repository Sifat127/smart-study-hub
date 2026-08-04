import { Link } from "react-router-dom";
import { BookOpen, Download, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardSection from "./DashboardSection";
import type { RecentDownload } from "./types";

interface Props {
  downloads: RecentDownload[];
  loading: boolean;
  className?: string;
}

export default function RecentDownloadsSection({ downloads, loading, className }: Props) {
  return (
    <DashboardSection
      className={className}
      title={
        <>
          <History className="h-5 w-5 text-accent shrink-0" /> Recent Downloads
        </>
      }
      action={
        <Button variant="ghost" size="sm" asChild>
          <Link to="/departments">
            <BookOpen className="h-4 w-4 mr-1.5" /> Browse
          </Link>
        </Button>
      }
    >
      {loading ? (
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      ) : downloads.length === 0 ? (
        <div className="p-8 text-center">
          <Download className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            No downloads yet — open a chapter and grab its PDF or notes.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link to="/departments">
              <BookOpen className="h-4 w-4 mr-1.5" /> Browse departments
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {downloads.map((d) => {
            const ch = d.chapters;
            const c = ch?.courses;
            const href =
              ch && c
                ? `/departments/${c.department.toLowerCase()}/semester/${c.semester}/course/${ch.course_id}?tab=${
                    d.kind === "pdf" ? "materials" : "notes"
                  }`
                : "/departments";
            return (
              <li key={d.id}>
                <Link to={href} className="flex items-center gap-3 p-4 hover:bg-accent/5 transition-colors">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Download className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.file_name || ch?.title || "Chapter file"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {ch?.title || "Chapter"}
                      {c ? ` · ${c.code} · Sem ${c.semester}` : ""}
                      {" · "}
                      {new Date(d.downloaded_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0">
                    {d.kind === "pdf" ? "PDF" : "Notes"}
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
