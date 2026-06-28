import { useEffect, useRef, useState } from "react";
import { AlertCircle, ExternalLink, FileText, Loader2, Lock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorker;

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
  | { status: "ready"; url: string; objectUrl: boolean; pages: number }
  | { status: "error"; message: string };

function isPdf(name: string) {
  return /\.pdf($|\?)/i.test(name);
}

/**
 * Inline preview for student-upload PDFs. Lazily fetches the PDF when the
 * card scrolls into view, renders page one to canvas, and surfaces a retry-able
 * error state if the fetch fails (auth, network, expired session, etc).
 */
export default function StudentUploadPreview({ fileId, fileName, legacyUrl, canPreview }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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
          const pdf = await getDocument(url).promise;
          if (cancelled) {
            URL.revokeObjectURL(url);
          } else {
            setState({ status: "ready", url, objectUrl: true, pages: pdf.numPages });
          }
        } else if (legacyUrl) {
          const pdf = await getDocument(legacyUrl).promise;
          if (!cancelled) setState({ status: "ready", url: legacyUrl, objectUrl: false, pages: pdf.numPages });
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

  useEffect(() => {
    if (state.status !== "ready") return;
    const readyState = state;
    let cancelled = false;

    async function renderFirstPage() {
      try {
        const loadingTask = getDocument(readyState.url);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        const containerWidth = rootRef.current?.clientWidth || 720;
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(2, Math.max(1, containerWidth / baseViewport.width));
        const viewport = page.getViewport({ scale });
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas preview is unavailable.");

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await page.render({ canvasContext: context, viewport }).promise;
      } catch (err) {
        if (!cancelled) {
          setState({ status: "error", message: err instanceof Error ? err.message : "The PDF failed to render." });
        }
      }
    }

    renderFirstPage();
    return () => {
      cancelled = true;
    };
  }, [state]);

  const pdf = isPdf(fileName);

  const openPdf = async () => {
    if (fileId) {
      const { getDownloadUrl } = await import("@/lib/storage");
      const url = await getDownloadUrl(fileId, false);
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    if (legacyUrl) window.open(legacyUrl, "_blank", "noopener,noreferrer");
  };

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
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg"
                  onClick={() => setAttempt((n) => n + 1)}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
                </Button>
                {(fileId || legacyUrl) && (
                  <Button size="sm" className="rounded-lg font-semibold" onClick={openPdf}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open PDF
                  </Button>
                )}
              </div>
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
        <div className="absolute inset-0 overflow-hidden bg-background/70">
          <div className="absolute left-2 top-2 z-10 rounded-lg border border-border/60 bg-background/85 px-2 py-1 text-[10px] font-semibold text-muted-foreground backdrop-blur-sm">
            Page 1 of {state.pages}
          </div>
          <canvas
            ref={canvasRef}
            aria-label={`${fileName} preview`}
            className="mx-auto block h-full max-h-full max-w-full bg-background object-contain"
          />
        </div>
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
