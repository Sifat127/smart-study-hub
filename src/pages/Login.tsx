import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Loader2, FileText } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signIn, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) {
      toast({ title: "Login failed", description: error, variant: "destructive" });
    } else {
      toast({ title: "Welcome back!" });
      // Small delay so role is fetched before redirect
      setTimeout(() => {
        // Re-read isAdmin won't work here since state updates async.
        // We'll let the onAuthStateChange + a useEffect in App handle redirect.
        navigate("/");
      }, 300);
    }
  };

  return (
    <div className="min-h-screen flex relative">
      {/* Background animation */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] bg-primary/4 rounded-full blur-[180px]" />
        <div className="absolute top-[40%] right-[5%] w-[500px] h-[500px] bg-accent/4 rounded-full blur-[200px]" />
        <div className="absolute bottom-[10%] left-[30%] w-[350px] h-[350px] bg-primary/3 rounded-full blur-[160px]" />
        <div className="absolute hidden md:flex animate-float opacity-[0.35]" style={{ left: "92%", top: "15%", ["--float-rotate" as string]: "12deg", transform: "rotate(12deg)" }}>
          <div className="h-14 w-10 rounded-lg bg-muted/60 border border-border/40 backdrop-blur-sm flex items-center justify-center">
            <FileText className="h-1/2 w-1/2 text-muted-foreground/30" />
          </div>
        </div>
        <div className="absolute hidden md:flex animate-float-delayed opacity-[0.35]" style={{ left: "85%", top: "70%", ["--float-rotate" as string]: "-8deg", transform: "rotate(-8deg)" }}>
          <div className="h-12 w-9 rounded-lg bg-muted/60 border border-border/40 backdrop-blur-sm flex items-center justify-center">
            <FileText className="h-1/2 w-1/2 text-muted-foreground/30" />
          </div>
        </div>
      </div>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero text-primary-foreground items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-cyan rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 p-12 max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <img src={logo} alt="DIU StudyBank" className="h-12 w-12 rounded-lg object-contain" />
            <span className="font-display font-bold text-2xl">DIU StudyBank</span>
          </div>
          <h2 className="font-display text-3xl font-bold mb-4">Welcome Back!</h2>
          <p className="text-primary-foreground/70">
            Access your department course materials, download PDFs, and stay organized with DIU StudyBank.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <img src={logo} alt="DIU StudyBank" className="h-9 w-9 rounded-lg object-contain" />
            <span className="font-display font-bold text-xl">DIU StudyBank</span>
          </div>

          <h1 className="font-display text-2xl font-bold mb-1">Log In</h1>
          <p className="text-muted-foreground mb-8">Enter your credentials to continue</p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@example.com" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type={showPass ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" />
                <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">Remember me</Label>
              </div>
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</Link>
            </div>

            <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Log In
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline">Sign Up</Link>
          </p>
          <p className="text-center mt-4">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to Home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
