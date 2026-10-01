"use client";

import { useDatabase } from "@/lib/db-context";
import { repository } from "@/lib/repository";
import { Card, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/Icon";

export function BookingsList() {
  const { bookings } = useDatabase();

  const handleCancel = (id: string) => {
    void repository.setBookingStatus(id, "cancelled");
  };

  if (bookings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-outline-variant/60 p-8 text-center">
        <Icon name="event_note" className="mb-2 text-4xl text-outline-variant" />
        <h2 className="font-title-lg text-title-lg text-on-surface">No bookings yet</h2>
        <p className="mt-2 text-body-md text-on-surface-variant">Your upcoming and past reservations will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <Card key={booking.id}>
          <CardHeader title={`Booking ${booking.id}`} aside={<span className="capitalize">{booking.status}</span>} />
          <div className="mt-4">
            <p className="text-body-md text-on-surface-variant">
              Date: {booking.state.intake.date || "TBD"} • Slot: {booking.state.intake.slot}
            </p>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Modalities: {booking.state.sequence.join(", ")}
            </p>
            {booking.status === "upcoming" && (
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCancel(booking.id)}
                  className="rounded-lg border border-error/50 px-4 py-2 text-error hover:bg-error/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-primary/50 px-4 py-2 text-primary hover:bg-primary/10"
                >
                  Reschedule
                </button>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
