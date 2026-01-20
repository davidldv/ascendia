export function dateKeyInTimeZone(date: Date, timeZone: string): string {
  // en-CA gives YYYY-MM-DD ordering.
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  // Some runtimes may format as YYYY-MM-DD already, but normalize just in case.
  // If formatted is like 2026-01-20: keep it.
  if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) return formatted;

  // Fallback: parse common formats (e.g. 01/20/2026)
  const parts = formatted.split(/[^0-9]/).filter(Boolean);
  if (parts.length >= 3) {
    const [month, day, year] = parts.map((p) => Number(p));
    if (year && month && day) {
      return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // Last resort: UTC date key
  return date.toISOString().slice(0, 10);
}

export function diffDays(aDateKey: string, bDateKey: string): number {
  const a = new Date(`${aDateKey}T00:00:00Z`).getTime();
  const b = new Date(`${bDateKey}T00:00:00Z`).getTime();
  return Math.round((a - b) / (24 * 60 * 60 * 1000));
}
