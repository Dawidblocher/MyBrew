import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DeleteRecipeDialogProps {
  recipeId: string;
  recipeName: string;
}

export function DeleteRecipeDialog({ recipeId, recipeName }: DeleteRecipeDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/recipes/${recipeId}`, { method: "DELETE" });
      if (response.status === 204) {
        window.location.href = "/recipes";
        return;
      }
      if (response.status === 401) {
        window.location.href = "/auth/signin";
        return;
      }
      setError("Nie udało się usunąć przepisu. Spróbuj ponownie.");
    } catch {
      setError("Nie udało się połączyć z serwerem. Spróbuj ponownie.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="danger" size="sm">
          <Trash2 className="size-4" />
          Usuń przepis
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Usuń przepis</DialogTitle>
          <DialogDescription>
            Czy na pewno chcesz usunąć &bdquo;{recipeName}&rdquo;? Tej operacji nie można cofnąć.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-err text-sm">{error}</p>}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
            }}
            disabled={isDeleting}
          >
            Anuluj
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Usuwanie…" : "Usuń"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
