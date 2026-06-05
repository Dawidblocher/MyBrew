import { useFormContext } from "react-hook-form";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RecipeDraft } from "@/types";

interface MashRestRowProps {
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

const inputClass = cn(
  "border-white/20 bg-white/10 text-white placeholder:text-white/40",
  "focus-visible:border-purple-400 focus-visible:ring-purple-400/50",
);

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-300">{message}</p>;
}

export function MashRestRow({ index, isFirst, isLast, onMoveUp, onMoveDown, onRemove }: MashRestRowProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext<RecipeDraft>();

  const rowErrors = errors.mash?.rests?.[index];
  const position = index + 1;

  return (
    <li className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start gap-3">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={`mash-rest-${index}-temp`} className="mb-1 text-blue-100/80">
              Temperatura (°C)
            </Label>
            <Input
              id={`mash-rest-${index}-temp`}
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              placeholder="np. 65"
              className={cn(inputClass, rowErrors?.tempC && "border-red-400/60")}
              aria-invalid={Boolean(rowErrors?.tempC)}
              {...register(`mash.rests.${index}.tempC`, { valueAsNumber: true })}
            />
            <FieldError message={rowErrors?.tempC?.message} />
          </div>

          <div>
            <Label htmlFor={`mash-rest-${index}-duration`} className="mb-1 text-blue-100/80">
              Czas (min)
            </Label>
            <Input
              id={`mash-rest-${index}-duration`}
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              placeholder="np. 60"
              className={cn(inputClass, rowErrors?.durationMin && "border-red-400/60")}
              aria-invalid={Boolean(rowErrors?.durationMin)}
              {...register(`mash.rests.${index}.durationMin`, { valueAsNumber: true })}
            />
            <FieldError message={rowErrors?.durationMin?.message} />
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-1 pt-6">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onMoveUp}
            disabled={isFirst}
            aria-label={`Przesuń przerwę ${position} w górę`}
            className="size-8 border-white/20 bg-white/5 text-white hover:bg-white/10 disabled:opacity-30"
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onMoveDown}
            disabled={isLast}
            aria-label={`Przesuń przerwę ${position} w dół`}
            className="size-8 border-white/20 bg-white/5 text-white hover:bg-white/10 disabled:opacity-30"
          >
            <ArrowDown className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onRemove}
            aria-label={`Usuń przerwę ${position}`}
            className="size-8 border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/20"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}
