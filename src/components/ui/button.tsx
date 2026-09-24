import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const danger = "border-rule bg-white text-err hover:border-err/60 hover:bg-err/5";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md border text-[13px] font-medium tracking-[-0.005em] transition-[background-color,border-color,color,filter] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 aria-invalid:border-err",
  {
    variants: {
      variant: {
        default: "border-rule bg-white text-ink hover:bg-paper-2",
        primary: "border-ink bg-ink text-white hover:bg-ink-2",
        copper: "border-copper bg-copper text-white hover:border-copper-2 hover:bg-copper-2",
        outline: "border-rule bg-transparent text-ink hover:bg-paper-2",
        ghost: "border-transparent bg-transparent text-ink hover:bg-paper-3",
        danger,
        /** @deprecated Alias of `danger`; remove once unused (Phase 6). */
        destructive: danger,
        link: "h-auto border-transparent bg-transparent px-0 text-copper underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3.5 has-[>svg]:px-3",
        sm: "h-8 px-2.5 text-xs has-[>svg]:px-2",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
