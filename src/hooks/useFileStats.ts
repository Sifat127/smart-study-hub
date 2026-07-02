import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logRealtimeEvent } from "@/lib/realtimeEventLog";

export type ReactionType = "like" | "dislike" | null;

export interface FileStatsState {
  likes: number;
  dislikes: number;
  views: number;
  mine: ReactionType;
  loading: boolean;
}

/**
 * Combined stats for a single file: likes/dislikes/views + the current user's
 * own reaction. Reads from the public aggregate views (`pdf_reaction_counts`,
 * `pdf_view_counts`) so anonymous visitors still see totals; only the "mine"
 * lookup requires an auth session.
 */
export function useFileStats(fileId: string | null | undefined) {
  const { user } = useAuth();
  const [state, setState] = useState<FileStatsState>({
    likes: 0,
    dislikes: 0,
    views: 0,
    mine: null,
    loading: true,
  });

  const load = useCallback(async () => {
    if (!fileId) return;
    setState((s) => ({ ...s, loading: true }));
    const [reactRes, viewRes, mineRes] = await Promise.all([
      supabase
        .from("pdf_reaction_counts")
        .select("likes, dislikes")
        .eq("file_id", fileId)
        .maybeSingle(),
      supabase
        .from("pdf_view_counts")
        .select("views")
        .eq("file_id", fileId)
        .maybeSingle(),
      user
        ? supabase
            .from("pdf_reactions")
            .select("reaction_type")
            .eq("file_id", fileId)
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null } as any),
    ]);
    setState({
      likes: Number(reactRes.data?.likes ?? 0),
      dislikes: Number(reactRes.data?.dislikes ?? 0),
      views: Number(viewRes.data?.views ?? 0),
      mine: ((mineRes as any).data?.reaction_type as ReactionType) ?? null,
      loading: false,
    });
  }, [fileId, user]);

  useEffect(() => {
    if (!fileId) return;
    load();
  }, [fileId, load]);

  // Live-refresh on reaction/view changes for this specific file so a card that
  // stays mounted reflects other users' activity without a manual reload.
  useEffect(() => {
    if (!fileId) return;
    const channel = supabase
      .channel(`file-stats:${fileId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pdf_reactions", filter: `file_id=eq.${fileId}` },
        (payload) => {
          logRealtimeEvent("file-stats", "pdf_reactions", payload, {
            applied: true,
            extra: `file=${fileId.slice(0, 8)}`,
          });
          load();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pdf_views", filter: `file_id=eq.${fileId}` },
        (payload) => {
          logRealtimeEvent("file-stats", "pdf_views", payload, {
            applied: true,
            extra: `file=${fileId.slice(0, 8)}`,
          });
          load();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fileId, load]);

  const react = useCallback(
    async (next: ReactionType) => {
      if (!fileId || !user) return { error: "auth_required" as const };
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
        await load();
        return { error: error.message };
      }
      return { error: null };
    },
    [fileId, user, load],
  );

  return { ...state, react, refresh: load };
}
