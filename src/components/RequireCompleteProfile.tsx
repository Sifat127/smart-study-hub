import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function RequireCompleteProfile({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading || !user) return <>{children}</>;
  // Only gate once we've actually loaded the profile row.
  if (profile && !profile.roll_number && location.pathname !== "/complete-profile") {
    return <Navigate to="/complete-profile" replace />;
  }
  return <>{children}</>;
}
