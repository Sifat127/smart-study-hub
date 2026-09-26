import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const REASONS = [
  { value: "broken", label: "Broken / won't open" },
  { value: "outdated", label: "Outdated content" },
  { value: "wrong_content", label: "Wrong file or course" },
  { value: "other", label: "Other" },
] as const;

const schema = z.object({
  reason: z.enum(["broken", "outdated", "wrong_content", "other"]),
  details: z.string().trim().max(1000, "Keep details under 1000 characters"),
});

interface Props {
  itemName: string;
  fileId?: string | null;
  chapterId?: string | null;
  className?: string;
}

export default function ReportPdfButton({ itemName, fileId, chapterId, className }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("broken");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);

  if (!fileId && !chapterId) return null;

  const openDialog = () => {
    if (!user) {
      toast.info("Sign in to report a PDF");
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setOpen(true);
  };

  const submit = async () => {
    const parsed = schema.safeParse({ reason, details });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid report");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("pdf_reports").insert({
      reporter_id: user!.id,
      file_id: fileId ?? null,
      chapter_id: chapterId ?? null,
      item_name: itemName.slice(0, 300),
      reason: parsed.data.reason,
      details: parsed.data.details || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Could not send report", { description: "Please try again." });
      return;
    }
    toast.success("Thanks! An admin will review this PDF.");
    setOpen(false);
    setDetails("");
    setReason("broken");
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={openDialog}
        aria-label={`Report ${itemName}`}
        className={cn("h-8 px-2.5 text-xs rounded-full text-muted-foreground hover:text-destructive", className)}
      >
        <Flag className="h-3.5 w-3.5 mr-1" /> Report
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report this PDF</DialogTitle>
            <DialogDescription className="line-clamp-2">{itemName}</DialogDescription>
          </DialogHeader>
          <RadioGroup value={reason} onValueChange={setReason} className="gap-2">
            {REASONS.map((r) => (
              <Label
                key={r.value}
                htmlFor={`reason-${r.value}`}
                className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer min-h-11"
              >
                <RadioGroupItem id={`reason-${r.value}`} value={r.value} />
                {r.label}
              </Label>
            ))}
          </RadioGroup>
          <div className="space-y-1.5">
            <Label htmlFor="report-details">Details (optional)</Label>
            <Textarea
              id="report-details"
              value={details}
              maxLength={1000}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="e.g. pages 3–5 are blank, or this is last year's syllabus"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="h-11">Cancel</Button>
            <Button onClick={submit} disabled={saving} className="h-11">
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />} Send report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
