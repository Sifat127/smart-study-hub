import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useFileReactions } from "@/hooks/useFileReactions";
import { toast } from "sonner";

interface Props {
  fileId: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Animated like/dislike pair. Reads counts publicly; mutations require auth
 * (toast + redirect prompt when guests click).
 */
export default function ReactionButtons({ fileId, size = "md", className }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { likes, dislikes, mine, loading, react } = useFileReactions(fileId);

  const handle = async (target: "like" | "dislike") => {
    if (!user) {
      toast.info("Sign in to react to PDFs");
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    // Toggle off if the user re-clicks the same button.
    const next = mine === target ? null : target;
    const { error } = await react(next);
    if (error && error !== "auth_required") toast.error("Could not save your reaction");
  };

  const dim = size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-sm";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div className={cn("inline-flex items-center gap-2", className)} aria-busy={loading}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => handle("like")}
        aria-pressed={mine === "like"}
        aria-label={`Like, ${likes} ${likes === 1 ? "like" : "likes"}`}
        className={cn(
          dim,
          "rounded-full border-white/10 gap-1.5 transition-transform active:scale-95",
          mine === "like" &&
            "bg-primary/15 border-primary/40 text-primary hover:bg-primary/20",
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
        aria-label={`Dislike, ${dislikes} ${dislikes === 1 ? "dislike" : "dislikes"}`}
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
    </div>
  );
}
