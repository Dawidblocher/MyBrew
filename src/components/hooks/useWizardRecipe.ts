import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { RecipeDraft } from "@/types";
import { defaultMaltEntry, defaultRecipeDraft, recipeDraftSchema } from "@/lib/recipe-schema";

export function useWizardRecipe() {
  const form = useForm<RecipeDraft>({
    // zodResolver infers `unknown` inputs for `z.coerce.number()` fields; the
    // form binds them via `valueAsNumber`, so assert the resolver to the draft.
    resolver: zodResolver(recipeDraftSchema) as Resolver<RecipeDraft>,
    defaultValues: defaultRecipeDraft,
    mode: "onTouched",
  });

  const malts = useFieldArray({
    control: form.control,
    name: "malts",
  });

  return {
    form,
    malts: {
      ...malts,
      appendEmpty: () => {
        malts.append({ ...defaultMaltEntry });
      },
    },
  };
}
