"use client";

import { useState } from "react";
import { HEALTH_CONSENTS, TIME_SLOTS } from "@/lib/catalog";
import { sessionBlocks } from "@/lib/booking-context";
import { useDatabase } from "@/lib/db-context";
import { formatClock, formatDate, formatPrice } from "@/lib/format";
import { repository, type BookingStatus, type ConfirmedBooking } from "@/lib/repository";
import { cn } from "@/lib/cn";
import { chargeBooking } from "@/lib/payments/client";
import { sessionCharged, type PaymentKind, type PaymentStatus } from "@/lib/payments/policy";

const STATUSES: BookingStatus[] = ["upcoming", "completed", "cancelled"];

interface Flag {
  label: string;
  tone: "alert" | "note";
}

/** Things the practitioner must see before the session. */
function healthFlags(b: ConfirmedBooking): Flag[] {
  const { consents, sensitivities } = b.state.intake;
  const flags: Flag[] = [];
  if (consents.pregnant) flags.push({ label: "Pregnant — side-lying protocol", tone: "alert" });
  for (const c of HEALTH_CONSENTS) {
    if (c.required && !consents[c.id]) flags.push({ label: `Missing: ${c.label}`, tone: "alert" });
  }
  if (sensitivities.trim()) flags.push({ label: "Has sensitivities", tone: "note" });
  return flags;
}

function FlagList({ flags }: { flags: Flag[] }) {
  if (flags.length === 0) return <span className="text-label-sm text-on-surface-variant">No flags</span>;
  return (
    <ul className="flex flex-wrap gap-1">
      {flags.map((f) => (
        <li
          key={f.label}
          className={cn(
            "rounded-full px-2 py-0.5 text-label-sm",
            f.tone === "alert" ? "bg-error-container text-on-error-container font-semibold" : "bg-secondary-fixed text-on-secondary-container",
          )}
        >
          {f.label}
        </li>
      ))}
    </ul>
  );
}

function sessionWhen(b: ConfirmedBooking): string {
  const { date, slot } = b.state.intake;
  const start = (TIME_SLOTS.find((s) => s.id === slot) ?? TIME_SLOTS[0]).startMinutes;
  const day = date ? formatDate(date, { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "No date";
  return `${day} · ${formatClock(start)}`;
}

function clientName(b: ConfirmedBooking): string {
  return b.profile?.fullName || b.state.intake.fullName || "Guest";
}

/** Marking a session completed charges its total to the card on file, unless already charged. */
async function setStatus(booking: ConfirmedBooking, status: BookingStatus, total: number) {
  await repository.setBookingStatus(booking.id, status);
  if (status === "completed" && booking.payment?.status === "card-on-file") {
    await chargeBooking(booking, "session", total);
  }
}

function StatusSelect({ booking, total }: { booking: ConfirmedBooking; total: number }) {
  return (
    <select
      value={booking.status}
      aria-label={`Status for ${clientName(booking)}`}
      onChange={(e) => void setStatus(booking, e.target.value as BookingStatus, total)}
      className="rounded-lg border border-outline-variant bg-surface px-3 py-1 text-on-surface text-label-sm uppercase"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  "card-on-file": "Card on file",
  charged: "Charged",
  "fee-charged": "Fee charged",
  failed: "Failed",
};

function PaymentCell({ booking, total }: { booking: ConfirmedBooking; total: number }) {
  const [busy, setBusy] = useState(false);
  const payment = booking.payment;
  if (!payment) return <p className="text-on-surface-variant">No card on file</p>;
  const last = payment.transactions.at(-1);
  // A cancelled booking whose late-cancel fee was declined can retry that fee; an active one can charge its session.
  const action: { kind: PaymentKind; amount: number; label: string } | null =
    booking.status === "cancelled"
      ? last && !last.ok && last.kind === "late-cancel-fee"
        ? { kind: "late-cancel-fee", amount: last.amount, label: `Retry fee ${formatPrice(last.amount, true)}` }
        : null
      : !sessionCharged(payment) && payment.status !== "fee-charged"
        ? { kind: "session", amount: total, label: `Charge session ${formatPrice(total, true)}` }
        : null;
  return (
    <div className="space-y-1">
      <span
        className={cn(
          "inline-flex rounded-full px-2 py-0.5 text-label-sm uppercase tracking-wider",
          payment.status === "failed" ? "bg-error-container text-on-error-container" : "bg-primary-fixed/60 text-primary",
        )}
      >
        {PAYMENT_LABELS[payment.status]}
      </span>
      <p className="text-on-surface-variant">
        {payment.card.brand} •••• {payment.card.last4}
      </p>
      {last && (
        <p className="text-label-sm text-on-surface-variant">
          {last.ok
            ? `${last.kind === "session" ? "Session" : "Late-cancel fee"} ${formatPrice(last.amount, true)} · ${last.transactionId}`
            : `${formatPrice(last.amount, true)} declined: ${last.message}`}
        </p>
      )}
      {action && (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await chargeBooking(booking, action.kind, action.amount);
            } finally {
              setBusy(false);
            }
          }}
          className="rounded-lg border border-primary/50 px-3 py-1 text-label-sm text-primary hover:bg-primary/10 disabled:opacity-60"
        >
          {busy ? "Charging…" : action.label}
        </button>
      )}
    </div>
  );
}

/** Full intake: tailoring answers, sensitivities and every consent with its label. */
function IntakeDetails({ booking }: { booking: ConfirmedBooking }) {
  const { intake } = booking.state;
  return (
    <details className="text-body-sm">
      <summary className="cursor-pointer text-primary">Intake &amp; health notes</summary>
      <dl className="mt-2 space-y-1 text-on-surface-variant">
        <div>
          <dt className="inline font-semibold">Focus: </dt>
          <dd className="inline">{intake.focusAreas.join(", ") || "—"}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">Pressure: </dt>
          <dd className="inline">{intake.pressure}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">Sensitivities: </dt>
          <dd className="inline">{intake.sensitivities || "None"}</dd>
        </div>
        <div>
          <dt className="inline font-semibold">Emergency contact: </dt>
          <dd className="inline">{booking.profile?.emergencyContact || intake.emergencyContact || "—"}</dd>
        </div>
        {HEALTH_CONSENTS.map((c) => (
          <div key={c.id}>
            <dt className="inline font-semibold">{c.label}: </dt>
            <dd className="inline">{intake.consents[c.id] ? "Yes" : "No"}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export function AdminBookings() {
  const { bookings, modalities } = useDatabase();
  const [filter, setFilter] = useState("all");

  const filteredBookings = bookings.filter((b) => filter === "all" || b.status === filter);
  const rows = filteredBookings.map((b) => {
    const blocks = b.blocks ?? sessionBlocks(b.state, modalities);
    return {
      booking: b,
      flags: healthFlags(b),
      modalities: blocks.map((x) => `${x.name} (${x.duration}m)`).join(", "),
      total: b.totalPrice ?? blocks.reduce((sum, x) => sum + x.price, 0),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-headline-sm text-primary">Bookings</h1>
        <select
          value={filter}
          aria-label="Filter bookings by status"
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-outline-variant bg-surface p-2 text-on-surface"
        >
          <option value="all">All Bookings</option>
          <option value="upcoming">Upcoming</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {rows.length === 0 && (
        <p className="p-4 text-body-md text-on-surface-variant text-center border border-dashed border-outline-variant/60 rounded-xl">
          No bookings match the filter.
        </p>
      )}

      {/* md+: a real table */}
      {rows.length > 0 && (
        <div className="hidden md:block overflow-x-auto rounded-xl border border-outline-variant/30 bg-surface-container-lowest">
          <table className="w-full text-left text-body-sm">
            <thead className="border-b border-outline-variant/30 text-label-sm uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th scope="col" className="p-3 font-semibold">Client</th>
                <th scope="col" className="p-3 font-semibold">Session</th>
                <th scope="col" className="p-3 font-semibold">Health</th>
                <th scope="col" className="p-3 font-semibold">Payment</th>
                <th scope="col" className="p-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 align-top">
              {rows.map(({ booking: b, flags, modalities: mods, total }) => (
                <tr key={b.id} className={cn(flags.some((f) => f.tone === "alert") && "bg-error-container/20")}>
                  <td className="p-3">
                    <p className="font-title-md text-on-surface">{clientName(b)}</p>
                    <p className="text-on-surface-variant">{b.profile?.phone || b.state.intake.phone}</p>
                    <p className="text-label-sm text-on-surface-variant">Ref {b.id}</p>
                  </td>
                  <td className="p-3">
                    <p className="text-on-surface">{sessionWhen(b)}</p>
                    <p className="text-on-surface-variant">{mods}</p>
                    <p className="text-on-surface-variant">{formatPrice(total)}</p>
                  </td>
                  <td className="p-3 space-y-2">
                    <FlagList flags={flags} />
                    <IntakeDetails booking={b} />
                  </td>
                  <td className="p-3">
                    <PaymentCell booking={b} total={total} />
                  </td>
                  <td className="p-3">
                    <StatusSelect booking={b} total={total} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile: cards */}
      <div className="grid gap-4 md:hidden">
        {rows.map(({ booking: b, flags, modalities: mods, total }) => (
          <div key={b.id} className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 space-y-3">
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-title-md text-on-surface">{clientName(b)}</p>
                <p className="text-body-sm text-on-surface-variant">
                  Ref {b.id} • {b.profile?.phone || b.state.intake.phone}
                </p>
              </div>
              <StatusSelect booking={b} total={total} />
            </div>
            <div className="text-body-sm">
              <p className="text-on-surface">{sessionWhen(b)}</p>
              <p className="text-on-surface-variant">{mods} · {formatPrice(total)}</p>
            </div>
            <div className="text-body-sm">
              <PaymentCell booking={b} total={total} />
            </div>
            <FlagList flags={flags} />
            <IntakeDetails booking={b} />
          </div>
        ))}
      </div>
    </div>
  );
}
