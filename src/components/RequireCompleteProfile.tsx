import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isProfileComplete } from "@/lib/profileCompleteness";

/**
 * Blocks protected pages until the signed-in user's profile is complete
 * (roll_number + department + batch). Anyone missing any of these fields is
 * bounced to `/complete-profile`. Admins are exempt so they aren't locked
 * out of the admin console during onboarding of the platform itself.
 */
export default function RequireCompleteProfile({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading || !user) return <>{children}</>;
  if (isAdmin) return <>{children}</>;
  if (location.pathname === "/complete-profile") return <>{children}</>;

  // profile is null until the fetch resolves — don't gate before we know.
  if (profile && !isProfileComplete(profile)) {
    return <Navigate to="/complete-profile" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
