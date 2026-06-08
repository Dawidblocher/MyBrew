import { AdjunctList } from "@/components/recipe/AdjunctList";

export function AdjunctsStep() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-blue-100/60">
        Dodatki są zapisywane jako część przepisu — nie wpływają na metryki w tym kroku.
      </p>
      <AdjunctList />
    </div>
  );
}
