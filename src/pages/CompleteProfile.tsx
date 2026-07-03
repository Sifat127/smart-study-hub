import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, IdCard, Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useDepartments } from "@/hooks/useDepartments";
import {
  isProfileComplete,
  missingProfileFields,
  type RequiredProfileField,
} from "@/lib/profileCompleteness";

const ROLL_REGEX = /^[A-Za-z0-9-]{3,20}$/;

const FIELD_LABELS: Record<RequiredProfileField, string> = {
  roll_number: "Student roll number",
  department: "Department",
  batch: "Batch",
};

export default function CompleteProfile() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const departments = useDepartments();

  const [rollNumber, setRollNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [batch, setBatch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Prefill from existing profile so users only fill what's actually missing.
  useEffect(() => {
    if (profile) {
      setRollNumber(profile.roll_number ?? "");
      setDepartment(profile.department ?? "");
      setBatch(profile.batch ?? "");
    }
  }, [profile]);

  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
    if (!loading && isProfileComplete(profile)) navigate("/", { replace: true });
  }, [loading, user, profile, navigate]);

  // Live list of what's still missing, based on the current form values.
  const missing = useMemo(
    () => missingProfileFields({ roll_number: rollNumber, department, batch }),
    [rollNumber, department, batch],
  );

  // What was missing on the profile when the user landed here — used for the
  // intro banner so they know exactly what to fill in.
  const initiallyMissing = useMemo(
    () => missingProfileFields(profile),
    [profile],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const normalizedRoll = rollNumber.trim();
    const normalizedDept = department.trim();
    const normalizedBatch = batch.trim();

    if (missing.length > 0) {
      toast({
        title: "Some required fields are still empty",
        description: `Please fill in: ${missing.map((f) => FIELD_LABELS[f]).join(", ")}.`,
        variant: "destructive",
      });
      return;
    }

    if (!ROLL_REGEX.test(normalizedRoll)) {
      toast({
        title: "Invalid roll number",
        description: "Use 3–20 characters: letters, numbers or dashes only.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    // Server-side validation lives in the `complete_profile` RPC — even if a
    // caller bypasses the disabled button (devtools, direct API call), the
    // database rejects missing/blank roll_number, department, or batch.
    const { error } = await supabase.rpc("complete_profile", {
      _roll_number: normalizedRoll,
      _department: normalizedDept,
      _batch: normalizedBatch,
    });
    setSubmitting(false);

    if (error) {
      const raw = error.message || "";
      let msg = raw;
      if (/Missing required fields/i.test(raw)) {
        const hint = (error as { hint?: string }).hint;
        const fields = (hint || raw.split(":")[1] || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((f) => FIELD_LABELS[f as RequiredProfileField] ?? f)
          .join(", ");
        msg = `Server rejected the request. Missing: ${fields}.`;
      } else if (/duplicate|unique|already registered/i.test(raw)) {
        msg = "This roll number is already registered.";
      }
      toast({ title: "Could not save", description: msg, variant: "destructive" });
      return;
    }
    toast({ title: "Profile completed", description: "Welcome to DIU StudyBank!" });
    window.location.replace("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <img src={logo} alt="DIU StudyBank" className="h-11 w-11 rounded-lg object-contain" />
          <span className="font-display font-bold text-xl">DIU StudyBank</span>
        </div>
        <h1 className="font-display text-2xl font-bold mb-1">Complete your profile</h1>
        <p className="text-muted-foreground mb-6">
          Add the details below to finish setting up your DIU StudyBank account.
        </p>

        {initiallyMissing.length > 0 && (
          <Alert variant="destructive" className="mb-6" role="status" aria-live="polite">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              {initiallyMissing.length === 1
                ? "1 required field is missing"
                : `${initiallyMissing.length} required fields are missing`}
            </AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5 mt-1 space-y-0.5" data-testid="missing-fields-list">
                {initiallyMissing.map((f) => (
                  <li key={f}>{FIELD_LABELS[f]}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="roll">
              Student Roll Number <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="roll"
                placeholder="e.g. 221-15-1234"
                className="pl-10 tracking-wide"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                autoComplete="off"
                maxLength={20}
                autoFocus
                aria-invalid={missing.includes("roll_number")}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              3–20 characters, letters/numbers/dashes only.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">
              Department <span className="text-destructive">*</span>
            </Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger
                id="department"
                aria-invalid={missing.includes("department")}
              >
                <SelectValue placeholder="Select your department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.fullName}>
                    {d.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="batch">
              Batch <span className="text-destructive">*</span>
            </Label>
            <Input
              id="batch"
              placeholder="e.g. 60th"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              maxLength={20}
              aria-invalid={missing.includes("batch")}
            />
          </div>

          {missing.length > 0 && (
            <p
              className="text-xs text-muted-foreground"
              role="status"
              aria-live="polite"
              data-testid="still-missing-hint"
            >
              Still needed: {missing.map((f) => FIELD_LABELS[f]).join(", ")}.
            </p>
          )}

          <Button
            type="submit"
            className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90"
            disabled={submitting || missing.length > 0}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save and continue
          </Button>
        </form>
      </div>
    </div>
  );
}
