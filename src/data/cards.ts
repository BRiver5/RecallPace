import { getDb } from "../db/client";
import { generateId } from "../lib/id";
import { nowStamp, todayIso } from "../lib/dates.ts";
import type { Card, CardState, Grade, ReviewLog } from "../lib/card.ts";
import type { ScheduleResult } from "../lib/scheduler.ts";

type Row = {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  state: string;
  stability: number;
  difficulty: number;
  due: string;
  last_review: string | null;
  reps: number;
  lapses: number;
  created_at: string;
};

function fromRow(row: Row): Card {
  return {
    id: row.id,
    deckId: row.deck_id,
    front: row.front,
    back: row.back,
    state: row.state as CardState,
    stability: row.stability,
    difficulty: row.difficulty,
    due: row.due,
    lastReview: row.last_review,
    reps: row.reps,
    lapses: row.lapses,
    createdAt: row.created_at,
  };
}

export async function listCards(): Promise<Card[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>("SELECT * FROM cards ORDER BY created_at ASC;");
  return rows.map(fromRow);
}

export async function createCard(deckId: string, front: string, back: string): Promise<Card> {
  const db = await getDb();
  const card: Card = {
    id: generateId(),
    deckId,
    front,
    back,
    state: "new",
    stability: 0,
    difficulty: 0,
    due: todayIso(),
    lastReview: null,
    reps: 0,
    lapses: 0,
    createdAt: new Date().toISOString(),
  };
  await db.runAsync(
    `INSERT INTO cards (id, deck_id, front, back, state, stability, difficulty, due, last_review, reps, lapses, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, 0, ?);`,
    [card.id, card.deckId, card.front, card.back, card.state, card.stability, card.difficulty, card.due, card.createdAt]
  );
  return card;
}

export async function updateCardText(id: string, front: string, back: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE cards SET front = ?, back = ? WHERE id = ?;", [front, back, id]);
}

export async function deleteCard(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM cards WHERE id = ?;", [id]);
}

// Повторение и его лог пишутся ОДНОЙ транзакцией: лог нужен для калибровки,
// и расходиться с состоянием карточки он не имеет права.
export async function commitReview(card: Card, grade: Grade, result: ScheduleResult): Promise<void> {
  const db = await getDb();
  const log: ReviewLog = {
    id: generateId(),
    cardId: card.id,
    deckId: card.deckId,
    grade,
    predictedRetrievability: result.predictedRetrievability,
    elapsedDays: result.elapsedDays,
    stabilityBefore: card.stability,
    stabilityAfter: result.stability,
    reviewedAt: nowStamp(),
  };
  const today = todayIso();

  await db.execAsync("BEGIN");
  try {
    await db.runAsync(
      "UPDATE cards SET state = ?, stability = ?, difficulty = ?, due = ?, last_review = ?, reps = reps + 1, lapses = lapses + ? WHERE id = ?;",
      [result.state, result.stability, result.difficulty, result.due, today, grade === 1 ? 1 : 0, card.id]
    );
    await db.runAsync(
      `INSERT INTO review_logs (id, card_id, deck_id, grade, predicted_retrievability, elapsed_days, stability_before, stability_after, reviewed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [log.id, log.cardId, log.deckId, log.grade, log.predictedRetrievability, log.elapsedDays, log.stabilityBefore, log.stabilityAfter, log.reviewedAt]
    );
    await db.execAsync("COMMIT");
  } catch (e) {
    await db.execAsync("ROLLBACK");
    throw e;
  }
}

type LogRow = {
  id: string;
  card_id: string;
  deck_id: string;
  grade: number;
  predicted_retrievability: number;
  elapsed_days: number;
  stability_before: number;
  stability_after: number;
  reviewed_at: string;
};

export async function listReviewLogs(): Promise<ReviewLog[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LogRow>("SELECT * FROM review_logs ORDER BY reviewed_at DESC;");
  return rows.map((r) => ({
    id: r.id,
    cardId: r.card_id,
    deckId: r.deck_id,
    grade: r.grade as Grade,
    predictedRetrievability: r.predicted_retrievability,
    elapsedDays: r.elapsed_days,
    stabilityBefore: r.stability_before,
    stabilityAfter: r.stability_after,
    reviewedAt: r.reviewed_at,
  }));
}

export async function deleteAllData(): Promise<void> {
  const db = await getDb();
  await db.execAsync("DELETE FROM review_logs; DELETE FROM cards; DELETE FROM decks;");
}
