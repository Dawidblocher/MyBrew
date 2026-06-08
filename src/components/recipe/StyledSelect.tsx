import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const hopFieldShellClass = cn(
  "relative h-9 w-full min-w-0 rounded-md border shadow-xs transition-[color,box-shadow]",
  "border-white/20 bg-white/10",
  "focus-within:border-purple-400 focus-within:ring-[3px] focus-within:ring-purple-400/50",
);

interface StyledSelectOption<T extends string> {
  value: T;
  label: string;
}

interface StyledSelectProps<T extends string> {
  id: string;
  value: T;
  options: StyledSelectOption<T>[];
  onChange: (value: T) => void;
  onBlur?: () => void;
  invalid?: boolean;
}

export function StyledSelect<T extends string>({
  id,
  value,
  options,
  onChange,
  onBlur,
  invalid,
}: StyledSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        onBlur?.();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open, onBlur]);

  const selectedLabel = options.find((option) => option.value === value)?.label ?? options[0].label;

  function close() {
    setOpen(false);
    onBlur?.();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid}
        onClick={() => {
          setOpen((prev) => !prev);
        }}
        className={cn(
          hopFieldShellClass,
          "flex w-full items-center justify-between px-3 text-left text-base text-white md:text-sm",
          invalid && "border-red-400/60",
        )}
      >
        <span>{selectedLabel}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-white/40 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-labelledby={id}
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-white/20 bg-slate-950 py-1 shadow-lg"
        >
          {options.map((option) => (
            <li key={option.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10",
                  option.value === value && "bg-white/10 text-purple-200",
                )}
                onClick={() => {
                  onChange(option.value);
                  close();
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
