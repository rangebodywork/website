"use client";

import { useEffect, useRef } from "react";
import { MODALITIES, type ModalityId } from "@/lib/catalog";
import { useBooking } from "@/lib/booking-context";
import type { IconName } from "@/lib/icons";
import { Icon } from "../Icon";

interface ModalityGuideSheetProps {
  id: ModalityId | null;
  onClose: () => void;
}

function GuideFact({ icon, iconClass, title, children }: { icon: IconName; iconClass: string; title: string; children: string }) {
  return (
    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-3">
      <div className="mb-1 flex items-center gap-1.5 font-label-md text-label-md text-primary">
        <Icon name={icon} className={`text-base ${iconClass}`} />
        <span>{title}</span>
      </div>
      <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">{children}</p>
    </div>
  );
}

/** Bottom sheet explaining a modality (from builder variant 2). */
export function ModalityGuideSheet({ id, onClose }: ModalityGuideSheetProps) {
  const { actions } = useBooking();
  const closeRef = useRef<HTMLButtonElement>(null);
  const guide = id ? MODALITIES[id].guide : undefined;

  useEffect(() => {
    if (!guide) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [guide, onClose]);

  if (!id || !guide) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="guide-title">
      <div
        className="absolute inset-0 animate-fade-in bg-on-background/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-lg animate-sheet-up rounded-t-3xl border-t border-outline-variant/40 bg-surface p-5 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-2xl md:bottom-8 md:rounded-3xl md:border">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-outline-variant/60" />
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-fixed text-primary">
              <Icon name="spa" className="text-lg" />
            </div>
            <div>
              <span className="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                Modality Guide
              </span>
              <h3 id="guide-title" className="font-title-lg text-title-lg font-medium text-primary">
                {guide.title}
              </h3>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close guide"
            className="rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
          >
            <Icon name="close" className="text-xl" />
          </button>
        </div>
        <div className="my-4 space-y-3.5">
          <GuideFact icon="nature_people" iconClass="text-primary" title="What to expect">
            {guide.expect}
          </GuideFact>
          <div className="grid grid-cols-2 gap-2.5">
            <GuideFact icon="favorite" iconClass="text-secondary" title="Ideal for">
              {guide.idealFor}
            </GuideFact>
            <GuideFact icon="checkroom" iconClass="text-primary" title="What to wear">
              {guide.wear}
            </GuideFact>
          </div>
        </div>
        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-outline-variant/60 px-4 py-3 text-center font-label-md text-label-md text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            Close Guide
          </button>
          <button
            type="button"
            onClick={() => {
              actions.configureModality(id, { duration: guide.select.duration, option: guide.select.option });
              onClose();
            }}
            className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-title-md text-title-md text-on-primary shadow-sm transition-colors hover:bg-primary-container"
          >
            <span>{guide.select.label}</span>
            <Icon name="check" className="text-base" />
          </button>
        </div>
      </div>
    </div>
  );
}
