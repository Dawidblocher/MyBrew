import { useFormContext, useWatch } from "react-hook-form";
import { computeWizardMetrics } from "@/lib/recipe-to-calc";
import type { CalcResult } from "@/lib/calc";
import { cn } from "@/lib/utils";
import type { RecipeDraft } from "@/types";

const PLACEHOLDER = "—";

function formatMetric(result: CalcResult<number>, fractionDigits: number): string {
  if (!result.ok) return PLACEHOLDER;
  return result.value.toFixed(fractionDigits);
}

interface MetricProps {
  label: string;
  unit: string;
  value: string;
}

function Metric({ label, unit, value }: MetricProps) {
  const isPlaceholder = value === PLACEHOLDER;
  return (
    <div className="flex flex-1 flex-col rounded-xl border border-white/10 bg-white/5 p-4">
      <span className="text-xs font-medium tracking-wide text-blue-100/60 uppercase">{label}</span>
      <span className="mt-1 flex items-baseline gap-1">
        <span className={cn("text-3xl font-bold tabular-nums", isPlaceholder ? "text-white/30" : "text-white")}>
          {value}
        </span>
        <span className="text-sm text-blue-100/60">{unit}</span>
      </span>
    </div>
  );
}

export function MetricsPanel() {
  const { control } = useFormContext<RecipeDraft>();
  const draft = useWatch({ control });

  const { blg, srm } = computeWizardMetrics(draft);

  return (
    <section
      aria-label="Wyliczenia przepisu"
      className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row"
    >
      <Metric label="BLG" unit="°BLG" value={formatMetric(blg, 1)} />
      <Metric label="Barwa" unit="SRM" value={formatMetric(srm, 1)} />
    </section>
  );
}
