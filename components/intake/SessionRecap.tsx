"use client";

import { useBooking } from "@/lib/booking-context";
import { formatDuration } from "@/lib/format";

/** "2 hrs 15 mins Custom Sanctuary Session" badge under the intake header. */
export function SessionRecap() {
  const { blocks, totalMinutes } = useBooking();
  if (blocks.length === 0) return null;
  return (
    <div className="mx-auto flex max-w-md items-center justify-center px-4 pb-3">
      <div className="inline-flex items-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container-high/80 px-3.5 py-1.5 text-primary shadow-ambient">
        <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" />
        <span className="font-label-md text-label-md font-semibold text-primary">
          {formatDuration(totalMinutes)} Custom Sanctuary Session
        </span>
      </div>
    </div>
  );
}
