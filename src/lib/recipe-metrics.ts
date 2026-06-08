import type { RecipeMetricsSnapshot } from "@/types";

export const METRIC_PLACEHOLDER = "—";

export const METRIC_DESCRIPTORS: {
  key: keyof RecipeMetricsSnapshot;
  label: string;
  unit: string;
  fractionDigits: number;
}[] = [
  { key: "blg", label: "BLG", unit: "°BLG", fractionDigits: 1 },
  { key: "srm", label: "Barwa", unit: "SRM", fractionDigits: 1 },
  { key: "ibu", label: "IBU", unit: "IBU", fractionDigits: 0 },
  { key: "abv", label: "ABV", unit: "%", fractionDigits: 1 },
];

export function formatMetricValue(value: number, fractionDigits: number): string {
  if (!Number.isFinite(value)) return METRIC_PLACEHOLDER;
  return value.toFixed(fractionDigits);
}
