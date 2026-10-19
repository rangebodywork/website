"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useBooking } from "@/lib/booking-context";
import { useDatabase } from "@/lib/db-context";
import { formatPrice } from "@/lib/format";
import { ROUTES } from "@/lib/nav";
import { Avatar, PORTRAIT } from "../Avatar";
import { EmptySession } from "../EmptySession";
import { Icon } from "../Icon";
import { StickyActionBar } from "../StickyActionBar";
import { HealthRecord, validateHealthRecord } from "./HealthRecord";
import { SacredWindow, useEffectiveDate } from "./SacredWindow";
import { BodyworkSection, LifestyleSection, MovementSection } from "./TailoringSections";

export function IntakeView() {
  const router = useRouter();
  const { state, actions, blocks, totalMinutes, totalPrice } = useBooking();
  const effectiveDate = useEffectiveDate();
  const [attempted, setAttempted] = useState(false);
  useProfilePrefill();

  if (blocks.length === 0) return <EmptySession />;

  const has = (id: (typeof blocks)[number]["id"]) => blocks.some((b) => b.id === id);
  const coaching = blocks.find((b) => b.id === "coaching");
  const sections = [
    has("massage") && ((letter: string) => <BodyworkSection key="bodywork" letter={letter} />),
    (has("yoga") || has("training")) && ((letter: string) => <MovementSection key="movement" letter={letter} />),
    coaching &&
      ((letter: string) => <LifestyleSection key="lifestyle" letter={letter} minutes={coaching.duration} />),
  ].filter((s) => s !== false && s !== undefined);

  // Errors appear once the client has tried to continue, then update live as they type.
  const visibleErrors = attempted ? validateHealthRecord(state.intake) : {};

  function handleContinue() {
    const found = validateHealthRecord(state.intake);
    setAttempted(true);
    if (Object.keys(found).length > 0) {
      document.getElementById("health-record")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (effectiveDate) actions.updateIntake({ date: effectiveDate });
    router.push(ROUTES.review);
  }

  return (
    <>
      <main className="mx-auto max-w-md space-y-6 px-4 pb-10 pt-3 md:max-w-2xl lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-8 lg:space-y-0 lg:px-8 lg:pt-8">
        <div className="space-y-6 lg:sticky lg:top-36">
          <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-4.5 shadow-ambient">
            <div className="flex items-center gap-3.5">
              <Avatar src={PORTRAIT} alt="Elena Vance" size={48} eager className="ring-2 ring-primary-fixed" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-title-md text-title-md font-medium text-primary">Elena Vance, LMT</span>
                  <Icon name="verified" filled className="text-sm text-secondary" />
                </div>
                <p className="truncate font-body-sm text-body-sm text-on-surface-variant">
                  Somatic Bodywork &amp; Restorative Movement
                </p>
              </div>
            </div>
            <p className="mt-3 border-l-2 border-secondary/50 pl-3 font-body-sm text-body-sm italic text-on-surface-variant/90">
              &ldquo;Every session is held in single-client presence with a 45-minute sacred transition buffer for your
              decompression.&rdquo;
            </p>
          </div>

          <SacredWindow />

          <div className="hidden lg:block">
            <PolicyNote />
          </div>
        </div>

        <div className="space-y-6">
          {sections.map((render, i) => render(String.fromCharCode(65 + i)))}
          <HealthRecord errors={visibleErrors} />
          <div className="lg:hidden">
            <PolicyNote />
          </div>
        </div>
      </main>

      <StickyActionBar className="md:max-w-2xl lg:max-w-6xl lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="block font-label-sm text-label-sm uppercase tracking-wider text-outline">
              Total Sanctuary Fee
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-title-lg text-title-lg font-bold text-primary">{formatPrice(totalPrice)}</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">· {totalMinutes} mins</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleContinue}
            className="flex h-12 max-w-[220px] flex-1 items-center justify-center gap-2 rounded-lg bg-primary font-title-md text-title-md text-on-primary shadow-ambient transition-all duration-150 hover:bg-primary-container active:scale-[0.98]"
          >
            <span>Review &amp; Confirm</span>
            <Icon name="arrow_forward" className="text-lg" />
          </button>
        </div>
        {attempted && Object.keys(visibleErrors).length > 0 && (
          <p role="alert" className="mt-2 font-label-sm text-label-sm text-error">
            A few details in your health record still need attention.{" "}
            <a href="#health-record" className="underline underline-offset-4">
              Review them
            </a>
          </p>
        )}
      </StickyActionBar>
    </>
  );
}

function PolicyNote() {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-outline-variant/30 bg-surface-container p-3">
      <Icon name="info" className="mt-0.5 text-lg text-outline" />
      <p className="font-body-sm text-body-sm text-outline">
        Because Elena holds only 2 clients per day to honor energetic focus, cancellations require 48 hours notice for
        full credit deposit transfer.
      </p>
    </div>
  );
}

/** Fills empty contact fields from the saved profile once per visit, so clearing a field later sticks. */
function useProfilePrefill() {
  const { profile } = useDatabase();
  const { state, actions } = useBooking();
  const done = useRef(false);
  const { intake, confirmation } = state;

  useEffect(() => {
    if (done.current || confirmation) return;
    if (!profile.fullName && !profile.phone && !profile.emergencyContact) return;
    done.current = true;
    const patch = {
      ...(!intake.fullName.trim() && profile.fullName && { fullName: profile.fullName }),
      ...(!intake.phone.trim() && profile.phone && { phone: profile.phone }),
      ...(!intake.emergencyContact.trim() && profile.emergencyContact && { emergencyContact: profile.emergencyContact }),
    };
    if (Object.keys(patch).length > 0) actions.updateIntake(patch);
  }, [profile, confirmation, intake.fullName, intake.phone, intake.emergencyContact, actions]);
}
