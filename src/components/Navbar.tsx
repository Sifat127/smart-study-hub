import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogIn, UserPlus, LogOut, LayoutDashboard, Sun, Moon, User as UserIcon } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Departments", to: "/departments" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut, profile } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-2xl bg-background/80 border-b border-border dark:bg-background/60 dark:border-white/[0.06]">

      {/* Aurora top edge glow */}
      <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

      <div className="container mx-auto flex items-center justify-between h-14 md:h-16 px-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <div className="absolute inset-0 bg-accent/30 blur-md rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
            <img src={logo} alt="DIU StudyBank" className="relative h-9 w-9 md:h-10 md:w-10 rounded-lg object-contain" />
          </div>
          <span className="font-display font-bold text-base md:text-lg text-foreground tracking-tight">
            DIU <span className="text-gradient">StudyBank</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-white/5 dark:bg-white/[0.06] border border-white/10 rounded-xl shadow-[0_0_20px_-4px_hsl(var(--accent)/0.4)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground border border-transparent hover:border-white/10"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {user ? (
            <>
              {isAdmin && (
                <Button variant="ghost" size="sm" className="rounded-xl" asChild>
                  <Link to="/admin"><LayoutDashboard className="h-4 w-4 mr-1.5" /> Dashboard</Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" className="rounded-xl" asChild>
                <Link to="/profile">
                  <UserIcon className="h-4 w-4 mr-1.5" />
                  <span className="max-w-[140px] truncate">{profile?.full_name || user.email}</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl border-white/10" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1.5" /> Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="rounded-xl" asChild>
                <Link to="/login"><LogIn className="h-4 w-4 mr-1.5" /> Login</Link>
              </Button>
              <Button size="sm" className="bg-gradient-primary text-primary-foreground btn-glow rounded-xl font-semibold" asChild>
                <Link to="/signup"><UserPlus className="h-4 w-4 mr-1.5" /> Sign Up</Link>
              </Button>
            </>
          )}
        </div>

        <div className="md:hidden flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors text-muted-foreground"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            className="p-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-white/[0.06] bg-background/90 backdrop-blur-2xl"
          >
            <div className="p-4 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    location.pathname === link.to
                      ? "bg-white/5 text-foreground border border-white/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex gap-2 mt-3 pt-3 border-t border-white/[0.06]">
                {user ? (
                  <>
                    {isAdmin && (
                      <Button variant="outline" size="sm" className="flex-1 rounded-xl border-white/10" asChild>
                        <Link to="/admin" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="flex-1 rounded-xl border-white/10" asChild>
                      <Link to="/profile" onClick={() => setMobileOpen(false)}>Profile</Link>
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 rounded-xl border-white/10" onClick={() => { handleSignOut(); setMobileOpen(false); }}>
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" className="flex-1 rounded-xl border-white/10" asChild>
                      <Link to="/login" onClick={() => setMobileOpen(false)}>Login</Link>
                    </Button>
                    <Button size="sm" className="flex-1 bg-gradient-primary text-primary-foreground rounded-xl" asChild>
                      <Link to="/signup" onClick={() => setMobileOpen(false)}>Sign Up</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
