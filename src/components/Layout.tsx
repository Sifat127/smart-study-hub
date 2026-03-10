import { ReactNode } from "react";
import { FileText } from "lucide-react";
import logo from "@/assets/logo.png";
import Navbar from "./Navbar";
import Footer from "./Footer";

const floatingElements = [
  { x: "5%", y: "15%", rotate: -10, size: "h-10 w-7 md:h-14 md:w-10", className: "animate-float" },
  { x: "90%", y: "10%", rotate: 12, size: "h-12 w-9 md:h-16 md:w-12", className: "animate-float-delayed" },
  { x: "8%", y: "50%", rotate: 8, size: "h-9 w-7 md:h-12 md:w-9", className: "animate-float-slow" },
  { x: "92%", y: "45%", rotate: -15, size: "h-8 w-6 md:h-10 md:w-8", className: "animate-float" },
  { x: "15%", y: "80%", rotate: 5, size: "h-9 w-7 md:h-12 md:w-9", className: "animate-float-delayed" },
  { x: "85%", y: "75%", rotate: -8, size: "h-10 w-7 md:h-14 md:w-10", className: "animate-float-slow" },
];

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Global background effects with mood color shifting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" style={{ animation: "mood-hue 20s ease-in-out infinite" }}>
        {/* Animated ambient glows */}
        <div className="absolute top-[10%] left-[5%] w-[250px] h-[250px] md:w-[500px] md:h-[500px] bg-primary/[0.05] rounded-full blur-[120px] md:blur-[200px]" style={{ animation: "mood-shift-1 12s ease-in-out infinite" }} />
        <div className="absolute top-[40%] right-[5%] w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-accent/[0.05] rounded-full blur-[140px] md:blur-[220px]" style={{ animation: "mood-shift-2 15s ease-in-out infinite" }} />
        <div className="absolute bottom-[10%] left-[30%] w-[200px] h-[200px] md:w-[450px] md:h-[450px] bg-primary/[0.04] rounded-full blur-[100px] md:blur-[180px]" style={{ animation: "mood-shift-3 18s ease-in-out infinite" }} />
        <div className="absolute top-[60%] right-[30%] w-[200px] h-[200px] md:w-[400px] md:h-[400px] bg-accent/[0.03] rounded-full blur-[120px] md:blur-[200px]" style={{ animation: "mood-shift-1 22s ease-in-out infinite reverse" }} />
        <div className="absolute top-[20%] left-[50%] w-[180px] h-[180px] md:w-[350px] md:h-[350px] bg-primary/[0.03] rounded-full blur-[100px] md:blur-[160px]" style={{ animation: "mood-shift-2 25s ease-in-out infinite reverse" }} />

        {/* Floating PDF elements */}
        {floatingElements.map((el, i) => (
          <div
            key={i}
            className={`absolute ${el.className} hidden md:flex opacity-[0.35]`}
            style={{
              left: el.x,
              top: el.y,
              ["--float-rotate" as string]: `${el.rotate}deg`,
              transform: `rotate(${el.rotate}deg)`,
            }}
          >
            <div className={`${el.size} rounded-lg bg-muted/60 border border-border/40 backdrop-blur-sm flex items-center justify-center`}>
              <FileText className="h-1/2 w-1/2 text-muted-foreground/30" />
            </div>
          </div>
        ))}

        {/* Watermark logo */}
        <img 
          src={logo} 
          alt="" 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] object-contain opacity-[0.05] pointer-events-none select-none"
        />
      </div>

      <Navbar />
      <main className="flex-1 relative z-10">{children}</main>
      <Footer />
    </div>
  );
}
