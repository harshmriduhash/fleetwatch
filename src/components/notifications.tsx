import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { relTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Database } from "@/integrations/supabase/types";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: ["notifications"],
    enabled,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
  });
}

const TONE: Record<string, string> = {
  high: "text-incident",
  medium: "text-degraded",
  low: "text-muted-foreground",
};

export function NotificationBell() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const { data: items = [] } = useNotifications(!!session);
  const unread = items.filter((n) => !n.read_at);

  async function markAll() {
    if (unread.length === 0) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in(
        "id",
        unread.map((n) => n.id),
      );
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function markOne(id: string) {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          aria-label={
            unread.length ? `${unread.length} unread notifications` : "Notifications"
          }
        >
          <Bell className="size-4" aria-hidden="true" />
          {unread.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-incident px-1 font-mono text-[10px] leading-4 text-background">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-88 max-w-[min(22rem,90vw)] p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <p className="text-sm font-medium">Notifications</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={markAll}
            disabled={unread.length === 0}
          >
            <CheckCheck className="size-3.5" aria-hidden="true" />
            Mark all read
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Nothing yet. Incidents, pages and postmortem reviews land here.
            </p>
          )}
          <ul className="divide-y divide-border">
            {items.map((n) => (
              <li key={n.id} className={n.read_at ? "opacity-60" : ""}>
                <Link
                  to={n.link ?? "/app/incidents"}
                  onClick={() => void markOne(n.id)}
                  className="block px-3 py-3 transition-colors hover:bg-surface"
                >
                  <p className="flex items-start gap-2 text-sm">
                    {!n.read_at && (
                      <span
                        className={`mt-1.5 size-1.5 shrink-0 rounded-full bg-current ${TONE[n.severity ?? "low"] ?? "text-primary"}`}
                        aria-hidden="true"
                      />
                    )}
                    <span className="min-w-0">{n.title}</span>
                  </p>
                  {n.body && (
                    <p className="mt-1 pl-3.5 text-xs text-muted-foreground">{n.body}</p>
                  )}
                  <p className="mt-1 pl-3.5 font-mono text-[11px] text-muted-foreground">
                    {relTime(n.created_at)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}
