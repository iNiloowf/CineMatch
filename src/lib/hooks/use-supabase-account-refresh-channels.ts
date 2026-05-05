"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

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

    /** Scoped filters so the browser gets relevant rows immediately (full-table fan-out can lag). */
    const filterAsRequester = `requester_id=eq.${currentUserId}`;
    const filterAsTarget = `target_id=eq.${currentUserId}`;

    const linkedChannel = supabase
      .channel(`linked-users-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "linked_users",
          filter: filterAsRequester,
        },
        bump,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "linked_users",
          filter: filterAsTarget,
        },
        bump,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(linkedChannel);
    };
  }, [currentUserId]);
}
