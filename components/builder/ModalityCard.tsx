"use client";

import { MODALITIES, durationsFor, type ModalityId } from "@/lib/catalog";
import { useBooking } from "@/lib/booking-context";
import { cn } from "@/lib/cn";
import { Icon } from "../Icon";
import { Chip } from "../ui/Chip";

interface ModalityCardProps {
  id: ModalityId;
  /** Highlighted with the moss accent bar (last card the client interacted with). */
  active: boolean;
  onInteract: (id: ModalityId) => void;
  onOpenGuide: (id: ModalityId) => void;
}

function GuideButton({ onClick, name }: { onClick: () => void; name: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${name} guide`}
      className="inline-flex items-center gap-1 rounded-full border border-outline-variant/40 bg-surface-container px-2 py-0.5 font-label-sm text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
    >
      <Icon name="info" className="text-xs text-outline" />
      <span>Guide</span>
    </button>
  );
}

export function ModalityCard({ id, active, onInteract, onOpenGuide }: ModalityCardProps) {
  const { state, actions } = useBooking();
  const modality = MODALITIES[id];
  const selection = state.modalities[id];

  if (!selection.enabled) {
    return (
      <article className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-outline-variant/60 bg-surface-container-low/60 p-4 transition-colors hover:bg-surface-container">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-outline">
            <Icon name={modality.icon} className="text-xl" />
          </div>
          <div>
            <h3 className="font-title-md text-title-md text-on-surface">{modality.name}</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{modality.tagline}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            actions.toggleModality(id);
            onInteract(id);
          }}
          aria-label={`Add ${modality.name}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-outline-variant/40 bg-surface-container-lowest text-primary transition-all hover:bg-primary hover:text-on-primary"
        >
          <Icon name="add" className="text-lg" />
        </button>
      </article>
    );
  }

  const guideOption = modality.guide?.select.option;

  return (
    <article
      onFocusCapture={() => onInteract(id)}
      className={cn(
        "relative space-y-3.5 overflow-hidden rounded-2xl bg-surface-container-lowest p-4 shadow-ambient",
        active ? "border-2 border-primary/30" : "border border-outline-variant/30",
      )}
    >
      {active && <div className="absolute left-0 right-0 top-0 h-1.5 bg-primary-container" />}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", modality.badgeClass)}>
            <Icon name={modality.icon} className="text-xl" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="font-title-lg text-title-lg text-primary">{modality.name}</h3>
              {active && <span className="h-2 w-2 rounded-full bg-primary" />}
              {modality.guide && <GuideButton name={modality.name} onClick={() => onOpenGuide(id)} />}
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{modality.tagline}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => actions.toggleModality(id)}
          aria-label={`Remove ${modality.name}`}
          className="p-1 text-primary hover:text-secondary"
        >
          <Icon name="check_circle" />
        </button>
      </div>

      <div className="space-y-1.5">
        <span className="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
          Duration
        </span>
        <div className="flex flex-wrap gap-2" role="group" aria-label={`${modality.name} duration`}>
          {durationsFor(id).map((minutes) => (
            <Chip
              key={minutes}
              variant="duration"
              selected={selection.duration === minutes}
              onClick={() => {
                actions.configureModality(id, { duration: minutes });
                onInteract(id);
              }}
            >
              {minutes}m
            </Chip>
          ))}
        </div>
      </div>

      {modality.options && (
        <div className="space-y-1.5 border-t border-surface-variant/40 pt-1">
          <span className="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
            {modality.options.label}
          </span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={modality.options.label}>
            {modality.options.choices.map((choice) => {
              const selected = selection.option === choice;
              // The guided technique (Thai massage) opens its guide first, as in the design.
              if (choice === guideOption && id === "massage" && !selected) {
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => onOpenGuide(id)}
                    className="flex items-center gap-1 rounded-md border border-primary/20 bg-primary-fixed/60 px-2.5 py-1 font-label-sm text-label-sm text-primary transition-colors hover:bg-primary-fixed"
                  >
                    <span>{choice}</span>
                    <Icon name="info" className="text-xs text-primary" />
                  </button>
                );
              }
              return (
                <Chip
                  key={choice}
                  variant="tag"
                  selected={selected}
                  onClick={() => {
                    actions.configureModality(id, { option: choice });
                    onInteract(id);
                  }}
                >
                  {choice}
                </Chip>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}
