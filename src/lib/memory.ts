// Модель памяти (FSRS-подобная). Две величины на карточку:
//   stability S  — сколько дней воспоминание держится, пока шанс вспомнить не
//                  упадёт до 90%;
//   difficulty D — 1..10, насколько карточка тяжёлая именно для тебя.
//
// Забывание — СТЕПЕННАЯ кривая, а не экспонента: R(t) = (1 + F·t/S)^DECAY.
// Экспонента (как в SM-2 и большинстве самодельных SRS) занижает вероятность
// вспомнить на длинных интервалах — реальные кривые забывания имеют тяжёлый
// хвост, и именно поэтому старые карточки можно показывать заметно реже.
//
// Интервал считается ОТ ЦЕЛЕВОЙ УДЕРЖИВАЕМОСТИ: пользователь говорит "хочу
// вспоминать 90%", а не "умножай интервал на 2.5". Отсюда же берётся честная
// калибровка (calibration.ts): предсказание модели можно сравнить с фактом.

import type { Card, CardState, Grade } from "./card.ts";

export const DECAY = -0.5;
export const FACTOR = 19 / 81; // при t = S получаем ровно R = 0.9

// Веса FSRS-5 (дефолтные, без персональной подгонки — честно сказано в UI).
export const W = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483,
  0.6014, 1.8729,
];

export const MIN_STABILITY = 0.1;
export const MAX_STABILITY = 36500;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// Шанс вспомнить карточку через elapsedDays дней после последнего повторения.
export function retrievability(stability: number, elapsedDays: number): number {
  if (stability <= 0) return 0;
  return clamp(Math.pow(1 + (FACTOR * Math.max(0, elapsedDays)) / stability, DECAY), 0, 1);
}

// Через сколько дней удерживаемость упадёт ровно до targetRetention.
export function intervalForRetention(stability: number, targetRetention: number): number {
  const r = clamp(targetRetention, 0.5, 0.99);
  return (stability / FACTOR) * (Math.pow(r, 1 / DECAY) - 1);
}

export function initialStability(grade: Grade): number {
  return clamp(W[grade - 1], MIN_STABILITY, MAX_STABILITY);
}

export function initialDifficulty(grade: Grade): number {
  return clamp(W[4] - Math.exp(W[5] * (grade - 1)) + 1, 1, 10);
}

function nextDifficulty(difficulty: number, grade: Grade): number {
  const delta = -W[6] * (grade - 3);
  const damped = difficulty + delta * ((10 - difficulty) / 9); // у лёгких карточек шаг меньше
  // Возврат к средней: без него D сползает в крайность и там застревает.
  const reverted = W[7] * initialDifficulty(4) + (1 - W[7]) * damped;
  return clamp(reverted, 1, 10);
}

function stabilityAfterRecall(stability: number, difficulty: number, r: number, grade: Grade): number {
  const hardPenalty = grade === 2 ? W[15] : 1;
  const easyBonus = grade === 4 ? W[16] : 1;
  const growth =
    Math.exp(W[8]) *
    (11 - difficulty) *
    Math.pow(stability, -W[9]) *
    (Math.exp(W[10] * (1 - r)) - 1) *
    hardPenalty *
    easyBonus;
  return clamp(stability * (1 + growth), MIN_STABILITY, MAX_STABILITY);
}

function stabilityAfterLapse(stability: number, difficulty: number, r: number): number {
  const post =
    W[11] * Math.pow(difficulty, -W[12]) * (Math.pow(stability + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r));
  // Забыв карточку, память не может стать КРЕПЧЕ, чем была.
  return clamp(Math.min(post, stability), MIN_STABILITY, MAX_STABILITY);
}

export type MemoryUpdate = {
  stability: number;
  difficulty: number;
  state: CardState;
  predictedRetrievability: number;
  elapsedDays: number;
};

// Один ответ пользователя → новое состояние памяти карточки.
export function applyReview(card: Card, grade: Grade, elapsedDays: number): MemoryUpdate {
  const isNew = card.reps === 0 || card.lastReview === null;

  if (isNew) {
    return {
      stability: initialStability(grade),
      difficulty: initialDifficulty(grade),
      state: grade === 1 ? "learning" : "review",
      predictedRetrievability: 0,
      elapsedDays: 0,
    };
  }

  const r = retrievability(card.stability, elapsedDays);
  const difficulty = nextDifficulty(card.difficulty, grade);
  const stability =
    grade === 1 ? stabilityAfterLapse(card.stability, card.difficulty, r) : stabilityAfterRecall(card.stability, card.difficulty, r, grade);

  return {
    stability,
    difficulty,
    state: grade === 1 ? "relearning" : "review",
    predictedRetrievability: r,
    elapsedDays,
  };
}
