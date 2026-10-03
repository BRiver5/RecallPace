// Расписание: что показать сегодня и когда карточка вернётся.
//
// Интервал берётся из модели памяти под целевую удерживаемость, но с двумя
// ограничениями, без которых формула ведёт себя неприлично:
//   1. минимум 1 день для review-карточек (иначе на старте интервалы дробные);
//   2. потолок maxIntervalDays — "через 7 лет" формально верно, но бесполезно.
//
// Провалы (Again) не ждут следующего дня: карточка возвращается в ТОЙ ЖЕ
// сессии, иначе забытое не закрепляется. Поэтому очередь сессии — отдельная
// структура, а не просто список due-карточек.

import { addDays, diffDays, type DayIso } from "./dates.ts";
import type { Card, Grade } from "./card.ts";
import { applyReview, intervalForRetention, type MemoryUpdate } from "./memory.ts";

export const RELEARN_QUEUE_GAP = 3; // через сколько карточек вернуть проваленную

export type SchedulerSettings = {
  targetRetention: number;
  maxIntervalDays: number;
  newPerDay: number;
  reviewsPerDay: number;
};

export const DEFAULT_SCHEDULER: SchedulerSettings = {
  targetRetention: 0.9,
  maxIntervalDays: 365,
  newPerDay: 10,
  reviewsPerDay: 120,
};

export function elapsedDaysFor(card: Card, today: DayIso): number {
  return card.lastReview ? Math.max(0, diffDays(card.lastReview, today)) : 0;
}

export type ScheduleResult = MemoryUpdate & { intervalDays: number; due: DayIso };

export function scheduleReview(card: Card, grade: Grade, today: DayIso, settings: SchedulerSettings): ScheduleResult {
  const elapsed = elapsedDaysFor(card, today);
  const update = applyReview(card, grade, elapsed);

  // Провал — повтор сегодня же, внутри сессии.
  if (grade === 1) return { ...update, intervalDays: 0, due: today };

  const raw = intervalForRetention(update.stability, settings.targetRetention);
  const intervalDays = Math.min(settings.maxIntervalDays, Math.max(1, Math.round(raw)));
  return { ...update, intervalDays, due: addDays(today, intervalDays) };
}

export function isDue(card: Card, today: DayIso): boolean {
  return card.state !== "new" && diffDays(card.due, today) >= 0;
}

export type DueCounts = { newCards: number; due: number; total: number };

export function dueCounts(cards: Card[], today: DayIso, settings: SchedulerSettings): DueCounts {
  const newCards = Math.min(settings.newPerDay, cards.filter((c) => c.state === "new").length);
  const due = Math.min(settings.reviewsPerDay, cards.filter((c) => isDue(c, today)).length);
  return { newCards, due, total: newCards + due };
}

// Очередь сессии: сначала просроченные (самые "протухшие" вперёд — у них
// удерживаемость ниже всех), потом новые. Лимиты из настроек применяются
// отдельно к каждому виду, чтобы новые карточки не вытесняли повторения.
export function buildSessionQueue(cards: Card[], today: DayIso, settings: SchedulerSettings): Card[] {
  const due = cards
    .filter((c) => isDue(c, today))
    .sort((a, b) => diffDays(b.due, today) - diffDays(a.due, today))
    .slice(0, settings.reviewsPerDay);
  const fresh = cards
    .filter((c) => c.state === "new")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, settings.newPerDay);
  return [...due, ...fresh];
}

// Куда вставить проваленную карточку ПОСЛЕ того, как её вынули из очереди:
// так, чтобы перед ней успело пройти RELEARN_QUEUE_GAP других карточек.
// Если до конца очереди меньше — встаёт последней.
export function requeuePosition(queueLengthAfterRemoval: number, removedIndex: number): number {
  return Math.min(queueLengthAfterRemoval, removedIndex + RELEARN_QUEUE_GAP);
}

export type ForecastDay = { day: DayIso; count: number };

// Сколько карточек придёт в ближайшие дни, если сегодня ничего не делать.
// Всё просроченное сваливается в первый столбик: оно ждёт уже сейчас.
export function forecast(cards: Card[], today: DayIso, days: number): ForecastDay[] {
  const counts = new Map<DayIso, number>();
  let overdue = 0;
  for (const card of cards) {
    if (card.state === "new") continue;
    if (diffDays(card.due, today) > 0) overdue += 1;
    else counts.set(card.due, (counts.get(card.due) ?? 0) + 1);
  }
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(today, i);
    return { day, count: (counts.get(day) ?? 0) + (i === 0 ? overdue : 0) };
  });
}
