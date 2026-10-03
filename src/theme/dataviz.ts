import type { Grade } from "../lib/card.ts";
import type { Maturity } from "../lib/deckStats.ts";

// Цвета оценок. Красный↔зелёный — худшая пара для дальтонизма, поэтому
// светлота разнесена намеренно (тёмный кирпич → светлая охра → светлый
// зелёный → средний синий): именно разница по светлоте читается при любом
// типе CVD. Проверено validate_palette.js дата-виз скилла ПО ВСЕМ парам
// (не только соседним, т.к. в донате порядок сегментов зависит от данных):
// ALL CHECKS PASS без CVD-предупреждений на поверхности #FBFCFB.
//
// Охра и зелёный дают <3:1 к фону, поэтому везде, где они используются
// (кнопки оценок, легенда доната), рядом ОБЯЗАТЕЛЬНА текстовая подпись —
// цвет не единственный носитель смысла.
export const GRADE_COLORS: Record<Grade, string> = {
  1: "#99372A",
  2: "#D9A52F",
  3: "#5CAF78",
  4: "#35539E",
};

export const MATURITY_COLORS: Record<Maturity, string> = {
  new: "#8C9A92",
  learning: "#D9A52F",
  young: "#5CAF78",
  mature: "#2F6B46",
};

export const MATURITY_LABELS: Record<Maturity, string> = {
  new: "New",
  learning: "Learning",
  young: "Young",
  mature: "Mature",
};
