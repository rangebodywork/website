"use client";

import Link from "next/link";
import { useState } from "react";
import { useBooking } from "@/lib/booking-context";
import { formatDuration, formatPrice } from "@/lib/format";
import { ROUTES, STUDIO } from "@/lib/nav";
import { pressureIntent, primaryGoal, scheduleSummary } from "@/lib/session-summary";
import { Avatar, PORTRAITS } from "../Avatar";
import { EmptySession } from "../EmptySession";
import { Icon } from "../Icon";
import { validateHealthRecord } from "../intake/HealthRecord";
import { StickyActionBar } from "../StickyActionBar";
import { Card, CardHeader } from "../ui/Card";
import { CancellationPolicy } from "./CancellationPolicy";
import { Confirmation } from "./Confirmation";
import { SaveCardStep } from "./SaveCardStep";
import { SessionItinerary } from "./SessionItinerary";

export function ReviewView() {
  const { state, actions, blocks, totalMinutes, totalPrice } = useBooking();
  const [bioOpen, setBioOpen] = useState(false);
  const [promoDraft, setPromoDraft] = useState<string | null>(null);

  if (state.confirmation) return <Confirmation />;
  if (blocks.length === 0) return <EmptySession />;

  const schedule = scheduleSummary(state, totalMinutes);
  const intakeComplete = Boolean(schedule) && Object.keys(validateHealthRecord(state.intake)).length === 0;
  const hasBodywork = blocks.some((b) => b.id === "massage");
  const promo = promoDraft ?? state.promoCode;

  return (
    <>
      <main className="mx-auto w-full max-w-lg space-y-6 px-4 pb-10 pt-4 md:max-w-2xl lg:max-w-6xl lg:px-8 lg:pt-8">
        <div className="space-y-2 pb-1 pt-2 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-fixed/60 px-3 py-1 text-primary">
            <Icon name="verified" filled className="text-[16px]" />
            <span className="font-label-md text-label-md uppercase tracking-wider">Review Your Customized Session</span>
          </div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-medium tracking-tight text-primary md:font-headline-lg md:text-headline-lg">
            Embodied Balance
          </h1>
          <p className="mx-auto max-w-xs font-body-sm text-body-sm text-on-surface-variant md:max-w-md">
            Take a slow breath. Take a moment to review the intentional cadence prepared for your journey.
          </p>
        </div>

        <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-8 lg:space-y-0">
          <div className="space-y-6">
            {/* Date & duration */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-surface-variant bg-surface-container-low p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-primary shadow-xs">
                  <Icon name="event" className="text-[22px]" />
                </div>
                {schedule ? (
                  <div>
                    <div className="font-title-md text-title-md text-on-surface">{schedule.dayLabel}</div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant">{schedule.timeLabel}</div>
                  </div>
                ) : (
                  <div>
                    <div className="font-title-md text-title-md text-on-surface">Choose your sacred window</div>
                    <Link href={ROUTES.intake} className="font-body-sm text-body-sm text-secondary hover:underline">
                      Pick a date &amp; time
                    </Link>
                  </div>
                )}
              </div>
              <span className="inline-flex shrink-0 items-center rounded-full border border-outline-variant/40 bg-surface px-2.5 py-1 font-label-sm text-label-sm text-primary">
                {formatDuration(totalMinutes, "short")} total
              </span>
            </div>

            {/* Practitioner */}
            <Card className="p-4">
              <div className="flex items-start gap-3.5">
                <Avatar src={PORTRAITS.review} alt="Elena Vance" size={56} className="border-2 border-surface-container" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="font-title-lg text-title-lg leading-snug text-on-surface">Elena Vance</h2>
                    <span className="flex items-center gap-0.5 font-label-sm text-label-sm text-secondary">
                      <Icon name="star" filled className="text-[14px]" />
                      4.98
                    </span>
                  </div>
                  <p className="mt-0.5 font-label-sm text-label-sm tracking-wide text-primary">
                    LMT, RYT-500, Holistic Movement Specialist
                  </p>
                  <p className="mt-2 font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                    &ldquo;We honor where your nervous system is today, weaving slow tactile dialogue and movement to
                    release somatic holding patterns.&rdquo;
                  </p>
                  {bioOpen && (
                    <p id="practitioner-bio" className="mt-2 font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                      Elena blends licensed massage therapy, 500-hour yoga training and habit coaching into single-client
                      sessions, holding just two clients a day so each practice can unfold without hurry.
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3.5 flex items-center justify-between border-t border-surface-variant/40 pt-3 font-label-sm text-label-sm text-on-surface-variant">
                <span className="flex items-center gap-1.5">
                  <Icon name="self_improvement" className="text-[16px] text-primary" />
                  Private 1-on-1 Sanctuary
                </span>
                <button
                  type="button"
                  onClick={() => setBioOpen((v) => !v)}
                  aria-expanded={bioOpen}
                  aria-controls="practitioner-bio"
                  className="flex items-center gap-0.5 font-label-sm text-label-sm text-secondary hover:underline"
                >
                  {bioOpen ? "Hide bio" : "Read bio"}
                  <Icon name={bioOpen ? "expand_more" : "arrow_forward"} className="text-[14px]" />
                </button>
              </div>
            </Card>

            <SessionItinerary blocks={blocks} />

            {/* Intake alignment */}
            <Card className="space-y-4">
              <div className="flex items-center justify-between border-b border-surface-variant/50 pb-2">
                <h2 className="font-headline-md text-headline-md text-primary">Intake Alignment</h2>
                <Link href={ROUTES.intake} className="font-label-md text-label-md text-secondary hover:underline">
                  Edit intake
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {hasBodywork && (
                  <>
                    <div className="space-y-1.5 rounded-lg border border-surface-variant/40 bg-surface-container-low p-3.5">
                      <span className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
                        <Icon name="accessibility_new" className="text-[16px] text-primary" /> Target Focus
                      </span>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {state.intake.focusAreas.length === 0 && (
                          <span className="font-label-sm text-label-sm text-outline">Full body</span>
                        )}
                        {state.intake.focusAreas.map((area) => (
                          <span
                            key={area}
                            className="rounded-full border border-outline-variant/30 bg-surface px-2.5 py-0.5 font-label-sm text-label-sm text-primary"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5 rounded-lg border border-surface-variant/40 bg-surface-container-low p-3.5">
                      <span className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
                        <Icon name="tune" className="text-[16px] text-secondary" /> Pressure Intent
                      </span>
                      <div className="pt-1">
                        <span className="inline-block rounded-full bg-secondary-fixed px-2.5 py-0.5 font-label-sm text-label-sm text-on-secondary-fixed">
                          {pressureIntent(state)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
                <div className="col-span-2 flex items-center justify-between rounded-lg border border-surface-variant/40 bg-surface-container-low p-3.5">
                  <div>
                    <span className="block font-label-sm text-label-sm text-on-surface-variant">Primary Somatic Goal</span>
                    <span className="mt-0.5 block font-title-md text-title-md text-primary">{primaryGoal(state)}</span>
                  </div>
                  <Icon name="energy_savings_leaf" className="text-[22px] text-primary" />
                </div>
              </div>
            </Card>

            {/* Arrival */}
            <Card className="space-y-3.5">
              <h2 className="font-headline-md text-headline-md text-primary">Arrival &amp; Studio Guidance</h2>
              <div className="flex items-start gap-3">
                <Icon name="location_on" className="mt-0.5 text-[20px] text-primary" />
                <div>
                  <div className="font-title-md text-title-md text-on-surface">{STUDIO.room}</div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{STUDIO.address}</p>
                </div>
              </div>
              <div className="space-y-2 rounded-lg border border-surface-variant/40 bg-surface-container-low p-3.5 font-body-sm text-body-sm text-on-surface-variant">
                <div className="flex items-start gap-2">
                  <Icon name="spa" className="mt-0.5 shrink-0 text-[18px] text-primary" />
                  <span>
                    <strong>Quiet Arrival:</strong> Please arrive 10 minutes early. Unlace your shoes in the entryway and
                    enjoy our warm cedar tea.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Icon name="local_parking" className="mt-0.5 shrink-0 text-[18px] text-primary" />
                  <span>
                    <strong>Parking:</strong> Dedicated client parking stalls 12-15 located in the rear courtyard via
                    Rosewood Alley.
                  </span>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-6 lg:sticky lg:top-24">
            <CancellationPolicy intake={state.intake} />

            <SaveCardStep />

            {/* Investment */}
            <Card className="space-y-3">
              <CardHeader title="Investment Summary" />
              <div className="space-y-2 font-body-sm text-body-sm">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Customized {blocks.length}-Block Subtotal</span>
                  <span>{formatPrice(totalPrice, true)}</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Studio Linens &amp; Organic Oils</span>
                  <span className="font-medium text-primary">Included</span>
                </div>
                <form
                  className="pb-1 pt-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    actions.setPromoCode(promo.trim().toUpperCase());
                    setPromoDraft(null);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={promo}
                        onChange={(e) => setPromoDraft(e.target.value)}
                        placeholder="Promo or gift card"
                        aria-label="Promo or gift code"
                        className="w-full rounded-lg border border-surface-variant/60 bg-surface-container-low px-3.5 py-2 font-body-sm text-body-sm text-on-surface transition-colors placeholder:text-outline focus:border-primary focus:ring-0"
                      />
                      <Icon name="redeem" className="pointer-events-none absolute right-3 top-2.5 text-[16px] text-outline" />
                    </div>
                    <button
                      type="submit"
                      className="shrink-0 rounded-lg border border-surface-variant/60 bg-surface-container-low px-4 py-2 font-label-md text-label-md text-primary transition-colors duration-150 hover:bg-surface-container"
                    >
                      Apply
                    </button>
                  </div>
                  {state.promoCode && promoDraft === null && (
                    <p className="mt-1.5 font-label-sm text-label-sm text-primary" role="status">
                      Code {state.promoCode} saved — Elena will apply it when your session is billed.
                    </p>
                  )}
                </form>
                <div className="flex items-baseline justify-between border-t border-surface-variant pt-2.5">
                  <div>
                    <div className="font-title-lg text-title-lg text-primary">Total Investment</div>
                    <div className="font-label-sm text-label-sm text-on-surface-variant">Billed upon completion</div>
                  </div>
                  <span className="font-headline-lg-mobile text-headline-lg-mobile font-medium text-primary">
                    {formatPrice(totalPrice, true)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Calendar sync */}
            <div className="flex items-center justify-between rounded-xl border border-outline-variant/40 bg-surface-container-low p-4">
              <div className="flex items-center gap-3">
                <input
                  id="calendar-sync"
                  type="checkbox"
                  checked={state.calendarSync}
                  onChange={(e) => actions.setCalendarSync(e.target.checked)}
                  className="h-5 w-5 cursor-pointer rounded-sm border-outline text-primary focus:ring-0 focus:ring-offset-0"
                />
                <label htmlFor="calendar-sync" className="cursor-pointer font-title-md text-title-md text-on-surface">
                  Instant Calendar Sync (.ics &amp; Google)
                </label>
              </div>
              <Icon name="notifications_active" className="text-[20px] text-primary" />
            </div>

            {/* Questions */}
            <Card className="space-y-3.5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed/60 text-primary">
                  <Icon name="chat_bubble" className="text-[20px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-title-md text-title-md text-on-surface">Questions or custom inquiries?</h3>
                  <p className="mt-0.5 font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                    Reach out anytime via email or Instagram DM before your session.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={`mailto:${STUDIO.email}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-surface-variant/60 bg-surface-container-low px-3 py-1.5 font-label-sm text-label-sm text-primary transition-colors duration-200 hover:bg-surface-container"
                >
                  <Icon name="mail" className="text-[16px]" />
                  <span>Email Elena</span>
                </a>
                <a
                  href={STUDIO.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-surface-variant/60 bg-surface-container-low px-3 py-1.5 font-label-sm text-label-sm text-on-surface-variant transition-colors duration-200 hover:bg-surface-container hover:text-primary"
                >
                  <Icon name="tag" className="text-[16px]" />
                  <span>Instagram ({STUDIO.instagramHandle})</span>
                </a>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <StickyActionBar className="flex flex-col gap-2 p-4 md:max-w-2xl lg:max-w-6xl lg:px-8">
        {intakeComplete && !state.savedCard ? (
          <button
            type="button"
            disabled
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-surface-container-high px-6 py-3.5 font-title-md text-title-md text-on-surface-variant lg:ml-auto lg:max-w-md"
          >
            Save a card on file to reserve
          </button>
        ) : intakeComplete ? (
          <button
            type="button"
            onClick={actions.confirm}
            className="group flex w-full items-center justify-center gap-2 rounded-lg bg-primary-container px-6 py-3.5 font-title-md text-title-md text-on-primary shadow-md transition-all duration-200 hover:bg-primary active:scale-[0.98] lg:ml-auto lg:max-w-md"
          >
            <span>Confirm &amp; Reserve Session</span>
            <Icon name="arrow_forward" className="text-[18px] transition-transform duration-150 group-hover:translate-x-0.5" />
          </button>
        ) : (
          <Link
            href={ROUTES.intake}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-container px-6 py-3.5 font-title-md text-title-md text-on-primary shadow-md transition-all duration-200 hover:bg-primary lg:ml-auto lg:max-w-md"
          >
            <span>Complete Intake to Reserve</span>
            <Icon name="arrow_forward" className="text-[18px]" />
          </Link>
        )}
        <div className="flex items-center justify-center gap-1.5 text-center font-label-sm text-label-sm text-on-surface-variant lg:ml-auto lg:max-w-md">
          <Icon name="lock" className="text-[14px] text-primary" />
          <span>Card saved on file • No charge until your session</span>
        </div>
      </StickyActionBar>
    </>
  );
}
