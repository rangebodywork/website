"use client";

import type { ReactNode } from "react";
import { FOCUS_AREAS, LIFESTYLE_TOPICS, MOVEMENT_GOALS, PRESSURE_LEVELS } from "@/lib/catalog";
import { useBooking } from "@/lib/booking-context";
import { cn } from "@/lib/cn";
import { Chip } from "../ui/Chip";

export function IntakeSection({
  marker,
  title,
  description,
  children,
  id,
}: {
  marker: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      aria-label={title}
      className="scroll-mt-32 space-y-4 rounded-xl border border-outline-variant/40 bg-surface-container-low p-4.5 shadow-ambient"
    >
      <div className="flex items-center gap-2">
        {marker}
        <h3 className="font-headline-md text-headline-md text-primary">{title}</h3>
      </div>
      {description && <p className="font-body-sm text-body-sm text-on-surface-variant">{description}</p>}
      {children}
    </section>
  );
}

function Letter({ children }: { children: string }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-xs font-semibold text-primary">
      {children}
    </span>
  );
}

export function BodyworkSection({ letter }: { letter: string }) {
  const { state, actions } = useBooking();
  return (
    <IntakeSection
      marker={<Letter>{letter}</Letter>}
      title="Bodywork & Physical Focus"
      description="Select target physical meridian areas that require special holding, myofascial release, or mindful caution."
    >
      <div className="flex flex-wrap gap-2 pt-1" role="group" aria-label="Focus areas">
        {FOCUS_AREAS.map((area) => (
          <Chip
            key={area}
            variant="focus"
            check
            selected={state.intake.focusAreas.includes(area)}
            onClick={() => actions.toggleIntakeList("focusAreas", area)}
          >
            {area}
          </Chip>
        ))}
      </div>
      <div className="pt-2">
        <span id="pressure-label" className="mb-2 block font-title-md text-title-md text-primary">
          Pressure Calibration
        </span>
        <div
          role="radiogroup"
          aria-labelledby="pressure-label"
          className="grid grid-cols-4 gap-1.5 rounded-xl border border-outline-variant/40 bg-surface-container-highest/60 p-1"
        >
          {PRESSURE_LEVELS.map((level) => {
            const selected = state.intake.pressure === level;
            return (
              <button
                key={level}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => actions.updateIntake({ pressure: level })}
                className={cn(
                  "min-h-10 rounded-lg py-2 text-center font-label-md text-label-md transition-colors",
                  selected
                    ? "bg-primary font-semibold text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-primary",
                )}
              >
                {level}
              </button>
            );
          })}
        </div>
      </div>
    </IntakeSection>
  );
}

export function MovementSection({ letter }: { letter: string }) {
  const { state, actions } = useBooking();
  return (
    <IntakeSection
      marker={<Letter>{letter}</Letter>}
      title="Yoga & Movement Integration"
      description="How would you like Elena to blend tailored movement mechanics into your sanctuary flow?"
    >
      <div className="grid grid-cols-2 gap-2 pt-1">
        {MOVEMENT_GOALS.map((goal) => {
          const checked = state.intake.movementGoals.includes(goal.id);
          return (
            <label
              key={goal.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-2.5"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => actions.toggleIntakeList("movementGoals", goal.id)}
                className="rounded-sm border-outline/40 text-primary focus:ring-primary"
              />
              <span className={cn("font-body-sm text-body-sm text-on-surface", checked && "font-medium")}>
                {goal.label}
              </span>
            </label>
          );
        })}
      </div>
      <div className="pt-1">
        <label
          htmlFor="injury-notes"
          className="mb-1 block font-label-md text-label-md uppercase tracking-wider text-outline"
        >
          Recent Sensitivities, Sprains, or Surgeries
        </label>
        <textarea
          id="injury-notes"
          rows={2}
          value={state.intake.sensitivities}
          onChange={(e) => actions.updateIntake({ sensitivities: e.target.value })}
          placeholder="e.g., Mild rotator cuff pinch when raising right arm overhead, sensitive knees in deep flexion..."
          className="w-full rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-3 font-body-sm text-body-sm text-on-surface placeholder:text-outline/70 focus:border-primary focus:ring-0"
        />
      </div>
    </IntakeSection>
  );
}

export function LifestyleSection({ letter, minutes }: { letter: string; minutes: number }) {
  const { state, actions } = useBooking();
  return (
    <IntakeSection
      marker={<Letter>{letter}</Letter>}
      title="Lifestyle Anchors & Dialogue"
      description={`Coaching focus for the ${minutes}-minute seated integration tea portion:`}
    >
      <div className="flex flex-wrap gap-2" role="group" aria-label="Coaching topics">
        {LIFESTYLE_TOPICS.map((topic) => (
          <Chip
            key={topic}
            variant="focus"
            check
            className="px-3"
            selected={state.intake.lifestyle.includes(topic)}
            onClick={() => actions.toggleIntakeList("lifestyle", topic)}
          >
            {topic}
          </Chip>
        ))}
      </div>
    </IntakeSection>
  );
}
