// frontend/src/components/layout/ResizeHandle.tsx
"use client";

import { cn } from "@/lib/utils";

interface ResizeHandleProps {
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}

export function ResizeHandle({ isDragging, onMouseDown }: ResizeHandleProps) {
  return (
    <div
      onMouseDown={onMouseDown}
      className={cn(
        "w-1 shrink-0 cursor-col-resize transition-colors",
        isDragging ? "bg-blue-500/70" : "hover:bg-blue-500/50"
      )}
    />
  );
}
