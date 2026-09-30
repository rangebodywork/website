import { fromDateKey } from "./format";

export interface CalendarEvent {
  uid: string;
  title: string;
  description: string;
  location: string;
  /** YYYY-MM-DD */
  date: string;
  startMinutes: number;
  durationMinutes: number;
}

function stamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (c) => `\\${c}`);
}

function bounds(event: CalendarEvent): { start: Date; end: Date } {
  const start = fromDateKey(event.date);
  start.setMinutes(event.startMinutes);
  return { start, end: new Date(start.getTime() + event.durationMinutes * 60_000) };
}

export function buildIcs(event: CalendarEvent): string {
  const { start, end } = bounds(event);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Soma Studio//Session Builder//EN",
    "BEGIN:VEVENT",
    `UID:${event.uid}@somastudio.com`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(event.title)}`,
    `DESCRIPTION:${escape(event.description)}`,
    `LOCATION:${escape(event.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Triggers a browser download of an .ics file. */
export function downloadIcs(filename: string, event: CalendarEvent): void {
  const blob = new Blob([buildIcs(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function googleCalendarUrl(event: CalendarEvent): string {
  const { start, end } = bounds(event);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: event.description,
    location: event.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
