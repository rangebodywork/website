"use client";

import { HEALTH_CONSENTS } from "@/lib/catalog";
import { useBooking } from "@/lib/booking-context";
import { cn } from "@/lib/cn";
import { Icon } from "../Icon";
import { IntakeSection } from "./TailoringSections";

export type HealthRecordErrors = Partial<Record<"fullName" | "phone" | "consents", string>>;

export function validateHealthRecord(intake: ReturnType<typeof useBooking>["state"]["intake"]): HealthRecordErrors {
  const errors: HealthRecordErrors = {};
  if (!intake.fullName.trim()) errors.fullName = "Please share your full legal name.";
  if (intake.phone.replace(/\D/g, "").length < 7) errors.phone = "Please add a mobile number we can reach.";
  if (HEALTH_CONSENTS.some((c) => c.required && !intake.consents[c.id]))
    errors.consents = "Please confirm the required health statements to continue.";
  return errors;
}

const inputClass =
  "h-11 w-full rounded-lg border bg-surface-container-lowest px-3 text-on-surface placeholder:text-outline/70 focus:border-primary focus:ring-0";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 font-label-sm text-label-sm text-error">
      {message}
    </p>
  );
}

export function HealthRecord({ errors }: { errors: HealthRecordErrors }) {
  const { state, actions } = useBooking();
  const { intake } = state;

  return (
    <IntakeSection
      id="health-record"
      marker={<Icon name="clinical_notes" className="text-primary" />}
      title="Confidential Health Record"
    >
      <div className="space-y-3">
        <div>
          <label
            htmlFor="full-name"
            className="mb-1 block font-label-md text-label-md uppercase tracking-wider text-outline"
          >
            Full Legal Name
          </label>
          <input
            id="full-name"
            type="text"
            autoComplete="name"
            value={intake.fullName}
            onChange={(e) => actions.updateIntake({ fullName: e.target.value })}
            placeholder="Siddhartha Roy"
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? "full-name-error" : undefined}
            className={cn(
              inputClass,
              "px-3.5 font-body-md text-body-md",
              errors.fullName ? "border-error" : "border-outline-variant/50",
            )}
          />
          <FieldError id="full-name-error" message={errors.fullName} />
        </div>
        <div className="grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-2">
          <div>
            <label
              htmlFor="client-phone"
              className="mb-1 block font-label-md text-label-md uppercase tracking-wider text-outline"
            >
              Mobile Phone
            </label>
            <input
              id="client-phone"
              type="tel"
              autoComplete="tel"
              value={intake.phone}
              onChange={(e) => actions.updateIntake({ phone: e.target.value })}
              placeholder="(503) 841-2940"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "client-phone-error" : undefined}
              className={cn(inputClass, "font-body-sm text-body-sm", errors.phone ? "border-error" : "border-outline-variant/50")}
            />
            <FieldError id="client-phone-error" message={errors.phone} />
          </div>
          <div>
            <label
              htmlFor="emergency-phone"
              className="mb-1 block font-label-md text-label-md uppercase tracking-wider text-outline"
            >
              Emergency Contact
            </label>
            <input
              id="emergency-phone"
              type="text"
              value={intake.emergencyContact}
              onChange={(e) => actions.updateIntake({ emergencyContact: e.target.value })}
              placeholder="Name & Phone"
              className={cn(inputClass, "border-outline-variant/50 font-body-sm text-body-sm")}
            />
          </div>
        </div>
        <fieldset className="space-y-2.5 pt-2" aria-describedby={errors.consents ? "consent-error" : undefined}>
          <legend className="sr-only">Health screening</legend>
          {HEALTH_CONSENTS.map((consent) => (
            <label key={consent.id} className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={intake.consents[consent.id]}
                onChange={(e) =>
                  actions.updateIntake({ consents: { ...intake.consents, [consent.id]: e.target.checked } })
                }
                className="mt-0.5 rounded-sm border-outline/40 text-primary focus:ring-primary"
              />
              <span className="font-body-sm text-body-sm leading-snug text-on-surface-variant">
                {consent.text}
                {consent.required && <span className="sr-only"> (required)</span>}
              </span>
            </label>
          ))}
          <FieldError id="consent-error" message={errors.consents} />
        </fieldset>
      </div>
    </IntakeSection>
  );
}
