import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const initialEmail = useMemo(() => (params.get("email") || "").trim().toLowerCase(), [params]);
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const startCooldown = (seconds = RESEND_COOLDOWN_SECONDS) => {
    setCooldown(seconds);
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (intervalRef.current) window.clearInterval(intervalRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    // Start an initial cooldown so the user doesn't spam resend right after signup.
    startCooldown(30);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      toast({ title: "Enter your DIU email", variant: "destructive" });
      return;
    }
    if (code.length !== 6) {
      toast({ title: "Enter the 6-digit code", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: code,
      type: "email",
    });
    setSubmitting(false);
    if (error) {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    // Sign the user out so they explicitly log in once verified.
    await supabase.auth.signOut();
    toast({
      title: "Email verified",
      description: "Your account is active. Please log in.",
    });
    navigate("/login");
  };

  const handleResend = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      toast({ title: "Enter your DIU email", variant: "destructive" });
      return;
    }
    if (cooldown > 0) return;
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: trimmedEmail });
    setResending(false);
    if (error) {
      toast({
        title: "Couldn't resend code",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Code resent", description: `New code sent to ${trimmedEmail}.` });
    startCooldown();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[15%] left-[10%] w-[420px] h-[420px] bg-primary/5 rounded-full blur-[180px]" />
        <div className="absolute bottom-[10%] right-[5%] w-[480px] h-[480px] bg-accent/5 rounded-full blur-[200px]" />
      </div>

      <div className="w-full max-w-md relative z-10 glass-strong rounded-3xl p-8 md:p-10 shadow-elevated">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <img src={logo} alt="DIU StudyBank" className="h-11 w-11 rounded-lg object-contain" />
          <span className="font-display font-bold text-xl">DIU StudyBank</span>
        </div>

        <div className="flex items-center justify-center mb-4">
          <div className="h-14 w-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center shadow-glow">
            <ShieldCheck className="h-7 w-7 text-accent" aria-hidden="true" />
          </div>
        </div>

        <h1 className="font-display text-2xl font-bold text-center mb-2">Verify your email</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Enter the 6-digit code we sent to{" "}
          <span className="font-semibold text-foreground break-all">{email || "your DIU email"}</span>.
        </p>

        <form className="space-y-5" onSubmit={handleVerify}>
          {!initialEmail && (
            <div className="space-y-2">
              <Label htmlFor="email">DIU Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  className="pl-10"
                  placeholder="you@diu.edu.bd"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="otp" className="sr-only">
              6-digit verification code
            </Label>
            <div className="flex justify-center">
              <InputOTP
                id="otp"
                maxLength={6}
                value={code}
                onChange={(v) => setCode(v.replace(/\D/g, ""))}
                inputMode="numeric"
                pattern="\d*"
                aria-label="6-digit verification code"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 btn-glow"
            disabled={submitting || code.length !== 6}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Verify Account
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Didn't get the code?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="text-primary font-semibold hover:underline disabled:opacity-60 disabled:no-underline disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            {resending
              ? "Sending..."
              : cooldown > 0
              ? `Resend in ${cooldown}s`
              : "Resend code"}
          </button>
        </div>

        <p className="text-center mt-6 text-sm">
          <Link to="/login" className="text-muted-foreground hover:text-foreground">
            ← Back to Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
