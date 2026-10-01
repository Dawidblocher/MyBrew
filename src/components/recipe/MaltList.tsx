import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { defaultMaltEntry } from "@/lib/recipe-schema";
import { MaltRow } from "@/components/recipe/MaltRow";
import type { RecipeDraft } from "@/types";

export function MaltList() {
  const { control } = useFormContext<RecipeDraft>();
  const { fields, append, move, remove } = useFieldArray({ control, name: "malts" });

  return (
    <section className="space-y-3" aria-label="Lista słodów">
      <div className="flex items-center justify-between">
        <h3 className="text-ink text-sm font-medium">Lista słodów</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            append({ ...defaultMaltEntry });
          }}
        >
          <Plus className="size-4" />
          Dodaj słód
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="border-rule bg-paper-2 text-ink-3 rounded-md border border-dashed p-4 text-sm">
          Brak słodów. Dodaj co najmniej jeden słód, aby policzyć BLG i SRM.
        </p>
      ) : (
        <ul className="space-y-3">
          {fields.map((field, index) => (
            <MaltRow
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
