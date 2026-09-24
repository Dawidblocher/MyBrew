import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-md font-mono font-medium tracking-[0.04em] uppercase",
  {
    variants: {
      tone: {
        neutral: "bg-chip text-chip-ink",
        ok: "bg-ok/15 text-[#3d5529]",
        warn: "bg-warn/15 text-[#7a4617]",
        err: "bg-err/12 text-[#7e2b1e]",
        ink: "bg-ink text-white",
        copper: "bg-copper/15 text-[#7a3f1b]",
        hop: "bg-hop/15 text-[#3f5529]",
      },
      size: {
        default: "px-2 py-0.5 text-[11px]",
        sm: "px-1.5 py-px text-[10px]",
      },
    },
    defaultVariants: {
      tone: "neutral",
      size: "default",
    },
  },
);

function Badge({ className, tone, size, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
