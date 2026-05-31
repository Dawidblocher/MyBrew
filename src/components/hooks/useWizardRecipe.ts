import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { RecipeDraft } from "@/types";
import { defaultMaltEntry, defaultRecipeDraft, recipeDraftSchema } from "@/lib/recipe-schema";

export function useWizardRecipe() {
  const form = useForm<RecipeDraft>({
    resolver: zodResolver(recipeDraftSchema),
    defaultValues: defaultRecipeDraft,
    mode: "onSubmit",
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
