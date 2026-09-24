import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { srmToHex } from "@/lib/srm-color";

const swatchVariants = cva(
  "border-rule inline-block shrink-0 rounded-full border shadow-[inset_0_-4px_6px_rgba(0,0,0,0.18),inset_0_2px_3px_rgba(255,255,255,0.25)]",
  {
    variants: {
      size: {
        sm: "size-4",
        md: "size-7",
        lg: "size-12",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

interface ColorSwatchProps {
  srm: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function ColorSwatch({ srm, size, className }: ColorSwatchProps) {
  return (
    <span
      data-slot="color-swatch"
      aria-hidden="true"
      className={cn(swatchVariants({ size }), className)}
      style={{ backgroundColor: srmToHex(srm) }}
    />
  );
}

export { ColorSwatch };
