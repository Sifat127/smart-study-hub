interface DashboardSectionProps {
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** Section wrapper with a heading row + bordered card body used by the dashboard lists. */
export default function DashboardSection({ title, action, className, children }: DashboardSectionProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="font-display text-lg md:text-2xl font-bold flex items-center gap-2 min-w-0">{title}</h2>
        {action}
      </div>
      <div className="bg-card rounded-2xl border border-border card-shadow overflow-hidden">{children}</div>
    </div>
  );
}
