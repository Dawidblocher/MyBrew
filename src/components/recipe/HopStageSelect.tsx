import { StyledSelect } from "@/components/recipe/StyledSelect";
import type { HopStage } from "@/types";

const STAGE_OPTIONS: { value: HopStage; label: string }[] = [
  { value: "boil", label: "Gotowanie" },
  { value: "whirlpool", label: "Whirlpool" },
  { value: "dryHop", label: "Chmielenie na zimno" },
];

export { hopFieldShellClass } from "@/components/recipe/StyledSelect";

interface HopStageSelectProps {
  id: string;
  value: HopStage;
  onChange: (value: HopStage) => void;
  onBlur?: () => void;
  invalid?: boolean;
}

export function HopStageSelect({ id, value, onChange, onBlur, invalid }: HopStageSelectProps) {
  return (
    <StyledSelect id={id} value={value} options={STAGE_OPTIONS} onChange={onChange} onBlur={onBlur} invalid={invalid} />
  );
}
