"use client";

import { useDatabase } from "@/lib/db-context";
import { repository } from "@/lib/repository";
import { useState } from "react";

export function AdminBookings() {
  const { bookings } = useDatabase();
  const [filter, setFilter] = useState("all");

  const filteredBookings = bookings.filter((b) => filter === "all" || b.status === filter);

  const updateStatus = (id: string, status: "upcoming" | "completed" | "cancelled") => {
    void repository.setBookingStatus(id, status);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-headline-sm text-primary">Bookings</h1>
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-outline-variant bg-surface p-2 text-on-surface"
        >
          <option value="all">All Bookings</option>
          <option value="upcoming">Upcoming</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="grid gap-4">
        {filteredBookings.map((b) => (
          <div key={b.id} className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 space-y-4">
            <div className="flex justify-between">
              <div>
                <p className="font-title-md text-on-surface">{b.state.intake.fullName || "Guest"}</p>
                <p className="text-body-sm text-on-surface-variant">Ref: {b.id} • {b.state.intake.phone}</p>
              </div>
              <select 
                value={b.status} 
                onChange={(e) => updateStatus(b.id, e.target.value as "upcoming" | "completed" | "cancelled")}
                className="rounded-lg border border-outline-variant bg-surface px-3 py-1 text-on-surface text-label-sm uppercase"
              >
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-body-sm border-t border-outline-variant/30 pt-4">
              <div>
                <span className="font-label-md text-primary block mb-1">Session</span>
                <p>{b.state.intake.date || "TBD"} - {b.state.intake.slot}</p>
                <p>Modalities: {b.state.sequence.join(", ")}</p>
                <p>Focus: {b.state.intake.focusAreas.join(", ")}</p>
                <p>Pressure: {b.state.intake.pressure}</p>
              </div>
              <div>
                <span className="font-label-md text-primary block mb-1">Health Notes</span>
                <p>Sensitivities: {b.state.intake.sensitivities || "None"}</p>
                <div className="mt-2 text-label-sm text-on-surface-variant">
                  {Object.entries(b.state.intake.consents).map(([k, v]) => (
                    <div key={k}>{k}: {v ? "Yes" : "No"}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
        {filteredBookings.length === 0 && (
          <p className="p-4 text-body-md text-on-surface-variant text-center border border-dashed border-outline-variant/60 rounded-xl">
            No bookings match the filter.
          </p>
        )}
      </div>
    </div>
  );
}
