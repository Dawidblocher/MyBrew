import { describe, expect, it } from "vitest";
import { SRM_NEUTRAL_HEX, srmToHex } from "./srm-color";

describe("srmToHex", () => {
  it("returns table colors for boundary values", () => {
    expect(srmToHex(1)).toBe("#FFE699");
    expect(srmToHex(40)).toBe("#36080A");
  });

  it("returns table colors for representative points", () => {
    expect(srmToHex(3)).toBe("#FFCA5A");
    expect(srmToHex(12)).toBe("#CF6900");
    expect(srmToHex(35)).toBe("#470606");
  });

  it("rounds fractional SRM to the nearest integer", () => {
    expect(srmToHex(11.6)).toBe(srmToHex(12));
    expect(srmToHex(11.4)).toBe(srmToHex(11));
  });

  it("clamps values below 1 and above 40", () => {
    expect(srmToHex(0)).toBe(srmToHex(1));
    expect(srmToHex(-5)).toBe(srmToHex(1));
    expect(srmToHex(41)).toBe(srmToHex(40));
    expect(srmToHex(500)).toBe(srmToHex(40));
  });

  it("returns the neutral color for non-finite input", () => {
    expect(srmToHex(Number.NaN)).toBe(SRM_NEUTRAL_HEX);
    expect(srmToHex(Number.POSITIVE_INFINITY)).toBe(SRM_NEUTRAL_HEX);
    expect(srmToHex(Number.NEGATIVE_INFINITY)).toBe(SRM_NEUTRAL_HEX);
  });
});
