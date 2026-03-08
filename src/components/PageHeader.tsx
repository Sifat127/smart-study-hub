import { motion } from "framer-motion";
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
    <section className="bg-gradient-hero text-primary-foreground relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-[300px] h-[300px] bg-accent/6 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-primary/6 rounded-full blur-[150px]" />
      </div>
      <div className="container mx-auto px-4 py-10 md:py-20 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl"
        >
          {badge && (
            <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 mb-4 text-sm font-medium text-accent">
              {badgeIcon}
              {badge}
            </div>
          )}
          <h1 className="font-display text-2xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-2 md:mb-3">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm md:text-lg text-primary-foreground/60 max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}
          {children}
        </motion.div>
      </div>
    </section>
  );
}
