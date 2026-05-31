import { useFormContext } from "react-hook-form";
import { FlaskConical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MaltList } from "@/components/recipe/MaltList";
import { cn } from "@/lib/utils";
import type { RecipeDraft } from "@/types";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-300">{message}</p>;
}

export function GristStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<RecipeDraft>();

  const volumeError = errors.batch?.volumeL?.message;

  const inputClass = cn(
    "border-white/20 bg-white/10 text-white placeholder:text-white/40",
    "focus-visible:border-purple-400 focus-visible:ring-purple-400/50",
  );

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="batch-volume" className="mb-1 text-blue-100/80">
          Objętość warki (L)
        </Label>
        <div className="relative">
          <FlaskConical className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40" />
          <Input
            id="batch-volume"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            placeholder="np. 20"
            className={cn(inputClass, "pl-10", volumeError && "border-red-400/60")}
            aria-invalid={Boolean(volumeError)}
            {...register("batch.volumeL", { valueAsNumber: true })}
          />
        </div>
        <FieldError message={volumeError} />
      </div>

      <MaltList />
    </div>
  );
}
