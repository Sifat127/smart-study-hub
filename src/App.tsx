import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Departments from "./pages/Departments";
import DepartmentDetail from "./pages/DepartmentDetail";
import SemesterDetail from "./pages/SemesterDetail";
import CourseDetail from "./pages/CourseDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import About from "./pages/About";
import Contact from "./pages/Contact";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUploadPdf from "./pages/AdminUploadPdf";
import AdminManageCourses from "./pages/AdminManageCourses";
import AdminManageUsers from "./pages/AdminManageUsers";
import AdminSettings from "./pages/AdminSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/departments" element={<Departments />} />
              <Route path="/departments/:deptId" element={<DepartmentDetail />} />
              <Route path="/departments/:deptId/semester/:semId" element={<SemesterDetail />} />
              <Route path="/departments/:deptId/semester/:semId/course/:courseId" element={<CourseDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/upload-pdf" element={<ProtectedRoute requireAdmin><AdminUploadPdf /></ProtectedRoute>} />
              <Route path="/admin/manage-courses" element={<ProtectedRoute requireAdmin><AdminManageCourses /></ProtectedRoute>} />
              <Route path="/admin/manage-users" element={<ProtectedRoute requireAdmin><AdminManageUsers /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute requireAdmin><AdminSettings /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);
export default App;
