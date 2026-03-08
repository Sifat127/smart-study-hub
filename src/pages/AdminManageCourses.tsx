import { Link } from "react-router-dom";
import { BookOpen, ArrowLeft, Edit, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const initialCourses = [
  { id: "1", name: "Introduction to Programming", code: "CSE101", department: "CSE", semester: 1 },
  { id: "2", name: "Data Structures", code: "CSE201", department: "CSE", semester: 3 },
  { id: "3", name: "Circuit Analysis", code: "EEE101", department: "EEE", semester: 1 },
  { id: "4", name: "Business Communication", code: "BBA101", department: "BBA", semester: 1 },
  { id: "5", name: "Database Management", code: "CSE301", department: "CSE", semester: 5 },
];

export default function AdminManageCourses() {
  const { toast } = useToast();
  const [courses, setCourses] = useState(initialCourses);
  const [search, setSearch] = useState("");

  const filtered = courses.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
    toast({ title: "Course deleted" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">Manage Courses</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard</Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <Input placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          <Button><Plus className="h-4 w-4 mr-1" /> Add Course</Button>
        </div>

        <div className="bg-card rounded-xl border border-border card-shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-display font-semibold">Code</th>
                <th className="text-left p-4 font-display font-semibold">Name</th>
                <th className="text-left p-4 font-display font-semibold hidden sm:table-cell">Department</th>
                <th className="text-left p-4 font-display font-semibold hidden sm:table-cell">Semester</th>
                <th className="text-right p-4 font-display font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-mono text-primary font-medium">{c.code}</td>
                  <td className="p-4">{c.name}</td>
                  <td className="p-4 hidden sm:table-cell text-muted-foreground">{c.department}</td>
                  <td className="p-4 hidden sm:table-cell text-muted-foreground">{c.semester}</td>
                  <td className="p-4 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No courses found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
