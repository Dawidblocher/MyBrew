import { useFormContext, useWatch } from "react-hook-form";
import { computeWizardMetrics } from "@/lib/recipe-to-calc";
import type { CalcResult } from "@/lib/calc";
import { METRIC_DESCRIPTORS, METRIC_PLACEHOLDER, formatMetricValue } from "@/lib/recipe-metrics";
import { cn } from "@/lib/utils";
import type { RecipeDraft } from "@/types";

function formatMetric(result: CalcResult<number>, fractionDigits: number): string {
  // Defense-in-depth: the engine contract says it never returns NaN/Infinity,
  // but the UI guards anyway so a contract drift can never paint a bad number.
  if (!result.ok || !Number.isFinite(result.value)) return METRIC_PLACEHOLDER;
  return formatMetricValue(result.value, fractionDigits);
}

interface MetricProps {
  label: string;
  unit: string;
  value: string;
}

function Metric({ label, unit, value }: MetricProps) {
  const isPlaceholder = value === METRIC_PLACEHOLDER;
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
  // Scope the subscription to fields that affect BLG/SRM/IBU/ABV — basics keystrokes
  // (name/style) and adjuncts must not trigger a recompute.
  const [batch, malts, mash, hops, yeast] = useWatch({
    control,
    name: ["batch", "malts", "mash", "hops", "yeast"],
  });

  const draft: RecipeDraft = {
    basics: { name: "", style: "" },
    batch,
    malts,
    mash,
    hops,
    yeast,
    adjuncts: [],
  };

  const metrics = computeWizardMetrics(draft);

  return (
    <section
      aria-label="Wyliczenia przepisu"
      className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row"
    >
      {METRIC_DESCRIPTORS.map(({ key, label, unit, fractionDigits }) => (
        <Metric key={key} label={label} unit={unit} value={formatMetric(metrics[key], fractionDigits)} />
      ))}
    </section>
  );
}
