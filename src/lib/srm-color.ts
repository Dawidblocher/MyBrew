/** Swatch color used when SRM is not a finite number (matches the `--paper-3` token). */
export const SRM_NEUTRAL_HEX = "#E6DCC7";

/** Standard SRM → sRGB approximation, index 0 = SRM 1 … index 39 = SRM 40. */
const SRM_HEX_TABLE = [
  "#FFE699",
  "#FFD878",
  "#FFCA5A",
  "#FFBF42",
  "#FBB123",
  "#F8A600",
  "#F39C00",
  "#EA8F00",
  "#E58500",
  "#DE7C00",
  "#D77200",
  "#CF6900",
  "#CB6200",
  "#C35900",
  "#BB5100",
  "#B54C00",
  "#B04500",
  "#A63E00",
  "#A13700",
  "#9B3200",
  "#952D00",
  "#8E2900",
  "#882300",
  "#821E00",
  "#7B1A00",
  "#771900",
  "#701400",
  "#6A0E00",
  "#660D00",
  "#5E0B00",
  "#5A0A02",
  "#600903",
  "#520907",
  "#4C0505",
  "#470606",
  "#440607",
  "#3F0708",
  "#3B0607",
  "#3A070B",
  "#36080A",
] as const;

export const SRM_MIN = 1;
export const SRM_MAX = SRM_HEX_TABLE.length;

/** Maps an SRM value to a display hex color: rounded to the nearest integer and clamped to 1–40. */
export function srmToHex(srm: number): string {
  if (!Number.isFinite(srm)) return SRM_NEUTRAL_HEX;
  const index = Math.min(SRM_MAX, Math.max(SRM_MIN, Math.round(srm))) - 1;
  return SRM_HEX_TABLE[index];
}
