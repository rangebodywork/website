"use client";

import { useState } from "react";
import { Avatar, PORTRAIT } from "../Avatar";
import { Icon } from "../Icon";
import { Chip } from "../ui/Chip";
import { SCHEDULE_FILTERS, type ScheduleCategory } from "@/lib/schedule-data";
import { useDatabase } from "@/lib/db-context";
import { ClassCard } from "./ClassCard";
import { WorkshopCard } from "./WorkshopCard";

export function ScheduleView() {
  const db = useDatabase();
  const [filter, setFilter] = useState<ScheduleCategory | "all">("all");
  const matches = (categories: ScheduleCategory[]) => filter === "all" || categories.includes(filter);
  const classes = db.classes.filter((c) => matches(c.categories));
  const workshops = db.workshops.filter((w) => matches(w.categories));

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 pb-12 pt-4 sm:px-6 md:px-8">
      <section className="flex flex-col justify-between gap-4 rounded-xl border border-surface-variant/40 bg-surface-container-low p-4 shadow-ambient sm:flex-row sm:items-center sm:p-5">
        <div className="flex items-center gap-3.5">
          <Avatar src={PORTRAIT} alt="Elena Vance" size={56} eager className="border border-surface-variant/60" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-title-md text-title-md font-semibold text-primary">Elena Vance, E-RYT 500</h1>
              <Icon name="verified" filled className="text-[18px] text-primary" />
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Equinox Master Yoga Instructor &amp; Independent Somatic Educator
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <span className="inline-flex items-center rounded-full bg-secondary-fixed/50 px-3 py-1 font-label-sm text-label-sm font-medium text-secondary">
            Equinox Instructor
          </span>
          <span className="inline-flex items-center rounded-full bg-primary-fixed px-3 py-1 font-label-sm text-label-sm font-medium text-primary">
            Private &amp; Retreats Host
          </span>
        </div>
      </section>

      <section className="flex flex-col justify-between gap-3 rounded-xl border border-outline-variant/60 bg-surface-container p-4 text-on-surface sm:p-5 md:flex-row md:items-center">
        <div className="flex items-start gap-3">
          <Icon name="info" className="mt-0.5 text-[24px] text-primary" />
          <div className="space-y-0.5">
            <p className="font-label-md text-label-md font-semibold uppercase tracking-wide text-primary">
              Class Location &amp; Booking Guide
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Weekly group studio classes are taught exclusively through Equinox clubs (San Francisco &amp; Berkeley).
              Independent weekend masterclasses, clinics, and immersions are curated and booked directly with Elena.
            </p>
          </div>
        </div>
        <span className="shrink-0 self-start rounded-full bg-secondary-fixed/30 px-2.5 py-1 font-label-sm text-label-sm font-medium text-secondary md:self-center">
          Guest passes available
        </span>
      </section>

      <section aria-label="Schedule categories">
        <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-0">
          {SCHEDULE_FILTERS.map((f) => (
            <Chip key={f.id} variant="filter" selected={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </Chip>
          ))}
        </div>
      </section>

      {classes.length > 0 && (
        <section className="space-y-4" aria-labelledby="club-heading">
          <div className="flex flex-col justify-between gap-1 pt-1 sm:flex-row sm:items-baseline">
            <div>
              <span className="font-label-sm text-label-sm font-semibold uppercase tracking-widest text-secondary">
                Club Rhythms
              </span>
              <h2 id="club-heading" className="mt-0.5 font-headline-md text-headline-md text-primary">
                Recurring Equinox Group Yoga
              </h2>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Exclusive to Equinox Members &amp; Invited Guests
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {classes.map((c) => (
              <ClassCard key={c.id} item={c} />
            ))}
          </div>
        </section>
      )}

      {workshops.length > 0 && (
        <section className="space-y-4 pt-2" aria-labelledby="workshops-heading">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-label-sm text-label-sm font-semibold uppercase tracking-widest text-secondary">
                Direct Booking • Soma Studio
              </span>
              <span className="rounded-full bg-primary-fixed px-2 py-0.5 font-label-sm text-label-sm text-on-primary-fixed">
                Independent Events
              </span>
            </div>
            <h2 id="workshops-heading" className="mt-1 font-headline-md text-headline-md text-primary">
              Workshops, Immersions &amp; Clinics
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              In-depth multi-hour somatic explorations curated and hosted directly by Elena Vance. Open to all students.
            </p>
          </div>
          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
            {workshops.map((w) => (
              <WorkshopCard key={w.id} workshop={w} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2 rounded-xl border border-outline-variant/30 bg-surface-container/60 p-5 text-center">
        <Icon name="self_improvement" className="text-[24px] text-primary" />
        <h2 className="font-title-lg text-title-lg text-primary">Atmosphere &amp; Attendance</h2>
        <p className="mx-auto max-w-lg font-body-sm text-body-sm text-on-surface-variant">
          For Equinox classes, check in at the club concierge 10 minutes prior to session. For independent weekend
          immersions at Soma Studio, doors close promptly 5 minutes before start. Organic linen props and mats are
          provided at all locations.
        </p>
      </section>
    </main>
  );
}
