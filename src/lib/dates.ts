export type DayIso = string; // YYYY-MM-DD

function pad(v: number): string {
  return String(v).padStart(2, "0");
}

export function toDayIso(date: Date): DayIso {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayIso(): DayIso {
  return toDayIso(new Date());
}

export function nowStamp(): string {
  const d = new Date();
  return `${toDayIso(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function dayOf(stamp: string): DayIso {
  return stamp.slice(0, 10);
}

export function addDays(day: DayIso, delta: number): DayIso {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  return toDayIso(date);
}

export function diffDays(from: DayIso, to: DayIso): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}

export function lastDays(day: DayIso, count: number): DayIso[] {
  const out: DayIso[] = [];
  for (let i = count - 1; i >= 0; i--) out.push(addDays(day, -i));
  return out;
}

export function nextDays(day: DayIso, count: number): DayIso[] {
  const out: DayIso[] = [];
  for (let i = 0; i < count; i++) out.push(addDays(day, i));
  return out;
}

export function weekdayNarrow(day: DayIso): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "narrow" });
}

export function formatDayShort(day: DayIso): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// "через 3 дня" / "через 2 мес" — интервал повторения показываем человеку,
// а не в сырых днях, когда счёт идёт на месяцы и годы.
export function formatInterval(days: number): string {
  if (days < 1) return "today";
  if (days === 1) return "1 day";
  if (days < 30) return `${Math.round(days)} days`;
  if (days < 365) {
    const months = days / 30.4;
    return `${months < 2 ? "1 month" : `${Math.round(months)} months`}`;
  }
  const years = days / 365;
  return years < 2 ? "1 year" : `${Math.round(years * 10) / 10} years`;
}
