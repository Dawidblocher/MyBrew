import { useFormContext, useController } from "react-hook-form";
import { Beer, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { RecipeDraft } from "@/types";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-300">{message}</p>;
}

export function BasicsStep() {
  const { control, register } = useFormContext<RecipeDraft>();
  const { field: nameField, fieldState: nameFieldState } = useController({
    control,
    name: "basics.name",
  });

  const nameError = nameFieldState.error?.message;

  const inputClass = cn(
    "border-white/20 bg-white/10 text-white placeholder:text-white/40",
    "focus-visible:border-purple-400 focus-visible:ring-purple-400/50",
  );

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="basics-name" className="mb-1 text-blue-100/80">
          Nazwa przepisu
        </Label>
        <div className="relative">
          <Beer className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40" />
          <Input
            id="basics-name"
            placeholder="np. Mój pierwszy IPA"
            className={cn(inputClass, "pl-10", nameError && "border-red-400/60")}
            aria-invalid={Boolean(nameError)}
            {...nameField}
          />
        </div>
        <FieldError message={nameError} />
      </div>

      <div>
        <Label htmlFor="basics-style" className="mb-1 text-blue-100/80">
          Styl piwa
        </Label>
        <div className="relative">
          <Tag className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40" />
          <Input
            id="basics-style"
            placeholder="np. American IPA"
            className={cn(inputClass, "pl-10")}
            {...register("basics.style")}
          />
        </div>
        <p className="mt-1 text-xs text-blue-100/50">Opcjonalnie — dowolny tekst.</p>
      </div>
    </div>
  );
}
