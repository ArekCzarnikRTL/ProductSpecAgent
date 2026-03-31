"use client";

import { AlertTriangle } from "lucide-react";

interface BlockerBannerProps {
  summary: string;
  onClick: () => void;
}

export function BlockerBanner({ summary, onClick }: BlockerBannerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left transition-colors hover:bg-amber-500/15"
    >
      <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
      <div>
        <p className="text-xs font-semibold text-amber-500">{summary}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Beantworte die offenen Punkte im Panel rechts
        </p>
      </div>
    </button>
  );
}
