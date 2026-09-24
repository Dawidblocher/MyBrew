import * as React from "react";

import { cn } from "@/lib/utils";

function Eyebrow({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="eyebrow"
      className={cn("text-ink-3 font-mono text-[10px] tracking-[0.1em] uppercase sm:text-[11px]", className)}
      {...props}
    />
  );
}

export { Eyebrow };
