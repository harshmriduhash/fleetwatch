import { CheckCircle2, AlertTriangle, Siren, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type HealthState = "healthy" | "degraded" | "incident";

const MAP: Record<HealthState, { label: string; icon: LucideIcon; dot: string; text: string; ring: string }> = {
  healthy: {
    label: "Healthy",
    icon: CheckCircle2,
    dot: "bg-healthy",
    text: "text-healthy",
    ring: "border-healthy/30 bg-healthy/10",
  },
  degraded: {
    label: "Degraded",
    icon: AlertTriangle,
    dot: "bg-degraded",
    text: "text-degraded",
    ring: "border-degraded/30 bg-degraded/10",
  },
  incident: {
    label: "Incident",
    icon: Siren,
    dot: "bg-incident",
    text: "text-incident",
    ring: "border-incident/30 bg-incident/10",
  },
};

/**
 * Status is never conveyed by color alone: dot + icon + text label always ship
 * together (WCAG 2.1 AA, and an on-call engineer misreading a tile has real
 * operational consequences).
 */
export function StatusPill({
  state,
  className,
  label,
}: {
  state: HealthState;
  className?: string;
  label?: string;
}) {
  const cfg = MAP[state];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        cfg.ring,
        cfg.text,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label ?? cfg.label}
    </span>
  );
}

export function StatusDot({ state, pulse }: { state: HealthState; pulse?: boolean }) {
  const cfg = MAP[state];
  return (
    <span className="relative inline-flex size-2.5" aria-hidden="true">
      {pulse && (
        <span className={cn("absolute inset-0 rounded-full animate-ping-soft", cfg.dot)} />
      )}
      <span className={cn("relative inline-flex size-2.5 rounded-full", cfg.dot)} />
    </span>
  );
}

export function statusLabel(state: HealthState) {
  return MAP[state].label;
}
