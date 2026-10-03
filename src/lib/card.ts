export type Grade = 1 | 2 | 3 | 4; // Again / Hard / Good / Easy
export type CardState = "new" | "learning" | "review" | "relearning";

export type Deck = {
  id: string;
  name: string;
  description: string;
  archived: boolean;
  createdAt: string;
};

export type Card = {
  id: string;
  deckId: string;
  front: string;
  back: string;
  state: CardState;
  // Память по модели FSRS: stability — сколько дней держится воспоминание,
  // difficulty — 1..10, насколько карточка тяжёлая лично для тебя.
  stability: number;
  difficulty: number;
  due: string; // YYYY-MM-DD
  lastReview: string | null; // YYYY-MM-DD
  reps: number;
  lapses: number;
  createdAt: string;
};

export type ReviewLog = {
  id: string;
  cardId: string;
  deckId: string;
  grade: Grade;
  // Что модель предсказывала ПЕРЕД ответом — нужно для калибровки.
  predictedRetrievability: number;
  elapsedDays: number;
  stabilityBefore: number;
  stabilityAfter: number;
  reviewedAt: string; // YYYY-MM-DDTHH:MM:SS
};

export const GRADE_LABELS: Record<Grade, string> = { 1: "Again", 2: "Hard", 3: "Good", 4: "Easy" };
