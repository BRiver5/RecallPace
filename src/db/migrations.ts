import type { SQLiteDatabase } from "expo-sqlite";

// Каждая миграция — одна ступень схемы. Не редактируй уже выпущенную миграцию —
// добавляй новую в конец массива. PRAGMA user_version хранит номер последней
// применённой ступени, миграции применяются последовательно от текущего значения.
const migrations: string[] = [
  `
  CREATE TABLE IF NOT EXISTS decks (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY NOT NULL,
    deck_id TEXT NOT NULL REFERENCES decks(id),
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    state TEXT NOT NULL,
    stability REAL NOT NULL,
    difficulty REAL NOT NULL,
    due TEXT NOT NULL,
    last_review TEXT,
    reps INTEGER NOT NULL DEFAULT 0,
    lapses INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS cards_deck_due ON cards(deck_id, due);

  CREATE TABLE IF NOT EXISTS review_logs (
    id TEXT PRIMARY KEY NOT NULL,
    card_id TEXT NOT NULL,
    deck_id TEXT NOT NULL,
    grade INTEGER NOT NULL,
    predicted_retrievability REAL NOT NULL,
    elapsed_days REAL NOT NULL,
    stability_before REAL NOT NULL,
    stability_after REAL NOT NULL,
    reviewed_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS review_logs_reviewed ON review_logs(reviewed_at);

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version;");
  const currentVersion = row?.user_version ?? 0;

  for (let i = currentVersion; i < migrations.length; i++) {
    await db.execAsync(migrations[i]);
    await db.execAsync(`PRAGMA user_version = ${i + 1};`);
  }
}
