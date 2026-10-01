import { useFormContext } from "react-hook-form";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { RecipeDraft } from "@/types";

interface MaltRowProps {
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

export function MaltRow({ index, isFirst, isLast, onMoveUp, onMoveDown, onRemove }: MaltRowProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext<RecipeDraft>();

  const rowErrors = errors.malts?.[index];
  const position = index + 1;

  return (
    <li className="border-rule rounded-md border bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="grid flex-1 grid-cols-1 gap-3 lg:grid-cols-3">
          <Field
            id={`malt-${index}-name`}
            label="Nazwa słodu"
            error={rowErrors?.name?.message}
            className="lg:col-span-3"
          >
            <Input placeholder="np. Pilzneński" {...register(`malts.${index}.name`)} />
          </Field>

          <Field
            id={`malt-${index}-amount`}
            label={
              <>
                Ilość<span className="sr-only"> (kg)</span>
              </>
            }
            error={rowErrors?.amountKg?.message}
          >
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="np. 5"
              unit="kg"
              {...register(`malts.${index}.amountKg`, { valueAsNumber: true })}
            />
          </Field>

          <Field
            id={`malt-${index}-color`}
            label={
              <>
                Kolor<span className="sr-only"> (EBC)</span>
              </>
            }
            error={rowErrors?.colorEbc?.message}
          >
            <Input
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              placeholder="np. 8"
              unit="EBC"
              {...register(`malts.${index}.colorEbc`, { valueAsNumber: true })}
            />
          </Field>

          <Field
            id={`malt-${index}-extract`}
            label={
              <>
                Ekstrakt<span className="sr-only"> (%)</span>
              </>
            }
            error={rowErrors?.extractPercent?.message}
          >
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              max="100"
              placeholder="np. 80"
              unit="%"
              {...register(`malts.${index}.extractPercent`, { valueAsNumber: true })}
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
            aria-label={`Przesuń słód ${position} w górę`}
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onMoveDown}
            disabled={isLast}
            aria-label={`Przesuń słód ${position} w dół`}
          >
            <ArrowDown className="size-4" />
          </Button>
          <Button type="button" variant="danger" size="icon-sm" onClick={onRemove} aria-label={`Usuń słód ${position}`}>
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}
