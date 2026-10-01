import { useFormContext } from "react-hook-form";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { RecipeDraft } from "@/types";

export function YeastStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<RecipeDraft>();

  const yeastErrors = errors.yeast;

  return (
    <div className="space-y-6">
      <p className="text-ink-3 text-sm">
        Podaj parametry drożdży — odfermentowanie steruje ABV w panelu metryk na żywo.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="yeast-strain" label="Szczep" error={yeastErrors?.strain?.message}>
          <Input placeholder="np. US-05" {...register("yeast.strain")} />
        </Field>

        <Field id="yeast-type" label="Typ" error={yeastErrors?.type?.message}>
          <Input placeholder="np. Ale" {...register("yeast.type")} />
        </Field>

        <Field
          id="yeast-attenuation"
          label={
            <>
              Odfermentowanie<span className="sr-only"> (%)</span>
            </>
          }
          error={yeastErrors?.attenuationPct?.message}
        >
          <Input
            type="number"
            inputMode="decimal"
            step="1"
            min="0"
            max="100"
            placeholder="np. 75"
            unit="%"
            {...register("yeast.attenuationPct", { valueAsNumber: true })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field
            id="yeast-ferm-min"
            label={
              <>
                Temp. min<span className="sr-only"> (°C)</span>
              </>
            }
            error={yeastErrors?.fermTempMinC?.message}
          >
            <Input
              type="number"
              inputMode="decimal"
              step="1"
              placeholder="np. 18"
              unit="°C"
              {...register("yeast.fermTempMinC", { valueAsNumber: true })}
            />
          </Field>

          <Field
            id="yeast-ferm-max"
            label={
              <>
                Temp. max<span className="sr-only"> (°C)</span>
              </>
            }
            error={yeastErrors?.fermTempMaxC?.message}
          >
            <Input
              type="number"
              inputMode="decimal"
              step="1"
              placeholder="np. 22"
              unit="°C"
              {...register("yeast.fermTempMaxC", { valueAsNumber: true })}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
