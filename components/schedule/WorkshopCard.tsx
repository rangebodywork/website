"use client";

import Image from "next/image";
import { formatPrice } from "@/lib/format";
import { downloadIcs } from "@/lib/ics";
import { STUDIO } from "@/lib/nav";
import type { Workshop } from "@/lib/schedule-data";
import { Icon } from "../Icon";
import { SaveButton } from "./ClassCard";

function reserveHref(workshop: Workshop): string {
  const subject = `Reserve Spot - ${workshop.title} (${workshop.when.split(" • ")[0]})`;
  const body = `Hi Elena,\n\nI'd love to reserve a spot for ${workshop.title} (${formatPrice(workshop.price)}).\n\nName:\nPhone:\n`;
  return `mailto:${STUDIO.practitionerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function addToCalendar(workshop: Workshop) {
  downloadIcs(`${workshop.id}.ics`, {
    uid: workshop.id,
    title: `Soma Studio · ${workshop.title}`,
    description: workshop.description,
    location: workshop.venue,
    date: workshop.date,
    startMinutes: workshop.startMinutes,
    durationMinutes: workshop.durationMinutes,
  });
}

const reserveClass =
  "rounded-lg bg-primary text-center font-label-md text-label-md text-on-primary shadow-sm transition-transform hover:bg-primary-container active:scale-[0.98]";

export function WorkshopCard({ workshop }: { workshop: Workshop }) {
  if (workshop.image) {
    return (
      <article className="flex flex-col justify-between overflow-hidden rounded-xl border border-surface-variant/60 bg-surface-container-low shadow-ambient">
        <div>
          <div className="relative h-44 w-full">
            <Image
              src={workshop.image.src}
              alt={workshop.image.alt}
              fill
              sizes="(min-width: 768px) 450px, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-inverse-surface/80 via-inverse-surface/20 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
              <span className="rounded-full bg-secondary px-2.5 py-1 font-label-sm text-label-sm font-medium text-on-secondary">
                {workshop.kicker}
              </span>
              <span className="font-title-lg text-title-lg font-medium text-inverse-on-surface">
                {formatPrice(workshop.price)}
              </span>
            </div>
          </div>
          <div className="space-y-3 p-4 sm:p-5">
            <div>
              <div className="mb-1 flex items-start gap-2 font-body-sm text-body-sm text-on-surface-variant">
                <Icon name="event" className="mt-0.5 text-[16px] text-primary" />
                <span>{workshop.when}</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface">{workshop.title}</h3>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{workshop.description}</p>
            {workshop.includes && (
              <div className="space-y-1.5 rounded-lg bg-surface-container p-3">
                <span className="block font-label-sm text-label-sm font-semibold text-primary">
                  {workshop.includes.title}
                </span>
                <ul className="space-y-1 font-body-sm text-body-sm text-on-surface-variant">
                  {workshop.includes.items.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Icon name="check_circle" filled className="text-[16px] text-secondary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {workshop.syllabus && (
              <details className="group border-t border-surface-variant/60 pt-2 text-on-surface">
                <summary className="flex cursor-pointer list-none items-center justify-between py-1 font-label-md text-label-md text-primary hover:text-primary-container [&::-webkit-details-marker]:hidden">
                  <span>View {workshop.durationMinutes / 60}-Hour Syllabus Timeline</span>
                  <Icon name="expand_more" className="transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <ol className="relative ml-2 mt-2 space-y-3 border-l-2 border-surface-variant/80 pb-1 pl-4 pt-3">
                  {workshop.syllabus.map((step, i) => {
                    const last = i === workshop.syllabus!.length - 1;
                    return (
                      <li key={step.time} className="relative">
                        <span
                          className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${last ? "bg-secondary" : "bg-primary"}`}
                        />
                        <p
                          className={`font-label-md text-label-md font-semibold ${last ? "text-secondary" : "text-primary"}`}
                        >
                          {step.time}
                        </p>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">{step.text}</p>
                      </li>
                    );
                  })}
                </ol>
              </details>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 p-4 pt-0 sm:p-5 sm:pt-0">
          <button
            type="button"
            onClick={() => addToCalendar(workshop)}
            className="flex w-1/2 items-center justify-center gap-1.5 rounded-lg border border-outline-variant/60 py-2.5 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container"
          >
            <Icon name="event_note" className="text-[18px]" />
            <span>Add to Calendar</span>
          </button>
          <a href={reserveHref(workshop)} className={`w-1/2 py-2.5 ${reserveClass}`}>
            Reserve Spot ({formatPrice(workshop.price)})
          </a>
        </div>
      </article>
    );
  }

  return (
    <article className="flex flex-col justify-between rounded-xl border border-surface-variant/60 bg-surface-container-low p-4 shadow-ambient sm:p-5">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="rounded-full bg-surface-variant px-2.5 py-0.5 font-label-sm text-label-sm font-medium text-on-surface-variant">
              {workshop.kicker}
            </span>
            <h3 className="pt-1 font-headline-md text-headline-md text-on-surface">{workshop.title}</h3>
          </div>
          <div className="shrink-0 text-right">
            <span className="block font-title-lg text-title-lg font-medium text-primary">
              {formatPrice(workshop.price)}
            </span>
            {workshop.priceNote && (
              <span className="font-label-sm text-label-sm text-on-surface-variant">{workshop.priceNote}</span>
            )}
          </div>
        </div>
        <div className="flex items-start gap-2 font-body-sm text-body-sm text-on-surface-variant">
          <Icon name="calendar_month" className="mt-0.5 text-[18px] text-primary" />
          <span>{workshop.when}</span>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{workshop.description}</p>
        {workshop.gear && (
          <div className="space-y-1 rounded-lg bg-surface-container p-3 font-body-sm text-body-sm text-on-surface-variant">
            <div className="flex items-center gap-2 font-label-sm text-label-sm font-semibold text-primary">
              <Icon name="inventory_2" className="text-[16px]" />
              <span>{workshop.gear.title}</span>
            </div>
            <p>{workshop.gear.text}</p>
          </div>
        )}
      </div>
      <div className="mt-6 flex items-center justify-between gap-3 border-t border-surface-variant/40 pt-3">
        <div className="flex items-center gap-1">
          <SaveButton id={workshop.id} title={workshop.title} />
          <span className="font-label-sm text-label-sm font-medium text-secondary">Hosted directly by Soma Studio</span>
        </div>
        <a href={reserveHref(workshop)} className={`shrink-0 px-5 py-2.5 ${reserveClass}`}>
          Reserve Spot ({formatPrice(workshop.price)})
        </a>
      </div>
    </article>
  );
}
