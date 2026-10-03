import { test } from "node:test";
import assert from "node:assert/strict";
import { currentRecallLevel, gradeBreakdown, hardestCards, maturityBreakdown, maturityOf, reviewsPerDay, studyStreak } from "./deckStats.ts";
import type { Card, Grade, ReviewLog } from "./card.ts";

const TODAY = "2026-10-03";

function card(over: Partial<Card> = {}): Card {
  return {
    id: `c${Math.random()}`,
    deckId: "d1",
    front: "f",
    back: "b",
    state: "review",
    stability: 30,
    difficulty: 5,
    due: TODAY,
    lastReview: TODAY,
    reps: 3,
    lapses: 0,
    createdAt: "2026-09-01T10:00:00",
    ...over,
  };
}

function log(day: string, grade: Grade = 3): ReviewLog {
  return {
    id: `l${Math.random()}`,
    cardId: "c1",
    deckId: "d1",
    grade,
    predictedRetrievability: 0.9,
    elapsedDays: 5,
    stabilityBefore: 10,
    stabilityAfter: 12,
    reviewedAt: `${day}T09:00:00`,
  };
}

test("зрелость определяется стабильностью, а не числом повторений", () => {
  assert.equal(maturityOf(card({ state: "new" })), "new");
  assert.equal(maturityOf(card({ state: "relearning" })), "learning");
  assert.equal(maturityOf(card({ stability: 5 })), "young");
  assert.equal(maturityOf(card({ stability: 21 })), "mature");
});

test("maturityBreakdown считает все четыре категории", () => {
  const cards = [card({ state: "new" }), card({ stability: 3 }), card({ stability: 40 }), card({ stability: 50 })];
  assert.deepEqual(maturityBreakdown(cards), { new: 1, learning: 0, young: 1, mature: 2 });
});

test("текущий уровень памяти учитывает, сколько прошло с повторения", () => {
  const fresh = currentRecallLevel([card({ stability: 30, lastReview: TODAY })], TODAY);
  const stale = currentRecallLevel([card({ stability: 30, lastReview: "2026-08-03" })], TODAY);
  assert.ok(Math.abs(fresh - 1) < 1e-9);
  assert.ok(stale < fresh && stale > 0);
});

test("новые карточки не занижают уровень памяти — их просто ещё не учат", () => {
  const level = currentRecallLevel([card({ lastReview: TODAY }), card({ state: "new", lastReview: null })], TODAY);
  assert.ok(Math.abs(level - 1) < 1e-9);
});

test("серия: сегодня + вчера = 2; вчерашний конец серии не ломается до конца дня", () => {
  assert.equal(studyStreak([log(TODAY), log("2026-10-02")], TODAY), 2);
  assert.equal(studyStreak([log("2026-10-02"), log("2026-10-01")], TODAY), 2);
  assert.equal(studyStreak([log("2026-09-30")], TODAY), 0);
  assert.equal(studyStreak([], TODAY), 0);
});

test("reviewsPerDay заполняет пустые дни нулями и заканчивается сегодняшним", () => {
  const days = reviewsPerDay([log(TODAY), log(TODAY), log("2026-10-01")], TODAY, 3);
  assert.deepEqual(days.map((d) => d.count), [1, 0, 2]);
  assert.equal(days[2].day, TODAY);
});

test("gradeBreakdown считает каждую оценку", () => {
  assert.deepEqual(gradeBreakdown([log(TODAY, 1), log(TODAY, 3), log(TODAY, 3), log(TODAY, 4)]), { 1: 1, 2: 0, 3: 2, 4: 1 });
});

test("самые тяжёлые — те, что чаще проваливались; без провалов в список не попадают", () => {
  const cards = [card({ id: "a", lapses: 5 }), card({ id: "b", lapses: 1 }), card({ id: "c", lapses: 0 })];
  const hardest = hardestCards(cards);
  assert.deepEqual(hardest.map((c) => c.id), ["a", "b"]);
});
