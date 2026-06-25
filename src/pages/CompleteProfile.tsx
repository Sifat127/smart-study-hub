import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IdCard, Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ROLL_REGEX = /^[A-Za-z0-9-]{3,20}$/;

export default function CompleteProfile() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rollNumber, setRollNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
    if (!loading && profile?.roll_number) navigate("/", { replace: true });
  }, [loading, user, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = rollNumber.trim();
    if (!ROLL_REGEX.test(normalized)) {
      toast({
        title: "Invalid roll number",
        description: "Use 3–20 characters: letters, numbers or dashes only.",
        variant: "destructive",
      });
      return;
    }
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("profiles")
      .update({ roll_number: normalized })
      .eq("user_id", user.id);
    setSubmitting(false);
    if (error) {
      const msg = /duplicate|unique/i.test(error.message)
        ? "This roll number is already registered."
        : error.message;
      toast({ title: "Could not save", description: msg, variant: "destructive" });
      return;
    }
    toast({ title: "Profile completed", description: "Welcome to DIU StudyBank!" });
    // Force a refresh so AuthContext re-fetches the profile.
    window.location.replace("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <img src={logo} alt="DIU StudyBank" className="h-11 w-11 rounded-lg object-contain" />
          <span className="font-display font-bold text-xl">DIU StudyBank</span>
        </div>
        <h1 className="font-display text-2xl font-bold mb-1">One last step</h1>
        <p className="text-muted-foreground mb-8">Enter your DIU student roll number to finish setting up your account.</p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="roll">Student Roll Number</Label>
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
              />
            </div>
            <p className="text-xs text-muted-foreground">3–20 characters, letters/numbers/dashes only.</p>
          </div>
          <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save and continue
          </Button>
        </form>
      </div>
    </div>
  );
}
