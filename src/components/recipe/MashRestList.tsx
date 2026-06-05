import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { defaultMashRest } from "@/lib/recipe-schema";
import { MashRestRow } from "@/components/recipe/MashRestRow";
import type { RecipeDraft } from "@/types";

export function MashRestList() {
  const { control } = useFormContext<RecipeDraft>();
  const { fields, append, move, remove } = useFieldArray({ control, name: "mash.rests" });

  return (
    <section className="space-y-3" aria-label="Lista przerw zacierania">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-blue-100/80">Przerwy zacierania</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            append({ ...defaultMashRest });
          }}
          className="border-purple-400/40 bg-purple-400/10 text-white hover:bg-purple-400/20"
        >
          <Plus className="size-4" />
          Dodaj przerwę
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-blue-100/50">
          Brak przerw zacierania. Możesz dodać przerwy temperaturowe lub przejść dalej.
        </p>
      ) : (
        <ul className="space-y-3">
          {fields.map((field, index) => (
            <MashRestRow
              key={field.id}
              index={index}
              isFirst={index === 0}
              isLast={index === fields.length - 1}
              onMoveUp={() => {
                move(index, index - 1);
              }}
              onMoveDown={() => {
                move(index, index + 1);
              }}
              onRemove={() => {
                remove(index);
              }}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
