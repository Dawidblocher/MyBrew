import { useFormContext, useController } from "react-hook-form";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { RecipeDraft } from "@/types";

export function BasicsStep() {
  const { control } = useFormContext<RecipeDraft>();
  const { field: nameField, fieldState: nameFieldState } = useController({
    control,
    name: "basics.name",
  });
  const { field: styleField, fieldState: styleFieldState } = useController({
    control,
    name: "basics.style",
  });

  return (
    <div className="space-y-4">
      <Field id="basics-name" label="Nazwa przepisu" error={nameFieldState.error?.message}>
        <Input placeholder="np. Mój pierwszy IPA" {...nameField} />
      </Field>

      <Field id="basics-style" label="Styl piwa" error={styleFieldState.error?.message}>
        <Input placeholder="np. American IPA" {...styleField} />
      </Field>
    </div>
  );
}
