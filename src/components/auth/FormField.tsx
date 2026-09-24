import type { AriaAttributes, HTMLInputAutoCompleteAttribute, ReactNode } from "react";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  id: string;
  name?: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: HTMLInputAutoCompleteAttribute;
  error?: string;
  hint?: string;
  endContent?: ReactNode;
}

interface FormInputProps extends Omit<FormFieldProps, "label" | "error" | "hint"> {
  "aria-describedby"?: string;
  "aria-invalid"?: AriaAttributes["aria-invalid"];
}

/** Receives `id`, `aria-describedby` and `aria-invalid` from `Field` and forwards them to the `<input>`. */
function FormInput({ id, name, type = "text", value, onChange, endContent, ...rest }: FormInputProps) {
  return (
    <div className="relative">
      <Input
        id={id}
        name={name ?? id}
        type={type}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        className={cn(endContent && "pr-10")}
        {...rest}
      />
      {endContent}
    </div>
  );
}

export function FormField({ label, error, hint, ...inputProps }: FormFieldProps) {
  return (
    <Field id={inputProps.id} label={label} error={error} hint={hint}>
      <FormInput {...inputProps} />
    </Field>
  );
}
