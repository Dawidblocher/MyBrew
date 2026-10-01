import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const hopFieldShellClass = cn(
  "relative h-9 w-full min-w-0 rounded-md border transition-[border-color,box-shadow]",
  "border-rule bg-white",
  "focus-within:border-copper focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-copper",
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
          "text-ink flex w-full items-center justify-between px-3 text-left text-base md:text-sm",
          invalid && "border-err",
        )}
      >
        <span>{selectedLabel}</span>
        <ChevronDown className={cn("text-ink-3 size-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-labelledby={id}
          className="border-rule shadow-card absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-white py-1"
        >
          {options.map((option) => (
            <li key={option.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={cn(
                  "hover:bg-paper-3 w-full px-3 py-2 text-left text-sm",
                  option.value === value ? "bg-paper-3 text-copper font-medium" : "text-ink",
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
