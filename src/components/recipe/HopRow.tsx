import { useFormContext, Controller } from "react-hook-form";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { HopStageSelect } from "@/components/recipe/HopStageSelect";
import { cn } from "@/lib/utils";
import type { RecipeDraft } from "@/types";

interface HopRowProps {
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

export function HopRow({ index, isFirst, isLast, onMoveUp, onMoveDown, onRemove }: HopRowProps) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<RecipeDraft>();

  const rowErrors = errors.hops?.[index];
  const position = index + 1;

  return (
    <li className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start gap-3">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <Label htmlFor={`hop-${index}-name`} className="mb-1 text-blue-100/80">
              Nazwa chmielu
            </Label>
            <Input
              id={`hop-${index}-name`}
              placeholder="np. Magnum"
              className={cn(inputClass, rowErrors?.name && "border-red-400/60")}
              aria-invalid={Boolean(rowErrors?.name)}
              {...register(`hops.${index}.name`)}
            />
            <FieldError message={rowErrors?.name?.message} />
          </div>

          <div>
            <Label htmlFor={`hop-${index}-alpha`} className="mb-1 text-blue-100/80">
              Alfa-kwasy (%)
            </Label>
            <Input
              id={`hop-${index}-alpha`}
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              max="100"
              placeholder="np. 12"
              className={cn(inputClass, rowErrors?.alphaAcidPercent && "border-red-400/60")}
              aria-invalid={Boolean(rowErrors?.alphaAcidPercent)}
              {...register(`hops.${index}.alphaAcidPercent`, { valueAsNumber: true })}
            />
            <FieldError message={rowErrors?.alphaAcidPercent?.message} />
          </div>

          <div>
            <Label htmlFor={`hop-${index}-amount`} className="mb-1 text-blue-100/80">
              Ilość (g)
            </Label>
            <Input
              id={`hop-${index}-amount`}
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              placeholder="np. 30"
              className={cn(inputClass, rowErrors?.amountG && "border-red-400/60")}
              aria-invalid={Boolean(rowErrors?.amountG)}
              {...register(`hops.${index}.amountG`, { valueAsNumber: true })}
            />
            <FieldError message={rowErrors?.amountG?.message} />
          </div>

          <div>
            <Label htmlFor={`hop-${index}-time`} className="mb-1 text-blue-100/80">
              Czas (min)
            </Label>
            <Input
              id={`hop-${index}-time`}
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              placeholder="np. 60"
              className={cn(inputClass, rowErrors?.timeMin && "border-red-400/60")}
              aria-invalid={Boolean(rowErrors?.timeMin)}
              {...register(`hops.${index}.timeMin`, { valueAsNumber: true })}
            />
            <FieldError message={rowErrors?.timeMin?.message} />
          </div>

          <div className="sm:col-span-3">
            <Label htmlFor={`hop-${index}-stage`} className="mb-1 text-blue-100/80">
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
            <FieldError message={rowErrors?.stage?.message} />
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-1 pt-6">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onMoveUp}
            disabled={isFirst}
            aria-label={`Przesuń chmiel ${position} w górę`}
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
            aria-label={`Przesuń chmiel ${position} w dół`}
            className="size-8 border-white/20 bg-white/5 text-white hover:bg-white/10 disabled:opacity-30"
          >
            <ArrowDown className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onRemove}
            aria-label={`Usuń chmiel ${position}`}
            className="size-8 border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/20"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}
