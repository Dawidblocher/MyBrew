import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PasswordToggleProps {
  visible: boolean;
  onToggle: () => void;
}

export function PasswordToggle({ visible, onToggle }: PasswordToggleProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={onToggle}
      className="text-ink-3 hover:text-ink absolute top-1/2 right-0.5 -translate-y-1/2"
      aria-label={visible ? "Ukryj hasło" : "Pokaż hasło"}
      aria-pressed={visible}
    >
      {visible ? <EyeOff /> : <Eye />}
    </Button>
  );
}
