import * as React from "react";

import { cn } from "@/lib/utils";

interface StatTileProps {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: string;
  /** Renders the value muted, e.g. when it is a "—" placeholder. */
  placeholder?: boolean;
  className?: string;
}

function StatTile({ label, value, unit, placeholder = false, className }: StatTileProps) {
  return (
    <div data-slot="stat-tile" className={cn("bg-paper-2 border-rule-soft rounded-md border px-4 py-3.5", className)}>
      <div className="text-ink-3 mb-1.5 font-mono text-[10px] tracking-[0.1em] uppercase">{label}</div>
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            "font-serif text-[28px] leading-none font-medium tracking-[-0.02em] tabular-nums",
            placeholder ? "text-ink-3/40" : "text-ink",
          )}
        >
          {value}
        </span>
        {unit && <span className="text-ink-3 font-mono text-xs">{unit}</span>}
      </div>
    </div>
  );
}

export { StatTile };
