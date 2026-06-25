import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { lovable } from "@/integrations/lovable";

interface Props {
  label?: string;
}

export default function GoogleAuthButton({ label = "Continue with Google" }: Props) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleClick = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
        extraParams: {
          hd: "diu.edu.bd",
          prompt: "select_account",
        },
      });

      if (result.error) {
        const msg = String(result.error?.message || result.error);
        const friendly = /diu\.edu\.bd/i.test(msg)
          ? "Only @diu.edu.bd Google accounts are allowed."
          : msg;
        toast({ title: "Google sign-in failed", description: friendly, variant: "destructive" });
        setLoading(false);
        return;
      }

      if (result.redirected) return; // browser will redirect away
      // Session set in-place (popup flow) — AuthProvider listener will pick it up.
      setLoading(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unexpected error";
      toast({ title: "Google sign-in failed", description: msg, variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full border-white/10 bg-white/[0.02] hover:bg-white/[0.06] rounded-xl font-medium"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.74-6-6.1S8.7 6 12 6c1.88 0 3.14.8 3.86 1.49l2.63-2.54C16.85 3.46 14.62 2.5 12 2.5 6.76 2.5 2.5 6.76 2.5 12S6.76 21.5 12 21.5c6.92 0 9.5-4.86 9.5-7.4 0-.5-.05-.88-.13-1.27H12z"/>
          <path fill="#4285F4" d="M21.37 12.83c0-.5-.05-.88-.13-1.27H12v3.94h5.5c-.22 1.27-1.4 3.72-5.5 3.72v.01c3.95 0 6.94-2.6 7.78-6.4z" opacity=".0"/>
        </svg>
      )}
      {label}
    </Button>
  );
}
