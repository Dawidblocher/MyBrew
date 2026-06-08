import { useFormContext } from "react-hook-form";
import { FlaskConical, Gauge, Thermometer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { RecipeDraft } from "@/types";

const inputClass = cn(
  "border-white/20 bg-white/10 text-white placeholder:text-white/40",
  "focus-visible:border-purple-400 focus-visible:ring-purple-400/50",
);

export function YeastStep() {
  const { register } = useFormContext<RecipeDraft>();

  return (
    <div className="space-y-6">
      <p className="text-sm text-blue-100/60">
        Podaj parametry drożdży — odfermentowanie steruje ABV w panelu metryk na żywo.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="yeast-strain" className="mb-1 text-blue-100/80">
            Szczep
          </Label>
          <div className="relative">
            <FlaskConical className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40" />
            <Input
              id="yeast-strain"
              placeholder="np. US-05"
              className={cn(inputClass, "pl-10")}
              {...register("yeast.strain")}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="yeast-type" className="mb-1 text-blue-100/80">
            Typ
          </Label>
          <Input id="yeast-type" placeholder="np. Ale" className={inputClass} {...register("yeast.type")} />
        </div>

        <div>
          <Label htmlFor="yeast-attenuation" className="mb-1 text-blue-100/80">
            Odfermentowanie (%)
          </Label>
          <div className="relative">
            <Gauge className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40" />
            <Input
              id="yeast-attenuation"
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              max="100"
              placeholder="np. 75"
              className={cn(inputClass, "pl-10")}
              {...register("yeast.attenuationPct", { valueAsNumber: true })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="yeast-ferm-min" className="mb-1 text-blue-100/80">
              Temp. min (°C)
            </Label>
            <div className="relative">
              <Thermometer className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40" />
              <Input
                id="yeast-ferm-min"
                type="number"
                inputMode="decimal"
                step="1"
                placeholder="np. 18"
                className={cn(inputClass, "pl-10")}
                {...register("yeast.fermTempMinC", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="yeast-ferm-max" className="mb-1 text-blue-100/80">
              Temp. max (°C)
            </Label>
            <div className="relative">
              <Thermometer className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40" />
              <Input
                id="yeast-ferm-max"
                type="number"
                inputMode="decimal"
                step="1"
                placeholder="np. 22"
                className={cn(inputClass, "pl-10")}
                {...register("yeast.fermTempMaxC", { valueAsNumber: true })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
