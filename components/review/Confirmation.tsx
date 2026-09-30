"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBooking } from "@/lib/booking-context";
import { formatDuration, formatPrice } from "@/lib/format";
import { downloadIcs, googleCalendarUrl, type CalendarEvent } from "@/lib/ics";
import { ROUTES, STUDIO } from "@/lib/nav";
import { scheduleSummary, sessionDescription } from "@/lib/session-summary";
import { Icon } from "../Icon";
import { Card } from "../ui/Card";

/** Post-submit state of the review step (no backend: the reservation lives in local state). */
export function Confirmation() {
  const router = useRouter();
  const { state, actions, blocks, totalMinutes, totalPrice } = useBooking();
  const confirmation = state.confirmation!;
  const schedule = scheduleSummary(state, totalMinutes);
  const firstName = state.intake.fullName.trim().split(/\s+/)[0];

  const event: CalendarEvent | null = schedule && {
    uid: confirmation.reference,
    title: "Soma Studio · Custom Sanctuary Session with Elena Vance",
    description: `${sessionDescription(blocks)}\n\nReference ${confirmation.reference}`,
    location: `${STUDIO.room}, ${STUDIO.address}`,
    date: schedule.date,
    startMinutes: schedule.startMinutes,
    durationMinutes: totalMinutes,
  };

  return (
    <main className="mx-auto w-full max-w-lg space-y-6 px-4 pb-10 pt-8 md:max-w-2xl">
      <div className="space-y-3 text-center" role="status">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-fixed text-primary">
          <Icon name="event_available" className="text-3xl" />
        </div>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-medium tracking-tight text-primary md:font-headline-lg md:text-headline-lg">
          {firstName ? `Your sanctuary awaits, ${firstName}` : "Your sanctuary awaits"}
        </h1>
        <p className="mx-auto max-w-sm font-body-sm text-body-sm text-on-surface-variant">
          Your session is reserved. Elena will reach out personally before you arrive — no card is charged until
          your session concludes.
        </p>
        <span className="inline-flex rounded-full border border-outline-variant/40 bg-surface-container-low px-3 py-1 font-label-md text-label-md tracking-wider text-primary">
          Reference {confirmation.reference}
        </span>
      </div>

      <Card className="space-y-4">
        {schedule && (
          <div className="flex items-center gap-3 border-b border-surface-variant/50 pb-3">
            <Icon name="event" className="text-[22px] text-primary" />
            <div>
              <div className="font-title-md text-title-md text-on-surface">{schedule.dayLabel}</div>
              <div className="font-body-sm text-body-sm text-on-surface-variant">
                {schedule.timeLabel} · {formatDuration(totalMinutes, "short")}
              </div>
            </div>
          </div>
        )}
        <ul className="space-y-2 font-body-sm text-body-sm">
          {blocks.map((b) => (
            <li key={b.id} className="flex justify-between gap-3 text-on-surface-variant">
              <span>
                {b.name}
                {b.option ? ` · ${b.option}` : ""} <span className="text-outline">({b.duration} min)</span>
              </span>
              <span>{formatPrice(b.price)}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between border-t border-surface-variant pt-2.5">
          <span className="font-title-lg text-title-lg text-primary">Total Investment</span>
          <span className="font-headline-md text-headline-md text-primary">{formatPrice(totalPrice, true)}</span>
        </div>
      </Card>

      {event && (
        <Card className="space-y-3">
          <h2 className="flex items-center gap-2 font-title-md text-title-md text-on-surface">
            <Icon name="notifications_active" className="text-[20px] text-primary" />
            {state.calendarSync ? "Sync to your calendar" : "Add to your calendar"}
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadIcs(`soma-studio-${confirmation.reference}.ics`, event)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant/60 px-4 py-2.5 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container"
            >
              <Icon name="event_note" className="text-[18px]" />
              Download .ics
            </button>
            <a
              href={googleCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant/60 px-4 py-2.5 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container"
            >
              <Icon name="open_in_new" className="text-[18px]" />
              Google Calendar
            </a>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          onClick={() => {
            actions.startOver();
            router.push(ROUTES.builder);
          }}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3.5 font-title-md text-title-md text-on-primary shadow-sm transition-colors hover:bg-primary-container"
        >
          Build another session
          <Icon name="arrow_forward" className="text-lg" />
        </button>
        <Link
          href={ROUTES.schedule}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-outline-variant/60 px-5 py-3.5 font-title-md text-title-md text-primary transition-colors hover:bg-surface-container"
        >
          Explore group classes
        </Link>
      </div>
    </main>
  );
}
