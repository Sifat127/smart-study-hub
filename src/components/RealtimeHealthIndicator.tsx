import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeRealtimeLog, type RealtimeLogEntry } from "@/lib/realtimeEventLog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Small badge that reports the health of the page's realtime subscriptions.
 *
 * Health rules:
 * - error   → any monitored channel is in `errored`/`closed`/`timed_out`
 * - connecting → any channel is still `joining`, none joined yet
 * - stale   → all channels joined but no events for > `staleAfterMs`
 *              AND the browser is online (offline is reported separately)
 * - offline → `navigator.onLine === false`
 * - healthy → at least one channel joined and events flowing (or fresh mount)
 *
 * `topicPrefixes` narrows which supabase channels count toward health so the
 * badge only reflects the subscriptions this page actually depends on.
 */
interface Props {
  topicPrefixes: string[];
  /** How long without an event before we call the stream "stale". */
  staleAfterMs?: number;
  className?: string;
}

type Status = "healthy" | "connecting" | "stale" | "error" | "offline";

export default function RealtimeHealthIndicator({
  topicPrefixes,
  staleAfterMs = 60_000,
  className,
}: Props) {
  const [channelStates, setChannelStates] = useState<string[]>([]);
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [mountedAt] = useState(() => Date.now());

  // Poll the SDK for channel state (there is no public event for it).
  useEffect(() => {
    const tick = () => {
      const states = supabase
        .getChannels()
        .filter((c) => {
          const topic = c.topic.replace(/^realtime:/, "");
          return topicPrefixes.some((p) => topic.startsWith(p));
        })
        .map((c) => String((c as unknown as { state?: string }).state ?? "unknown"));
      setChannelStates(states);
      setNow(Date.now());
    };
    tick();
    const id = window.setInterval(tick, 2000);
    return () => window.clearInterval(id);
  }, [topicPrefixes.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track the newest event from any surface — good enough to detect a silent stream.
  useEffect(() => {
    const unsub = subscribeRealtimeLog((entries: RealtimeLogEntry[]) => {
      if (entries.length > 0) setLastEventAt(entries[0].at);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const status: Status = useMemo(() => {
    if (!online) return "offline";
    if (channelStates.length === 0) return "connecting";
    if (
      channelStates.some((s) =>
        ["errored", "closed", "timed_out", "channel_error"].includes(s),
      )
    ) {
      return "error";
    }
    const joined = channelStates.filter((s) => s === "joined").length;
    if (joined === 0) return "connecting";
    const since = lastEventAt ?? mountedAt;
    // Only flag "stale" after we've been mounted long enough that silence is
    // meaningful — a brand new page with no activity is not unhealthy.
    if (now - since > staleAfterMs && now - mountedAt > staleAfterMs) {
      return "stale";
    }
    return "healthy";
  }, [online, channelStates, lastEventAt, mountedAt, now, staleAfterMs]);

  const meta: Record<
    Status,
    { label: string; hint: string; icon: any; tone: string }
  > = {
    healthy: {
      label: "Live",
      hint: "Realtime streams connected and receiving events.",
      icon: CheckCircle2,
      tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    },
    connecting: {
      label: "Connecting",
      hint: "Joining realtime channels…",
      icon: Loader2,
      tone: "border-sky-500/30 bg-sky-500/10 text-sky-400",
    },
    stale: {
      label: "Stale",
      hint: `No events for ${Math.round((now - (lastEventAt ?? mountedAt)) / 1000)}s. Try reconnecting.`,
      icon: AlertTriangle,
      tone: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    },
    error: {
      label: "Stream error",
      hint: "A subscription errored or was closed. Reconnect to restore updates.",
      icon: AlertTriangle,
      tone: "border-rose-500/30 bg-rose-500/10 text-rose-400",
    },
    offline: {
      label: "Offline",
      hint: "No network — realtime updates paused until you're back online.",
      icon: WifiOff,
      tone: "border-rose-500/30 bg-rose-500/10 text-rose-400",
    },
  };

  const m = meta[status];
  const Icon = m.icon;

  // Fire a one-time toast when we transition into an actionable failure state
  // so the user notices even if the badge is off-screen.
  useEffect(() => {
    if (status === "error") {
      toast.error("Realtime stream error", {
        description: m.hint,
        id: "realtime-error",
      });
    } else if (status === "stale") {
      toast.warning("Realtime feed is quiet", {
        description: m.hint,
        id: "realtime-stale",
      });
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const reconnect = async () => {
    const targets = supabase.getChannels().filter((c) => {
      const topic = c.topic.replace(/^realtime:/, "");
      return topicPrefixes.some((p) => topic.startsWith(p));
    });
    for (const c of targets) {
      await supabase.removeChannel(c);
    }
    // Force a full realtime socket reconnect so channels re-subscribe on mount.
    try {
      supabase.realtime.disconnect();
      supabase.realtime.connect();
    } catch {
      // no-op — SDK handles reconnect internally on next channel().subscribe()
    }
    toast.success("Reconnecting realtime…", { id: "realtime-reconnect" });
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        m.tone,
        className,
      )}
      title={m.hint}
      role="status"
      aria-live="polite"
    >
      <Icon
        className={cn("h-3.5 w-3.5", status === "connecting" && "animate-spin")}
      />
      <span>{m.label}</span>
      <span className="text-[10px] opacity-70">
        {channelStates.filter((s) => s === "joined").length}/{channelStates.length} ch
      </span>
      {(status === "error" || status === "stale") && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-[11px]"
          onClick={reconnect}
        >
          Reconnect
        </Button>
      )}
    </div>
  );
}
