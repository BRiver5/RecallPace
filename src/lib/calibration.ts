// Калибровка: модель на каждом повторении ПРЕДСКАЗЫВАЛА шанс вспомнить
// (predictedRetrievability), а потом стало известно, вспомнил ты или нет.
// Это и есть главная честная проверка: совпадает ли обещанное с фактом.
//
// Простая разница "обещали 90%, получилось 78%" врёт на малых выборках —
// на 10 повторениях 78% и 90% неотличимы. Поэтому вывод делается только
// когда доверительный интервал Уилсона для фактической доли ЦЕЛИКОМ лежит
// по одну сторону от предсказания (тот же принцип, что в HeadMap/BreathEasy/
// EnvelopeFlow). Иначе честно говорим "данных пока не хватает".

import type { ReviewLog } from "./card.ts";
import { wilsonInterval, type Interval } from "./statsMath.ts";

export const MIN_REVIEWS_FOR_CALIBRATION = 30;

export type CalibrationBin = {
  label: string;
  lowerBound: number;
  upperBound: number;
  predicted: number; // средний прогноз модели в корзине
  observed: number; // фактическая доля вспомненного
  interval: Interval;
  reviews: number;
};

export type CalibrationVerdict =
  | { status: "insufficientData"; reviews: number; needed: number }
  | { status: "calibrated"; predicted: number; observed: number; reviews: number }
  | { status: "overconfident"; predicted: number; observed: number; reviews: number; gap: number }
  | { status: "underconfident"; predicted: number; observed: number; reviews: number; gap: number };

// Повторения новых карточек не считаем: там модель ещё ничего не предсказывала.
export function calibratableLogs(logs: ReviewLog[]): ReviewLog[] {
  return logs.filter((l) => l.elapsedDays > 0 && l.predictedRetrievability > 0);
}

const BINS: { label: string; lowerBound: number; upperBound: number }[] = [
  { label: "<70%", lowerBound: 0, upperBound: 0.7 },
  { label: "70–80%", lowerBound: 0.7, upperBound: 0.8 },
  { label: "80–90%", lowerBound: 0.8, upperBound: 0.9 },
  { label: "90–95%", lowerBound: 0.9, upperBound: 0.95 },
  { label: "95%+", lowerBound: 0.95, upperBound: 1.0001 },
];

export function calibrationBins(logs: ReviewLog[]): CalibrationBin[] {
  const usable = calibratableLogs(logs);
  return BINS.map((bin) => {
    const inBin = usable.filter((l) => l.predictedRetrievability >= bin.lowerBound && l.predictedRetrievability < bin.upperBound);
    const recalled = inBin.filter((l) => l.grade > 1).length;
    return {
      ...bin,
      reviews: inBin.length,
      predicted: inBin.length ? inBin.reduce((s, l) => s + l.predictedRetrievability, 0) / inBin.length : 0,
      observed: inBin.length ? recalled / inBin.length : 0,
      interval: wilsonInterval(recalled, inBin.length),
    };
  });
}

export function calibrationVerdict(logs: ReviewLog[]): CalibrationVerdict {
  const usable = calibratableLogs(logs);
  if (usable.length < MIN_REVIEWS_FOR_CALIBRATION) {
    return { status: "insufficientData", reviews: usable.length, needed: MIN_REVIEWS_FOR_CALIBRATION };
  }

  const predicted = usable.reduce((s, l) => s + l.predictedRetrievability, 0) / usable.length;
  const recalled = usable.filter((l) => l.grade > 1).length;
  const observed = recalled / usable.length;
  const interval = wilsonInterval(recalled, usable.length);

  // Вердикт только если интервал целиком по одну сторону от прогноза.
  if (interval.high < predicted) {
    return { status: "overconfident", predicted, observed, reviews: usable.length, gap: predicted - observed };
  }
  if (interval.low > predicted) {
    return { status: "underconfident", predicted, observed, reviews: usable.length, gap: observed - predicted };
  }
  return { status: "calibrated", predicted, observed, reviews: usable.length };
}

// Если модель систематически переоценивает память, целевую удерживаемость
// имеет смысл поднять: тогда интервалы станут короче и факт подтянется к цели.
export function suggestedTargetRetention(verdict: CalibrationVerdict, current: number): number | null {
  if (verdict.status === "overconfident") return Math.min(0.97, Math.round((current + Math.min(0.05, verdict.gap)) * 100) / 100);
  if (verdict.status === "underconfident") return Math.max(0.8, Math.round((current - Math.min(0.05, verdict.gap)) * 100) / 100);
  return null;
}
