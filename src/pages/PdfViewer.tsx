import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { downloadFile, getPreviewBytes } from "@/lib/storage";
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import { toast } from "sonner";

GlobalWorkerOptions.workerSrc = pdfWorker;

type State =
  | { status: "loading" }
  | { status: "ready"; pdf: PDFDocumentProxy }
  | { status: "error"; message: string };

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
// `fit` recomputes scale from container width on every render/resize.
type Zoom = number | "fit";

/**
 * Dedicated PDF viewer with custom zoom, page navigation and full-screen
 * controls. Uses pdf.js to render each page to a canvas, so the controls
 * behave identically in Chrome and Firefox (we never depend on the browser's
 * built-in PDF viewer chrome).
 */
export default function PdfViewer() {
  const { fileId = "" } = useParams<{ fileId: string }>();
  const [searchParams] = useSearchParams();
  const fileName = searchParams.get("name") || "document.pdf";
  const back = searchParams.get("back") || "/";

  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [zoom, setZoom] = useState<Zoom>("fit");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const shellRef = useRef<HTMLDivElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  // -- Load the PDF document ------------------------------------------------
  useEffect(() => {
    if (!fileId) {
      setState({ status: "error", message: "No file specified." });
      return;
    }
    let cancelled = false;
    let createdUrl: string | null = null;
    setState({ status: "loading" });
    setPage(1);
    setPageInput("1");

    (async () => {
      try {
        const url = await getPreviewObjectUrl(fileId);
        createdUrl = url;
        const pdf = await getDocument(url).promise;
        if (cancelled) {
          pdf.destroy();
          URL.revokeObjectURL(url);
          return;
        }
        setState({ status: "ready", pdf, objectUrl: url });
      } catch (err) {
        if (cancelled) return;
        if (createdUrl) URL.revokeObjectURL(createdUrl);
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Couldn't load this PDF.",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fileId, attempt]);

  // Tear down the pdf + blob URL when the document changes or page unmounts.
  useEffect(() => {
    if (state.status !== "ready") return;
    const { pdf, objectUrl } = state;
    return () => {
      try {
        renderTaskRef.current?.cancel();
      } catch {
        /* noop */
      }
      pdf.destroy();
      URL.revokeObjectURL(objectUrl);
    };
  }, [state]);

  // -- Render the current page whenever page/zoom/document changes ----------
  const renderPage = useCallback(async () => {
    if (state.status !== "ready") return;
    const { pdf } = state;
    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    if (!canvas || !container) return;

    try {
      renderTaskRef.current?.cancel();
    } catch {
      /* noop */
    }

    const pageProxy = await pdf.getPage(page);
    const baseViewport = pageProxy.getViewport({ scale: 1 });
    const cssScale =
      zoom === "fit"
        ? Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, (container.clientWidth - 32) / baseViewport.width))
        : zoom;
    const dpr = window.devicePixelRatio || 1;
    const viewport = pageProxy.getViewport({ scale: cssScale * dpr });

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
    canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

    const task = pageProxy.render({ canvasContext: ctx, viewport });
    renderTaskRef.current = task;
    try {
      await task.promise;
    } catch (err) {
      // `RenderingCancelledException` is expected when the user flips pages quickly.
      if ((err as { name?: string })?.name !== "RenderingCancelledException") {
        toast.error("Couldn't render this page", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      }
    }
  }, [state, page, zoom]);

  useEffect(() => {
    void renderPage();
  }, [renderPage]);

  // Re-render at fit-width when the window resizes.
  useEffect(() => {
    if (zoom !== "fit") return;
    const handler = () => void renderPage();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [zoom, renderPage]);

  // -- Page / zoom / fullscreen controls -----------------------------------
  const numPages = state.status === "ready" ? state.pdf.numPages : 0;

  const goToPage = useCallback(
    (next: number) => {
      if (!numPages) return;
      const clamped = Math.min(Math.max(1, Math.floor(next)), numPages);
      setPage(clamped);
      setPageInput(String(clamped));
    },
    [numPages],
  );

  const submitPageInput = () => {
    const parsed = parseInt(pageInput, 10);
    if (Number.isFinite(parsed)) goToPage(parsed);
    else setPageInput(String(page));
  };

  const zoomIn = () => {
    setZoom((z) => {
      const current = typeof z === "number" ? z : 1;
      return Math.min(MAX_ZOOM, +(current + ZOOM_STEP).toFixed(2));
    });
  };
  const zoomOut = () => {
    setZoom((z) => {
      const current = typeof z === "number" ? z : 1;
      return Math.max(MIN_ZOOM, +(current - ZOOM_STEP).toFixed(2));
    });
  };
  const zoomFit = () => setZoom("fit");

  const toggleFullscreen = async () => {
    const el = shellRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      toast.error("Couldn't toggle full-screen", {
        description: err instanceof Error ? err.message : "Your browser blocked this.",
      });
    }
  };

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Keyboard shortcuts: arrows for paging, +/- for zoom, f for fullscreen.
  useEffect(() => {
    if (state.status !== "ready") return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        goToPage(page + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goToPage(page - 1);
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        zoomFit();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        void toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, page, goToPage]);

  const zoomLabel = useMemo(() => (zoom === "fit" ? "Fit" : `${Math.round(zoom * 100)}%`), [zoom]);

  const onDownload = async () => {
    try {
      await downloadFile(fileId, fileName);
    } catch (err) {
      toast.error("Couldn't download file", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <Button asChild variant="ghost" size="sm" className="rounded-xl -ml-2">
            <Link to={back}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
            </Link>
          </Button>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="font-display text-base sm:text-lg font-semibold truncate" title={fileName}>
              {fileName}
            </h1>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl font-semibold"
            onClick={onDownload}
            disabled={state.status !== "ready"}
          >
            <Download className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Download</span>
          </Button>
        </div>

        <motion.div
          ref={shellRef}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-muted/30 shadow-sm data-[fs=true]:bg-background"
          data-fs={isFullscreen}
          style={
            isFullscreen
              ? { height: "100vh" }
              : { height: "calc(100vh - 240px)", minHeight: 480 }
          }
        >
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-background/80 px-2 py-1.5 backdrop-blur-sm">
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-lg"
                aria-label="Previous page"
                onClick={() => goToPage(page - 1)}
                disabled={state.status !== "ready" || page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 text-xs">
                <Input
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ""))}
                  onBlur={submitPageInput}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  aria-label="Page number"
                  disabled={state.status !== "ready"}
                  className="h-8 w-12 rounded-lg px-2 text-center text-xs"
                />
                <span className="text-muted-foreground">/ {numPages || "–"}</span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-lg"
                aria-label="Next page"
                onClick={() => goToPage(page + 1)}
                disabled={state.status !== "ready" || page >= numPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-lg"
                aria-label="Zoom out"
                onClick={zoomOut}
                disabled={state.status !== "ready"}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <button
                type="button"
                onClick={zoomFit}
                disabled={state.status !== "ready"}
                aria-label="Fit width"
                className="h-8 min-w-[3.5rem] rounded-lg px-2 text-xs font-semibold tabular-nums hover:bg-muted disabled:opacity-50"
              >
                {zoomLabel}
              </button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-lg"
                aria-label="Zoom in"
                onClick={zoomIn}
                disabled={state.status !== "ready"}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <div className="mx-1 hidden h-5 w-px bg-border/60 sm:block" />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-lg"
                aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Viewport */}
          <div
            ref={canvasContainerRef}
            className="relative flex-1 overflow-auto bg-muted/40"
          >
            {state.status === "loading" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <Loader2 className="h-7 w-7 animate-spin text-accent" />
                <div>
                  <p className="text-sm font-semibold">Loading PDF…</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    Fetching a secure preview. This usually takes a few seconds.
                  </p>
                </div>
              </div>
            )}

            {state.status === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <AlertCircle className="h-7 w-7 text-destructive" />
                <div>
                  <p className="text-sm font-semibold">Couldn't load this PDF</p>
                  <p className="text-xs text-muted-foreground mt-1 break-words max-w-sm">
                    {state.message}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setAttempt((n) => n + 1)}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
                  </Button>
                  <Button size="sm" className="rounded-xl font-semibold" onClick={onDownload}>
                    <Download className="h-3.5 w-3.5 mr-1.5" /> Download instead
                  </Button>
                </div>
              </div>
            )}

            {state.status === "ready" && (
              <div className="flex min-h-full w-full justify-center p-4">
                <canvas
                  ref={canvasRef}
                  aria-label={`${fileName} page ${page}`}
                  className="block rounded-md bg-background shadow-[0_2px_18px_-6px_hsl(var(--foreground)/0.25)]"
                />
              </div>
            )}
          </div>
        </motion.div>
      </main>

      {!isFullscreen && <Footer />}
    </div>
  );
}
