import { useFormContext } from "react-hook-form";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SectionTitle } from "@/components/ui/section-title";
import { MashRestList } from "@/components/recipe/MashRestList";
import type { RecipeDraft } from "@/types";

export function MashStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<RecipeDraft>();

  const efficiencyError = errors.mash?.efficiencyPct?.message;
  const ratioError = errors.mash?.waterToGrainRatio?.message;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <SectionTitle eyebrow="Zacieranie" title="Parametry" as="h3" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="mash-efficiency"
            label={
              <>
                Wydajność zacierania<span className="sr-only"> (%)</span>
              </>
            }
            error={efficiencyError}
          >
            <Input
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              max="100"
              placeholder="np. 75"
              unit="%"
              {...register("mash.efficiencyPct", { valueAsNumber: true })}
            />
          </Field>

          <Field
            id="mash-ratio"
            label={
              <>
                Stosunek woda/słód<span className="sr-only"> (L/kg)</span>
              </>
            }
            error={ratioError}
          >
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              placeholder="np. 3"
              unit="L/kg"
              {...register("mash.waterToGrainRatio", { valueAsNumber: true })}
            />
          </Field>
        </div>
      </section>

      <MashRestList />
    </div>
  );
}
