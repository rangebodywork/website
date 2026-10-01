"use client";

import { TIME_SLOTS } from "@/lib/catalog";
import { sessionBlocks } from "@/lib/booking-context";
import { useDatabase } from "@/lib/db-context";
import { formatClock, formatDate } from "@/lib/format";
import { Icon } from "@/components/Icon";

export function AdminDashboard() {
  const { bookings, classes, workshops, modalities } = useDatabase();
  // Undated sessions sort last.
  const upcoming = bookings
    .filter((b) => b.status === "upcoming")
    .sort((a, b) => (a.state.intake.date ?? "9999").localeCompare(b.state.intake.date ?? "9999"));
  const upcomingBookings = upcoming.length;
  
  return (
    <div className="space-y-6">
      <h1 className="text-headline-sm text-primary mb-6">Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-5">
          <div className="flex items-center gap-3 text-secondary mb-2">
            <Icon name="event" className="text-2xl" />
            <span className="font-title-md">Upcoming Bookings</span>
          </div>
          <p className="text-4xl font-bold text-on-surface">{upcomingBookings}</p>
        </div>
        
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-5">
          <div className="flex items-center gap-3 text-secondary mb-2">
            <Icon name="calendar_month" className="text-2xl" />
            <span className="font-title-md">Classes Offered</span>
          </div>
          <p className="text-4xl font-bold text-on-surface">{classes.length}</p>
        </div>

        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-5">
          <div className="flex items-center gap-3 text-secondary mb-2">
            <Icon name="star" className="text-2xl" />
            <span className="font-title-md">Workshops Offered</span>
          </div>
          <p className="text-4xl font-bold text-on-surface">{workshops.length}</p>
        </div>
      </div>
      
      <h2 className="text-title-lg text-primary mt-8 mb-4">Upcoming Sessions</h2>
      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest divide-y divide-outline-variant/30">
        {upcoming.slice(0, 8).map((b) => (
          <div key={b.id} className="p-4 flex justify-between items-center">
            <div>
              <p className="font-title-md text-on-surface">{b.state.intake.fullName || "Guest"}</p>
              <p className="text-body-sm text-on-surface-variant">
                {b.state.intake.date
                  ? formatDate(b.state.intake.date, { weekday: "short", month: "short", day: "numeric" })
                  : "No date"}{" "}
                · {formatClock((TIME_SLOTS.find((s) => s.id === b.state.intake.slot) ?? TIME_SLOTS[0]).startMinutes)} ·{" "}
                {(b.blocks ?? sessionBlocks(b.state, modalities)).map((x) => x.name).join(", ")}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full border border-primary/30 text-label-sm text-primary uppercase">
              {b.status}
            </span>
          </div>
        ))}
        {upcoming.length === 0 && (
          <p className="p-4 text-body-md text-on-surface-variant text-center">No upcoming sessions.</p>
        )}
      </div>
    </div>
  );
}
