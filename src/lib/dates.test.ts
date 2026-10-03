import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, diffDays, formatInterval, lastDays, nextDays } from "./dates.ts";

test("addDays и diffDays согласованы, включая переход через месяц", () => {
  assert.equal(addDays("2026-09-30", 3), "2026-10-03");
  assert.equal(diffDays("2026-09-30", "2026-10-03"), 3);
  assert.equal(diffDays("2026-10-03", "2026-09-30"), -3);
});

test("lastDays заканчивается сегодняшним днём, nextDays начинается с него", () => {
  assert.deepEqual(lastDays("2026-10-03", 3), ["2026-10-01", "2026-10-02", "2026-10-03"]);
  assert.deepEqual(nextDays("2026-10-03", 3), ["2026-10-03", "2026-10-04", "2026-10-05"]);
});

test("формат интервала читается по-человечески на всех масштабах", () => {
  assert.equal(formatInterval(0), "today");
  assert.equal(formatInterval(1), "1 day");
  assert.equal(formatInterval(8), "8 days");
  assert.equal(formatInterval(28), "4 weeks");
  assert.equal(formatInterval(120), "4 months");
  assert.equal(formatInterval(400), "1 year");
  assert.equal(formatInterval(900), "2.5 years");
});

test("близкие интервалы зрелой карточки дают РАЗНЫЕ подписи", () => {
  // Весь смысл подписи под оценкой — показать разницу между Hard/Good/Easy.
  // На целых месяцах 34/41/52 дня схлопывались в три одинаковых "1 month".
  const labels = [34, 41, 52].map(formatInterval);
  assert.equal(new Set(labels).size, 3, `подписи должны различаться: ${labels.join(", ")}`);
});
