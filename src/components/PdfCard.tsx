import { Link } from "react-router-dom";
import { Download, Eye, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import MaterialStats from "@/components/MaterialStats";
import { downloadFile } from "@/lib/storage";
import { toast } from "sonner";

export interface PdfCardData {
  id: string;
  title: string;
  original_filename: string;
  upload_date: string;
  uploader_name?: string | null;
}

interface Props {
  pdf: PdfCardData;
}

export default function PdfCard({ pdf }: Props) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    const toastId = toast.loading("Preparing download…", { description: pdf.original_filename });
    try {
      await downloadFile(pdf.id, pdf.original_filename);
      toast.success("Download started", { id: toastId, description: pdf.original_filename });
    } catch (e) {
      toast.error("Download failed", {
        id: toastId,
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setDownloading(false);
    }
  };


  const viewerHref = `/pdf/${pdf.id}?name=${encodeURIComponent(pdf.original_filename)}`;

  return (
    <Card className="group p-4 md:p-5 rounded-2xl bg-card/60 backdrop-blur-sm border border-white/10 hover:border-accent/40 transition-colors flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="h-16 w-12 md:h-20 md:w-16 rounded-md bg-gradient-to-br from-primary/20 to-accent/10 border border-white/10 flex items-center justify-center shrink-0">
          <FileText className="h-6 w-6 md:h-7 md:w-7 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold text-sm md:text-base leading-tight line-clamp-2">
            {pdf.title}
          </h3>
          {pdf.uploader_name && (
            <p className="text-xs text-muted-foreground mt-1 truncate">By {pdf.uploader_name}</p>
          )}
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {new Date(pdf.upload_date).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
        <MaterialStats fileId={pdf.id} size="sm" />
        <div className="flex items-center gap-1.5">
          <Button asChild size="sm" variant="outline" className="rounded-full h-8 px-3 text-xs border-white/10">
            <Link to={viewerHref}>
              <Eye className="h-3.5 w-3.5 mr-1" /> View
            </Link>
          </Button>
          <Button
            size="sm"
            onClick={handleDownload}
            disabled={downloading}
            className="rounded-full h-8 px-3 text-xs bg-gradient-primary text-primary-foreground"
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5 mr-1" />
            )}
            Download
          </Button>
        </div>
      </div>
    </Card>
  );
}
