import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, BookOpen, Layers, FileText, Shield, Users, Download, Monitor, Zap, Briefcase, ArrowRight, Clock, Loader2, Sparkles, GraduationCap, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import TypewriterText from "@/components/TypewriterText";
import CountUpNumber from "@/components/CountUpNumber";
import { departments, recentPDFs } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";

interface SearchResult {
  id: string;
  code: string;
  name: string;
  department: string;
  semester: number;
}

const deptIcons: Record<string, React.ElementType> = { Monitor, Zap, Briefcase };

const features = [
  { icon: Layers, title: "Organized by Department", desc: "Browse materials across 15+ departments." },
  { icon: BookOpen, title: "Semester-wise Navigation", desc: "Navigate through all 12 semesters seamlessly." },
  { icon: FileText, title: "Chapter-wise PDFs", desc: "Access course materials chapter by chapter." },
  { icon: Shield, title: "Secure Login", desc: "Role-based access for admins and students." },
  { icon: Users, title: "Admin Management", desc: "Admins can upload, edit, and manage all content." },
  { icon: Download, title: "Direct Download", desc: "Download any PDF with a single click." },
];

const stats = [
  { icon: FolderOpen, value: 15, label: "Departments" },
  { icon: BookOpen, value: 330, label: "Courses" },
  { icon: FileText, value: 500, label: "PDFs Shared" },
];

const floatingElements = [
  { x: "8%", y: "18%", rotate: -12, size: "h-10 w-7 md:h-16 md:w-12", delay: 0, className: "animate-float" },
  { x: "85%", y: "22%", rotate: 15, size: "h-12 w-9 md:h-20 md:w-14", delay: 0, className: "animate-float-delayed" },
  { x: "12%", y: "65%", rotate: 8, size: "h-9 w-7 md:h-14 md:w-10", delay: 0, className: "animate-float-slow" },
  { x: "88%", y: "70%", rotate: -20, size: "h-8 w-6 md:h-12 md:w-9", delay: 0, className: "animate-float" },
  { x: "50%", y: "85%", rotate: 5, size: "h-8 w-6 md:h-10 md:w-8", delay: 0, className: "animate-float-delayed" },
];

export default function Index() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        setShowResults(false);
        return;
      }
      setSearching(true);
      const { data } = await supabase
        .from("courses")
        .select("id, code, name, department, semester")
        .or(`name.ilike.%${query}%,code.ilike.%${query}%`)
        .limit(8);
      setResults(data || []);
      setShowResults(true);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleResultClick = (r: SearchResult) => {
    setShowResults(false);
    setQuery("");
    navigate(`/departments/${r.department.toLowerCase()}/semester/${r.semester}/course/${r.id}`);
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden min-h-[88vh] md:min-h-[92vh] flex items-center">
        {/* Aurora layer */}
        <div className="absolute inset-0 bg-gradient-hero opacity-95" />
        <div className="absolute inset-0 hidden md:block">
          <div className="aurora-orb animate-aurora-1 top-[-15%] left-[-5%] w-[55%] h-[70%] bg-[hsl(220_95%_55%/0.28)]" />
          <div className="aurora-orb animate-aurora-2 bottom-[-25%] right-[-10%] w-[60%] h-[80%] bg-[hsl(280_85%_60%/0.22)]" />
          <div className="aurora-orb animate-aurora-3 top-[20%] right-[15%] w-[35%] h-[40%] bg-[hsl(170_90%_50%/0.16)]" />
        </div>
        <div className="noise hidden md:block" />

        {/* Floating PDF elements */}
        {floatingElements.map((el, i) => (
          <div
            key={i}
            className={`absolute hidden md:flex ${el.className} opacity-60`}
            style={{
              left: el.x,
              top: el.y,
              ["--float-rotate" as string]: `${el.rotate}deg`,
              transform: `rotate(${el.rotate}deg)`,
            }}
          >
            <div className={`${el.size} rounded-2xl glass shadow-elevated flex items-center justify-center`}>
              <FileText className="h-1/2 w-1/2 text-white/30" />
            </div>
          </div>
        ))}

        <div className="container mx-auto px-5 py-16 md:py-24 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 glass-strong rounded-full px-4 py-1.5 mb-6 md:mb-8 text-xs md:text-sm font-medium text-accent shadow-glow">
              <Sparkles className="h-3.5 w-3.5" />
              Over 10,000+ course materials shared
            </div>

            {/* Heading */}
            <h1 className="font-display text-[1.85rem] sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.05] mb-4 md:mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/50">
              Your Complete Academic{" "}
              <span className="block mt-2 text-gradient">
                <TypewriterText phrases={["Knowledge Hub", "Resource Center", "Study Platform"]} />
              </span>
            </h1>

            <p className="text-sm md:text-lg text-white/55 mb-8 md:mb-10 max-w-xl mx-auto leading-relaxed px-2">
              DIU StudyBank helps students easily explore, view, and download course materials — organized by department, semester, course, and chapter.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8 md:mb-10">
              <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-95 btn-glow font-semibold px-7 md:px-9 h-11 md:h-12 text-sm md:text-base rounded-2xl" asChild>
                <Link to="/departments">
                  Explore Departments <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" className="text-white/80 hover:text-white hover:bg-white/5 border border-white/10 font-semibold h-11 md:h-12 text-sm md:text-base rounded-2xl" asChild>
                <Link to="/signup">Get Started Free</Link>
              </Button>
            </div>

            {/* Search bar */}
            <div className="max-w-xl mx-auto relative mb-10 md:mb-14" ref={searchRef}>
              <div className="relative group">
                <div className="absolute -inset-px bg-gradient-primary rounded-2xl opacity-30 blur-sm group-focus-within:opacity-60 transition-opacity" />
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40 z-10" />
                  {searching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-white/50 z-10" />}
                  <Input
                    placeholder="Search courses by name or code..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => results.length > 0 && setShowResults(true)}
                    className="pl-12 h-13 bg-background/40 backdrop-blur-xl border-white/10 text-white placeholder:text-white/40 rounded-2xl focus-visible:ring-accent/50 text-base"
                  />
                </div>
              </div>
              {showResults && (
                  <div className="absolute top-full mt-2 w-full glass-strong rounded-2xl shadow-elevated overflow-hidden z-50">
                    {results.length > 0 ? results.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleResultClick(r)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                      >
                        <BookOpen className="h-4 w-4 text-accent flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{r.code} — {r.name}</p>
                          <p className="text-xs text-muted-foreground">{r.department} • Semester {r.semester}</p>
                        </div>
                      </button>
                    )) : (
                      <div className="px-4 py-3 text-sm text-muted-foreground text-center">কোনো কোর্স পাওয়া যায়নি</div>
                    )}
                  </div>
                )}
            </div>

            {/* Stats Bento */}
            <div className="grid grid-cols-3 gap-3 md:gap-4 max-w-2xl mx-auto">
              {stats.map((stat, i) => (
                <div key={i} className="glass rounded-2xl p-4 md:p-5 card-lift text-left">
                  <div className="flex items-center gap-2 md:gap-3 mb-2">
                    <div className="h-8 w-8 md:h-9 md:w-9 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center">
                      <stat.icon className="h-4 w-4 md:h-4.5 md:w-4.5 text-accent" />
                    </div>
                  </div>
                  <p className="text-xl md:text-3xl font-bold text-foreground tracking-tight"><CountUpNumber end={stat.value} suffix="+" duration={2000} /></p>
                  <p className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* Departments */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="font-display text-2xl md:text-4xl font-bold mb-2 md:mb-3">Browse by Department</h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-lg mx-auto">Choose your department to access semester-wise course materials and chapter PDFs.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {departments.filter(d => ["cse", "eee", "swe"].includes(d.id)).map((dept, i) => {
              const Icon = deptIcons[dept.icon] || Monitor;
              return (
                <div
                  key={dept.id}
                >
                  <Link
                    to={`/departments/${dept.id}`}
                    className="group relative block glass rounded-3xl p-5 md:p-7 card-lift overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/0 via-accent/0 to-accent/0 group-hover:from-accent/5 group-hover:via-transparent group-hover:to-primary/5 transition-all duration-500 rounded-2xl" />
                    <div className="relative z-10">
                      <div className="h-12 w-12 md:h-16 md:w-16 rounded-xl md:rounded-2xl bg-gradient-primary flex items-center justify-center mb-4 md:mb-5">
                        <Icon className="h-6 w-6 md:h-8 md:w-8 text-primary-foreground" />
                      </div>
                      <h3 className="font-display text-xl font-bold mb-1 group-hover:text-accent transition-colors duration-300">{dept.name}</h3>
                      <p className="text-sm text-muted-foreground mb-1">{dept.fullName}</p>
                      <p className="text-sm text-muted-foreground mb-4">{dept.description}</p>
                      <div className="flex items-center text-primary font-semibold text-sm group-hover:text-accent transition-colors duration-300">
                        Explore <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-2 transition-transform duration-300" />
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
          <div className="text-center mt-8">
            <Button variant="outline" size="lg" className="rounded-2xl border-white/10 glass" asChild>
              <Link to="/departments">View All Departments <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 md:py-20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="font-display text-2xl md:text-4xl font-bold mb-2 md:mb-3">Why Choose DIU StudyBank?</h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-lg mx-auto">Everything you need for organized, accessible academic resources.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group relative glass rounded-3xl p-5 md:p-6 card-lift overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-accent/0 via-accent/0 to-accent/0 group-hover:from-accent/5 group-hover:via-transparent group-hover:to-primary/5 transition-all duration-500 rounded-2xl" />
                <div className="relative z-10">
                  <div className="h-12 w-12 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center mb-4 shadow-glow">
                    <f.icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="font-display font-semibold text-base md:text-lg mb-1 md:mb-2 group-hover:text-accent transition-colors duration-300">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Materials */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="font-display text-2xl md:text-4xl font-bold mb-2 md:mb-3">Recently Uploaded</h2>
            <p className="text-sm md:text-base text-muted-foreground">Stay updated with the latest course materials.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {recentPDFs.map((pdf, i) => (
              <div
                key={i}
                className="flex items-start gap-3 glass rounded-2xl p-3 md:p-4 card-lift"
              >
                <div className="h-10 w-10 rounded-xl bg-destructive/15 border border-destructive/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-destructive" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{pdf.title}</p>
                  <p className="text-xs text-muted-foreground">{pdf.department} • Semester {pdf.semester}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {pdf.date}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 md:py-20 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="glass-strong rounded-[2rem] p-8 md:p-14 text-center relative overflow-hidden max-w-4xl mx-auto card-lift">
            {/* Inner aurora */}
            <div className="absolute inset-0 pointer-events-none hidden md:block">
              <div className="aurora-orb top-[-50%] left-[10%] w-[50%] h-[120%] bg-[hsl(220_90%_55%/0.18)]" />
              <div className="aurora-orb bottom-[-60%] right-[5%] w-[55%] h-[140%] bg-[hsl(280_85%_55%/0.16)]" />
            </div>
            <div className="noise hidden md:block" />
            <div className="relative z-10">
              <div className="inline-flex h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-accent/15 border border-accent/30 items-center justify-center mx-auto mb-5 shadow-glow">
                <GraduationCap className="h-6 w-6 md:h-7 md:w-7 text-accent" />
              </div>
              <h2 className="font-display text-2xl md:text-4xl font-bold mb-3 md:mb-4 tracking-tight">Ready to Get Started?</h2>
              <p className="text-muted-foreground mb-7 md:mb-8 max-w-lg mx-auto text-sm md:text-lg">
                Join DIU StudyBank today and access all your course materials in one organized platform.
              </p>
              <Button size="lg" className="bg-gradient-primary text-primary-foreground btn-glow font-semibold px-7 md:px-9 h-11 md:h-12 text-sm md:text-base rounded-2xl" asChild>
                <Link to="/signup">Create Free Account <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
