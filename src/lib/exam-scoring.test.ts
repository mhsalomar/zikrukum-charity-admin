import { describe, expect, it } from "vitest";

import { calculateExamScore } from "./exam-scoring";

describe("calculateExamScore", () => {
  it("deducts one point per mistake and a quarter point per alert by default", () => {
    const result = calculateExamScore({ mistakesCount: 3, alertsCount: 4 });

    expect(result.mistakesDiscount).toBe(3);
    expect(result.alertsDiscount).toBe(1);
    expect(result.finalScore).toBe(96);
  });

  it("never returns a score below zero", () => {
    expect(calculateExamScore({ fullScore: 10, mistakesCount: 20 }).finalScore).toBe(0);
  });

  it("supports disabling alert deduction for a formal exam setting", () => {
    expect(calculateExamScore({ mistakesCount: 3, alertsCount: 4, alertsDeduct: false }).finalScore).toBe(97);
  });
});
