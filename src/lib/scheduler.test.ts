import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSessionQueue, dueCounts, forecast, isDue, requeuePosition, scheduleReview, DEFAULT_SCHEDULER } from "./scheduler.ts";
import type { Card } from "./card.ts";

const TODAY = "2026-10-03";

function card(over: Partial<Card> = {}): Card {
  return {
    id: `c${Math.random()}`,
    deckId: "d1",
    front: "f",
    back: "b",
    state: "review",
    stability: 10,
    difficulty: 5,
    due: TODAY,
    lastReview: "2026-09-23",
    reps: 3,
    lapses: 0,
    createdAt: "2026-09-01T10:00:00",
    ...over,
  };
}

test("провал возвращает карточку на сегодня, успех — в будущее", () => {
  const again = scheduleReview(card(), 1, TODAY, DEFAULT_SCHEDULER);
  assert.equal(again.due, TODAY);
  assert.equal(again.intervalDays, 0);

  const good = scheduleReview(card(), 3, TODAY, DEFAULT_SCHEDULER);
  assert.ok(good.intervalDays >= 1);
  assert.ok(good.due > TODAY);
});

test("интервал никогда не превышает потолок из настроек", () => {
  const veteran = card({ stability: 5000 });
  const result = scheduleReview(veteran, 4, TODAY, { ...DEFAULT_SCHEDULER, maxIntervalDays: 180 });
  assert.equal(result.intervalDays, 180);
});

test("более строгая цель удерживаемости даёт более короткий интервал", () => {
  const strict = scheduleReview(card(), 3, TODAY, { ...DEFAULT_SCHEDULER, targetRetention: 0.95 });
  const relaxed = scheduleReview(card(), 3, TODAY, { ...DEFAULT_SCHEDULER, targetRetention: 0.8 });
  assert.ok(strict.intervalDays < relaxed.intervalDays);
});

test("isDue: просроченные и сегодняшние — да, завтрашние и новые — нет", () => {
  assert.equal(isDue(card({ due: "2026-10-01" }), TODAY), true);
  assert.equal(isDue(card({ due: TODAY }), TODAY), true);
  assert.equal(isDue(card({ due: "2026-10-04" }), TODAY), false);
  assert.equal(isDue(card({ state: "new", due: TODAY }), TODAY), false);
});

test("очередь: сначала самые просроченные, потом новые, с учётом лимитов", () => {
  const cards = [
    card({ id: "today", due: TODAY }),
    card({ id: "old", due: "2026-09-28" }),
    card({ id: "mid", due: "2026-10-01" }),
    card({ id: "n1", state: "new", createdAt: "2026-09-01T10:00:00" }),
    card({ id: "n2", state: "new", createdAt: "2026-09-02T10:00:00" }),
    card({ id: "future", due: "2026-11-01" }),
  ];
  const queue = buildSessionQueue(cards, TODAY, { ...DEFAULT_SCHEDULER, newPerDay: 1 });
  assert.deepEqual(queue.map((c) => c.id), ["old", "mid", "today", "n1"]);
});

test("лимит новых карточек не съедает лимит повторений", () => {
  const cards = [...Array(5)].map(() => card()).concat([...Array(5)].map(() => card({ state: "new" })));
  const counts = dueCounts(cards, TODAY, { ...DEFAULT_SCHEDULER, newPerDay: 2, reviewsPerDay: 3 });
  assert.deepEqual(counts, { newCards: 2, due: 3, total: 5 });
});

test("проваленная карточка возвращается позже в той же сессии, но не за её конец", () => {
  // Вынули первую карточку → вернуть так, чтобы перед ней прошло ещё 3.
  assert.equal(requeuePosition(10, 0), 3);
  // У конца очереди ставить некуда — встаёт последней.
  assert.equal(requeuePosition(10, 8), 10);
});

test("прогноз: всё просроченное падает в первый день, будущее — по своим дням", () => {
  const cards = [
    card({ due: "2026-09-30" }),
    card({ due: "2026-10-01" }),
    card({ due: TODAY }),
    card({ due: "2026-10-05" }),
    card({ due: "2026-10-05" }),
    card({ state: "new" }),
  ];
  // 3 октября: два просроченных + одно сегодняшнее = 3; две карточки на 5-е
  // попадают в индекс 2 (3 → 4 → 5 октября); новые в прогнозе не участвуют.
  assert.deepEqual(forecast(cards, TODAY, 4).map((d) => d.count), [3, 0, 2, 0]);
});
