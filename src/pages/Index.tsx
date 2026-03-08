import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, BookOpen, Layers, FileText, Shield, Users, Download, Monitor, Zap, Briefcase, ArrowRight, Clock, Loader2, Sparkles, GraduationCap, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
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
  { icon: Layers, title: "Organized by Department", desc: "Browse materials by CSE, EEE, or BBA departments." },
  { icon: BookOpen, title: "Semester-wise Navigation", desc: "Navigate through all 12 semesters seamlessly." },
  { icon: FileText, title: "Chapter-wise PDFs", desc: "Access course materials chapter by chapter." },
  { icon: Shield, title: "Secure Login", desc: "Role-based access for admins and students." },
  { icon: Users, title: "Admin Management", desc: "Admins can upload, edit, and manage all content." },
  { icon: Download, title: "Direct Download", desc: "Download any PDF with a single click." },
];

const stats = [
  { icon: FolderOpen, value: "3+", label: "Departments" },
  { icon: BookOpen, value: "150+", label: "Courses" },
  { icon: FileText, value: "500+", label: "PDFs Shared" },
];

const floatingElements = [
  { x: "8%", y: "18%", rotate: -12, size: "h-16 w-12", delay: 0, className: "animate-float" },
  { x: "85%", y: "22%", rotate: 15, size: "h-20 w-14", delay: 0, className: "animate-float-delayed" },
  { x: "12%", y: "65%", rotate: 8, size: "h-14 w-10", delay: 0, className: "animate-float-slow" },
  { x: "88%", y: "70%", rotate: -20, size: "h-12 w-9", delay: 0, className: "animate-float" },
  { x: "50%", y: "85%", rotate: 5, size: "h-10 w-8", delay: 0, className: "animate-float-delayed" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

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
      <section className="bg-gradient-hero text-primary-foreground relative overflow-hidden min-h-[70vh] md:min-h-[90vh] flex items-center">
        {/* Background glows */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-[500px] h-[500px] bg-accent/8 rounded-full blur-[180px]" />
          <div className="absolute bottom-20 right-10 w-[600px] h-[600px] bg-primary/8 rounded-full blur-[200px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[150px]" />
        </div>

        {/* Floating PDF elements */}
        {floatingElements.map((el, i) => (
          <div
            key={i}
            className={`absolute ${el.className} hidden md:flex`}
            style={{
              left: el.x,
              top: el.y,
              ["--float-rotate" as string]: `${el.rotate}deg`,
              transform: `rotate(${el.rotate}deg)`,
            }}
          >
            <div className={`${el.size} rounded-lg bg-primary-foreground/5 border border-primary-foreground/10 backdrop-blur-sm flex items-center justify-center`}>
              <FileText className="h-1/2 w-1/2 text-primary-foreground/20" />
            </div>
          </div>
        ))}

        <div className="container mx-auto px-4 py-12 md:py-28 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl mx-auto text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 mb-5 md:mb-8 text-xs md:text-sm font-medium text-accent"
            >
              <Sparkles className="h-4 w-4" />
              Over 10,000+ course materials shared
            </motion.div>

            {/* Heading */}
            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold leading-[1.15] mb-5 tracking-tight">
              Your Complete Academic{" "}
              <span className="block text-accent mt-1">Knowledge Hub</span>
            </h1>

            <p className="text-base md:text-lg text-primary-foreground/60 mb-9 max-w-xl mx-auto leading-relaxed">
              DIU Slider helps students easily explore, view, and download course materials — organized by department, semester, course, and chapter.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold px-8 h-12 text-base rounded-xl" asChild>
                <Link to="/departments">
                  Explore Departments <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 font-semibold h-12 text-base rounded-xl" asChild>
                <Link to="/signup">Get Started Free</Link>
              </Button>
            </div>

            {/* Search bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="max-w-xl mx-auto relative mb-12"
              ref={searchRef}
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-foreground/30 z-10" />
              {searching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary-foreground/50 z-10" />}
              <Input
                placeholder="Search courses by name or code..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => results.length > 0 && setShowResults(true)}
                className="pl-12 h-13 bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 rounded-2xl focus-visible:ring-accent/50 text-base"
              />
              <AnimatePresence>
                {showResults && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute top-full mt-2 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50"
                  >
                    {results.length > 0 ? results.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleResultClick(r)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                      >
                        <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{r.code} — {r.name}</p>
                          <p className="text-xs text-muted-foreground">{r.department} • Semester {r.semester}</p>
                        </div>
                      </button>
                    )) : (
                      <div className="px-4 py-3 text-sm text-muted-foreground text-center">কোনো কোর্স পাওয়া যায়নি</div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Stats Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-8 md:gap-12"
            >
              {stats.map((stat, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <stat.icon className="h-5 w-5 text-accent" />
                  </div>
                  <div className="text-left">
                    <p className="text-xl md:text-2xl font-bold text-primary-foreground">{stat.value}</p>
                    <p className="text-xs text-primary-foreground/50 font-medium">{stat.label}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Departments */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Browse by Department</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">Choose your department to access semester-wise course materials and chapter PDFs.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {departments.map((dept, i) => {
              const Icon = deptIcons[dept.icon] || Monitor;
              return (
                <motion.div
                  key={dept.id}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                >
                  <Link
                    to={`/departments/${dept.id}`}
                    className="group block bg-card rounded-2xl border border-border p-7 card-shadow hover:card-shadow-hover transition-all duration-300 hover:-translate-y-1 hover:border-accent/30"
                  >
                    <div className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                      <Icon className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <h3 className="font-display text-xl font-bold mb-1">{dept.name}</h3>
                    <p className="text-sm text-muted-foreground mb-1">{dept.fullName}</p>
                    <p className="text-sm text-muted-foreground mb-4">{dept.description}</p>
                    <div className="flex items-center text-primary font-medium text-sm">
                      Explore <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Why Choose DIU Slider?</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">Everything you need for organized, accessible academic resources.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="glass rounded-2xl p-6 hover:border-accent/30 transition-all duration-300 hover:card-shadow-hover"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Materials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Recently Uploaded</h2>
            <p className="text-muted-foreground">Stay updated with the latest course materials.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {recentPDFs.map((pdf, i) => (
              <motion.div
                key={i}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="flex items-start gap-4 bg-card rounded-xl border border-border p-4 card-shadow"
              >
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-destructive" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{pdf.title}</p>
                  <p className="text-xs text-muted-foreground">{pdf.department} • Semester {pdf.semester}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {pdf.date}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-hero text-primary-foreground relative overflow-hidden">
        {/* Floating decorations */}
        <div className="absolute left-[5%] top-[20%] animate-float hidden md:block" style={{ ["--float-rotate" as string]: "-8deg" }}>
          <div className="h-14 w-10 rounded-lg bg-primary-foreground/5 border border-primary-foreground/10 flex items-center justify-center">
            <FileText className="h-6 w-4 text-primary-foreground/15" />
          </div>
        </div>
        <div className="absolute right-[8%] bottom-[25%] animate-float-delayed hidden md:block" style={{ ["--float-rotate" as string]: "12deg" }}>
          <div className="h-12 w-9 rounded-lg bg-primary-foreground/5 border border-primary-foreground/10 flex items-center justify-center">
            <FileText className="h-5 w-4 text-primary-foreground/15" />
          </div>
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <GraduationCap className="h-12 w-12 text-accent mx-auto mb-6" />
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-primary-foreground/60 mb-8 max-w-lg mx-auto text-lg">
            Join DIU Slider today and access all your course materials in one organized platform.
          </p>
          <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold px-8 h-12 text-base rounded-xl" asChild>
            <Link to="/signup">Create Free Account <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
}
