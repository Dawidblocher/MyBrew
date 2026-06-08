import { useFormContext, Controller } from "react-hook-form";
import { ArrowDown, ArrowUp, X } from "lucide-react";
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

interface AdjunctRowProps {
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

export function AdjunctRow({ index, isFirst, isLast, onMoveUp, onMoveDown, onRemove }: AdjunctRowProps) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<RecipeDraft>();

  const rowErrors = errors.adjuncts?.[index];
  const position = index + 1;

  return (
    <li className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start gap-3">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <Label htmlFor={`adjunct-${index}-name`} className="mb-1 text-blue-100/80">
              Nazwa dodatku
            </Label>
            <Input
              id={`adjunct-${index}-name`}
              placeholder="np. Cukier stołowy"
              className={cn(inputClass, rowErrors?.name && "border-red-400/60")}
              aria-invalid={Boolean(rowErrors?.name)}
              {...register(`adjuncts.${index}.name`)}
            />
            <FieldError message={rowErrors?.name?.message} />
          </div>

          <div>
            <Label htmlFor={`adjunct-${index}-stage`} className="mb-1 text-blue-100/80">
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
            <FieldError message={rowErrors?.stage?.message} />
          </div>

          <div>
            <Label htmlFor={`adjunct-${index}-time`} className="mb-1 text-blue-100/80">
              Czas (min)
            </Label>
            <Input
              id={`adjunct-${index}-time`}
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              placeholder="np. 10"
              className={cn(inputClass, rowErrors?.timeMin && "border-red-400/60")}
              aria-invalid={Boolean(rowErrors?.timeMin)}
              {...register(`adjuncts.${index}.timeMin`, { valueAsNumber: true })}
            />
            <FieldError message={rowErrors?.timeMin?.message} />
          </div>

          <div className="sm:col-span-3">
            <Label htmlFor={`adjunct-${index}-notes`} className="mb-1 text-blue-100/80">
              Notatki
            </Label>
            <textarea
              id={`adjunct-${index}-notes`}
              rows={2}
              placeholder="Opcjonalne uwagi"
              className={cn(
                inputClass,
                "flex min-h-[4.5rem] w-full rounded-md border px-3 py-2 text-base md:text-sm",
                rowErrors?.notes && "border-red-400/60",
              )}
              aria-invalid={Boolean(rowErrors?.notes)}
              {...register(`adjuncts.${index}.notes`)}
            />
            <FieldError message={rowErrors?.notes?.message} />
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-1 pt-6">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onMoveUp}
            disabled={isFirst}
            aria-label={`Przesuń dodatek ${position} w górę`}
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
            aria-label={`Przesuń dodatek ${position} w dół`}
            className="size-8 border-white/20 bg-white/5 text-white hover:bg-white/10 disabled:opacity-30"
          >
            <ArrowDown className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onRemove}
            aria-label={`Usuń dodatek ${position}`}
            className="size-8 border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/20"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}
