// Сводки по колодам и истории повторений для экрана Stats.

import { addDays, dayOf, diffDays, type DayIso } from "./dates.ts";
import type { Card, Grade, ReviewLog } from "./card.ts";
import { retrievability } from "./memory.ts";
import { elapsedDaysFor } from "./scheduler.ts";

// Зрелость карточки по стабильности памяти: сколько дней она держится.
export type Maturity = "new" | "learning" | "young" | "mature";

export const MATURE_STABILITY_DAYS = 21;

export function maturityOf(card: Card): Maturity {
  if (card.state === "new") return "new";
  if (card.state === "learning" || card.state === "relearning") return "learning";
  return card.stability >= MATURE_STABILITY_DAYS ? "mature" : "young";
}

export function maturityBreakdown(cards: Card[]): Record<Maturity, number> {
  const out: Record<Maturity, number> = { new: 0, learning: 0, young: 0, mature: 0 };
  for (const card of cards) out[maturityOf(card)] += 1;
  return out;
}

// Средний текущий шанс вспомнить по всей колоде — "сколько ты помнишь прямо
// сейчас", а не "сколько повторений сделал".
export function currentRecallLevel(cards: Card[], today: DayIso): number {
  const studied = cards.filter((c) => c.state !== "new" && c.lastReview);
  if (studied.length === 0) return 0;
  return studied.reduce((s, c) => s + retrievability(c.stability, elapsedDaysFor(c, today)), 0) / studied.length;
}

export function reviewsPerDay(logs: ReviewLog[], today: DayIso, days: number): { day: DayIso; count: number }[] {
  const counts = new Map<DayIso, number>();
  for (const log of logs) counts.set(dayOf(log.reviewedAt), (counts.get(dayOf(log.reviewedAt)) ?? 0) + 1);
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(today, -(days - 1 - i));
    return { day, count: counts.get(day) ?? 0 };
  });
}

export function gradeBreakdown(logs: ReviewLog[]): Record<Grade, number> {
  const out: Record<Grade, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const log of logs) out[log.grade] += 1;
  return out;
}

// Серия дней подряд, в которые были повторения (сегодня считается, если
// сегодня уже занимались; вчерашний конец серии не ломает её до конца дня).
export function studyStreak(logs: ReviewLog[], today: DayIso): number {
  const days = new Set(logs.map((l) => dayOf(l.reviewedAt)));
  if (days.size === 0) return 0;
  let cursor = days.has(today) ? today : addDays(today, -1);
  if (!days.has(cursor)) return 0;
  let streak = 0;
  while (days.has(cursor) && streak < 3650) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

// Самые тяжёлые карточки: высокий difficulty при уже заметном числе провалов.
export function hardestCards(cards: Card[], limit = 5): Card[] {
  return cards
    .filter((c) => c.lapses > 0)
    .sort((a, b) => b.lapses - a.lapses || b.difficulty - a.difficulty)
    .slice(0, limit);
}

export function totalStudyDays(logs: ReviewLog[]): number {
  return new Set(logs.map((l) => dayOf(l.reviewedAt))).size;
}

export function reviewsToday(logs: ReviewLog[], today: DayIso): number {
  return logs.filter((l) => dayOf(l.reviewedAt) === today).length;
}

export function daysSinceFirstReview(logs: ReviewLog[], today: DayIso): number {
  if (logs.length === 0) return 0;
  const first = logs.reduce((min, l) => (l.reviewedAt < min ? l.reviewedAt : min), logs[0].reviewedAt);
  return diffDays(dayOf(first), today);
}
