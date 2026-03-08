export interface Department {
  id: string;
  name: string;
  fullName: string;
  description: string;
  icon: string;
  totalCourses: number;
}

export interface Semester {
  id: number;
  name: string;
  courses: Course[];
}

export interface Course {
  id: string;
  name: string;
  code: string;
  description: string;
  chapters: Chapter[];
}

export interface Chapter {
  id: string;
  title: string;
  description: string;
  pdfName: string;
  pdfUrl: string;
  uploadedAt: string;
}

export const departments: Department[] = [
  {
    id: "cse",
    name: "CSE",
    fullName: "Computer Science & Engineering",
    description: "Explore courses in programming, algorithms, data structures, AI, networking and more.",
    icon: "Monitor",
    totalCourses: 55,
  },
  {
    id: "eee",
    name: "EEE",
    fullName: "Electrical & Electronic Engineering",
    description: "Study circuits, power systems, electronics, signal processing and control systems.",
    icon: "Zap",
    totalCourses: 52,
  },
  {
    id: "bba",
    name: "BBA",
    fullName: "Bachelor of Business Administration",
    description: "Learn management, marketing, finance, accounting and business strategy.",
    icon: "Briefcase",
    totalCourses: 48,
  },
];

const sampleChapters: Chapter[] = [
  {
    id: "ch1",
    title: "Chapter 1: Introduction",
    description: "An overview of the fundamental concepts and course objectives. This chapter covers the basic terminology and foundational ideas.",
    pdfName: "chapter-1-introduction.pdf",
    pdfUrl: "#",
    uploadedAt: "2025-12-15",
  },
  {
    id: "ch2",
    title: "Chapter 2: Core Concepts",
    description: "Deep dive into the core principles and theories that form the backbone of this subject area.",
    pdfName: "chapter-2-core-concepts.pdf",
    pdfUrl: "#",
    uploadedAt: "2025-12-20",
  },
  {
    id: "ch3",
    title: "Chapter 3: Applications",
    description: "Practical applications and real-world examples demonstrating how the concepts are used in industry.",
    pdfName: "chapter-3-applications.pdf",
    pdfUrl: "#",
    uploadedAt: "2026-01-05",
  },
  {
    id: "ch4",
    title: "Chapter 4: Advanced Topics",
    description: "Explores advanced theories, research directions, and cutting-edge developments in the field.",
    pdfName: "chapter-4-advanced-topics.pdf",
    pdfUrl: "#",
    uploadedAt: "2026-01-15",
  },
];

const cseCourses: Record<number, Course[]> = {
  1: [
    { id: "cse101", name: "Introduction to Computer Science", code: "CSE 101", description: "Basics of computing, algorithms, and problem-solving.", chapters: sampleChapters },
    { id: "cse102", name: "Programming Fundamentals", code: "CSE 102", description: "Learn C programming from scratch with hands-on projects.", chapters: sampleChapters },
    { id: "cse103", name: "Discrete Mathematics", code: "CSE 103", description: "Logic, sets, relations, and graph theory for CS.", chapters: sampleChapters },
    { id: "cse104", name: "Physics for Engineers", code: "PHY 101", description: "Mechanics, waves, and thermodynamics.", chapters: sampleChapters },
  ],
  2: [
    { id: "cse201", name: "Object-Oriented Programming", code: "CSE 201", description: "OOP concepts using Java.", chapters: sampleChapters },
    { id: "cse202", name: "Data Structures", code: "CSE 202", description: "Arrays, linked lists, trees, and graphs.", chapters: sampleChapters },
    { id: "cse203", name: "Digital Logic Design", code: "CSE 203", description: "Boolean algebra, gates, and combinational circuits.", chapters: sampleChapters },
    { id: "cse204", name: "Calculus II", code: "MAT 201", description: "Integrals, series, and multivariable calculus.", chapters: sampleChapters },
  ],
  3: [
    { id: "cse301", name: "Algorithms", code: "CSE 301", description: "Sorting, searching, dynamic programming, and greedy algorithms.", chapters: sampleChapters },
    { id: "cse302", name: "Database Systems", code: "CSE 302", description: "SQL, normalization, and database design.", chapters: sampleChapters },
    { id: "cse303", name: "Computer Architecture", code: "CSE 303", description: "CPU design, memory hierarchy, and pipelining.", chapters: sampleChapters },
    { id: "cse304", name: "Statistics & Probability", code: "STA 301", description: "Probability distributions and statistical inference.", chapters: sampleChapters },
  ],
};

export function getSemesters(departmentId: string): Semester[] {
  return Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    name: `Semester ${i + 1}`,
    courses: cseCourses[i + 1] || [
      { id: `${departmentId}-s${i+1}-c1`, name: "Course 1", code: `${departmentId.toUpperCase()} ${(i+1)*100+1}`, description: "Course description coming soon.", chapters: sampleChapters },
      { id: `${departmentId}-s${i+1}-c2`, name: "Course 2", code: `${departmentId.toUpperCase()} ${(i+1)*100+2}`, description: "Course description coming soon.", chapters: sampleChapters },
      { id: `${departmentId}-s${i+1}-c3`, name: "Course 3", code: `${departmentId.toUpperCase()} ${(i+1)*100+3}`, description: "Course description coming soon.", chapters: sampleChapters },
      { id: `${departmentId}-s${i+1}-c4`, name: "Course 4", code: `${departmentId.toUpperCase()} ${(i+1)*100+4}`, description: "Course description coming soon.", chapters: sampleChapters },
    ],
  }));
}

export function getCourse(courseId: string): Course | undefined {
  for (const courses of Object.values(cseCourses)) {
    const found = courses.find(c => c.id === courseId);
    if (found) return found;
  }
  // fallback
  return {
    id: courseId,
    name: "Sample Course",
    code: "XXX 000",
    description: "Course materials and chapters.",
    chapters: sampleChapters,
  };
}

export const recentPDFs = [
  { title: "Data Structures - Chapter 3", department: "CSE", semester: 2, date: "2026-03-01" },
  { title: "Circuit Analysis - Chapter 5", department: "EEE", semester: 3, date: "2026-02-28" },
  { title: "Marketing Management - Chapter 2", department: "BBA", semester: 4, date: "2026-02-27" },
  { title: "Algorithms - Chapter 1", department: "CSE", semester: 3, date: "2026-02-25" },
  { title: "Power Systems - Chapter 4", department: "EEE", semester: 5, date: "2026-02-24" },
  { title: "Financial Accounting - Chapter 6", department: "BBA", semester: 2, date: "2026-02-23" },
];
