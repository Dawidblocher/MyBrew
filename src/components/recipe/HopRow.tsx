import { useFormContext, Controller } from "react-hook-form";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { HopStageSelect } from "@/components/recipe/HopStageSelect";
import type { RecipeDraft } from "@/types";

interface HopRowProps {
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

export function HopRow({ index, isFirst, isLast, onMoveUp, onMoveDown, onRemove }: HopRowProps) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<RecipeDraft>();

  const rowErrors = errors.hops?.[index];
  const position = index + 1;

  return (
    <li className="border-rule rounded-md border bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="grid flex-1 grid-cols-1 gap-3 lg:grid-cols-3">
          <Field
            id={`hop-${index}-name`}
            label="Nazwa chmielu"
            error={rowErrors?.name?.message}
            className="lg:col-span-3"
          >
            <Input placeholder="np. Magnum" {...register(`hops.${index}.name`)} />
          </Field>

          <Field
            id={`hop-${index}-alpha`}
            label={
              <>
                Alfa-kwasy<span className="sr-only"> (%)</span>
              </>
            }
            error={rowErrors?.alphaAcidPercent?.message}
          >
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              max="100"
              placeholder="np. 12"
              unit="%"
              {...register(`hops.${index}.alphaAcidPercent`, { valueAsNumber: true })}
            />
          </Field>

          <Field
            id={`hop-${index}-amount`}
            label={
              <>
                Ilość<span className="sr-only"> (g)</span>
              </>
            }
            error={rowErrors?.amountG?.message}
          >
            <Input
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              placeholder="np. 30"
              unit="g"
              {...register(`hops.${index}.amountG`, { valueAsNumber: true })}
            />
          </Field>

          <Field
            id={`hop-${index}-time`}
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
              placeholder="np. 60"
              unit="min"
              {...register(`hops.${index}.timeMin`, { valueAsNumber: true })}
            />
          </Field>

          <div className="lg:col-span-3">
            <Label htmlFor={`hop-${index}-stage`} className="mb-1">
              Etap
            </Label>
            <Controller
              name={`hops.${index}.stage`}
              control={control}
              render={({ field }) => (
                <HopStageSelect
                  id={`hop-${index}-stage`}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={Boolean(rowErrors?.stage)}
                />
              )}
            />
            {rowErrors?.stage?.message && <p className="text-err mt-1 text-xs">{rowErrors.stage.message}</p>}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-1 pt-6">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onMoveUp}
            disabled={isFirst}
            aria-label={`Przesuń chmiel ${position} w górę`}
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onMoveDown}
            disabled={isLast}
            aria-label={`Przesuń chmiel ${position} w dół`}
          >
            <ArrowDown className="size-4" />
          </Button>
          <Button
            type="button"
            variant="danger"
            size="icon-sm"
            onClick={onRemove}
            aria-label={`Usuń chmiel ${position}`}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}
