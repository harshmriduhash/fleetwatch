import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { LayoutGrid, Siren, Settings, LogOut, Radar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/brand";
import { NotificationBell } from "@/components/notifications";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/app/fleet", label: "Fleet", icon: LayoutGrid },
  { to: "/app/incidents", label: "Incidents", icon: Siren },
  { to: "/app/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", search: { mode: "login" } });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Radar className="size-6 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-5">
          <Link to="/app/fleet">
            <Wordmark />
          </Link>
          <nav className="flex flex-1 items-center gap-1">
            {NAV.map((n) => {
              const active = pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-surface text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <n.icon className="size-4" aria-hidden="true" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
              {session.user.email}
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await qc.cancelQueries();
                qc.clear();
                await supabase.auth.signOut();
                navigate({ to: "/", replace: true });
              }}
            >
              <LogOut className="size-4" />
              <span className="sr-only">Sign out</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
