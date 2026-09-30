"use client";

import { useBooking } from "@/lib/booking-context";
import { cn } from "@/lib/cn";
import { STUDIO } from "@/lib/nav";
import type { RecurringClass } from "@/lib/schedule-data";
import { Icon } from "../Icon";

export function SaveButton({ id, title }: { id: string; title: string }) {
  const { state, actions } = useBooking();
  const saved = state.savedClasses.includes(id);
  return (
    <button
      type="button"
      onClick={() => actions.toggleSavedClass(id)}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from saved` : `Save ${title}`}
      className={cn(
        "rounded-lg p-2 transition-colors hover:bg-surface-container",
        saved ? "text-primary" : "text-outline hover:text-primary",
      )}
    >
      <Icon name={saved ? "bookmark" : "bookmark_border"} filled={saved} />
    </button>
  );
}

export function ClassCard({ item }: { item: RecurringClass }) {
  const primary = item.accent === "primary";
  return (
    <article
      className={cn(
        "flex flex-col justify-between rounded-xl border-t-2 bg-surface-container-low p-5 shadow-ambient transition-all",
        primary ? "border-primary hover:border-primary-container" : "border-secondary hover:border-secondary-container",
      )}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 font-label-sm text-label-sm font-medium",
                  primary ? "bg-primary-fixed text-on-primary-fixed" : "bg-secondary-fixed text-on-secondary-fixed",
                )}
              >
                {item.duration}
              </span>
              <span className="rounded-full bg-surface-container px-2.5 py-0.5 font-label-sm text-label-sm text-on-surface-variant">
                {item.level}
              </span>
            </div>
            <h3 className="pt-1 font-headline-md text-headline-md text-on-surface">{item.title}</h3>
          </div>
          <span className="shrink-0 rounded-md bg-secondary-fixed/50 px-2 py-0.5 text-right text-xs font-semibold uppercase tracking-wider text-secondary">
            {item.location}
          </span>
        </div>
        <p className="line-clamp-2 font-body-sm text-body-sm text-on-surface-variant">{item.description}</p>
        <div className="space-y-2 border-t border-surface-variant/50 pt-3 text-on-surface-variant">
          <div className="flex items-center gap-2">
            <Icon name={item.whenIcon} className={cn("text-[18px]", primary ? "text-primary" : "text-secondary")} />
            <span className="font-body-sm text-body-sm">{item.when}</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="fitness_center" className={cn("text-[18px]", primary ? "text-primary" : "text-secondary")} />
            <span className="truncate font-body-sm text-body-sm">{item.venue}</span>
          </div>
        </div>
        <div className="rounded-lg border border-surface-variant/50 bg-surface-container p-2.5">
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            <strong className="text-primary">Taught exclusively at Equinox:</strong> {item.notice}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-surface-variant/40 pt-3">
        <SaveButton id={item.id} title={item.title} />
        <div className="flex items-center gap-2">
          <a
            href={`mailto:${STUDIO.practitionerEmail}?subject=${encodeURIComponent(item.inquirySubject)}`}
            className="px-2 py-1 font-label-md text-label-md text-secondary hover:underline"
          >
            Guest Inquiry
          </a>
          <a
            href="https://www.equinox.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-label-md text-label-md text-on-primary transition-transform hover:bg-primary-container active:scale-[0.98]"
          >
            <span>Book in Equinox App</span>
            <Icon name="open_in_new" className="text-[16px]" />
          </a>
        </div>
      </div>
    </article>
  );
}
