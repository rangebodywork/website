"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { MODALITY_ORDER, type ModalityId } from "@/lib/catalog";
import { useBooking } from "@/lib/booking-context";
import { formatDuration, formatPrice } from "@/lib/format";
import { ROUTES } from "@/lib/nav";
import { Icon } from "../Icon";
import { StickyActionBar } from "../StickyActionBar";
import { Badge } from "../ui/Chip";
import { ModalityCard } from "./ModalityCard";
import { ModalityGuideSheet } from "./ModalityGuideSheet";
import { RitualCarousel } from "./RitualCarousel";
import { SequenceTimeline } from "./SequenceTimeline";

export function BuilderView() {
  const { blocks, totalMinutes, totalPrice } = useBooking();
  const [activeCard, setActiveCard] = useState<ModalityId>("massage");
  const [guideFor, setGuideFor] = useState<ModalityId | null>(null);
  const closeGuide = useCallback(() => setGuideFor(null), []);
  const count = blocks.length;

  return (
    <>
      <main className="mx-auto max-w-lg space-y-6 px-4 pb-10 pt-4 md:max-w-3xl lg:max-w-6xl lg:px-8 lg:pt-8">
        <section className="space-y-1">
          <Badge className="bg-primary-fixed text-on-primary-fixed font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Curate Your Practice
          </Badge>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile tracking-tight text-primary md:font-headline-lg md:text-headline-lg">
            Personalized Session
          </h1>
          <p className="max-w-xl font-body-sm text-body-sm text-on-surface-variant md:font-body-md md:text-body-md">
            Harmonize modalities into one continuous restorative continuum tailored to your nervous system.
          </p>
        </section>

        <RitualCarousel />

        <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8 lg:space-y-0">
          <div className="lg:sticky lg:top-24 lg:order-2 lg:space-y-4">
            <SequenceTimeline />
            <SomaticNote className="hidden lg:flex" />
          </div>

          <section aria-labelledby="modalities-heading" className="space-y-4 lg:order-1">
            <div className="flex items-baseline justify-between pt-2 lg:pt-0">
              <h2 id="modalities-heading" className="font-headline-md text-headline-md text-primary">
                Custom Modalities
              </h2>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Select durations &amp; focus</span>
            </div>
            {MODALITY_ORDER.map((id) => (
              <ModalityCard
                key={id}
                id={id}
                active={activeCard === id}
                onInteract={setActiveCard}
                onOpenGuide={setGuideFor}
              />
            ))}
          </section>
        </div>

        <SomaticNote className="flex lg:hidden" />
      </main>

      <StickyActionBar className="lg:max-w-6xl lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-headline-md text-headline-md font-semibold text-primary">
                {formatPrice(totalPrice)}
              </span>
              <Badge>{formatDuration(totalMinutes)}</Badge>
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant" aria-live="polite">
              {count === 0
                ? "Add a modality to begin"
                : `${count} curated ${count === 1 ? "modality" : "modalities"} selected`}
            </p>
          </div>
          {count > 0 ? (
            <Link
              href={ROUTES.intake}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary-container px-5 py-3 font-title-md text-title-md text-on-primary shadow-sm transition-all hover:bg-primary active:scale-[0.98]"
            >
              <span>Continue</span>
              <Icon name="east" className="text-lg" />
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-surface-container-high px-5 py-3 font-title-md text-title-md text-outline"
            >
              <span>Continue</span>
              <Icon name="east" className="text-lg" />
            </button>
          )}
        </div>
      </StickyActionBar>

      <ModalityGuideSheet id={guideFor} onClose={closeGuide} />
    </>
  );
}

function SomaticNote({ className }: { className: string }) {
  return (
    <div
      className={`items-start gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-high/60 p-4 ${className}`}
    >
      <Icon name="nest_eco_leaf" className="mt-0.5 text-lg text-primary-container" />
      <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
        Sessions begin with hand-selected herbal infusions and 5 minutes of grounding somatic pulse check to align
        energy reserves and adjust each modality in real-time.
      </p>
    </div>
  );
}
