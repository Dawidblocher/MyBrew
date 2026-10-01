import * as React from "react";

import { cn } from "@/lib/utils";

const frameClass =
  "bg-white border-rule text-ink rounded-md border transition-[border-color,box-shadow] aria-invalid:border-err";

const controlClass =
  "placeholder:text-ink-3/60 selection:bg-copper selection:text-white h-9 w-full min-w-0 bg-transparent px-2.5 py-1 text-[13px] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 file:text-ink file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium";

type InputProps = React.ComponentProps<"input"> & {
  /** Unit rendered as a visual suffix inside the frame (hidden from assistive tech). */
  unit?: string;
};

/**
 * Without `unit`, `className` goes to the `<input>` (original contract).
 * With `unit`, the input sits inside a framed wrapper and `className` goes to that wrapper.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input({ className, type, unit, ...props }, ref) {
  if (!unit) {
    return (
      <input
        type={type}
        data-slot="input"
        ref={ref}
        className={cn(frameClass, controlClass, "focus-visible:border-copper", className)}
        {...props}
      />
    );
  }

  return (
    <div
      data-slot="input-frame"
      className={cn(
        frameClass,
        "focus-within:border-copper has-[input[aria-invalid=true]]:border-err has-[input:focus-visible]:outline-copper flex items-center has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2",
        className,
      )}
    >
      <input
        type={type}
        data-slot="input"
        ref={ref}
        className={cn(controlClass, "focus-visible:outline-none")}
        {...props}
      />
      <span aria-hidden="true" className="text-ink-3 shrink-0 pr-2.5 font-mono text-[11px]">
        {unit}
      </span>
    </div>
  );
});

export { Input };
