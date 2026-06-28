import { useEffect, useRef, useState } from "react";
import { AlertCircle, FileText, Loader2, Lock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  fileId: string | null;
  fileName: string;
  legacyUrl?: string | null;
  /** Authenticated (signed-in) users only — preview is gated. */
  canPreview: boolean;
}

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; url: string; objectUrl: boolean }
  | { status: "error"; message: string };

function isPdf(name: string) {
  return /\.pdf($|\?)/i.test(name);
}

/**
 * Inline preview for student-upload PDFs. Lazily fetches a signed URL when the
 * card scrolls into view, renders it in an <iframe>, and surfaces a retry-able
 * error state if the fetch fails (auth, network, expired session, etc).
 */
export default function StudentUploadPreview({ fileId, fileName, legacyUrl, canPreview }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<State>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);

  // Observe once; trigger load when the card scrolls near the viewport.
  useEffect(() => {
    if (!rootRef.current || visible) return;
    const el = rootRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || !canPreview) return;
    let cancelled = false;

    async function load() {
      setState({ status: "loading" });
      try {
        if (fileId) {
          const { getPreviewObjectUrl } = await import("@/lib/storage");
          const url = await getPreviewObjectUrl(fileId);
          if (cancelled) {
            URL.revokeObjectURL(url);
          } else {
            setState({ status: "ready", url, objectUrl: true });
          }
        } else if (legacyUrl) {
          if (!cancelled) setState({ status: "ready", url: legacyUrl, objectUrl: false });
        } else {
          if (!cancelled) setState({ status: "error", message: "No file attached." });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Couldn't load preview.",
          });
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [visible, canPreview, fileId, legacyUrl, attempt]);

  useEffect(() => {
    return () => {
      if (state.status === "ready" && state.objectUrl) URL.revokeObjectURL(state.url);
    };
  }, [state]);

  const pdf = isPdf(fileName);

  return (
    <div
      ref={rootRef}
      className="relative mb-4 w-full overflow-hidden rounded-2xl border border-border/60 bg-muted/30"
      style={{ aspectRatio: "16 / 10" }}
    >
      {!canPreview && (
        <Fallback icon={<Lock className="h-5 w-5" />} title="Sign in to preview" subtitle={fileName} />
      )}

      {canPreview && !pdf && (
        <Fallback icon={<FileText className="h-5 w-5" />} title="Preview not available" subtitle={fileName} />
      )}

      {canPreview && pdf && state.status !== "ready" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
          {state.status === "error" ? (
            <>
              <AlertCircle className="h-6 w-6 text-destructive" />
              <div>
                <p className="text-sm font-medium">Preview unavailable</p>
                <p className="text-xs text-muted-foreground mt-1 break-words max-w-xs">{state.message}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg"
                onClick={() => setAttempt((n) => n + 1)}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
              </Button>
            </>
          ) : (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Loading preview…</p>
            </>
          )}
        </div>
      )}

      {canPreview && pdf && state.status === "ready" && (
        <iframe
          src={`${state.url}#toolbar=0&navpanes=0&view=FitH`}
          title={fileName}
          className="absolute inset-0 h-full w-full"
          loading="lazy"
          onError={() =>
            setState({ status: "error", message: "The PDF failed to render in this browser." })
          }
        />
      )}
    </div>
  );
}

function Fallback({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
      <div className="h-9 w-9 rounded-xl bg-background/60 border border-border/60 flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground truncate max-w-full">{subtitle}</p>
    </div>
  );
}
