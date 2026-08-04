import { Search, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DashboardFiltersProps {
  query: string;
  onQueryChange: (value: string) => void;
  semester: string;
  onSemesterChange: (value: string) => void;
  semesters: number[];
}

export default function DashboardFilters({
  query,
  onQueryChange,
  semester,
  onSemesterChange,
  semesters,
}: DashboardFiltersProps) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 md:p-5 card-shadow mb-6 flex flex-col md:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search departments…"
          className="pl-9 h-11 md:h-10"
        />
      </div>
      <div className="md:w-56">
        <Select value={semester} onValueChange={onSemesterChange}>
          <SelectTrigger className="h-11 md:h-10">
            <GraduationCap className="h-4 w-4 mr-2 shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All semesters</SelectItem>
            {semesters.map((s) => (
              <SelectItem key={s} value={String(s)}>
                Semester {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
