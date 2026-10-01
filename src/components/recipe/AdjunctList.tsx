import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { defaultAdjunctEntry } from "@/lib/recipe-schema";
import { AdjunctRow } from "@/components/recipe/AdjunctRow";
import type { RecipeDraft } from "@/types";

export function AdjunctList() {
  const { control } = useFormContext<RecipeDraft>();
  const { fields, append, move, remove } = useFieldArray({ control, name: "adjuncts" });

  return (
    <section className="space-y-3" aria-label="Lista dodatków">
      <div className="flex items-center justify-between">
        <h3 className="text-ink text-sm font-medium">Lista dodatków</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            append({ ...defaultAdjunctEntry });
          }}
        >
          <Plus className="size-4" />
          Dodaj dodatek
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="border-rule bg-paper-2 text-ink-3 rounded-md border border-dashed p-4 text-sm">
          Brak dodatków. Możesz dodać cukier, przyprawy lub inne składniki poza zasypem i chmielem.
        </p>
      ) : (
        <ul className="space-y-3">
          {fields.map((field, index) => (
            <AdjunctRow
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
