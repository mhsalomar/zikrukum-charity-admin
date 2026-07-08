import { describe, expect, it } from "vitest";

import { suggestQuranPassage } from "./quran-juz";

describe("suggestQuranPassage", () => {
  it("keeps the suggestion inside the selected single juz", () => {
    const passage = suggestQuranPassage([1], "medium", 42);
    expect(passage).not.toBeNull();
    expect(passage?.juz).toBe(1);
    expect(passage?.fromSurahNo).toBe(passage?.toSurahNo);
    expect(passage?.toAyah).toBeGreaterThanOrEqual(passage?.fromAyah ?? 0);
  });

  it("selects only one of the requested juz values", () => {
    const passage = suggestQuranPassage([1, 2, 3], "long", 2026);
    expect([1, 2, 3]).toContain(passage?.juz);
    expect(passage?.approximateAyahs).toBeLessThanOrEqual(15);
  });

  it("returns null without a valid juz", () => {
    expect(suggestQuranPassage([], "short")).toBeNull();
  });
});
