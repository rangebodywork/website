"use client";

import { useBooking } from "@/lib/booking-context";
import { Card, CardHeader } from "@/components/ui/Card";

export function ProfileView() {
  const { state, actions } = useBooking();
  const { intake } = state;

  return (
    <Card>
      <CardHeader title="Personal Information" />
      <div className="space-y-4">
        <div>
          <label className="block text-label-md text-on-surface-variant">Full Name</label>
          <input
            className="mt-1 block w-full rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface"
            type="text"
            value={intake.fullName}
            onChange={(e) => actions.updateIntake({ fullName: e.target.value })}
            placeholder="Jane Doe"
          />
        </div>
        <div>
          <label className="block text-label-md text-on-surface-variant">Phone Number</label>
          <input
            className="mt-1 block w-full rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface"
            type="tel"
            value={intake.phone}
            onChange={(e) => actions.updateIntake({ phone: e.target.value })}
            placeholder="(555) 123-4567"
          />
        </div>
        <div>
          <label className="block text-label-md text-on-surface-variant">Emergency Contact</label>
          <input
            className="mt-1 block w-full rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface"
            type="text"
            value={intake.emergencyContact}
            onChange={(e) => actions.updateIntake({ emergencyContact: e.target.value })}
            placeholder="Name & Phone"
          />
        </div>
      </div>
    </Card>
  );
}
