import { HopList } from "@/components/recipe/HopList";

export function HopsStep() {
  return (
    <div className="space-y-4">
      <p className="text-ink-3 text-sm">
        Dodaj chmiel i obserwuj IBU w panelu metryk — wartość aktualizuje się na żywo przy każdej zmianie.
      </p>
      <HopList />
    </div>
  );
}
