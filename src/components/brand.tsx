import { cn } from "@/lib/utils";

export function FleetwatchMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex size-7 items-center justify-center rounded-md border border-border bg-surface",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="size-5">
        <circle
          cx="12"
          cy="12"
          r="8.5"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="1.5"
          className="text-muted-foreground"
        />
        <path
          d="M12 12 L12 3.5 A8.5 8.5 0 0 1 19.4 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="text-primary"
        />
        <circle cx="12" cy="12" r="1.7" className="fill-primary" />
      </svg>
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <FleetwatchMark />
      <span className="text-[15px] font-semibold tracking-tight">Fleetwatch</span>
    </span>
  );
}
