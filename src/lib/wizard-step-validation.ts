import type { FieldPath, UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import type { RecipeDraft } from "@/types";

export function validateWizardStep<S extends z.ZodType>(
  schema: S,
  values: z.infer<S>,
  form: UseFormReturn<RecipeDraft>,
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

  for (const issue of result.error.issues) {
    const path = issue.path.join(".") as FieldPath<RecipeDraft>;
    if (fieldPaths.includes(path)) {
      form.setError(path, { type: "manual", message: issue.message, shouldFocus: true });
    }
  }

  return false;
}
