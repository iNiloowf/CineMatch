"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Row = Record<string, string | undefined>;

/**
 * Subscribes to Supabase tables that should pull a fresh `/api/account-sync`
 * payload when rows touching the signed-in user change.
 */
export function useSupabaseAccountRefreshChannels(
  currentUserId: string | null,
  onRefresh: () => void,
) {
  const onRefreshRef = useRef(onRefresh);
  useLayoutEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !currentUserId) {
      return;
    }

    const bump = () => {
      onRefreshRef.current();
    };

    const linkedChannel = supabase
      .channel(`linked-users-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "linked_users",
        },
        (payload) => {
          const nextRow = payload.new as Row | null;
          const previousRow = payload.old as Row | null;
          const touchesCurrentUser =
            nextRow?.requester_id === currentUserId ||
            nextRow?.target_id === currentUserId ||
            previousRow?.requester_id === currentUserId ||
            previousRow?.target_id === currentUserId;

          if (touchesCurrentUser) {
            bump();
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(linkedChannel);
    };
  }, [currentUserId]);
}
