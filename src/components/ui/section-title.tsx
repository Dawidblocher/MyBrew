import * as React from "react";

import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/ui/eyebrow";

interface SectionTitleProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  as?: "h1" | "h2" | "h3";
  right?: React.ReactNode;
  id?: string;
  className?: string;
}

function SectionTitle({ eyebrow, title, as: Heading = "h2", right, id, className }: SectionTitleProps) {
  return (
    <div
      data-slot="section-title"
      className={cn("border-rule-soft mb-3 flex items-end justify-between gap-4 border-b pb-2.5", className)}
    >
      <div>
        {eyebrow && <Eyebrow className="mb-1">{eyebrow}</Eyebrow>}
        <Heading id={id} className="text-ink font-serif text-[22px] leading-tight font-medium tracking-[-0.02em]">
          {title}
        </Heading>
      </div>
      {right}
    </div>
  );
}

export { SectionTitle };
