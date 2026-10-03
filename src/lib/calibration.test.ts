import { test } from "node:test";
import assert from "node:assert/strict";
import { calibrationBins, calibrationVerdict, suggestedTargetRetention, MIN_REVIEWS_FOR_CALIBRATION } from "./calibration.ts";
import type { Grade, ReviewLog } from "./card.ts";

let seq = 0;
function log(predicted: number, recalled: boolean, over: Partial<ReviewLog> = {}): ReviewLog {
  seq += 1;
  return {
    id: `l${seq}`,
    cardId: "c1",
    deckId: "d1",
    grade: (recalled ? 3 : 1) as Grade,
    predictedRetrievability: predicted,
    elapsedDays: 5,
    stabilityBefore: 10,
    stabilityAfter: 12,
    reviewedAt: "2026-10-03T09:00:00",
    ...over,
  };
}

function many(count: number, predicted: number, recalledCount: number): ReviewLog[] {
  return Array.from({ length: count }, (_, i) => log(predicted, i < recalledCount));
}

test("мало повторений — честно говорим 'данных не хватает', а не выносим вердикт", () => {
  const verdict = calibrationVerdict(many(10, 0.9, 5));
  assert.equal(verdict.status, "insufficientData");
  if (verdict.status === "insufficientData") {
    assert.equal(verdict.reviews, 10);
    assert.equal(verdict.needed, MIN_REVIEWS_FOR_CALIBRATION);
  }
});

test("повторения новых карточек не идут в калибровку — модель там ничего не предсказывала", () => {
  const logs = [...many(40, 0.9, 36), ...Array.from({ length: 20 }, () => log(0, true, { elapsedDays: 0 }))];
  const verdict = calibrationVerdict(logs);
  assert.equal(verdict.status, "calibrated");
  if (verdict.status === "calibrated") assert.equal(verdict.reviews, 40);
});

test("модель переоценивает память: обещала 90%, вспоминается 60% на большой выборке", () => {
  const verdict = calibrationVerdict(many(200, 0.9, 120));
  assert.equal(verdict.status, "overconfident");
  if (verdict.status === "overconfident") {
    assert.ok(Math.abs(verdict.observed - 0.6) < 1e-9);
    assert.ok(verdict.gap > 0.25);
  }
});

test("модель недооценивает память: обещала 80%, вспоминается 97%", () => {
  const verdict = calibrationVerdict(many(200, 0.8, 194));
  assert.equal(verdict.status, "underconfident");
});

test("прогноз совпал с фактом — вердикт 'калибрована'", () => {
  const verdict = calibrationVerdict(many(200, 0.9, 180));
  assert.equal(verdict.status, "calibrated");
});

test("выборки достаточно, но разрыв не отделился от шума — всё ещё 'калибрована'", () => {
  // 30 повторений, факт 86.7% против прогноза 90%: интервал Уилсона широкий
  // и накрывает прогноз — объявлять перекос нельзя.
  const verdict = calibrationVerdict(many(30, 0.9, 26));
  assert.equal(verdict.status, "calibrated");
});

test("при переоценке советуем поднять целевую удерживаемость, при недооценке — опустить", () => {
  const over = calibrationVerdict(many(200, 0.9, 120));
  assert.equal(suggestedTargetRetention(over, 0.9), 0.95);

  const under = calibrationVerdict(many(200, 0.8, 194));
  assert.equal(suggestedTargetRetention(under, 0.9), 0.85);

  const fine = calibrationVerdict(many(200, 0.9, 180));
  assert.equal(suggestedTargetRetention(fine, 0.9), null);
});

test("корзины разносят повторения по уровню прогноза и считают факт в каждой", () => {
  const logs = [...many(20, 0.75, 10), ...many(20, 0.93, 19)];
  const bins = calibrationBins(logs);
  const low = bins.find((b) => b.label === "70–80%")!;
  const high = bins.find((b) => b.label === "90–95%")!;
  assert.equal(low.reviews, 20);
  assert.ok(Math.abs(low.observed - 0.5) < 1e-9);
  assert.equal(high.reviews, 20);
  assert.ok(Math.abs(high.observed - 0.95) < 1e-9);
  assert.equal(bins.find((b) => b.label === "95%+")!.reviews, 0);
});
