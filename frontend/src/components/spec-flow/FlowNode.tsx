"use client";

import type { FlowNode as FlowNodeData } from "./editor";
import type { StepStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<StepStatus, { border: string; badge: string; badgeText: string }> = {
  OPEN: { border: "border-border", badge: "bg-muted text-muted-foreground", badgeText: "Open" },
  IN_PROGRESS: { border: "border-primary", badge: "bg-primary text-primary-foreground", badgeText: "In Progress" },
  COMPLETED: { border: "border-[oklch(0.65_0.15_160)]", badge: "bg-[oklch(0.65_0.15_160)] text-black", badgeText: "Done" },
};

export function FlowNodeComponent({ data }: { data: FlowNodeData }) {
  const styles = STATUS_STYLES[data.status] ?? STATUS_STYLES.OPEN;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-lg border-2 px-4 py-3",
        "min-w-[140px] cursor-pointer select-none transition-colors bg-card",
        styles.border
      )}
      style={{ width: data.width, height: data.height }}
    >
      <span className="text-sm font-semibold leading-tight text-foreground">{data.label}</span>
      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium leading-none", styles.badge)}>
        {styles.badgeText}
      </span>
    </div>
  );
}
