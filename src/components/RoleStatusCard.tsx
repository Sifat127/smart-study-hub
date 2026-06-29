import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, ShieldAlert, RefreshCw, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type Status = "idle" | "checking" | "match" | "mismatch" | "error";

export default function RoleStatusCard() {
  const { user, role: contextRole } = useAuth();
  const [backendRole, setBackendRole] = useState<"admin" | "user" | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  const verify = async () => {
    if (!user) return;
    setStatus("checking");
    setError(null);
    const { data, error: err } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    if (err) {
      setStatus("error");
      setError(err.message);
      return;
    }
    const roles = (data ?? []).map((r) => r.role as "admin" | "user");
    const effective: "admin" | "user" = roles.includes("admin") ? "admin" : "user";
    setBackendRole(effective);
    setCheckedAt(new Date());
    setStatus(effective === contextRole ? "match" : "mismatch");
  };

  useEffect(() => {
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const isAdmin = contextRole === "admin";
  const label = isAdmin ? "Administrator" : "Student";
  const Icon = isAdmin ? ShieldCheck : GraduationCap;

  return (
    <div className="rounded-2xl border border-border bg-card/50 p-5 md:p-6 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div
            className={`h-12 w-12 rounded-xl flex items-center justify-center border ${
              isAdmin
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-muted/40 border-border text-foreground"
            }`}
          >
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Your role</div>
            <div className="font-display text-lg font-semibold truncate">{label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Stored on the backend as <code className="font-mono">{contextRole}</code>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={verify}
            disabled={status === "checking"}
            className="rounded-xl"
          >
            {status === "checking" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            )}
            Verify with backend
          </Button>
          {status === "match" && backendRole && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Confirmed: backend role is <strong className="font-semibold">{backendRole}</strong>
            </div>
          )}
          {status === "mismatch" && backendRole && (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <ShieldAlert className="h-3.5 w-3.5" />
              Mismatch: backend says <strong className="font-semibold">{backendRole}</strong>. Sign out and back in.
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <ShieldAlert className="h-3.5 w-3.5" />
              {error ?? "Couldn't reach the backend"}
            </div>
          )}
          {checkedAt && status !== "checking" && (
            <div className="text-[10px] text-muted-foreground">
              Checked {checkedAt.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
