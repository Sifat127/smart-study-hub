import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ReactionType = "like" | "dislike" | null;

export interface ReactionState {
  likes: number;
  dislikes: number;
  mine: ReactionType;
  loading: boolean;
}

/**
 * Reactions for a single PDF (files.id).
 * - Counts come from the public `pdf_reaction_counts` view (anyone can read).
 * - "My" reaction comes from `pdf_reactions` (RLS allows anyone to read; clients can only mutate their own row).
 * - Mutations go through the `set_pdf_reaction` SECURITY DEFINER RPC, which atomically inserts / updates / deletes.
 */
export function useFileReactions(fileId: string | null | undefined) {
  const { user } = useAuth();
  const [state, setState] = useState<ReactionState>({
    likes: 0,
    dislikes: 0,
    mine: null,
    loading: true,
  });

  const load = useCallback(async () => {
    if (!fileId) return;
    setState((s) => ({ ...s, loading: true }));
    const countsP = supabase
      .from("pdf_reaction_counts")
      .select("likes, dislikes")
      .eq("file_id", fileId)
      .maybeSingle();
    const mineP = user
      ? supabase
          .from("pdf_reactions")
          .select("reaction_type")
          .eq("file_id", fileId)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as const);

    const [counts, mine] = await Promise.all([countsP, mineP]);
    setState({
      likes: Number(counts.data?.likes ?? 0),
      dislikes: Number(counts.data?.dislikes ?? 0),
      mine: (mine.data?.reaction_type as ReactionType) ?? null,
      loading: false,
    });
  }, [fileId, user]);

  useEffect(() => {
    if (!fileId) return;
    load();
  }, [fileId, load]);

  const react = useCallback(
    async (next: ReactionType) => {
      if (!fileId || !user) return { error: "auth_required" as const };
      // Optimistic update.
      setState((s) => {
        let { likes, dislikes } = s;
        if (s.mine === "like") likes -= 1;
        if (s.mine === "dislike") dislikes -= 1;
        if (next === "like") likes += 1;
        if (next === "dislike") dislikes += 1;
        return { ...s, likes, dislikes, mine: next };
      });
      const { error } = await supabase.rpc("set_pdf_reaction", {
        _file_id: fileId,
        _reaction: next,
      });
      if (error) {
        // Revert on failure.
        await load();
        return { error: error.message };
      }
      return { error: null };
    },
    [fileId, user, load],
  );

  return { ...state, react, refresh: load };
}
