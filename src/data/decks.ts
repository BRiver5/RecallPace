import { getDb } from "../db/client";
import { generateId } from "../lib/id";
import type { Deck } from "../lib/card.ts";

type Row = { id: string; name: string; description: string; archived: number; created_at: string };

function fromRow(row: Row): Deck {
  return { id: row.id, name: row.name, description: row.description, archived: row.archived === 1, createdAt: row.created_at };
}

export async function listDecks(): Promise<Deck[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>("SELECT * FROM decks WHERE archived = 0 ORDER BY created_at ASC;");
  return rows.map(fromRow);
}

export async function createDeck(name: string, description = ""): Promise<Deck> {
  const db = await getDb();
  const deck: Deck = { id: generateId(), name, description, archived: false, createdAt: new Date().toISOString() };
  await db.runAsync("INSERT INTO decks (id, name, description, archived, created_at) VALUES (?, ?, ?, 0, ?);", [
    deck.id,
    deck.name,
    deck.description,
    deck.createdAt,
  ]);
  return deck;
}

export async function renameDeck(id: string, name: string, description: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE decks SET name = ?, description = ? WHERE id = ?;", [name, description, id]);
}

export async function archiveDeck(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE decks SET archived = 1 WHERE id = ?;", [id]);
}
