"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TIME_SLOTS, type TimeSlotId } from "@/lib/catalog";
import { sessionBlocks, useBooking } from "@/lib/booking-context";
import { useDatabase } from "@/lib/db-context";
import { addDays, formatClock, formatDate, formatPrice } from "@/lib/format";
import { ROUTES } from "@/lib/nav";
import { repository, type ConfirmedBooking } from "@/lib/repository";
import { useTodayKey } from "@/components/intake/SacredWindow";
import { Card, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/Icon";

/** Past once it is no longer upcoming, or its day has gone by. */
function isPast(booking: ConfirmedBooking, today: string | null): boolean {
  if (booking.status !== "upcoming") return true;
  const date = booking.state.intake.date;
  return Boolean(today && date && date < today);
}

const byDate = (a: ConfirmedBooking, b: ConfirmedBooking) =>
  (a.state.intake.date ?? "").localeCompare(b.state.intake.date ?? "");

export function BookingsList() {
  const { bookings } = useDatabase();
  const today = useTodayKey();

  if (bookings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-outline-variant/60 p-8 text-center">
        <Icon name="event_note" className="mb-2 text-4xl text-outline-variant" />
        <h2 className="font-title-lg text-title-lg text-on-surface">No bookings yet</h2>
        <p className="mt-2 text-body-md text-on-surface-variant">Your upcoming and past reservations will appear here.</p>
        <Link href={ROUTES.builder} className="mt-4 inline-block font-label-md text-label-md text-primary underline">
          Build a session
        </Link>
      </div>
    );
  }

  const upcoming = bookings.filter((b) => !isPast(b, today)).sort(byDate);
  const past = bookings.filter((b) => isPast(b, today)).sort((a, b) => byDate(b, a));

  return (
    <div className="space-y-8">
      <BookingSection title="Upcoming" empty="No upcoming sessions." bookings={upcoming} editable today={today} />
      <BookingSection title="Past" empty="No past sessions yet." bookings={past} editable={false} today={today} />
    </div>
  );
}

function BookingSection({
  title,
  empty,
  bookings,
  editable,
  today,
}: {
  title: string;
  empty: string;
  bookings: ConfirmedBooking[];
  editable: boolean;
  today: string | null;
}) {
  const id = `bookings-${title.toLowerCase()}`;
  return (
    <section aria-labelledby={id} className="space-y-4">
      <h2 id={id} className="font-headline-md text-headline-md text-primary">
        {title}
      </h2>
      {bookings.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">{empty}</p>
      ) : (
        bookings.map((b) => <BookingCard key={b.id} booking={b} editable={editable} today={today} />)
      )}
    </section>
  );
}

function BookingCard({ booking, editable, today }: { booking: ConfirmedBooking; editable: boolean; today: string | null }) {
  const { modalities } = useDatabase();
  const { actions } = useBooking();
  const [mode, setMode] = useState<"view" | "cancel" | "reschedule">("view");
  const cancelTrigger = useRef<HTMLButtonElement>(null);
  const keepButton = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const { date, slot } = booking.state.intake;

  // Focus moves into the cancel dialog (onto the safe choice) and back to its trigger on dismiss.
  useEffect(() => {
    if (mode === "cancel") keepButton.current?.focus();
    else if (mode === "view" && restoreFocus.current) {
      restoreFocus.current = false;
      cancelTrigger.current?.focus();
    }
  }, [mode]);

  const dismissCancel = () => {
    restoreFocus.current = true;
    setMode("view");
  };
  const blocks = booking.blocks ?? sessionBlocks(booking.state, modalities);
  const total = booking.totalPrice ?? blocks.reduce((sum, b) => sum + b.price, 0);
  const slotInfo = TIME_SLOTS.find((s) => s.id === slot) ?? TIME_SLOTS[0];
  const status = booking.status === "upcoming" && !editable ? "past" : booking.status;

  return (
    <Card>
      <CardHeader
        title={date ? formatDate(date, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "Date to be confirmed"}
        aside={<span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{status}</span>}
      />
      <div className="mt-4 space-y-1">
        <p className="text-body-md text-on-surface">
          {formatClock(slotInfo.startMinutes)} · {slotInfo.label}
        </p>
        <p className="text-body-sm text-on-surface-variant">
          {blocks.map((b) => `${b.name} (${b.duration} min)`).join(" → ")}
        </p>
        <p className="text-body-sm text-on-surface-variant">
          {formatPrice(total)} · Reference {booking.id}
        </p>
      </div>

      {editable && mode === "view" && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("reschedule")}
            className="rounded-lg border border-primary/50 px-4 py-2 text-primary hover:bg-primary/10"
          >
            Reschedule
          </button>
          <button
            ref={cancelTrigger}
            type="button"
            onClick={() => setMode("cancel")}
            className="rounded-lg border border-error/50 px-4 py-2 text-error hover:bg-error/10"
          >
            Cancel
          </button>
        </div>
      )}

      {editable && mode === "cancel" && (
        <div
          role="alertdialog"
          aria-labelledby={`cancel-${booking.id}`}
          onKeyDown={(e) => e.key === "Escape" && dismissCancel()}
          className="mt-4 rounded-lg bg-error/5 p-4"
        >
          <p id={`cancel-${booking.id}`} className="text-body-md text-on-surface">
            Cancel this session? The studio will release your time slot.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                void repository.setBookingStatus(booking.id, "cancelled");
                actions.syncCancelled(booking.id);
              }}
              className="rounded-lg bg-error px-4 py-2 text-on-error"
            >
              Yes, cancel booking
            </button>
            <button
              ref={keepButton}
              type="button"
              onClick={dismissCancel}
              className="rounded-lg border border-outline-variant px-4 py-2 text-on-surface"
            >
              Keep booking
            </button>
          </div>
        </div>
      )}

      {editable && mode === "reschedule" && (
        <RescheduleForm
          booking={booking}
          minDate={today ? addDays(today, 1) : undefined}
          onCancel={() => setMode("view")}
          onSave={(newDate, newSlot) => {
            void repository.rescheduleBooking(booking.id, newDate, newSlot);
            actions.syncRescheduled(booking.id, newDate, newSlot);
            setMode("view");
          }}
        />
      )}
    </Card>
  );
}

function RescheduleForm({
  booking,
  minDate,
  onSave,
  onCancel,
}: {
  booking: ConfirmedBooking;
  minDate?: string;
  onSave: (date: string, slot: TimeSlotId) => void;
  onCancel: () => void;
}) {
  const current = booking.state.intake;
  const [date, setDate] = useState(
    current.date && (!minDate || current.date >= minDate) ? current.date : (minDate ?? ""),
  );
  const [slot, setSlot] = useState<TimeSlotId>(current.slot);
  const dateId = `reschedule-date-${booking.id}`;
  const slotId = `reschedule-slot-${booking.id}`;

  return (
    <form
      className="mt-4 space-y-3 rounded-lg bg-surface-container-low p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (date) onSave(date, slot);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={dateId} className="block text-label-md text-on-surface-variant">
            New date
          </label>
          <input
            id={dateId}
            type="date"
            required
            min={minDate}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-on-surface"
          />
        </div>
        <div>
          <label htmlFor={slotId} className="block text-label-md text-on-surface-variant">
            Time
          </label>
          <select
            id={slotId}
            value={slot}
            onChange={(e) => setSlot(e.target.value as TimeSlotId)}
            className="mt-1 block w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-on-surface"
          >
            {TIME_SLOTS.map((s) => (
              <option key={s.id} value={s.id}>
                {formatClock(s.startMinutes)} · {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-on-primary">
          Save new time
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-outline-variant px-4 py-2 text-on-surface">
          Back
        </button>
      </div>
    </form>
  );
}
