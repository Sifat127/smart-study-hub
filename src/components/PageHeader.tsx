import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeIcon?: ReactNode;
  children?: ReactNode;
}

export default function PageHeader({ title, subtitle, badge, badgeIcon, children }: PageHeaderProps) {
  return (
    <section className="relative overflow-hidden">
      {/* Aurora gradient layer */}
      <div className="absolute inset-0 bg-gradient-hero opacity-90" />
      <div className="absolute inset-0">
        <div className="aurora-orb animate-aurora-1 top-[-20%] left-[10%] w-[40%] h-[60%] bg-[hsl(220_90%_55%/0.25)]" />
        <div className="aurora-orb animate-aurora-2 bottom-[-30%] right-[5%] w-[45%] h-[70%] bg-[hsl(280_80%_55%/0.22)]" />
        <div className="aurora-orb animate-aurora-3 top-[10%] right-[30%] w-[30%] h-[40%] bg-[hsl(170_85%_50%/0.18)]" />
      </div>
      <div className="noise" />

      <div className="container mx-auto px-4 py-12 md:py-20 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {badge && (
            <div className="inline-flex items-center gap-2 glass-strong rounded-full px-4 py-1.5 mb-5 text-sm font-medium text-accent shadow-glow">
              {badgeIcon}
              {badge}
            </div>
          )}
          <h1 className="font-display text-3xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/50">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm md:text-lg text-white/55 max-w-2xl mx-auto leading-relaxed">
              {subtitle}
            </p>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}
