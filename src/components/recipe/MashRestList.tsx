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
        <h3 className="text-ink text-sm font-medium">Przerwy zacierania</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            append({ ...defaultMashRest });
          }}
        >
          <Plus className="size-4" />
          Dodaj przerwę
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="border-rule bg-paper-2 text-ink-3 rounded-md border border-dashed p-4 text-sm">
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
