/** 135 -> "2 hrs 15 mins" (long) or "2 hr 15 min" (short). */
export function formatDuration(minutes: number, style: "long" | "short" | "compact" = "long"): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (style === "compact") return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
  const plural = style === "long";
  const hours = h ? `${h} ${plural && h !== 1 ? "hrs" : "hr"}` : "";
  const mins = m ? `${m} ${plural && m !== 1 ? "mins" : "min"}` : "";
  return [hours, mins].filter(Boolean).join(" ") || "0 min";
}

/** Minutes after midnight -> "9:30 AM". */
export function formatClock(minutesOfDay: number): string {
  const h24 = Math.floor(minutesOfDay / 60) % 24;
  const m = minutesOfDay % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatTimeRange(startMinutes: number, durationMinutes: number): string {
  return `${formatClock(startMinutes)} – ${formatClock(startMinutes + durationMinutes)}`;
}

export function formatPrice(amount: number, cents = false): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(amount);
}

/* ------------------------------------------------------------------ Dates --- */

/** YYYY-MM-DD for a local Date. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function formatDate(key: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", options).format(fromDateKey(key));
}
