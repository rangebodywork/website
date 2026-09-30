"use client";

import { useSyncExternalStore } from "react";
import { TIME_SLOTS } from "@/lib/catalog";
import { useBooking } from "@/lib/booking-context";
import { cn } from "@/lib/cn";
import { addDays, formatDate, formatTimeRange, fromDateKey, toDateKey } from "@/lib/format";
import { Icon } from "../Icon";

const DAYS_SHOWN = 5;
const noopSubscribe = () => () => {};

/** Today's local date key on the client; null during prerender so dates never mismatch. */
export function useTodayKey(): string | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => toDateKey(new Date()),
    () => null,
  );
}

/** Bookable days start tomorrow. Friday & Sunday fill quickly (terracotta dot). */
export function useBookableDays() {
  const today = useTodayKey();
  if (!today) return [];
  return Array.from({ length: DAYS_SHOWN }, (_, i) => {
    const key = addDays(today, i + 1);
    const weekday = fromDateKey(key).getDay();
    return { key, limited: weekday === 5 || weekday === 0 };
  });
}

/** The client's chosen day, or the design's default (second bookable day). */
export function useEffectiveDate(): string | null {
  const { state } = useBooking();
  const days = useBookableDays();
  if (days.length === 0) return null;
  const chosen = state.intake.date;
  return chosen && days.some((d) => d.key === chosen) ? chosen : days[1].key;
}

export function SacredWindow() {
  const { state, actions, totalMinutes } = useBooking();
  const days = useBookableDays();
  const selectedDate = useEffectiveDate();
  const months = [...new Set(days.map((d) => formatDate(d.key, { month: "long", year: "numeric" })))];

  return (
    <section aria-labelledby="window-heading" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-secondary">
            Step 01
          </span>
          <h2 id="window-heading" className="font-headline-md text-headline-md text-primary">
            Sacred Window
          </h2>
        </div>
        <span className="font-body-sm text-body-sm text-outline">{months.join(" / ")}</span>
      </div>

      <div
        role="radiogroup"
        aria-label="Session date"
        className="no-scrollbar -mx-4 flex min-h-[88px] gap-2 overflow-x-auto px-4 py-1 lg:mx-0 lg:px-0"
      >
        {days.map((day) => {
          const selected = day.key === selectedDate;
          return (
            <button
              key={day.key}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={formatDate(day.key, { weekday: "long", month: "long", day: "numeric" })}
              onClick={() => actions.updateIntake({ date: day.key })}
              className={cn(
                "flex h-20 min-w-[56px] shrink-0 flex-col items-center justify-center rounded-xl border transition-all duration-150 lg:flex-1",
                selected
                  ? "border-primary bg-primary text-on-primary shadow-ambient"
                  : "border-outline-variant/30 bg-surface-container-low text-on-surface-variant hover:border-primary/40",
              )}
            >
              <span
                className={cn("font-label-sm text-label-sm uppercase", selected ? "text-primary-fixed-dim" : "text-outline")}
              >
                {formatDate(day.key, { weekday: "short" })}
              </span>
              <span
                className={cn(
                  "mt-0.5 font-title-lg text-title-lg",
                  selected ? "font-medium text-surface-container-lowest" : "font-normal text-on-surface",
                )}
              >
                {formatDate(day.key, { day: "numeric" })}
              </span>
              <span
                className={cn("mt-1.5 h-1.5 w-1.5 rounded-full", day.limited ? "bg-secondary" : "bg-outline-variant")}
              />
            </button>
          );
        })}
      </div>

      <div role="radiogroup" aria-label="Session time" className="space-y-2.5 pt-1">
        {TIME_SLOTS.map((slot) => {
          const selected = state.intake.slot === slot.id;
          return (
            <button
              key={slot.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => actions.updateIntake({ slot: slot.id })}
              className={cn(
                "relative block w-full rounded-xl p-3.5 text-left transition-all",
                selected
                  ? "border-2 border-primary bg-surface-container-low shadow-ambient"
                  : "border border-outline-variant/40 bg-surface-container-lowest hover:border-primary/50",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Icon
                    name={selected ? "radio_button_checked" : "radio_button_unchecked"}
                    filled={selected}
                    className={cn("text-xl", selected ? "text-primary" : "text-outline")}
                  />
                  <div>
                    <span
                      className={cn(
                        "font-title-md text-title-md",
                        selected ? "font-semibold text-primary" : "font-medium text-on-surface",
                      )}
                    >
                      {formatTimeRange(slot.startMinutes, totalMinutes)}
                    </span>
                    <p className={cn("font-body-sm text-body-sm", selected ? "text-on-surface-variant" : "text-outline")}>
                      {slot.label}
                    </p>
                  </div>
                </div>
                {selected ? (
                  <span className="shrink-0 rounded-full bg-primary-fixed px-2 py-0.5 font-label-sm text-label-sm font-semibold text-on-primary-fixed">
                    Selected
                  </span>
                ) : (
                  <span className="shrink-0 font-label-sm text-label-sm text-outline">Available</span>
                )}
              </div>
              {selected && (
                <div className="mt-2.5 flex items-center gap-1.5 border-t border-outline-variant/30 pt-2 text-secondary">
                  <Icon name="timelapse" className="text-sm" />
                  <span className="font-label-sm text-label-sm">45m Decompression Buffer reserved post-session</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
