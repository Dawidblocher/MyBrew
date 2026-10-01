import type { MouseEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SaveValidationError } from "@/lib/recipe-save";

interface WizardFooterProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  isSaving: boolean;
  onBack: () => void;
  onNext: () => void;
  onSave: () => void;
  cancelHref: string;
  onCancel: (event: MouseEvent<HTMLAnchorElement>) => void;
  saveErrors: SaveValidationError[];
  genericSaveError: string | null;
}

export function WizardFooter({
  isFirstStep,
  isLastStep,
  isSaving,
  onBack,
  onNext,
  onSave,
  cancelHref,
  onCancel,
  saveErrors,
  genericSaveError,
}: WizardFooterProps) {
  const hasError = saveErrors.length > 0 || Boolean(genericSaveError);

  return (
    <footer className="border-rule bg-paper-2 sticky bottom-0 flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div className="min-w-0 flex-1 text-sm">
        {hasError ? (
          <div role="alert" className="text-err">
            {genericSaveError ? (
              <p>{genericSaveError}</p>
            ) : (
              <ul className="list-inside list-disc space-y-0.5">
                {saveErrors.map((err) => (
                  <li key={`${err.field}-${err.message}`}>{err.message}</li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-ink-3 font-mono text-xs">Zmiany zapisują się dopiero po kliknięciu Zapisz</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button asChild variant="ghost">
          <a href={cancelHref} onClick={onCancel}>
            Anuluj
          </a>
        </Button>
        <Button type="button" variant="outline" onClick={onBack} disabled={isFirstStep}>
          <ChevronLeft className="size-4" />
          Wstecz
        </Button>
        {isLastStep ? (
          <Button type="button" variant="copper" onClick={onSave} disabled={isSaving}>
            {isSaving ? "Zapisywanie…" : "Zapisz przepis"}
          </Button>
        ) : (
          <Button type="button" variant="primary" onClick={onNext}>
            Dalej
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </footer>
  );
}
