"use client";

import { Fragment } from "react";
import { TRANSITION_MINUTES } from "@/lib/catalog";
import { useDatabase } from "@/lib/db-context";
import type { SessionBlock } from "@/lib/booking-context";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import { Icon } from "../Icon";
import { Card, CardHeader } from "../ui/Card";

/** "Mindful Timeline" — hollow river-stone nodes, grounding transition before the final block. */
export function SessionItinerary({ blocks }: { blocks: SessionBlock[] }) {
  const { modalities } = useDatabase();
  return (
    <Card className="space-y-4">
      <CardHeader
        title="Session Itinerary"
        aside={<span className="font-label-sm text-label-sm text-on-surface-variant">Sequential Flow</span>}
      />
      <ol className="relative space-y-6 pl-6 before:absolute before:bottom-3 before:left-[11px] before:top-2 before:w-[1.5px] before:bg-surface-container-highest before:content-['']">
        {blocks.map((block, index) => {
          const last = index === blocks.length - 1;
          const first = index === 0;
          const modality = modalities[block.id];
          return (
            <Fragment key={block.id}>
              {last && blocks.length > 1 && (
                <li className="relative -ml-1 rounded-lg border border-dashed border-outline-variant/60 bg-surface-container-low py-2 pl-5 pr-3">
                  <div className="flex items-center gap-2 font-body-sm text-body-sm text-primary">
                    <Icon name="hourglass_empty" className="text-[18px]" />
                    <span className="font-title-lg text-[15px] italic">
                      {TRANSITION_MINUTES} min grounding tea &amp; hydration integration transition
                    </span>
                  </div>
                </li>
              )}
              <li className="relative">
                <span
                  className={cn(
                    "absolute -left-[24px] top-1.5 h-3 w-3 rounded-full border-2 ring-4 ring-background",
                    last && !first
                      ? "border-secondary bg-surface-container-lowest"
                      : first
                        ? "border-primary bg-surface-container-lowest"
                        : "border-primary bg-primary",
                  )}
                />
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-title-md text-title-md text-on-surface">
                      {modality.itineraryTitle(block.option)}
                    </span>
                    <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
                      {modality.itineraryDescription}
                    </p>
                  </div>
                  <div className="shrink-0 pl-3 text-right">
                    <span className="font-title-md text-title-md text-on-surface">{formatPrice(block.price)}</span>
                    <div className="font-label-sm text-label-sm text-on-surface-variant">{block.duration} min</div>
                  </div>
                </div>
              </li>
            </Fragment>
          );
        })}
      </ol>
    </Card>
  );
}
