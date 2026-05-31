import { useFormContext } from "react-hook-form";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RecipeDraft } from "@/types";

interface MaltRowProps {
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

export function MaltRow({ index, isFirst, isLast, onMoveUp, onMoveDown, onRemove }: MaltRowProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext<RecipeDraft>();

  const rowErrors = errors.malts?.[index];
  const position = index + 1;

  return (
    <li className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start gap-3">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <Label htmlFor={`malt-${index}-name`} className="mb-1 text-blue-100/80">
              Nazwa słodu
            </Label>
            <Input
              id={`malt-${index}-name`}
              placeholder="np. Pilzneński"
              className={cn(inputClass, rowErrors?.name && "border-red-400/60")}
              aria-invalid={Boolean(rowErrors?.name)}
              {...register(`malts.${index}.name`)}
            />
            <FieldError message={rowErrors?.name?.message} />
          </div>

          <div>
            <Label htmlFor={`malt-${index}-amount`} className="mb-1 text-blue-100/80">
              Ilość (kg)
            </Label>
            <Input
              id={`malt-${index}-amount`}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="np. 5"
              className={cn(inputClass, rowErrors?.amountKg && "border-red-400/60")}
              aria-invalid={Boolean(rowErrors?.amountKg)}
              {...register(`malts.${index}.amountKg`, { valueAsNumber: true })}
            />
            <FieldError message={rowErrors?.amountKg?.message} />
          </div>

          <div>
            <Label htmlFor={`malt-${index}-color`} className="mb-1 text-blue-100/80">
              Kolor (EBC)
            </Label>
            <Input
              id={`malt-${index}-color`}
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              placeholder="np. 8"
              className={cn(inputClass, rowErrors?.colorEbc && "border-red-400/60")}
              aria-invalid={Boolean(rowErrors?.colorEbc)}
              {...register(`malts.${index}.colorEbc`, { valueAsNumber: true })}
            />
            <FieldError message={rowErrors?.colorEbc?.message} />
          </div>

          <div>
            <Label htmlFor={`malt-${index}-extract`} className="mb-1 text-blue-100/80">
              Ekstrakt (%)
            </Label>
            <Input
              id={`malt-${index}-extract`}
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              max="100"
              placeholder="np. 80"
              className={cn(inputClass, rowErrors?.extractPercent && "border-red-400/60")}
              aria-invalid={Boolean(rowErrors?.extractPercent)}
              {...register(`malts.${index}.extractPercent`, { valueAsNumber: true })}
            />
            <FieldError message={rowErrors?.extractPercent?.message} />
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-1 pt-6">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onMoveUp}
            disabled={isFirst}
            aria-label={`Przesuń słód ${position} w górę`}
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
            aria-label={`Przesuń słód ${position} w dół`}
            className="size-8 border-white/20 bg-white/5 text-white hover:bg-white/10 disabled:opacity-30"
          >
            <ArrowDown className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onRemove}
            aria-label={`Usuń słód ${position}`}
            className="size-8 border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/20"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}
