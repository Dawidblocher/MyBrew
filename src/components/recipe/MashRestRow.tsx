import { useFormContext } from "react-hook-form";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { RecipeDraft } from "@/types";

interface MashRestRowProps {
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

export function MashRestRow({ index, isFirst, isLast, onMoveUp, onMoveDown, onRemove }: MashRestRowProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext<RecipeDraft>();

  const rowErrors = errors.mash?.rests?.[index];
  const position = index + 1;

  return (
    <li className="border-rule rounded-md border bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="grid flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
          <Field
            id={`mash-rest-${index}-temp`}
            label={
              <>
                Temperatura<span className="sr-only"> (°C)</span>
              </>
            }
            error={rowErrors?.tempC?.message}
          >
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              placeholder="np. 65"
              unit="°C"
              {...register(`mash.rests.${index}.tempC`, { valueAsNumber: true })}
            />
          </Field>

          <Field
            id={`mash-rest-${index}-duration`}
            label={
              <>
                Czas<span className="sr-only"> (min)</span>
              </>
            }
            error={rowErrors?.durationMin?.message}
          >
            <Input
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              placeholder="np. 60"
              unit="min"
              {...register(`mash.rests.${index}.durationMin`, { valueAsNumber: true })}
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
            aria-label={`Przesuń przerwę ${position} w górę`}
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onMoveDown}
            disabled={isLast}
            aria-label={`Przesuń przerwę ${position} w dół`}
          >
            <ArrowDown className="size-4" />
          </Button>
          <Button
            type="button"
            variant="danger"
            size="icon-sm"
            onClick={onRemove}
            aria-label={`Usuń przerwę ${position}`}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}
