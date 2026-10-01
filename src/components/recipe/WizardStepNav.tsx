import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WizardStepConfig {
  id: string;
  label: string;
  hint: string;
}

interface WizardStepNavProps {
  steps: WizardStepConfig[];
  currentIndex: number;
  onSelect: (index: number) => void;
  className?: string;
}

const itemClass = "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left";

export function WizardStepNav({ steps, currentIndex, onSelect, className }: WizardStepNavProps) {
  return (
    <nav aria-label="Kroki kreatora" className={className}>
      <ol className="flex flex-col gap-0.5">
        {steps.map((step, index) => {
          const isDone = index < currentIndex;
          const isActive = index === currentIndex;

          const circle = (
            <span
              aria-hidden="true"
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-medium",
                isDone && "bg-ok text-white",
                isActive && "bg-copper ring-copper/25 text-white ring-[3px]",
                !isDone && !isActive && "bg-paper-3 text-ink-3",
              )}
            >
              {isDone ? <Check className="size-3.5" /> : index + 1}
            </span>
          );

          const label = (
            <span className="min-w-0 flex-1">
              <span className={cn("block text-[13px]", isActive ? "text-ink font-medium" : "text-ink-2")}>
                {step.label}
              </span>
              <span className="text-ink-3 mt-0.5 block font-mono text-[10px]">{step.hint}</span>
            </span>
          );

          return (
            <li key={step.id}>
              {isDone ? (
                <button
                  type="button"
                  onClick={() => {
                    onSelect(index);
                  }}
                  aria-label={`Wróć do kroku ${index + 1}: ${step.label}`}
                  className={cn(itemClass, "hover:bg-paper-3 cursor-pointer transition-colors")}
                >
                  {circle}
                  {label}
                </button>
              ) : (
                <div className={itemClass} aria-current={isActive ? "step" : undefined}>
                  {circle}
                  {label}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
