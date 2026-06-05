import { useFormContext } from "react-hook-form";
import { Droplets, Gauge } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MashRestList } from "@/components/recipe/MashRestList";
import { cn } from "@/lib/utils";
import type { RecipeDraft } from "@/types";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-300">{message}</p>;
}

export function MashStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<RecipeDraft>();

  const efficiencyError = errors.mash?.efficiencyPct?.message;
  const ratioError = errors.mash?.waterToGrainRatio?.message;

  const inputClass = cn(
    "border-white/20 bg-white/10 text-white placeholder:text-white/40",
    "focus-visible:border-purple-400 focus-visible:ring-purple-400/50",
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="mash-efficiency" className="mb-1 text-blue-100/80">
            Wydajność zacierania (%)
          </Label>
          <div className="relative">
            <Gauge className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40" />
            <Input
              id="mash-efficiency"
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              max="100"
              placeholder="np. 75"
              className={cn(inputClass, "pl-10", efficiencyError && "border-red-400/60")}
              aria-invalid={Boolean(efficiencyError)}
              {...register("mash.efficiencyPct", { valueAsNumber: true })}
            />
          </div>
          <FieldError message={efficiencyError} />
        </div>

        <div>
          <Label htmlFor="mash-ratio" className="mb-1 text-blue-100/80">
            Stosunek woda/słód (L/kg)
          </Label>
          <div className="relative">
            <Droplets className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40" />
            <Input
              id="mash-ratio"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              placeholder="np. 3"
              className={cn(inputClass, "pl-10", ratioError && "border-red-400/60")}
              aria-invalid={Boolean(ratioError)}
              {...register("mash.waterToGrainRatio", { valueAsNumber: true })}
            />
          </div>
          <FieldError message={ratioError} />
        </div>
      </div>

      <MashRestList />
    </div>
  );
}
