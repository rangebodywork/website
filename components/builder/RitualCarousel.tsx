"use client";

import { ritualTotals } from "@/lib/catalog";
import { useDatabase } from "@/lib/db-context";
import { useBooking } from "@/lib/booking-context";
import { cn } from "@/lib/cn";
import { formatDuration, formatPrice } from "@/lib/format";
import { Icon } from "../Icon";

export function RitualCarousel() {
  const db = useDatabase();
  const RITUALS = db.rituals;
  const { state, actions } = useBooking();

  return (
    <section aria-labelledby="rituals-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 id="rituals-heading" className="flex items-center gap-1.5 font-title-md text-title-md text-primary">
          <Icon name="auto_awesome" className="text-lg text-secondary" />
          Curated Rituals
        </h2>
        <span className="font-label-sm text-label-sm text-on-surface-variant">Pre-set pairings</span>
      </div>
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 pt-1 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
        {RITUALS.map((ritual, index) => {
          const { price, minutes } = ritualTotals(ritual);
          const applied = state.appliedRitual === ritual.id;
          return (
            <article
              key={ritual.id}
              className={cn(
                "flex min-w-[270px] max-w-[270px] shrink-0 flex-col justify-between rounded-xl border bg-surface-container-low p-4 shadow-ambient transition-colors lg:min-w-0 lg:max-w-none",
                applied ? "border-primary/50" : "border-outline-variant/30 hover:border-primary/40",
              )}
            >
              <div>
                <div className="mb-2 flex items-start justify-between">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 font-label-sm text-label-sm font-semibold tracking-wide",
                      ritual.tagClass,
                    )}
                  >
                    {ritual.tag}
                  </span>
                  <span className="font-title-md text-title-md font-semibold text-secondary">{formatPrice(price)}</span>
                </div>
                <h3 className="mb-1 font-title-lg text-title-lg text-primary">{ritual.name}</h3>
                <p className="line-clamp-2 font-body-sm text-body-sm text-on-surface-variant">{ritual.description}</p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-outline-variant/20 pt-3">
                <span className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
                  <Icon name="schedule" className="text-sm" />
                  {formatDuration(minutes, "compact")}
                </span>
                <button
                  type="button"
                  onClick={() => actions.applyRitual(ritual.id)}
                  aria-pressed={applied}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-3.5 py-1.5 font-label-sm text-label-sm transition-all active:scale-[0.97]",
                    applied
                      ? "bg-primary-fixed text-on-primary-fixed"
                      : index === 0
                        ? "bg-primary-container text-on-primary shadow-sm hover:bg-primary"
                        : "border border-outline-variant/50 bg-surface-container-high text-primary hover:bg-primary hover:text-on-primary",
                  )}
                >
                  <span>{applied ? "Applied" : "Apply Ritual"}</span>
                  <Icon name={applied ? "check" : "arrow_forward"} className="text-xs" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
