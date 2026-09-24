import * as React from "react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface ControlProps {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
}

interface FieldProps {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  className?: string;
  /** A single form control; `Field` wires `id`, `aria-describedby` and `aria-invalid` onto it. */
  children: React.ReactElement<ControlProps>;
}

export function fieldErrorId(id: string) {
  return `${id}-error`;
}

export function fieldHintId(id: string) {
  return `${id}-hint`;
}

function Field({ id, label, hint, error, className, children }: FieldProps) {
  const describedBy = [
    children.props["aria-describedby"],
    hint ? fieldHintId(id) : null,
    error ? fieldErrorId(id) : null,
  ]
    .filter(Boolean)
    .join(" ");

  const control = React.cloneElement(children, {
    id: children.props.id ?? id,
    "aria-describedby": describedBy || undefined,
    "aria-invalid": children.props["aria-invalid"] ?? (error ? true : undefined),
  });

  return (
    <div data-slot="field" className={cn("flex flex-col gap-1", className)}>
      <Label htmlFor={id}>{label}</Label>
      {control}
      {hint && (
        <p id={fieldHintId(id)} className="text-ink-3 text-[11px]">
          {hint}
        </p>
      )}
      {error && (
        <p id={fieldErrorId(id)} className="text-err text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

export { Field };
