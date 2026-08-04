export interface DashboardCourseRef {
  code: string;
  name: string;
  department: string;
  semester: number;
}

export interface RecentUpload {
  id: string;
  title: string;
  kind: string;
  created_at: string;
  course_id: string;
  courses?: DashboardCourseRef | null;
}

export interface RecentDownload {
  id: string;
  kind: "pdf" | "notes";
  file_name: string | null;
  downloaded_at: string;
  chapter_id: string;
  chapters?: {
    id: string;
    title: string;
    course_id: string;
    courses?: DashboardCourseRef | null;
  } | null;
}
