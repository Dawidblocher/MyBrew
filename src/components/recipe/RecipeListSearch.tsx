import { useMemo, useState } from "react";
import { ColorSwatch } from "@/components/ui/color-swatch";
import { formatMetricValue, METRIC_DESCRIPTORS } from "@/lib/recipe-metrics";
import { cn } from "@/lib/utils";
import type { RecipeListItem } from "@/types";

interface RecipeListSearchProps {
  items: RecipeListItem[];
  activeId?: string;
}

export default function RecipeListSearch({ items, activeId }: RecipeListSearchProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pl");
    if (!q) return items;
    return items.filter(
      (item) => item.name.toLocaleLowerCase("pl").includes(q) || item.style.toLocaleLowerCase("pl").includes(q),
    );
  }, [items, query]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-5 pt-4 pb-2">
        <label className="sr-only" htmlFor="recipe-search">
          Szukaj przepisu
        </label>
        <input
          id="recipe-search"
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          placeholder="Szukaj przepisu…"
          className="border-rule text-ink placeholder:text-ink-3/60 focus-visible:border-copper h-9 w-full rounded-md border bg-white px-3 text-[13px] outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-ink-3 px-5 py-6 text-sm">Brak przepisów pasujących do wyszukiwania</p>
      ) : (
        <ul className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3">
          {filtered.map((item) => {
            const active = item.id === activeId;
            return (
              <li key={item.id}>
                <a
                  href={`/recipes/${item.id}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col gap-2.5 rounded-md border border-l-2 px-3 py-2.5 transition-colors",
                    active ? "border-rule border-l-copper bg-white" : "hover:bg-paper-3 border-transparent",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <ColorSwatch srm={item.srm} size="md" />
                    <div className="min-w-0 flex-1">
                      <span className="text-ink block truncate font-serif text-[15px] font-medium tracking-[-0.01em]">
                        {item.name}
                      </span>
                      <span className="text-ink-3 mt-0.5 block truncate font-mono text-[10px] tracking-[0.05em] uppercase">
                        {item.style}
                      </span>
                    </div>
                  </div>
                  <div className="border-rule-soft flex gap-3 border-t border-dashed pt-2">
                    {METRIC_DESCRIPTORS.map(({ key, label, unit, fractionDigits }) => (
                      <span key={key} className="flex flex-1 flex-col">
                        <span className="text-ink-3 font-mono text-[9px] tracking-[0.08em] uppercase">{label}</span>
                        <span className="text-ink font-mono text-[11px]">
                          {formatMetricValue(item[key], fractionDigits)}
                          <span className="text-ink-3">{unit}</span>
                        </span>
                      </span>
                    ))}
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
