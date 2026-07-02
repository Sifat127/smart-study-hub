import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Handles the redirect from Supabase auth emails (signup verification,
 * magic link, invite, email change). Supabase appends either a
 * `?code=...` (PKCE) or a `#access_token=...` fragment. The JS client
 * auto-detects the fragment; the code flow needs an explicit exchange.
 * Once a session exists we route the user to the right in-app page.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState("Verifying your account…");

  useEffect(() => {
    let cancelled = false;

    const finish = (path: string, title: string, description?: string) => {
      if (cancelled) return;
      setStatus("ok");
      setMessage(title);
      toast({ title, description });
      // Clean the URL so tokens don't linger, then send the user in.
      window.history.replaceState({}, "", "/auth/callback");
      setTimeout(() => navigate(path, { replace: true }), 400);
    };

    const fail = (title: string, description: string, redirectTo = "/login") => {
      if (cancelled) return;
      setStatus("error");
      setMessage(title);
      toast({ title, description, variant: "destructive" });
      setTimeout(() => navigate(redirectTo, { replace: true }), 1500);
    };

    (async () => {
      const search = new URLSearchParams(location.search);
      const hash = location.hash.startsWith("#")
        ? location.hash.slice(1)
        : location.hash;
      const hashParams = new URLSearchParams(hash);
      const errParam =
        search.get("error_description") || hashParams.get("error_description");
      if (errParam) {
        fail("Verification failed", decodeURIComponent(errParam));
        return;
      }

      const code = search.get("code");
      const type = search.get("type") || hashParams.get("type") || "";

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            fail("Could not verify link", error.message);
            return;
          }
        } else {
          // Give the JS client a tick to parse the URL fragment session.
          await new Promise((r) => setTimeout(r, 150));
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          fail(
            "Link expired or already used",
            "Please sign in to continue.",
            "/login",
          );
          return;
        }

        if (type === "recovery") {
          finish("/reset-password", "Verified — set a new password");
          return;
        }

        // New signup or magic link: check role + profile completeness.
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);
        const isAdmin = roles?.some((r) => r.role === "admin");

        if (isAdmin) {
          finish("/admin", "Welcome back, admin!");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("department, batch, section")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!profile?.department || !profile?.batch) {
          finish("/complete-profile", "Email verified", "Finish your profile to get started.");
        } else {
          finish("/dashboard", "Email verified", "Welcome to DIU StudyBank!");
        }
      } catch (err) {
        fail(
          "Something went wrong",
          err instanceof Error ? err.message : "Please try signing in again.",
        );
      }
    })();

    return () => { cancelled = true; };
  }, [navigate, toast, location.search, location.hash]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md w-full text-center space-y-5 rounded-2xl border bg-card p-8 shadow-sm">
        {status === "working" && (
          <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
        )}
        {status === "ok" && (
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
        )}
        {status === "error" && (
          <AlertTriangle className="w-10 h-10 mx-auto text-destructive" />
        )}
        <h1 className="text-xl font-semibold">{message}</h1>
        <p className="text-sm text-muted-foreground">
          {status === "working"
            ? "Hang tight while we finish signing you in."
            : status === "ok"
              ? "Redirecting you now…"
              : "Taking you back to the login page."}
        </p>
      </div>
    </div>
  );
}
