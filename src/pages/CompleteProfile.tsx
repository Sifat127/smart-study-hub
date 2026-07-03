import { useEffect, useMemo, useRef, useState } from "react";
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
  REQUIRED_PROFILE_FIELDS,
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
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const alertRef = useRef<HTMLDivElement>(null);
  const rollRef = useRef<HTMLInputElement>(null);
  const deptTriggerRef = useRef<HTMLButtonElement>(null);
  const batchRef = useRef<HTMLInputElement>(null);
  const prevMissingRef = useRef<RequiredProfileField[] | null>(null);
  const [announcement, setAnnouncement] = useState("");

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

  // What was missing on the profile when the user landed here.
  const initiallyMissing = useMemo(
    () => missingProfileFields(profile),
    [profile],
  );

  // Announce corrections & remaining count to screen readers.
  useEffect(() => {
    const prev = prevMissingRef.current;
    prevMissingRef.current = missing;
    if (prev === null) return;
    const filled = prev.filter((f) => !missing.includes(f));
    if (filled.length === 0) return;
    const filledLabel = filled.map((f) => FIELD_LABELS[f]).join(", ");
    if (missing.length === 0) {
      setAnnouncement(`${filledLabel} filled. All required fields complete.`);
    } else {
      const remaining = missing.length === 1 ? "1 field remaining" : `${missing.length} fields remaining`;
      const remainingLabels = missing.map((f) => FIELD_LABELS[f]).join(", ");
      setAnnouncement(`${filledLabel} filled. ${remaining}: ${remainingLabels}.`);
    }
  }, [missing]);

  const focusFirstInvalid = () => {
    const first = missing[0];
    if (first === "roll_number") rollRef.current?.focus();
    else if (first === "department") deptTriggerRef.current?.focus();
    else if (first === "batch") batchRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setAttemptedSubmit(true);

    const normalizedRoll = rollNumber.trim();
    const normalizedDept = department.trim();
    const normalizedBatch = batch.trim();

    if (missing.length > 0) {
      // Move focus to the alert so screen readers announce the full list,
      // then to the first invalid input on the next tick for quick correction.
      alertRef.current?.focus();
      setTimeout(focusFirstInvalid, 50);
      toast({
        title: "Some required fields are still empty",
        description: `Please fill in: ${missing.map((f) => FIELD_LABELS[f]).join(", ")}.`,
        variant: "destructive",
      });
      return;
    }

    if (!ROLL_REGEX.test(normalizedRoll)) {
      rollRef.current?.focus();
      toast({
        title: "Invalid roll number",
        description: "Use 3–20 characters: letters, numbers or dashes only.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
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
        alertRef.current?.focus();
      } else if (/duplicate|unique|already registered/i.test(raw)) {
        msg = "This roll number is already registered.";
        rollRef.current?.focus();
      }
      toast({ title: "Could not save", description: msg, variant: "destructive" });
      return;
    }
    toast({ title: "Profile completed", description: "Welcome to DIU StudyBank!" });
    window.location.replace("/");
  };

  // The banner shows the *live* missing fields once the user has attempted to
  // submit, so corrections are reflected immediately. Before the first submit
  // attempt, it shows what was missing on load (informational).
  const bannerFields = attemptedSubmit ? missing : initiallyMissing;
  const showBanner = bannerFields.length > 0;

  const describedBy = (field: RequiredProfileField, hintId?: string) => {
    const ids: string[] = [];
    if (hintId) ids.push(hintId);
    if (attemptedSubmit && missing.includes(field)) ids.push(`${field}-error`);
    return ids.join(" ") || undefined;
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <main className="w-full max-w-md" aria-labelledby="cp-heading">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <img src={logo} alt="" className="h-11 w-11 rounded-lg object-contain" />
          <span className="font-display font-bold text-xl">DIU StudyBank</span>
        </div>
        <h1 id="cp-heading" className="font-display text-2xl font-bold mb-1">
          Complete your profile
        </h1>
        <p className="text-muted-foreground mb-6">
          Add the details below to finish setting up your DIU StudyBank account.
        </p>

        {/* Screen-reader-only live region for incremental corrections. */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          data-testid="a11y-announcer"
        >
          {announcement}
        </div>

        {showBanner && (
          <Alert
            ref={alertRef}
            variant="destructive"
            className="mb-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            // role="alert" + assertive so corrections re-announce after submit.
            role="alert"
            aria-live={attemptedSubmit ? "assertive" : "polite"}
            aria-atomic="true"
            tabIndex={-1}
          >
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>
              {bannerFields.length === 1
                ? "1 required field is missing"
                : `${bannerFields.length} required fields are missing`}
            </AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5 mt-1 space-y-0.5" data-testid="missing-fields-list">
                {bannerFields.map((f) => (
                  <li key={f}>{FIELD_LABELS[f]}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="roll">
              Student Roll Number <span aria-hidden="true" className="text-destructive">*</span>
              <span className="sr-only"> (required)</span>
            </Label>
            <div className="relative">
              <IdCard aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="roll"
                ref={rollRef}
                placeholder="e.g. 221-15-1234"
                className="pl-10 tracking-wide"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                autoComplete="off"
                maxLength={20}
                aria-required="true"
                aria-invalid={attemptedSubmit && missing.includes("roll_number")}
                aria-describedby={describedBy("roll_number", "roll-hint")}
              />
            </div>
            <p id="roll-hint" className="text-xs text-muted-foreground">
              3–20 characters, letters/numbers/dashes only.
            </p>
            {attemptedSubmit && missing.includes("roll_number") && (
              <p id="roll_number-error" className="text-xs text-destructive">
                Roll number is required.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">
              Department <span aria-hidden="true" className="text-destructive">*</span>
              <span className="sr-only"> (required)</span>
            </Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger
                id="department"
                ref={deptTriggerRef}
                aria-required="true"
                aria-invalid={attemptedSubmit && missing.includes("department")}
                aria-describedby={describedBy("department")}
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
            {attemptedSubmit && missing.includes("department") && (
              <p id="department-error" className="text-xs text-destructive">
                Department is required.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="batch">
              Batch <span aria-hidden="true" className="text-destructive">*</span>
              <span className="sr-only"> (required)</span>
            </Label>
            <Input
              id="batch"
              ref={batchRef}
              placeholder="e.g. 60th"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              maxLength={20}
              aria-required="true"
              aria-invalid={attemptedSubmit && missing.includes("batch")}
              aria-describedby={describedBy("batch")}
            />
            {attemptedSubmit && missing.includes("batch") && (
              <p id="batch-error" className="text-xs text-destructive">
                Batch is required.
              </p>
            )}
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
            className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 min-h-11"
            disabled={submitting || missing.length > 0}
            aria-describedby={missing.length > 0 ? "still-missing-live" : undefined}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" /> : null}
            Save and continue
          </Button>
        </form>

        {/* Guard against unused-import warning by referencing the required-field list length. */}
        <span className="sr-only">{REQUIRED_PROFILE_FIELDS.length} required fields.</span>
      </main>
    </div>
  );
}
