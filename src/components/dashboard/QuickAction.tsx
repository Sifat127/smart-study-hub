import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface QuickActionProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}

export default function QuickAction({ to, icon, title, desc }: QuickActionProps) {
  return (
    <Link
      to={to}
      className="group relative block bg-card rounded-2xl border border-border p-4 md:p-5 card-shadow hover:border-accent/40 hover:shadow-[0_8px_30px_-8px_hsl(var(--accent)/0.25)]"
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center text-primary-foreground shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm md:text-base group-hover:text-accent transition-colors">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent shrink-0" />
      </div>
    </Link>
  );
}
