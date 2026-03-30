"use client";

import { cn } from "@/lib/utils";

interface ChipSelectProps {
  options: string[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiSelect?: boolean;
}

export function ChipSelect({ options, value, onChange, multiSelect = false }: ChipSelectProps) {
  const selected = Array.isArray(value) ? value : value ? [value] : [];

  function handleClick(option: string) {
    if (multiSelect) {
      const next = selected.includes(option)
        ? selected.filter((v) => v !== option)
        : [...selected, option];
      onChange(next);
    } else {
      onChange(option);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isSelected = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => handleClick(opt)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
              isSelected
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
