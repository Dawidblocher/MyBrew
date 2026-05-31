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
        <h3 className="text-sm font-medium text-blue-100/80">Lista słodów</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            append({ ...defaultMaltEntry });
          }}
          className="border-purple-400/40 bg-purple-400/10 text-white hover:bg-purple-400/20"
        >
          <Plus className="size-4" />
          Dodaj słód
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-blue-100/50">
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
