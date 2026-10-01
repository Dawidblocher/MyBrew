import { useFormContext, Controller } from "react-hook-form";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StyledSelect } from "@/components/recipe/StyledSelect";
import { cn } from "@/lib/utils";
import type { AdjunctStage, RecipeDraft } from "@/types";

const ADJUNCT_STAGE_OPTIONS: { value: AdjunctStage; label: string }[] = [
  { value: "mash", label: "Zacieranie" },
  { value: "boil", label: "Gotowanie" },
  { value: "whirlpool", label: "Whirlpool" },
  { value: "fermentation", label: "Fermentacja" },
];

const textareaClass = cn(
  "border-rule bg-white text-ink placeholder:text-ink-3/60 focus-visible:border-copper aria-invalid:border-err",
  "flex min-h-[4.5rem] w-full rounded-md border px-2.5 py-2 text-[13px] outline-none",
);

interface AdjunctRowProps {
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

export function AdjunctRow({ index, isFirst, isLast, onMoveUp, onMoveDown, onRemove }: AdjunctRowProps) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<RecipeDraft>();

  const rowErrors = errors.adjuncts?.[index];
  const position = index + 1;

  return (
    <li className="border-rule rounded-md border bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="grid flex-1 grid-cols-1 gap-3 lg:grid-cols-3">
          <Field
            id={`adjunct-${index}-name`}
            label="Nazwa dodatku"
            error={rowErrors?.name?.message}
            className="lg:col-span-3"
          >
            <Input placeholder="np. Cukier stołowy" {...register(`adjuncts.${index}.name`)} />
          </Field>

          <div>
            <Label htmlFor={`adjunct-${index}-stage`} className="mb-1">
              Etap
            </Label>
            <Controller
              name={`adjuncts.${index}.stage`}
              control={control}
              render={({ field }) => (
                <StyledSelect
                  id={`adjunct-${index}-stage`}
                  value={field.value}
                  options={ADJUNCT_STAGE_OPTIONS}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={Boolean(rowErrors?.stage)}
                />
              )}
            />
            {rowErrors?.stage?.message && <p className="text-err mt-1 text-xs">{rowErrors.stage.message}</p>}
          </div>

          <Field
            id={`adjunct-${index}-time`}
            label={
              <>
                Czas<span className="sr-only"> (min)</span>
              </>
            }
            error={rowErrors?.timeMin?.message}
          >
            <Input
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              placeholder="np. 10"
              unit="min"
              {...register(`adjuncts.${index}.timeMin`, { valueAsNumber: true })}
            />
          </Field>

          <Field
            id={`adjunct-${index}-notes`}
            label="Notatki"
            hint="Opcjonalne"
            error={rowErrors?.notes?.message}
            className="lg:col-span-3"
          >
            <textarea
              rows={2}
              placeholder="Opcjonalne uwagi"
              className={textareaClass}
              {...register(`adjuncts.${index}.notes`)}
            />
          </Field>
        </div>

        <div className="flex shrink-0 flex-col gap-1 pt-6">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onMoveUp}
            disabled={isFirst}
            aria-label={`Przesuń dodatek ${position} w górę`}
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onMoveDown}
            disabled={isLast}
            aria-label={`Przesuń dodatek ${position} w dół`}
          >
            <ArrowDown className="size-4" />
          </Button>
          <Button
            type="button"
            variant="danger"
            size="icon-sm"
            onClick={onRemove}
            aria-label={`Usuń dodatek ${position}`}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}
