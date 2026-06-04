import { describe, expect, it } from "vitest";

import type { CalcResult } from "@/lib/calc";

/** Identity-typed pass-through so the union isn't narrowed to a literal. */
function asResult<T>(result: CalcResult<T>): CalcResult<T> {
  return result;
}

describe("CalcResult discriminator", () => {
  it("narrows to the value on ok: true", () => {
    const result = asResult<number>({ ok: true, value: 12.5 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(12.5);
    } else {
      throw new Error("expected ok result");
    }
  });

  it("narrows to the reason on ok: false", () => {
    const result = asResult<number>({ ok: false, reason: "insufficient input" });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected error result");
    } else {
      expect(result.reason).toBe("insufficient input");
    }
  });
});
