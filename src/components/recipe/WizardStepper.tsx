import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface WizardStepConfig {
  id: string;
  label: string;
}

interface WizardStepperProps {
  steps: WizardStepConfig[];
  currentIndex: number;
  onBack: () => void;
  onNext: () => void;
  onSave?: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  isSaving?: boolean;
  children: ReactNode;
}

export function WizardStepper({
  steps,
  currentIndex,
  onBack,
  onNext,
  onSave,
  isFirstStep,
  isLastStep,
  isSaving = false,
  children,
}: WizardStepperProps) {
  return (
    <div className="space-y-6">
      <nav aria-label="Kroki kreatora">
        <ol className="flex gap-2">
          {steps.map((step, index) => {
            const isActive = index === currentIndex;
            const isComplete = index < currentIndex;
            return (
              <li key={step.id} className="flex-1">
                <div
                  className={cn(
                    "rounded-lg border px-3 py-2 text-center text-sm transition-colors",
                    isActive && "border-purple-400/60 bg-purple-400/10 text-white",
                    isComplete && "border-white/30 bg-white/5 text-blue-100/80",
                    !isActive && !isComplete && "border-white/10 text-blue-100/50",
                  )}
                  aria-current={isActive ? "step" : undefined}
                >
                  <span className="block text-xs font-medium tracking-wide uppercase opacity-70">Krok {index + 1}</span>
                  <span className="font-medium">{step.label}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      <div>{children}</div>

      <div className="flex justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isFirstStep}
          className="border-white/20 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40"
        >
          <ChevronLeft className="size-4" />
          Wstecz
        </Button>
        {isLastStep ? (
          <Button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="bg-purple-500/80 text-white hover:bg-purple-500 disabled:opacity-40"
          >
            {isSaving ? "Zapisywanie…" : "Zapisz przepis"}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onNext}
            className="bg-purple-500/80 text-white hover:bg-purple-500 disabled:opacity-40"
          >
            Dalej
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
