import { HopList } from "@/components/recipe/HopList";

export function HopsStep() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-blue-100/60">
        Dodaj chmiel i obserwuj IBU w panelu metryk — wartość aktualizuje się na żywo przy każdej zmianie.
      </p>
      <HopList />
    </div>
  );
}
