import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Download, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { downloadFile, getPreviewObjectUrl } from "@/lib/storage";
import { toast } from "sonner";

type State =
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "error"; message: string };

/**
 * Dedicated PDF viewer route. Loads the file via the authenticated
 * `storage-download?preview=1` proxy and renders it through the browser's
 * built-in PDF viewer (toolbar, search, zoom, native print/download).
 *
 * Visit `/pdf/:fileId?name=<filename>&back=<return-path>`.
 */
export default function PdfViewer() {
  const { fileId = "" } = useParams<{ fileId: string }>();
  const [searchParams] = useSearchParams();
  const fileName = searchParams.get("name") || "document.pdf";
  const back = searchParams.get("back") || "/";
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!fileId) {
      setState({ status: "error", message: "No file specified." });
      return;
    }
    let cancelled = false;
    let createdUrl: string | null = null;

    setState({ status: "loading" });
    (async () => {
      try {
        const url = await getPreviewObjectUrl(fileId);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        createdUrl = url;
        setState({ status: "ready", url });
      } catch (err) {
        if (cancelled) return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Couldn't load this PDF.",
        });
      }
    })();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [fileId, attempt]);

  // Append #toolbar=1&view=FitH so Chrome/Firefox open zoomed-to-width by default.
  const viewerSrc = useMemo(
    () => (state.status === "ready" ? `${state.url}#view=FitH` : null),
    [state],
  );

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
        <div className="flex items-center justify-between gap-3 mb-4">
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
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="relative w-full overflow-hidden rounded-2xl border border-border/60 bg-muted/30 shadow-sm"
          style={{ height: "calc(100vh - 220px)", minHeight: 480 }}
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

          {state.status === "ready" && viewerSrc && (
            <iframe
              key={viewerSrc}
              src={viewerSrc}
              title={fileName}
              className="h-full w-full bg-background"
            />
          )}
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
