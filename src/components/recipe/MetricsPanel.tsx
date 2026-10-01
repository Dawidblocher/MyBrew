import { useFormContext, useWatch } from "react-hook-form";
import { computeWizardMetrics } from "@/lib/recipe-to-calc";
import type { CalcResult } from "@/lib/calc";
import { METRIC_DESCRIPTORS, METRIC_PLACEHOLDER, formatMetricValue } from "@/lib/recipe-metrics";
import { StatTile } from "@/components/ui/stat-tile";
import { ColorSwatch } from "@/components/ui/color-swatch";
import type { RecipeDraft } from "@/types";

function formatMetric(result: CalcResult<number>, fractionDigits: number): string {
  // Defense-in-depth: the engine contract says it never returns NaN/Infinity,
  // but the UI guards anyway so a contract drift can never paint a bad number.
  if (!result.ok || !Number.isFinite(result.value)) return METRIC_PLACEHOLDER;
  return formatMetricValue(result.value, fractionDigits);
}

interface MetricsPanelProps {
  /** Only variant used by the wizard; kept as a prop for the plan's documented contract. */
  variant?: "strip";
}

export function MetricsPanel({ variant = "strip" }: MetricsPanelProps) {
  void variant;
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
  const srmValue = metrics.srm.ok ? metrics.srm.value : Number.NaN;

  return (
    <section
      aria-label="Wyliczenia przepisu"
      className="border-rule grid grid-cols-2 gap-2 border-y bg-white px-4 py-3 sm:grid-cols-5 sm:gap-3 sm:px-8"
    >
      {METRIC_DESCRIPTORS.map(({ key, label, unit, fractionDigits }) => {
        const value = formatMetric(metrics[key], fractionDigits);
        return (
          <StatTile key={key} label={label} value={value} unit={unit} placeholder={value === METRIC_PLACEHOLDER} />
        );
      })}
      <div className="border-rule-soft bg-paper-2 flex items-center justify-center gap-2 rounded-md border px-3 py-2">
        <ColorSwatch srm={srmValue} size="md" />
        <span className="text-ink-3 font-mono text-[10px] tracking-[0.1em] uppercase">Barwa</span>
      </div>
    </section>
  );
}
