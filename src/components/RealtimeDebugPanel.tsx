import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  /** Labels for context (e.g. current userId / fileIds this page cares about). */
  watching: Record<string, string | null | undefined>;
  className?: string;
}

/**
 * Dev-only floating panel that lists every active Supabase Realtime channel
 * plus the identifiers the surrounding page is subscribed to. Handy when
 * verifying that UserDashboard and ContributorProfile listen to the same
 * `contributor_stats` / `pdf_reaction_counts` / `pdf_view_counts` streams and
 * therefore render matching totals.
 *
 * Rendered only when `import.meta.env.DEV` is true or the URL contains
 * `?debug=1`, so production builds never ship the overlay.
 */
export default function RealtimeDebugPanel({ watching, className }: Props) {
  const enabled =
    import.meta.env.DEV ||
    (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug"));
  const [channels, setChannels] = useState<Array<{ topic: string; state: string }>>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      const list = supabase.getChannels().map((c) => ({
        topic: c.topic.replace(/^realtime:/, ""),
        state: (c as unknown as { state?: string }).state ?? "unknown",
      }));
      setChannels(list);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 font-mono text-[11px] leading-tight",
        "rounded-xl border border-white/10 bg-background/90 backdrop-blur shadow-lg",
        "max-w-xs",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <span className="relative inline-flex h-2 w-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <Radio className="h-3 w-3 text-emerald-400" />
        <span className="font-semibold">Realtime</span>
        <span className="ml-auto text-muted-foreground">{channels.length} ch</span>
      </button>
      {open && (
        <div className="border-t border-white/10 px-3 py-2 space-y-2 max-h-72 overflow-auto">
          <div>
            <div className="text-muted-foreground uppercase tracking-wide mb-1">Watching</div>
            {Object.entries(watching).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{k}</span>
                <span className="truncate max-w-[10rem]" title={v ?? ""}>
                  {v ? v : "—"}
                </span>
              </div>
            ))}
          </div>
          <div>
            <div className="text-muted-foreground uppercase tracking-wide mb-1">
              Channels ({channels.length})
            </div>
            {channels.length === 0 ? (
              <div className="text-muted-foreground">none</div>
            ) : (
              channels.map((c) => (
                <div key={c.topic} className="flex justify-between gap-3">
                  <span className="truncate" title={c.topic}>
                    {c.topic}
                  </span>
                  <span
                    className={cn(
                      "shrink-0",
                      c.state === "joined" ? "text-emerald-400" : "text-amber-400",
                    )}
                  >
                    {c.state}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
