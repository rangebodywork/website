"use client";

import { useDatabase } from "@/lib/db-context";
import { formatPrice } from "@/lib/format";
import type { TimeSlotId } from "@/lib/catalog";
import { isPlaceholderPolicy, sessionStart } from "@/lib/payments/policy";
import { Icon } from "../Icon";

/** The admin-editable cancellation policy, shown before confirming and on the confirmation. */
export function CancellationPolicy({ intake }: { intake?: { date: string | null; slot: TimeSlotId } }) {
  const { paymentSettings } = useDatabase();
  const { cancellationFee, cancellationWindowHours, policyText } = paymentSettings;
  const start = intake ? sessionStart(intake) : null;
  const cancelBy = start
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(
        new Date(start.getTime() - cancellationWindowHours * 60 * 60 * 1000),
      )
    : undefined;
  return (
    <section
      aria-labelledby="cancellation-policy"
      className="flex items-start gap-3.5 rounded-xl border border-surface-variant/60 bg-surface-container-lowest p-4"
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary-fixed/50 text-secondary">
        <Icon name="shield" className="text-[20px]" />
      </div>
      <div className="space-y-1.5">
        <h3 id="cancellation-policy" className="font-title-md text-title-md text-on-surface">
          Cancellation policy
        </h3>
        {isPlaceholderPolicy(policyText) && (
          <span className="inline-flex rounded-full bg-tertiary-fixed px-2 py-0.5 font-label-sm text-label-sm uppercase tracking-wider text-on-tertiary-fixed">
            Placeholder wording
          </span>
        )}
        <p className="whitespace-pre-line font-body-sm text-body-sm leading-relaxed text-on-surface-variant">{policyText}</p>
        <p className="font-body-sm text-body-sm text-on-surface">
          {cancellationFee > 0
            ? `Cancelling within ${cancellationWindowHours} hours of your start time incurs a ${formatPrice(cancellationFee, true)} fee${cancelBy ? `; cancel before ${cancelBy} at no cost` : ""}. Rescheduling is free.`
            : "Cancelling is free. Rescheduling is free."}
        </p>
      </div>
    </section>
  );
}
