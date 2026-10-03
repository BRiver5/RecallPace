import { test } from "node:test";
import assert from "node:assert/strict";
import { applyReview, initialDifficulty, initialStability, intervalForRetention, retrievability } from "./memory.ts";
import type { Card, Grade } from "./card.ts";

function card(over: Partial<Card> = {}): Card {
  return {
    id: "c1",
    deckId: "d1",
    front: "front",
    back: "back",
    state: "review",
    stability: 10,
    difficulty: 5,
    due: "2026-10-03",
    lastReview: "2026-09-23",
    reps: 3,
    lapses: 0,
    createdAt: "2026-09-01T10:00:00",
    ...over,
  };
}

test("через ровно S дней шанс вспомнить равен 90% — это определение стабильности", () => {
  for (const s of [1, 5, 30, 400]) {
    assert.ok(Math.abs(retrievability(s, s) - 0.9) < 1e-9, `S=${s}`);
  }
});

test("забывание монотонно падает со временем и начинается со 100%", () => {
  assert.equal(retrievability(10, 0), 1);
  let prev = 1;
  for (const t of [1, 3, 10, 30, 100, 1000]) {
    const r = retrievability(10, t);
    assert.ok(r < prev, `R должен падать на t=${t}`);
    assert.ok(r > 0 && r < 1);
    prev = r;
  }
});

test("степенная кривая держит хвост выше экспоненты (в этом и смысл модели)", () => {
  // На 4×S экспонента даёт ~0.66^4 ≈ 0.19, степенная — заметно больше.
  const power = retrievability(10, 40);
  assert.ok(power > 0.4, `ожидали тяжёлый хвост, получили ${power}`);
});

test("intervalForRetention обратен retrievability", () => {
  for (const target of [0.8, 0.85, 0.9, 0.95]) {
    const days = intervalForRetention(20, target);
    assert.ok(Math.abs(retrievability(20, days) - target) < 1e-9, `target=${target}`);
  }
});

test("чем выше целевая удерживаемость, тем короче интервал", () => {
  const strict = intervalForRetention(20, 0.95);
  const relaxed = intervalForRetention(20, 0.8);
  assert.ok(strict < relaxed);
});

test("новая карточка: Easy даёт более крепкую память и меньшую сложность, чем Again", () => {
  const fresh = card({ reps: 0, lastReview: null, state: "new" });
  const again = applyReview(fresh, 1, 0);
  const easy = applyReview(fresh, 4, 0);
  assert.ok(easy.stability > again.stability);
  assert.ok(easy.difficulty < again.difficulty);
  assert.equal(again.state, "learning");
  assert.equal(easy.state, "review");
});

test("успешное повторение укрепляет память, провал — никогда", () => {
  const base = card({ stability: 10 });
  for (const grade of [2, 3, 4] as Grade[]) {
    const after = applyReview(base, grade, 10);
    assert.ok(after.stability > base.stability, `grade=${grade} должен укреплять`);
  }
  const lapse = applyReview(base, 1, 10);
  assert.ok(lapse.stability <= base.stability, "после провала память не может стать крепче");
  assert.equal(lapse.state, "relearning");
});

test("Good укрепляет сильнее, чем Hard, и слабее, чем Easy", () => {
  const base = card({ stability: 10 });
  const hard = applyReview(base, 2, 10).stability;
  const good = applyReview(base, 3, 10).stability;
  const easy = applyReview(base, 4, 10).stability;
  assert.ok(hard < good && good < easy, `${hard} < ${good} < ${easy}`);
});

test("вспомнить просроченную карточку ценнее, чем свежую (прирост больше)", () => {
  const base = card({ stability: 10 });
  const onTime = applyReview(base, 3, 10).stability;
  const overdue = applyReview(base, 3, 40).stability;
  assert.ok(overdue > onTime, "чем ниже был шанс вспомнить, тем больше прирост");
});

test("difficulty остаётся в границах 1..10 даже после серии крайних оценок", () => {
  let current = card({ difficulty: 5 });
  for (let i = 0; i < 50; i++) {
    const u = applyReview(current, 1, 5);
    current = { ...current, difficulty: u.difficulty, stability: u.stability };
    assert.ok(current.difficulty >= 1 && current.difficulty <= 10);
  }
  assert.ok(current.difficulty > 8, "серия провалов должна утащить сложность вверх");

  let easy = card({ difficulty: 5 });
  for (let i = 0; i < 50; i++) {
    const u = applyReview(easy, 4, 5);
    easy = { ...easy, difficulty: u.difficulty, stability: u.stability };
    assert.ok(easy.difficulty >= 1 && easy.difficulty <= 10);
  }
  assert.ok(easy.difficulty < 3, "серия Easy должна утащить сложность вниз");
});

test("тяжёлая карточка укрепляется медленнее лёгкой при том же ответе", () => {
  const easyCard = applyReview(card({ difficulty: 2, stability: 10 }), 3, 10).stability;
  const hardCard = applyReview(card({ difficulty: 9, stability: 10 }), 3, 10).stability;
  assert.ok(easyCard > hardCard);
});

test("начальные значения модели лежат в допустимых границах", () => {
  for (const g of [1, 2, 3, 4] as Grade[]) {
    assert.ok(initialStability(g) > 0);
    const d = initialDifficulty(g);
    assert.ok(d >= 1 && d <= 10);
  }
});
