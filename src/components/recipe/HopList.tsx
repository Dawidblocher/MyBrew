import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { defaultHopEntry } from "@/lib/recipe-schema";
import { HopRow } from "@/components/recipe/HopRow";
import type { RecipeDraft } from "@/types";

export function HopList() {
  const { control } = useFormContext<RecipeDraft>();
  const { fields, append, move, remove } = useFieldArray({ control, name: "hops" });

  return (
    <section className="space-y-3" aria-label="Lista chmielu">
      <div className="flex items-center justify-between">
        <h3 className="text-ink text-sm font-medium">Lista chmielu</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            append({ ...defaultHopEntry });
          }}
        >
          <Plus className="size-4" />
          Dodaj chmiel
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="border-rule bg-paper-2 text-ink-3 rounded-md border border-dashed p-4 text-sm">
          Brak dodatków chmielu. Dodaj chmiel na gotowanie, aby zobaczyć IBU na żywo.
        </p>
      ) : (
        <ul className="space-y-3">
          {fields.map((field, index) => (
            <HopRow
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
