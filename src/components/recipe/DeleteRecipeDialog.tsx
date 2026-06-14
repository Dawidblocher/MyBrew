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
  variant?: "icon" | "button";
}

export function DeleteRecipeDialog({ recipeId, recipeName, variant = "button" }: DeleteRecipeDialogProps) {
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
        {variant === "icon" ? (
          <button
            className="cursor-pointer rounded-lg p-1.5 text-red-300/70 transition-colors hover:bg-red-500/20 hover:text-red-300"
            aria-label="Usuń przepis"
          >
            <Trash2 className="size-4" />
          </button>
        ) : (
          <Button variant="destructive" className="gap-2">
            <Trash2 className="size-4" />
            Usuń przepis
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="border-white/10 bg-slate-900 text-white">
        <DialogHeader>
          <DialogTitle>Usuń przepis</DialogTitle>
          <DialogDescription className="text-blue-100/70">
            Czy na pewno chcesz usunąć &bdquo;{recipeName}&rdquo;? Tej operacji nie można cofnąć.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <DialogFooter>
          <Button
            variant="outline"
            className="border-white/20 bg-transparent text-white hover:bg-white/10"
            onClick={() => {
              setOpen(false);
            }}
            disabled={isDeleting}
          >
            Anuluj
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Usuwanie…" : "Usuń"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
