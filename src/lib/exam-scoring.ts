export type ExamScoringInput = {
  fullScore?: number;
  mistakesCount?: number;
  mistakeDeduction?: number;
  alertsCount?: number;
  alertsDeduct?: boolean;
  alertDeduction?: number;
};

export function calculateExamScore(input: ExamScoringInput) {
  const fullScore = nonNegative(input.fullScore, 100);
  const mistakesCount = nonNegative(input.mistakesCount, 0);
  const mistakeDeduction = nonNegative(input.mistakeDeduction, 1);
  const alertsCount = nonNegative(input.alertsCount, 0);
  const alertsDeduct = input.alertsDeduct ?? true;
  const alertDeduction = nonNegative(input.alertDeduction, 0.25);
  const mistakesDiscount = mistakesCount * mistakeDeduction;
  const alertsDiscount = alertsDeduct ? alertsCount * alertDeduction : 0;
  const finalScore = round(Math.max(0, fullScore - mistakesDiscount - alertsDiscount));

  return {
    fullScore,
    mistakesCount,
    mistakeDeduction,
    mistakesDiscount: round(mistakesDiscount),
    alertsCount,
    alertsDeduct,
    alertDeduction,
    alertsDiscount: round(alertsDiscount),
    finalScore,
    rating:
      finalScore >= 90
        ? "excellent"
        : finalScore >= 80
          ? "very_good"
          : finalScore >= 70
            ? "good"
            : finalScore >= 60
              ? "acceptable"
              : "needs_improvement",
    resultStatus: finalScore >= 60 ? "passed" : finalScore >= 50 ? "retest" : "failed",
  };
}

function nonNegative(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? Math.max(0, Number(value)) : fallback;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
