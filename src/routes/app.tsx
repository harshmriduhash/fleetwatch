import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Fleetwatch console" },
      { name: "description", content: "Monitor agent health, SLAs and incidents." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppShell,
});
