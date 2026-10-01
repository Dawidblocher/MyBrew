import { useFormContext } from "react-hook-form";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SectionTitle } from "@/components/ui/section-title";
import { MaltList } from "@/components/recipe/MaltList";
import type { RecipeDraft } from "@/types";

export function GristStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<RecipeDraft>();

  const volumeError = errors.batch?.volumeL?.message;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <SectionTitle eyebrow="Warka" title="Objętość" as="h3" />
        <Field
          id="batch-volume"
          label={
            <>
              Objętość warki<span className="sr-only"> (L)</span>
            </>
          }
          error={volumeError}
        >
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            placeholder="np. 20"
            unit="L"
            {...register("batch.volumeL", { valueAsNumber: true })}
          />
        </Field>
      </section>

      <MaltList />
    </div>
  );
}
