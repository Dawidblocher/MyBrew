import type { FieldPath, UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import type { RecipeDraft } from "@/types";

export function validateWizardStep<S extends z.ZodType>(
  schema: S,
  values: z.infer<S>,
  form: Pick<UseFormReturn<RecipeDraft>, "clearErrors" | "setError">,
  fieldPaths: FieldPath<RecipeDraft>[],
): boolean {
  const result = schema.safeParse(values);
  if (result.success) {
    fieldPaths.forEach((path) => {
      form.clearErrors(path);
    });
    return true;
  }

  fieldPaths.forEach((path) => {
    form.clearErrors(path);
  });

  let focused = false;
  for (const issue of result.error.issues) {
    if (issue.path.length === 0) continue;
    const path = issue.path.join(".") as FieldPath<RecipeDraft>;
    form.setError(path, { type: "manual", message: issue.message }, { shouldFocus: !focused });
    focused = true;
  }

  return false;
}
