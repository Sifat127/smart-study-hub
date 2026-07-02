import { Eye, ThumbsDown, ThumbsUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useFileStats } from "@/hooks/useFileStats";

interface Props {
  fileId: string | null | undefined;
  size?: "sm" | "md";
  className?: string;
  /** When true, buttons are omitted and only the read-only stat pills are shown. */
  readOnly?: boolean;
}

/**
 * Compact like / dislike / view strip used on catalog cards, chapter cards,
 * and student upload cards. Renders read-only counters when `fileId` is
 * missing so legacy items without a `files.id` still display cleanly.
 */
export default function MaterialStats({ fileId, size = "sm", className, readOnly = false }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { likes, dislikes, views, mine, loading, react } = useFileStats(fileId ?? null);

  const dim = size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-sm";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  const handle = async (target: "like" | "dislike") => {
    if (!fileId) return;
    if (!user) {
      toast.info("Sign in to react to this PDF");
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const next = mine === target ? null : target;
    const { error } = await react(next);
    if (error && error !== "auth_required") toast.error("Could not save your reaction");
  };

  const viewsBadge = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 text-muted-foreground",
        size === "sm" ? "h-8 text-xs" : "h-9 text-sm",
      )}
      title={`${views.toLocaleString()} view${views === 1 ? "" : "s"}`}
    >
      <Eye className={icon} />
      <span className="tabular-nums">{views.toLocaleString()}</span>
    </span>
  );

  if (!fileId || readOnly) {
    return (
      <div className={cn("inline-flex items-center gap-2 flex-wrap", className)} aria-busy={loading}>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 text-muted-foreground",
            size === "sm" ? "h-8 text-xs" : "h-9 text-sm",
          )}
        >
          <ThumbsUp className={icon} />
          <span className="tabular-nums">{fileId ? likes : 0}</span>
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 text-muted-foreground",
            size === "sm" ? "h-8 text-xs" : "h-9 text-sm",
          )}
        >
          <ThumbsDown className={icon} />
          <span className="tabular-nums">{fileId ? dislikes : 0}</span>
        </span>
        {viewsBadge}
      </div>
    );
  }

  return (
    <div
      className={cn("inline-flex items-center gap-2 flex-wrap", className)}
      aria-busy={loading}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => handle("like")}
        aria-pressed={mine === "like"}
        aria-label={`Like, ${likes} like${likes === 1 ? "" : "s"}`}
        className={cn(
          dim,
          "rounded-full border-white/10 gap-1.5 transition-transform active:scale-95",
          mine === "like" && "bg-primary/15 border-primary/40 text-primary hover:bg-primary/20",
        )}
      >
        <ThumbsUp className={cn(icon, mine === "like" && "fill-current")} />
        <span className="tabular-nums">{likes}</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => handle("dislike")}
        aria-pressed={mine === "dislike"}
        aria-label={`Dislike, ${dislikes} dislike${dislikes === 1 ? "" : "s"}`}
        className={cn(
          dim,
          "rounded-full border-white/10 gap-1.5 transition-transform active:scale-95",
          mine === "dislike" &&
            "bg-destructive/15 border-destructive/40 text-destructive hover:bg-destructive/20",
        )}
      >
        <ThumbsDown className={cn(icon, mine === "dislike" && "fill-current")} />
        <span className="tabular-nums">{dislikes}</span>
      </Button>
      {viewsBadge}
    </div>
  );
}
