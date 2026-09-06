import { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MessageSquare, Loader2, Trash2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { avatarPublicUrl } from "@/lib/avatarUrl";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CommentRow {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Props {
  chapterId: string;
  className?: string;
}

/** Discussion thread for a single chapter — students can post and remove their own comments. */
export default function ChapterComments({ chapterId, className }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [comments, setComments] = useState<CommentRow[] | null>(null);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("chapter_comments_public" as any)
      .select("id, user_id, body, created_at, full_name, avatar_url")
      .eq("chapter_id", chapterId)
      .order("created_at", { ascending: false });
    if (error) {
      setComments([]);
      return;
    }
    setComments((data ?? []) as unknown as CommentRow[]);
  }, [chapterId]);

  useEffect(() => {
    setComments(null);
    load();
    const channel = supabase
      .channel(`chapter-comments:${chapterId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chapter_comments", filter: `chapter_id=eq.${chapterId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chapterId, load]);

  const post = async () => {
    if (!user) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    const text = body.trim();
    if (!text) return;
    setPosting(true);
    const { error } = await supabase
      .from("chapter_comments" as any)
      .insert({ chapter_id: chapterId, user_id: user.id, body: text } as any);
    setPosting(false);
    if (error) {
      toast.error("Could not post your comment");
      return;
    }
    setBody("");
    toast.success("Comment posted");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("chapter_comments" as any).delete().eq("id", id);
    if (error) {
      toast.error("Could not delete the comment");
      return;
    }
    toast.success("Comment deleted");
    load();
  };

  return (
    <div className={cn("rounded-2xl border border-white/10 bg-card/50 p-4 md:p-6", className)}>
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg md:text-xl font-bold">Discussion</h2>
        {comments && (
          <span className="text-xs text-muted-foreground">({comments.length})</span>
        )}
      </div>

      <div className="mb-6">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 2000))}
          placeholder={user ? "Ask a question or share a tip…" : "Sign in to join the discussion"}
          rows={3}
          className="rounded-xl bg-background/60 text-base"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[11px] text-muted-foreground">{body.length}/2000</span>
          <Button
            onClick={post}
            disabled={posting || (!!user && !body.trim())}
            className="h-11 px-4 rounded-xl bg-gradient-primary text-primary-foreground font-semibold"
          >
            {posting ? (
              <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Posting…</>
            ) : (
              <><Send className="h-4 w-4 mr-1.5" /> {user ? "Post" : "Sign in"}</>
            )}
          </Button>
        </div>
      </div>

      {comments === null ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet — be the first to share.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => {
            const src = avatarPublicUrl(c.avatar_url);
            const name = c.full_name || "Student";
            return (
              <li key={c.id} className="rounded-xl border border-white/10 bg-background/40 p-3">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-full overflow-hidden bg-gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                    {src ? (
                      <img src={src} alt={name} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold truncate">{name}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words mt-1">
                      {c.body}
                    </p>
                  </div>
                  {user?.id === c.user_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Delete comment"
                      className="h-9 w-9 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(c.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
