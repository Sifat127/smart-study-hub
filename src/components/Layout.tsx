import { ReactNode } from "react";
import { FileText } from "lucide-react";
import logo from "@/assets/logo.png";
import Navbar from "./Navbar";
import Footer from "./Footer";

const floatingElements = [
  { x: "6%", y: "16%", rotate: -10, size: "h-10 w-7 md:h-14 md:w-10", className: "animate-float" },
  { x: "90%", y: "12%", rotate: 12, size: "h-12 w-9 md:h-16 md:w-12", className: "animate-float-delayed" },
  { x: "8%", y: "55%", rotate: 8, size: "h-9 w-7 md:h-12 md:w-9", className: "animate-float-slow" },
  { x: "92%", y: "48%", rotate: -15, size: "h-8 w-6 md:h-10 md:w-8", className: "animate-float" },
  { x: "15%", y: "82%", rotate: 5, size: "h-9 w-7 md:h-12 md:w-9", className: "animate-float-delayed" },
  { x: "85%", y: "78%", rotate: -8, size: "h-10 w-7 md:h-14 md:w-10", className: "animate-float-slow" },
];

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col relative bg-background">
      {/* Aurora ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Aurora orbs — drift slowly */}
        <div className="aurora-orb animate-aurora-1 top-[-15%] left-[-10%] w-[55%] h-[55%] bg-[hsl(179_75%_45%/0.14)] dark:bg-[hsl(220_95%_55%/0.22)]" />
        <div className="aurora-orb animate-aurora-2 bottom-[-15%] right-[-12%] w-[55%] h-[55%] bg-[hsl(35_75%_60%/0.16)] dark:bg-[hsl(280_85%_55%/0.2)]" />
        <div className="aurora-orb animate-aurora-3 top-[30%] right-[10%] w-[35%] h-[35%] bg-[hsl(165_65%_45%/0.10)] dark:bg-[hsl(170_85%_45%/0.16)]" />
        <div className="aurora-orb animate-aurora-1 top-[55%] left-[20%] w-[40%] h-[40%] bg-[hsl(40_70%_70%/0.12)] dark:bg-[hsl(200_85%_50%/0.14)]" />


        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />

        {/* Floating PDF elements — 3D feel */}
        {floatingElements.map((el, i) => (
          <div
            key={i}
            className={`absolute ${el.className} flex opacity-[0.18] md:opacity-[0.28]`}
            style={{
              left: el.x,
              top: el.y,
              ["--float-rotate" as string]: `${el.rotate}deg`,
              transform: `rotate(${el.rotate}deg)`,
            }}
          >
            <div className={`${el.size} rounded-2xl glass flex items-center justify-center shadow-elevated`}>
              <FileText className="h-1/2 w-1/2 text-muted-foreground/40" />
            </div>
          </div>
        ))}

        {/* Watermark logo */}
        <img
          src={logo}
          alt=""
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] object-contain opacity-[0.025] dark:opacity-[0.04] pointer-events-none select-none"
        />
      </div>

      <Navbar />
      <main className="flex-1 relative z-10">{children}</main>
      <Footer />
    </div>
  );
}
