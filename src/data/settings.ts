import { getDb } from "../db/client";
import { DEFAULT_SCHEDULER, type SchedulerSettings } from "../lib/scheduler.ts";

export type AppSettings = SchedulerSettings & { haptics: boolean };

export const DEFAULT_SETTINGS: AppSettings = { ...DEFAULT_SCHEDULER, haptics: true };

export async function loadSettings(): Promise<AppSettings> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>("SELECT * FROM app_settings;");
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    targetRetention: Number(map.get("targetRetention") ?? DEFAULT_SETTINGS.targetRetention),
    maxIntervalDays: Number(map.get("maxIntervalDays") ?? DEFAULT_SETTINGS.maxIntervalDays),
    newPerDay: Number(map.get("newPerDay") ?? DEFAULT_SETTINGS.newPerDay),
    reviewsPerDay: Number(map.get("reviewsPerDay") ?? DEFAULT_SETTINGS.reviewsPerDay),
    haptics: (map.get("haptics") ?? "1") === "1",
  };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDb();
  const entries: [string, string][] = [
    ["targetRetention", String(settings.targetRetention)],
    ["maxIntervalDays", String(settings.maxIntervalDays)],
    ["newPerDay", String(settings.newPerDay)],
    ["reviewsPerDay", String(settings.reviewsPerDay)],
    ["haptics", settings.haptics ? "1" : "0"],
  ];
  for (const [key, value] of entries) {
    await db.runAsync("INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;", [key, value]);
  }
}
